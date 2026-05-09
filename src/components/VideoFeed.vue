<template>
  <div
    ref="feedRef"
    class="video-feed"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @wheel.prevent="onWheel"
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import VideoCard from './VideoCard.vue'
import { useVideoList } from '../composables/useVideoList.js'
import { useFavorites } from '../composables/useFavorites.js'

const emit = defineEmits(['index-change'])

const { orderedList, loading, fetchVideos } = useVideoList()
const { isFavorite, toggle: toggleFav } = useFavorites()

const feedRef = ref(null)
const currentIndex = ref(0)
const offset = ref(-1)
const animating = ref(false)
const resetting = ref(false)

let touchStartY = 0
let touchDeltaY = 0
let wheelTimer = null

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

onMounted(async () => {
  await fetchVideos()
})

onBeforeUnmount(() => {
  clearTimeout(wheelTimer)
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
  top: env(safe-area-inset-top, 12px);
  right: 16px;
  margin-top: 12px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  z-index: 20;
}
</style>
