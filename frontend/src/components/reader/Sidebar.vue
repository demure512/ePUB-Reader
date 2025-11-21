<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }" ref="sidebarRef">
    <!-- 收起/展开按钮 -->
    <button class="toggle-btn" @click="toggleSidebar" :title="isCollapsed ? '展开目录' : '收起目录'">
      <span class="toggle-icon" :class="{ 'collapsed': isCollapsed }">‹</span>
    </button>
    
    <div class="sidebar-content" v-show="!isCollapsed">
      <div class="sidebar-header">
        <h3>目录</h3>
      </div>
      <ul class="toc-list">
        <!-- 章节内容 -->
        <TocItem
          v-for="item in toc"
          :key="item.href || item.index"
          :item="item"
          :current-chapter-href="currentChapterHref"
          :current-chapter-index="currentChapterIndex"
          @navigate="navigate"
        />
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import TocItem from './TocItem.vue';

const props = defineProps({
  toc: Array,
  currentChapterHref: String,
  currentChapterIndex: Number,
});

const emit = defineEmits(['navigate', 'toggle']);
const sidebarRef = ref(null);
const isCollapsed = ref(false);

const navigate = (href) => {
  emit('navigate', href);
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('toggle', isCollapsed.value);
};

watch(() => props.currentChapterHref, async () => {
  // 只有在侧边栏展开时才滚动到当前章节
  if (!isCollapsed.value) {
    await nextTick();
    const activeElement = sidebarRef.value?.querySelector('.active');
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }
});
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px;
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 40px;
}

.toggle-btn {
  position: absolute;
  top: 50%;
  right: -15px;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  transition: all 0.2s ease;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

.toggle-btn:hover {
  background: #f5f5f5;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  font-size: 18px;
  font-weight: bold;
  color: #666;
  transition: transform 0.3s ease;
  user-select: none;
}

.toggle-icon.collapsed {
  transform: rotate(180deg);
}

.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.sidebar.collapsed .sidebar-content {
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  margin-bottom: 20px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
  }
  
  .sidebar.collapsed {
    width: 35px;
  }
  
  .toggle-btn {
    width: 25px;
    height: 50px;
    right: -12px;
  }
  
  .toggle-icon {
    font-size: 16px;
  }
}
</style>