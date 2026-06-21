import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 7077

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', 'data')
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function loadFavorites() {
  try {
    return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveFavorites(list) {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(list, null, 2))
}

// ---- 持久化设置（videoDir 等）----
// 优先级：VIDEO_DIR 环境变量 > 持久化文件 > 默认值
// 当 VIDEO_DIR 被显式设置时，禁用通过 API 修改（容器化部署场景）
const videoDirFromEnv = !!process.env.VIDEO_DIR

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveSettings(patch) {
  const current = loadSettings()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...current, ...patch }, null, 2))
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'])

app.use(express.json())

// 校验 filename 不会逃出 baseDir（防止 ..%2F 等路径遍历攻击）
function resolveSafe(baseDir, filename) {
  const base = path.resolve(baseDir)
  const target = path.resolve(base, filename)
  if (target !== base && !target.startsWith(base + path.sep)) {
    return null
  }
  return target
}

function getFavDir() {
  return path.join(videoDir, 'favourite')
}

function findVideoLocation(filename) {
  const rootPath = resolveSafe(videoDir, filename)
  const favPath = resolveSafe(getFavDir(), filename)
  if (rootPath && fs.existsSync(rootPath)) return 'root'
  if (favPath && fs.existsSync(favPath)) return 'favourite'
  return null
}

function moveToFavourite(filename) {
  const favDir = getFavDir()
  if (!fs.existsSync(favDir)) fs.mkdirSync(favDir, { recursive: true })
  const src = resolveSafe(videoDir, filename)
  const dst = resolveSafe(favDir, filename)
  if (!src || !dst) return
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.renameSync(src, dst)
  }
}

function moveFromFavourite(filename) {
  const favDir = getFavDir()
  const src = resolveSafe(favDir, filename)
  const dst = resolveSafe(videoDir, filename)
  if (!src || !dst) return
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.renameSync(src, dst)
  }
}

// 启动时确定初始 videoDir：环境变量优先，其次持久化文件，最后默认值
let videoDir = process.env.VIDEO_DIR
  || loadSettings().videoDir
  || path.resolve(__dirname, '..', 'videos')
videoDir = path.resolve(videoDir)

app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(videoDir)) {
      return res.json({ videos: [], error: `目录不存在: ${videoDir}` })
    }

    const scanDir = (dir, subDir) => {
      if (!fs.existsSync(dir)) return []
      return fs.readdirSync(dir).filter((f) => {
        const ext = path.extname(f).toLowerCase()
        return VIDEO_EXTENSIONS.has(ext)
      }).map((f) => ({
        name: f,
        url: `/videos/${encodeURIComponent(f)}${subDir ? '?sub=favourite' : ''}`,
        size: fs.statSync(path.join(dir, f)).size,
        subDir,
      }))
    }

    const videos = [...scanDir(videoDir, ''), ...scanDir(getFavDir(), 'favourite')]
    res.json({ videos, dir: videoDir })
  } catch (err) {
    res.status(500).json({ videos: [], error: err.message })
  }
})

app.get('/api/settings', (req, res) => {
  res.json({
    videoDir,
    videoDirLocked: videoDirFromEnv,
  })
})

app.put('/api/settings/video-dir', (req, res) => {
  if (videoDirFromEnv) {
    return res.status(403).json({ error: '视频目录由环境变量 VIDEO_DIR 指定，无法通过界面修改' })
  }
  const { dir } = req.body
  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({ error: '需要提供有效的目录路径' })
  }

  const resolved = path.resolve(dir)
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `目录不存在: ${resolved}` })
  }

  videoDir = resolved
  saveSettings({ videoDir: resolved })
  res.json({ dir: videoDir })
})

app.get('/api/favorites', (req, res) => {
  res.json(loadFavorites())
})

app.put('/api/favorites', (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const list = loadFavorites()
  const idx = list.indexOf(name)
  if (idx >= 0) {
    list.splice(idx, 1)
    moveFromFavourite(name)
  } else {
    list.push(name)
    moveToFavourite(name)
  }
  saveFavorites(list)
  res.json(list)
})

app.post('/api/favorites/import', (req, res) => {
  const { names } = req.body
  if (!Array.isArray(names)) return res.status(400).json({ error: 'names must be an array' })
  const list = loadFavorites()
  const merged = [...new Set([...list, ...names])]
  saveFavorites(merged)
  for (const name of names) {
    moveToFavourite(name)
  }
  res.json(merged)
})

app.delete('/api/videos/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename)
  const sub = req.query.sub === 'favourite' ? 'favourite' : ''
  const baseDir = sub ? getFavDir() : videoDir
  const filePath = resolveSafe(baseDir, filename)
  if (!filePath) {
    return res.status(400).json({ error: '非法的文件路径' })
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' })
  }
  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: '删除失败: ' + err.message })
    const favs = loadFavorites()
    const idx = favs.indexOf(filename)
    if (idx >= 0) { favs.splice(idx, 1); saveFavorites(favs) }
    res.json({ deleted: filename })
  })
})

// 允许跨源读取视频（手机端非同源访问时 canvas 截图需要，否则画布被污染 toDataURL 失败）
app.options('/videos/:filename', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
  res.sendStatus(204)
})

app.get('/videos/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename)
  const sub = req.query.sub === 'favourite' ? 'favourite' : ''
  const baseDir = sub ? getFavDir() : videoDir
  const filePath = resolveSafe(baseDir, filename)

  if (!filePath) {
    return res.status(400).send('Invalid path')
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found')
  }

  // 统一设置 CORS 头，覆盖 206/200 所有响应分支
  res.setHeader('Access-Control-Allow-Origin', '*')

  const stat = fs.statSync(filePath)
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunkSize = end - start + 1

    const fileStream = fs.createReadStream(filePath, { start, end })
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    })
    fileStream.pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

const distPath = path.resolve(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

function syncFavoritesOnStartup() {
  const favDir = getFavDir()
  if (!fs.existsSync(favDir)) fs.mkdirSync(favDir, { recursive: true })
  const favs = loadFavorites()
  let moved = 0
  for (const name of favs) {
    const src = resolveSafe(videoDir, name)
    const dst = resolveSafe(favDir, name)
    if (!src || !dst) continue
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.renameSync(src, dst)
      moved++
    }
  }
  if (moved > 0) {
    console.log(`已同步 ${moved} 个收藏视频到 favourite 文件夹`)
  }
}

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log(`视频目录: ${videoDir}`)
  syncFavoritesOnStartup()
})
