import { ref, watch } from 'vue'

const STORAGE_KEY = 'douyin-local-settings'

const defaults = {
  playMode: 'sequential',
  videoDir: '',
  videoDirLocked: false, // 服务器端由环境变量锁定时为 true
  randomIncludeFav: true,
  favShuffle: false,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

const settings = ref(load())
let synced = false

watch(settings, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

// 启动时从服务器同步 videoDir 的真实状态（环境变量锁定 / 持久化值）
async function syncFromServer() {
  if (synced) return
  synced = true
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    if (data.videoDir) settings.value.videoDir = data.videoDir
    settings.value.videoDirLocked = !!data.videoDirLocked
  } catch {
    settings.value.videoDirLocked = false
  }
}

export function useSettings() {
  function update(patch) {
    Object.assign(settings.value, patch)
  }

  return { settings, update, syncFromServer }
}
