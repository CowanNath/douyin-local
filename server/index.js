import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 7077

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', 'data')
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json')
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

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'])

app.use(express.json())

let videoDir = process.env.VIDEO_DIR || path.resolve(__dirname, '..', 'videos')

app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(videoDir)) {
      return res.json({ videos: [], error: `目录不存在: ${videoDir}` })
    }

    const files = fs.readdirSync(videoDir).filter((f) => {
      const ext = path.extname(f).toLowerCase()
      return VIDEO_EXTENSIONS.has(ext)
    })

    const videos = files.map((f) => ({
      name: f,
      url: `/videos/${encodeURIComponent(f)}`,
      size: fs.statSync(path.join(videoDir, f)).size,
    }))

    res.json({ videos, dir: videoDir })
  } catch (err) {
    res.status(500).json({ videos: [], error: err.message })
  }
})

app.put('/api/settings/video-dir', (req, res) => {
  const { dir } = req.body
  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({ error: '需要提供有效的目录路径' })
  }

  const resolved = path.resolve(dir)
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `目录不存在: ${resolved}` })
  }

  videoDir = resolved
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
  if (idx >= 0) list.splice(idx, 1)
  else list.push(name)
  saveFavorites(list)
  res.json(list)
})

app.post('/api/favorites/import', (req, res) => {
  const { names } = req.body
  if (!Array.isArray(names)) return res.status(400).json({ error: 'names must be an array' })
  const list = loadFavorites()
  const merged = [...new Set([...list, ...names])]
  saveFavorites(merged)
  res.json(merged)
})

app.get('/videos/:filename', (req, res) => {
  const filePath = path.join(videoDir, decodeURIComponent(req.params.filename))

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found')
  }

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

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log(`视频目录: ${videoDir}`)
})
