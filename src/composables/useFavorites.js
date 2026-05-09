import { ref, computed } from 'vue'

const STORAGE_KEY = 'douyin-local-favorites'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const favorites = ref(load())

export function useFavorites() {
  function toggle(name) {
    const idx = favorites.value.indexOf(name)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(name)
    }
    save()
  }

  function isFavorite(name) {
    return favorites.value.includes(name)
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value))
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

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          if (Array.isArray(data)) {
            const merged = new Set([...favorites.value, ...data])
            favorites.value = [...merged]
            save()
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

  return { favorites, toggle, isFavorite, exportJSON, importJSON }
}
