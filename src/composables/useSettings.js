import { ref, watch } from 'vue'

const STORAGE_KEY = 'douyin-local-settings'

const defaults = {
  playMode: 'sequential',
  videoDir: '',
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

watch(settings, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function useSettings() {
  function update(patch) {
    Object.assign(settings.value, patch)
  }

  return { settings, update }
}
