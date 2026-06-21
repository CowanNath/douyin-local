<template>
  <div class="video-card" :data-index="index"
    @touchstart="onLongPressStart"
    @touchend="onLongPressEnd"
    @touchcancel="onLongPressEnd"
    @touchmove="onLongPressEnd"
    @contextmenu.prevent="onContextMenu"
  >
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
      // 配合服务端 CORS 头，跨源访问时 canvas 截图才不会被污染导致 toDataURL 失败
      crossorigin: 'anonymous',
      'webkit-playsinline': true,
      'x5-video-player-type': 'h5',
      'x5-video-player-fullscreen': false,
      // 禁用浏览器原生下载按钮和画中画按钮（移动端长按菜单）
      controlsList: 'nodownload noplaybackrate',
      disablePictureInPicture: true,
    },
  })

  art.on('video:loadedmetadata', () => {
    art.video.currentTime = 0.5
  })

  // 生成封面：从视频 0.5s 处截一帧。seeked 为主路径，canplay 为兜底
  // （移动端 preload:metadata 下 seeked 可能因关键帧未下载而不触发或 videoWidth 为 0）
  function capturePoster() {
    if (art.poster) return
    try {
      const canvas = document.createElement('canvas')
      const vw = art.video.videoWidth
      const vh = art.video.videoHeight
      if (!vw || !vh) return
      // 分辨率上限 640×360（比原 320×180 清晰一倍），竖屏视频按比例适配
      const scale = Math.min(640 / vw, 360 / vh, 1)
      canvas.width = vw * scale
      canvas.height = vh * scale
      canvas.getContext('2d').drawImage(art.video, 0, 0, canvas.width, canvas.height)
      art.poster = canvas.toDataURL('image/jpeg', 0.8)
    } catch (e) {
      console.warn('[poster] 生成失败:', e?.message || e)
    }
  }

  art.on('video:seeked', capturePoster)
  art.on('video:canplay', capturePoster)

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

defineExpose({
  // 用 getter 而非直接暴露变量：art 会被重新赋值，
  // 直接暴露捕获的是初始 null，父组件永远读不到新实例。
  get art() {
    return art
  },
})

let longPressTimer = null
let normalPlaybackRate = 1
let longPressActive = false

function onLongPressStart(e) {
  if (!art || art.isDestroy) return
  // 阻止移动端长按弹出的下载/保存菜单
  if (e.cancelable) e.preventDefault()
  const startY = e.touches[0]?.clientY
  longPressTimer = setTimeout(() => {
    if (art && !art.isDestroy) {
      normalPlaybackRate = art.playbackRate || 1
      art.playbackRate = 2
      longPressActive = true
    }
  }, 300)
}

function onLongPressEnd() {
  clearTimeout(longPressTimer)
  if (longPressActive && art && !art.isDestroy) {
    art.playbackRate = normalPlaybackRate
  }
  longPressActive = false
}

// 拦截右键/长按上下文菜单（部分安卓浏览器下载入口）
function onContextMenu() {}

function onDel() {
  showConfirm.value = true
}

async function confirmDel() {
  showConfirm.value = false
  if (art && !art.isDestroy) {
    art.pause()
    art.destroy(false)
    art = null
  }
  emit('delete', { name: props.video.name, subDir: props.video.subDir || '' })
}
</script>

<style scoped>
.video-card {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  /* 禁用移动端长按弹出的保存/下载菜单 */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.video-card :deep(video) {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
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

/* Artplayer 默认 .art-poster 用 background-size:cover 会裁切封面，
   改为 contain 与 video 的 object-fit 一致，完整显示 */
.art-container :deep(.art-poster) {
  background-size: contain;
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
