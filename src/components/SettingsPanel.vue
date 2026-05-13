<template>
  <Teleport to="body">
    <div class="settings-overlay" :class="{ open: open }" @click.self="$emit('close')">
      <div class="settings-panel">
        <div class="panel-header">
          <h2>设置</h2>
          <button class="close-btn" @click="$emit('close')">&times;</button>
        </div>

        <div class="panel-body">
          <section class="setting-group">
            <h3>播放模式</h3>
            <div class="radio-group">
              <label class="radio-item" :class="{ active: settings.playMode === 'sequential' }">
                <input type="radio" value="sequential" v-model="settings.playMode" />
                <span class="radio-label">顺序播放</span>
              </label>
              <label class="radio-item" :class="{ active: settings.playMode === 'random' }">
                <input type="radio" value="random" v-model="settings.playMode" />
                <span class="radio-label">随机播放</span>
              </label>
              <label class="radio-item" :class="{ active: settings.playMode === 'favorites' }">
                <input type="radio" value="favorites" v-model="settings.playMode" />
                <span class="radio-label">收藏播放</span>
              </label>
            </div>
          </section>

          <section class="setting-group">
            <h3>视频目录</h3>
            <div class="dir-row">
              <input
                type="text"
                v-model="dirInput"
                placeholder="输入服务器上的视频目录路径"
                class="dir-input"
                @keydown.enter="applyDir"
              />
              <button class="dir-btn" @click="applyDir" :disabled="dirLoading">
                {{ dirLoading ? '...' : '应用' }}
              </button>
            </div>
            <p class="dir-hint" v-if="dirError">{{ dirError }}</p>
          </section>

          <section class="setting-group">
            <h3>收藏管理</h3>
            <div class="fav-actions">
              <button class="action-btn" @click="handleExport">导出收藏</button>
              <label class="action-btn import-btn">
                导入收藏
                <input type="file" accept=".json" hidden @change="handleImport" ref="importRef" />
              </label>
            </div>
            <p class="dir-hint">{{ favorites.length }} 个收藏</p>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings.js'
import { useVideoList } from '../composables/useVideoList.js'
import { useFavorites } from '../composables/useFavorites.js'

defineProps({ open: Boolean })
defineEmits(['close'])

const { settings } = useSettings()
const { setVideoDir } = useVideoList()
const { favorites, exportJSON, importJSON } = useFavorites()

const dirInput = ref(settings.value.videoDir)
const dirLoading = ref(false)
const dirError = ref(null)
const importRef = ref(null)

async function applyDir() {
  dirError.value = null
  dirLoading.value = true
  try {
    const resolved = await setVideoDir(dirInput.value)
    settings.value.videoDir = resolved
    dirError.value = null
  } catch (e) {
    dirError.value = e.message
  } finally {
    dirLoading.value = false
  }
}

function handleExport() {
  exportJSON()
}

async function handleImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    await importJSON(file)
  } catch (err) {
    alert(err.message)
  }
  if (importRef.value) importRef.value.value = ''
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}
.settings-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.settings-panel {
  width: min(360px, 85vw);
  height: 100%;
  background: #1a1a1a;
  color: #eee;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.settings-overlay.open .settings-panel {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.close-btn:hover {
  color: #fff;
}

.panel-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.setting-group h3 {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 12px;
  font-weight: 500;
}

.radio-group {
  display: flex;
  gap: 10px;
}
.radio-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.radio-item input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.radio-item.active {
  border-color: #fe2c55;
  background: rgba(254, 44, 85, 0.12);
}
.radio-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.dir-row {
  display: flex;
  gap: 8px;
}
.dir-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 12px;
  color: #eee;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.dir-input:focus {
  border-color: #fe2c55;
}
.dir-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.dir-btn {
  padding: 10px 18px;
  background: #fe2c55;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.dir-btn:disabled {
  opacity: 0.5;
}
.dir-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin: 6px 0 0;
}
.dir-hint[style*="color"] {
  color: #ff6b6b;
}

.fav-actions {
  display: flex;
  gap: 10px;
}
.action-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #eee;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}
.import-btn {
  position: relative;
  overflow: hidden;
}
</style>
