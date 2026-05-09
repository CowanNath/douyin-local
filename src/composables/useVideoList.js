import { ref, computed } from 'vue'
import { useSettings } from './useSettings.js'

const videos = ref([])
const loading = ref(false)
const error = ref(null)
let shuffled = []

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useVideoList() {
  const { settings } = useSettings()

  const orderedList = computed(() => {
    if (settings.value.playMode === 'random') {
      if (shuffled.length !== videos.value.length) {
        shuffled = shuffle(videos.value)
      }
      return shuffled
    }
    return videos.value
  })

  async function fetchVideos() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/videos')
      const data = await res.json()
      if (data.error) {
        error.value = data.error
      } else {
        videos.value = data.videos
        shuffled = []
      }
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function setVideoDir(dir) {
    const res = await fetch('/api/settings/video-dir', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    await fetchVideos()
    return data.dir
  }

  return { videos, orderedList, loading, error, fetchVideos, setVideoDir }
}
