<template>
  <li :class="{ 'has-children': hasChildren, 'active': isActive }">
    <div class="toc-item-content" @click="handleItemClick">
      <span class="toc-label" @click="handleItemClick">{{ item.label }}</span>
      <span v-if="hasChildren" class="toggle-icon" :class="{ 'is-open': isOpen }" @click.stop="toggleChildren">›</span>
    </div>
    <ul v-if="hasChildren && isOpen" class="toc-list-nested">
      <TocItem
        v-for="child in item.children"
        :key="child.href || child.index"
        :item="child"
        :current-chapter-href="currentChapterHref"
        :current-chapter-index="currentChapterIndex"
        @navigate="emitNavigate"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';
import TocItem from './TocItem.vue';

const props = defineProps({
  item: Object,
  currentChapterHref: String,
  currentChapterIndex: Number,
});

const emit = defineEmits(['navigate']);

const isOpen = ref(true); // Default to open

const hasChildren = computed(() => props.item.children && props.item.children.length > 0);

const isActive = computed(() => {
  // Match by href for EPUB. Now using strict equality.
  if (typeof props.item.href === 'string') {
    return props.item.href === props.currentChapterHref;
  }
  // Match by index for other types like TXT.
  if (typeof props.item.index === 'number') {
    return props.item.index === props.currentChapterIndex;
  }
  return false;
});

const handleItemClick = (event) => {
  // 点击标题文本时，总是导航到该章节
  if (props.item.href) {
    emit('navigate', props.item.href);
  }
  
  // 如果有子项，同时也展开
  if (hasChildren.value) {
    isOpen.value = true;
  }
};

const toggleChildren = () => {
  if (hasChildren.value) {
    isOpen.value = !isOpen.value;
  }
};

const emitNavigate = (href) => {
  emit('navigate', href); // Bubble up event
};
</script>

<style scoped>
.toc-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
}
.toc-label {
  flex-grow: 1;
}
.toc-label:hover {
  text-decoration: underline;
}
.toggle-icon {
  padding: 0 10px;
  font-weight: bold;
  transition: transform 0.2s ease-in-out;
  font-size: 1.2em;
  color: #aaa;
}
.toggle-icon.is-open {
  transform: rotate(90deg);
}
.toc-list-nested {
  list-style: none;
  padding-left: 20px;
}
li.active > .toc-item-content .toc-label {
  color: var(--primary-color);
  font-weight: bold;
}
</style>