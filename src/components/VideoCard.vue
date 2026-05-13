<template>
  <div class="video-card" :data-index="index">
    <div ref="artRef" class="art-container"></div>
    <div class="overlay-right">
      <FavoriteBtn :active="isFav" @toggle="$emit('toggle-fav', video.name)" />
      <button class="del-btn" @click.stop="onDel">
        <svg viewBox="0 0 24 24" width="36" height="36">
          <path
            fill="rgba(255,255,255,0.7)"
            stroke="rgba(255,255,255,0.9)"
            stroke-width="1.5"
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
          />
        </svg>
      </button>
    </div>
    <div class="video-title">{{ video.name }}</div>
    <Teleport to="body">
      <div v-if="showConfirm" class="del-overlay" @click.self="showConfirm = false">
        <div class="del-dialog">
          <p class="del-text">确定要删除这个视频吗？</p>
          <p class="del-filename">{{ video.name }}</p>
          <p class="del-hint">此操作不可恢复，文件将被永久删除</p>
          <div class="del-actions">
            <button class="del-cancel" @click="showConfirm = false">取消</button>
            <button class="del-confirm" @click="confirmDel">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Artplayer from 'artplayer'
import FavoriteBtn from './FavoriteBtn.vue'

Artplayer.DBCLICK_FULLSCREEN = false
Artplayer.MOBILE_CLICK_PLAY = false
Artplayer.MOBILE_DBCLICK_PLAY = true
Artplayer.REMOVE_SRC_WHEN_DESTROY = true

const props = defineProps({
  video: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
  isFav: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-fav', 'ended', 'delete'])

const artRef = ref(null)
const showConfirm = ref(false)
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
    if (!art.poster) {
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
    }
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

function onDel() {
  showConfirm.value = true
}

async function confirmDel() {
  showConfirm.value = false
  emit('delete', props.video.name)
}
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
  bottom: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 10;
}

.video-title {
  position: absolute;
  left: 16px;
  top: max(env(safe-area-inset-top, 0px), 48px);
  right: 100px;
  color: #fff;
  font-size: 14px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 10;
}

.del-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s;
}
.del-btn:active {
  transform: scale(1.2);
}

.del-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.del-dialog {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  width: min(320px, 80vw);
  text-align: center;
}

.del-text {
  color: #eee;
  font-size: 16px;
  margin: 0 0 8px;
}

.del-filename {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  word-break: break-all;
  margin: 0 0 8px;
}

.del-hint {
  color: #fe2c55;
  font-size: 12px;
  margin: 0 0 20px;
}

.del-actions {
  display: flex;
  gap: 12px;
}

.del-cancel {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #eee;
  font-size: 14px;
  cursor: pointer;
}
.del-cancel:active {
  background: rgba(255, 255, 255, 0.18);
}

.del-confirm {
  flex: 1;
  padding: 10px;
  background: #fe2c55;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.del-confirm:active {
  background: #e02048;
}
</style>
