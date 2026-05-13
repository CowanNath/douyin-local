<template>
  <div
    ref="feedRef"
    class="video-feed"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @wheel.prevent="onWheel"
    @mousedown.prevent="onMouseDown"
  >
    <div class="feed-track" :style="trackStyle">
      <VideoCard
        v-for="(item, i) in pool"
        :key="item.key"
        :video="item.video"
        :index="i"
        :active="i === 1 && !resetting"
        :isFav="isFav(item.video?.name)"
        @toggle-fav="handleFav"
        @ended="next"
      />
    </div>

    <div v-if="totalCount === 0 && !loading" class="empty-state">
      <p>暂无视频</p>
      <p class="hint">请在设置中配置视频目录</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div class="counter" v-if="totalCount > 0">
      {{ currentIndex + 1 }} / {{ totalCount }}
    </div>

    <button class="mode-btn" v-if="totalCount > 0" @click.stop="cycleMode" :title="modeLabel">
      <svg v-if="settings.playMode === 'sequential'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      <svg v-else-if="settings.playMode === 'random'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
      <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <span>{{ modeLabel }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import VideoCard from './VideoCard.vue'
import { useVideoList } from '../composables/useVideoList.js'
import { useFavorites } from '../composables/useFavorites.js'
import { useSettings } from '../composables/useSettings.js'

const emit = defineEmits(['index-change'])

const { orderedList, loading, fetchVideos } = useVideoList()
const { isFavorite, toggle: toggleFav, fetchFavorites } = useFavorites()
const { settings, update: updateSettings } = useSettings()

const feedRef = ref(null)
const currentIndex = ref(0)
const offset = ref(-1)
const animating = ref(false)
const resetting = ref(false)

let touchStartY = 0
let touchDeltaY = 0
let wheelTimer = null
let isDragging = false

const totalCount = computed(() => orderedList.value.length)

const pool = computed(() => {
  const list = orderedList.value
  if (list.length === 0) {
    return [
      { key: 'empty-0', video: { name: '', url: '' } },
      { key: 'empty-1', video: { name: '', url: '' } },
      { key: 'empty-2', video: { name: '', url: '' } },
    ]
  }
  const idx = currentIndex.value
  const prevIdx = idx > 0 ? idx - 1 : idx
  const nextIdx = idx < list.length - 1 ? idx + 1 : idx
  return [
    { key: list[prevIdx].name, video: list[prevIdx] },
    { key: list[idx].name, video: list[idx] },
    { key: list[nextIdx].name, video: list[nextIdx] },
  ]
})

const trackStyle = computed(() => ({
  transform: `translateY(${offset.value * 100}vh)`,
  transition: animating.value ? 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
}))

function isFav(name) {
  return isFavorite(name)
}

function handleFav(name) {
  toggleFav(name)
}

const MODES = ['sequential', 'random', 'favorites']
const MODE_LABELS = { sequential: '顺序', random: '随机', favorites: '收藏' }

const modeLabel = computed(() => MODE_LABELS[settings.value.playMode] || '顺序')

function cycleMode() {
  const cur = MODES.indexOf(settings.value.playMode)
  const next = MODES[(cur + 1) % MODES.length]
  updateSettings({ playMode: next })
}

function goTo(index) {
  if (index < 0 || index >= totalCount.value || animating.value) return
  if (index === currentIndex.value) return

  animating.value = true
  const direction = index > currentIndex.value ? -1 : 1
  offset.value = -1 + direction
  currentIndex.value = index
  emit('index-change', index)

  setTimeout(() => {
    animating.value = false
    resetting.value = true
    offset.value = -1
    nextTick(() => { resetting.value = false })
  }, 360)
}

function next() {
  goTo(currentIndex.value + 1)
}

function prev() {
  goTo(currentIndex.value - 1)
}

function onTouchStart(e) {
  if (animating.value) return
  touchStartY = e.touches[0].clientY
  touchDeltaY = 0
}

function onTouchMove(e) {
  if (animating.value) return
  touchDeltaY = e.touches[0].clientY - touchStartY
  const vh = window.innerHeight
  const dragOffset = touchDeltaY / vh
  offset.value = -1 + dragOffset
}

function onTouchEnd() {
  if (animating.value) return
  const threshold = window.innerHeight * 0.15
  if (touchDeltaY < -threshold) {
    next()
  } else if (touchDeltaY > threshold) {
    prev()
  } else {
    animating.value = true
    offset.value = -1
    setTimeout(() => { animating.value = false }, 360)
  }
}

function onWheel(e) {
  if (animating.value) return
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => {
    if (e.deltaY > 20) next()
    else if (e.deltaY < -20) prev()
  }, 50)
}

function onMouseDown(e) {
  if (animating.value) return
  isDragging = true
  touchStartY = e.clientY
  touchDeltaY = 0
}

function onMouseMove(e) {
  if (!isDragging || animating.value) return
  touchDeltaY = e.clientY - touchStartY
  const vh = window.innerHeight
  const dragOffset = touchDeltaY / vh
  offset.value = -1 + dragOffset
}

function onMouseUp() {
  if (!isDragging) return
  isDragging = false
  if (animating.value) return
  const threshold = window.innerHeight * 0.15
  if (touchDeltaY < -threshold) {
    next()
  } else if (touchDeltaY > threshold) {
    prev()
  } else {
    animating.value = true
    offset.value = -1
    setTimeout(() => { animating.value = false }, 360)
  }
}

function onKeyDown(e) {
  if (animating.value) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
}

onMounted(async () => {
  await Promise.all([fetchVideos(), fetchFavorites()])
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  clearTimeout(wheelTimer)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('keydown', onKeyDown)
})

watch(orderedList, () => {
  currentIndex.value = 0
  offset.value = -1
})

defineExpose({ next, prev, goTo, fetchVideos })
</script>

<style scoped>
.video-feed {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
}

.video-feed:active {
  cursor: grabbing;
}

.feed-track {
  width: 100%;
  will-change: transform;
}

.feed-track > * {
  width: 100%;
  height: 100vh;
}

.empty-state,
.loading-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  z-index: 20;
}

.empty-state .hint {
  font-size: 13px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.4);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #fe2c55;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.counter {
  position: absolute;
  top: max(env(safe-area-inset-top, 0px), 48px);
  right: 16px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  z-index: 20;
}

.mode-btn {
  position: absolute;
  top: max(env(safe-area-inset-top, 0px), 48px);
  left: 68px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  z-index: 20;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.mode-btn:active {
  background: rgba(0, 0, 0, 0.7);
}
</style>
