import { ref } from 'vue'

const favorites = ref([])
let loaded = false

async function ensureLoaded() {
  if (loaded) return
  try {
    const res = await fetch('/api/favorites')
    favorites.value = await res.json()
  } catch {
    favorites.value = []
  }
  loaded = true
}

export function useFavorites() {
  async function fetchFavorites() {
    await ensureLoaded()
    return favorites.value
  }

  async function toggle(name) {
    await ensureLoaded()
    const res = await fetch('/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    favorites.value = await res.json()
  }

  function isFavorite(name) {
    return favorites.value.includes(name)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(favorites.value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `douyin-favorites-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result)
          if (Array.isArray(data)) {
            const res = await fetch('/api/favorites/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ names: data }),
            })
            favorites.value = await res.json()
            resolve(favorites.value.length)
          } else {
            reject(new Error('JSON 格式不正确'))
          }
        } catch {
          reject(new Error('JSON 解析失败'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  return { favorites, fetchFavorites, toggle, isFavorite, exportJSON, importJSON }
}
