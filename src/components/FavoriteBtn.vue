<template>
  <button class="fav-btn" :class="{ active: active }" @click.stop="handleClick">
    <svg viewBox="0 0 24 24" width="36" height="36">
      <path
        :fill="active ? '#fe2c55' : 'rgba(255,255,255,0.7)'"
        :stroke="active ? 'none' : 'rgba(255,255,255,0.9)'"
        stroke-width="1.5"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  </button>
</template>

<script setup>
defineProps({ active: Boolean })
const emit = defineEmits(['toggle'])

function handleClick() {
  emit('toggle')
}
</script>

<style scoped>
.fav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s;
}
.fav-btn:active {
  transform: scale(1.2);
}
</style>
