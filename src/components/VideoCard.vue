<template>
  <div class="video-card" :data-index="index">
    <div ref="artRef" class="art-container"></div>
    <div class="overlay-right">
      <FavoriteBtn :active="isFav" @toggle="$emit('toggle-fav', video.name)" />
    </div>
    <div class="video-title">{{ video.name }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Artplayer from 'artplayer'
import FavoriteBtn from './FavoriteBtn.vue'

Artplayer.DBCLICK_FULLSCREEN = false
Artplayer.MOBILE_CLICK_PLAY = true
Artplayer.MOBILE_DBCLICK_PLAY = true
Artplayer.REMOVE_SRC_WHEN_DESTROY = true

const props = defineProps({
  video: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
  isFav: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-fav', 'ended'])

const artRef = ref(null)
let art = null

function createPlayer(url) {
  if (!artRef.value) return

  if (art && !art.isDestroy) {
    art.switchUrl(url)
    return
  }

  art = new Artplayer({
    container: artRef.value,
    url,
    autoplay: false,
    muted: false,
    loop: false,
    playsInline: true,
    mutex: true,
    miniProgressBar: true,
    gesture: true,
    backdrop: false,
    hotkey: false,
    fullscreen: false,
    fullscreenWeb: false,
    pip: false,
    screenshot: false,
    setting: false,
    flip: false,
    playbackRate: false,
    aspectRatio: false,
    autoSize: false,
    lock: false,
    moreVideoAttr: {
      preload: 'metadata',
      'webkit-playsinline': true,
      'x5-video-player-type': 'h5',
      'x5-video-player-fullscreen': false,
    },
  })

  art.on('video:loadedmetadata', () => {
    art.video.currentTime = 0.5
  })

  art.on('video:seeked', () => {
    if (art.poster) return
    try {
      const canvas = document.createElement('canvas')
      const vw = art.video.videoWidth
      const vh = art.video.videoHeight
      if (!vw || !vh) return
      const scale = Math.min(320 / vw, 180 / vh, 1)
      canvas.width = vw * scale
      canvas.height = vh * scale
      canvas.getContext('2d').drawImage(art.video, 0, 0, canvas.width, canvas.height)
      art.poster = canvas.toDataURL('image/jpeg', 0.6)
    } catch {}
  })

  art.on('video:ended', () => {
    emit('ended')
  })
}

onMounted(() => {
  nextTick(() => createPlayer(props.video.url))
})

onBeforeUnmount(() => {
  if (art && !art.isDestroy) {
    art.destroy(false)
    art = null
  }
})

watch(() => props.active, (val) => {
  if (!art || art.isDestroy) return
  if (val) {
    art.play()
  } else {
    art.pause()
  }
})

watch(() => props.video.url, (url) => {
  if (url) createPlayer(url)
})

defineExpose({ art })
</script>

<style scoped>
.video-card {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.art-container {
  width: 100%;
  height: calc(100% - 65px);
}

.art-container :deep(.art-video-player) {
  width: 100%;
  height: 100%;
}

.art-container :deep(.art-video) {
  object-fit: contain;
  width: 100%;
  height: 100%;
}

.overlay-right {
  position: absolute;
  right: 12px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 10;
}

.video-title {
  position: absolute;
  left: 16px;
  bottom: 16px;
  right: 70px;
  color: #fff;
  font-size: 14px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 10;
}
</style>
