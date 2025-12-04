<template>
  <div class="reader-layout" @wheel="handleWheel" @keydown.prevent="handleKeydown" tabindex="0">
    <!-- 显示全局错误 -->
    <div v-if="globalError" class="error-boundary">
      <div class="error-content">
        <h2>阅读器出现错误</h2>
        <p>{{ globalError }}</p>
        <button @click="retryLoad" class="retry-btn">重试</button>
        <button @click="goBack" class="back-btn">返回书库</button>
      </div>
    </div>
    
    <!-- 正常的阅读器界面 -->
    <template v-else>
      <Sidebar
        :toc="tableOfContents"
        :current-chapter-href="currentChapterHref"
        :current-chapter-index="currentChapterIndex"
        @navigate="navigateTo"
        @toggle="onSidebarToggle"
      />
      <div class="main-content" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
        <ReaderHeader
          v-if="book"
          :book="book"
          :current-location="currentLocation"
          :total-locations="totalLocations"
          :chapter-label="chapterLabel"
          @change-font-size="changeFontSize"
        />
        <ReaderContainer
          ref="readerContainerRef"
          :font-size="fontSize"
          :line-height="lineHeight"
          :page-width="pageWidth"
          :font-family="fontFamily"
          :reading-mode="readingMode"
          @update:toc="onTocUpdate"
          @update:location="onLocationUpdate"
          @update:book="book = $event"
          @error="handleGlobalError"
          @book-loaded="onBookLoaded"
        />
        <ReaderControls
          v-if="book && book.fileType === 'EPUB'"
          @prev="readerContainerRef?.prev()"
          @next="readerContainerRef?.next()"
        />
        <ReaderSettings />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onErrorCaptured, onMounted, computed } from 'vue';
import { useBookStore } from '@/stores/book';
import { useSettingsStore } from '@/stores/settings';
import { useRouter } from 'vue-router';
import Sidebar from './Sidebar.vue';
import ReaderContainer from './ReaderContainer.vue';
import ReaderHeader from './ReaderHeader.vue';
import ReaderControls from './ReaderControls.vue';
import ReaderSettings from './ReaderSettings.vue';

const tableOfContents = ref([]);
const readerContainerRef = ref(null);
const bookStore = useBookStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const book = ref(null);
const currentLocation = ref(0);
const totalLocations = ref(0);
const chapterLabel = ref('');
const currentChapterHref = ref('');
const currentChapterIndex = ref(0);
const globalError = ref(null);
const isInitializing = ref(true); // 添加初始化标志
const isSidebarCollapsed = ref(false); // 侧边栏收起状态

// 进度保存相关
let progressSaveTimer = null;
let lastSavedProgress = { percentage: 0, location: null };

// 使用settingsStore中的阅读设置
const fontSize = computed(() => settingsStore.fontSize);
const lineHeight = computed(() => settingsStore.lineHeight);
const pageWidth = computed(() => settingsStore.pageWidth);
const fontFamily = computed(() => settingsStore.fontFamily);
const readingMode = computed(() => settingsStore.readingMode);

// 全局错误处理
const handleGlobalError = (error) => {
  console.error('ReaderLayout: 捕获到全局错误:', error);
  globalError.value = error;
};

// 重试加载
const retryLoad = () => {
  globalError.value = null;
  // 重新加载ReaderContainer
  if (readerContainerRef.value) {
    readerContainerRef.value.loadBookData();
  }
};

// 返回书库
const goBack = () => {
  console.log('ReaderLayout: 错误处理 - 返回书库');
  router.push('/library');
};

// 监听书籍加载完成
const onBookLoaded = () => {
  console.log('ReaderLayout: 书籍加载完成');
  isInitializing.value = false;
};

// 捕获子组件错误
onErrorCaptured((err, instance, info) => {
  console.error('捕获到子组件错误:', err, info);
  globalError.value = `组件错误: ${err.message}`;
  return false; // 防止错误传播
});

onMounted(async () => {
  console.log('ReaderLayout: 组件挂载');
  
  // 确保设置已初始化
  if (!settingsStore.isInitialized) {
    await settingsStore.initializeSettings();
  }
  
  // 给初始化一些时间
  setTimeout(() => {
    if (isInitializing.value) {
      console.log('ReaderLayout: 初始化超时，设置为完成');
      isInitializing.value = false;
    }
  }, 10000); // 10秒超时
});

const onTocUpdate = (toc) => {
  tableOfContents.value = toc;
};


const findBestTocItem = (toc, currentHref) => {
  let bestMatch = null;

  const search = (items) => {
    for (const item of items) {
      if (currentHref.startsWith(item.href)) {
        if (!bestMatch || item.href.length > bestMatch.href.length) {
          bestMatch = item;
        }
      }
      if (item.children && item.children.length > 0) {
        search(item.children);
      }
    }
  };

  search(toc);
  return bestMatch;
};

const onLocationUpdate = (location) => {
  currentLocation.value = location.current || 0;
  totalLocations.value = location.total || 0;
  
  const currentHref = decodeURIComponent(location.currentChapterHref || '');
  const bestMatch = findBestTocItem(tableOfContents.value, currentHref);
  
  if (bestMatch) {
    chapterLabel.value = bestMatch.label;
    currentChapterHref.value = bestMatch.href;
  } else {
    chapterLabel.value = location.chapterLabel || '';
    currentChapterHref.value = location.currentChapterHref || '';
  }

  currentChapterIndex.value = location.currentChapterIndex;
  
  // 自动保存进度（防抖）
  scheduleProgressSave();
};

// 定时保存进度
const scheduleProgressSave = () => {
  if (!book.value || !totalLocations.value || totalLocations.value === 0) return;
  
  const percentage = (currentLocation.value / totalLocations.value) * 100;
  const lastLocation = readerContainerRef.value?.getCurrentLocationCfi();
  
  // 检查进度是否有显著变化（避免频繁保存）
  const progressChanged = Math.abs(percentage - lastSavedProgress.percentage) > 1 ||
                         lastLocation !== lastSavedProgress.location;
  
  if (!progressChanged) return;
  
  // 清除之前的定时器
  if (progressSaveTimer) {
    clearTimeout(progressSaveTimer);
  }
  
  // 设置新的定时器（3秒后保存）
  progressSaveTimer = setTimeout(async () => {
    if (percentage > 0 || lastLocation) {
      console.log(`自动保存进度: ${percentage.toFixed(1)}%`);
      const result = await bookStore.saveProgress(
        book.value.id, 
        percentage, 
        lastLocation,
        chapterLabel.value, // 当前章节
        null, // scrollPosition (EPUB不使用滚动位置)
        currentLocation.value, // currentPage (当前位置)
        totalLocations.value // totalPages (总位置数)
      );
      if (result.success) {
        lastSavedProgress = { percentage, location: lastLocation };
      }
    }
  }, 3000);
};

onBeforeUnmount(() => {
  // 清除定时器
  if (progressSaveTimer) {
    clearTimeout(progressSaveTimer);
  }
  
  // 最后一次保存进度
  if (!book.value || !totalLocations.value || totalLocations.value === 0) return;

  const percentage = (currentLocation.value / totalLocations.value) * 100;
  const lastLocation = readerContainerRef.value?.getCurrentLocationCfi();

  // 只有在进度有变化时才保存
  const progressChanged = Math.abs(percentage - lastSavedProgress.percentage) > 0.1 ||
                         lastLocation !== lastSavedProgress.location;

  if (progressChanged && (percentage > 0 || lastLocation)) {
    console.log(`组件卸载时保存进度: ${percentage.toFixed(1)}%`);
    bookStore.saveProgress(
      book.value.id, 
      percentage, 
      lastLocation,
      chapterLabel.value,
      null,
      currentLocation.value,
      totalLocations.value
    );
  }
});

const navigateTo = (location) => {
  readerContainerRef.value?.navigateTo(location);
};

const changeFontSize = async (delta) => {
  const newSize = settingsStore.fontSize + delta;
  if (newSize >= 12 && newSize <= 32) { // Set min/max font size
    await settingsStore.updateSetting('fontSize', newSize);
  }
};

const onSidebarToggle = (collapsed) => {
  isSidebarCollapsed.value = collapsed;
};

let wheelTimeout = null;
const handleWheel = (event) => {
  // 如果鼠标在侧边栏上，则不执行任何操作，允许默认的滚动行为
  if (event.target.closest('.sidebar')) {
    return;
  }

  // 阻止默认行为（例如页面滚动），因为我们要用它来翻页
  event.preventDefault();

  // 如果没有有效的书籍信息，则不执行任何操作
  if (!book.value) return;

  // TXT 文件翻页逻辑
  if (book.value?.fileType === 'TXT') {
    if (wheelTimeout) return;
    if (event.deltaY > 0) {
      readerContainerRef.value?.next();
    } else if (event.deltaY < 0) {
      readerContainerRef.value?.prev();
    }
    wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 100);
  }
};

const handleKeydown = (event) => {
  console.log('ReaderLayout: 键盘事件:', event.key, event.code);
  
  if (event.key === 'ArrowRight') {
    readerContainerRef.value?.next();
  } else if (event.key === 'ArrowLeft') {
    readerContainerRef.value?.prev();
  } else if (event.key === 'Escape') {
    console.log('ReaderLayout: 用户按ESC键');
    // 不自动返回，让用户自己决定
  }
};
</script>

<style scoped>
.reader-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
.main-content {
  flex-grow: 1;
  margin-left: 300px; /* Sidebar width */
  display: flex;
  flex-direction: column;
  height: 100vh; /* Full viewport height */
  position: relative; /* For positioning controls */
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-collapsed {
  margin-left: 40px; /* Collapsed sidebar width */
}

.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.error-content h2 {
  color: #e74c3c;
  margin-bottom: 16px;
}

.error-content p {
  color: #666;
  margin-bottom: 24px;
}

.retry-btn, .back-btn {
  padding: 10px 20px;
  margin: 0 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn {
  background: #3498db;
  color: white;
}

.back-btn {
  background: #95a5a6;
  color: white;
}

.retry-btn:hover, .back-btn:hover {
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    margin-left: 280px; /* 移动端侧边栏宽度 */
  }
  
  .main-content.sidebar-collapsed {
    margin-left: 35px; /* 移动端收起后的宽度 */
  }
}
</style>