<template>
  <div class="reader-controls">
    <button class="control-btn prev" @click="$emit('prev')">‹</button>
    <button class="control-btn next" @click="$emit('next')">›</button>
  </div>
</template>

<script setup>
defineEmits(['prev', 'next']);
</script>

<style scoped>
.reader-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none; /* Allow clicks to pass through the container */
}

.control-btn {
  pointer-events: all; /* Make buttons clickable */
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 36px;
  line-height: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 20px;
  user-select: none;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.8);
}
</style>