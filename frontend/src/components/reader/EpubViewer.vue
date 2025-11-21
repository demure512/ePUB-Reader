<template>
  <div class="epub-viewer" ref="viewerRef"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useBookStore } from '@/stores/book';
import ePub from 'epubjs';

// --- Props & Emits ---
const props = defineProps({
  bookData: ArrayBuffer,
  bookId: Number,
  initialLocation: String,
});
const emit = defineEmits(['update:location', 'update:toc', 'update:page-calc-status', 'initialization-error']);

// --- Stores ---
const settingsStore = useSettingsStore();
const bookStore = useBookStore();

// --- Refs & State ---
const viewerRef = ref(null);
let book = null;
let rendition = null;
let isInitialized = false;
let resizeObserver = null;
const isLocationsReady = ref(false);

// --- 同步相关状态 ---
let autoSaveTimer = null;
let currentLocationData = null;
const AUTOSAVE_INTERVAL = 30000; // 30秒自动保存一次

// --- Initialization ---
const initializeReader = async (width, height) => {
  if (!props.bookData || isInitialized) return;
  isInitialized = true;

  try {
    book = ePub(props.bookData);
    rendition = book.renderTo(viewerRef.value, {
      width,
      height,
      manager: 'default',
      allowScriptedContent: true,
    });

    rendition.on('relocated', handleLocationChange);

    // --- 最终修复方案 ---
    // 1. 监听 'rendered' 事件，在每个章节渲染完成后重新绑定滚轮事件
    rendition.on('rendered', () => {
      const iframe = viewerRef.value?.querySelector('iframe');
      if (iframe?.contentWindow) {
        // 移除旧监听器，防止重复绑定
        iframe.contentWindow.removeEventListener('wheel', handleWheel);
        // 重新绑定滚轮事件
        iframe.contentWindow.addEventListener('wheel', handleWheel, { passive: false });
      }
    });

    // 2. 等待首次渲染完成，以确保 rendition 和 themes 对象已初始化
    // 修复：正确处理 null 和空字符串的 initialLocation
    const validInitialLocation = props.initialLocation && props.initialLocation !== 'null' && props.initialLocation.trim() !== '' 
      ? props.initialLocation 
      : undefined;
    await rendition.display(validInitialLocation);

    // 3. 使用云端设置初始化字体大小
    updateFontSize(settingsStore.fontSize);
    
    // 4. 启动自动保存定时器
    startAutoSave();
    
    // 等待图书元数据加载完成
    await book.ready;
    
    // 添加调试信息：显示书籍基本信息
    console.log('📘 [EpubViewer] 书籍初始化完成');
    console.log('📘 [EpubViewer] 书籍标题:', book.package?.metadata?.title);
    console.log('📘 [EpubViewer] 书籍作者:', book.package?.metadata?.creator);
    console.log('📘 [EpubViewer] spine章节总数:', book.spine?.spineItems?.length || 0);
    console.log('📘 [EpubViewer] navigation存在:', !!book.navigation);
    console.log('📘 [EpubViewer] landmarks存在:', !!book.navigation?.landmarks);
    console.log('📘 [EpubViewer] toc存在:', !!book.navigation?.toc);

    // 发送目录
    emitToc();

    // 异步、非阻塞地生成分页信息
    isLocationsReady.value = false; // Reset on new book
    
    // --- Locations Generation with Caching ---
    const CHARS_PER_PAGE = 1024; // Reduced from 2048 to improve accuracy and reduce jump bugs on pages with few characters
    const locationsKey = `${book.key()}:locations-${CHARS_PER_PAGE}`;
    const storedLocations = localStorage.getItem(locationsKey);

    if (storedLocations) {
      book.locations.load(storedLocations);
      isLocationsReady.value = true;
      // Now that locations are loaded, report the current location
      // to trigger a 'relocated' event with the correct data.
      rendition.reportLocation();
    } else {
      book.locations.generate(CHARS_PER_PAGE).then(() => {
        isLocationsReady.value = true;
        localStorage.setItem(locationsKey, book.locations.save());
        // After locations are generated, report the current location again
        // to update the UI with the final page numbers.
        rendition.reportLocation();
      });
    }

  } catch (error) {
    console.error("EPUB Initialization Failed:", error);
    // 发送错误信息到父组件
    emit('initialization-error', error.message || '初始化失败');
  }
};

// --- Event Handlers ---
const handleLocationChange = (location) => {
  // The location object may be incomplete if locations are not ready
  if (!book || !book.locations || !book.navigation || !location || !location.start) {
    return;
  }

  const chapter = findChapter(location.start.index);
  if (!chapter) return;

  const locationData = {
    chapterLabel: chapter.label,
    currentChapterHref: chapter.href,
    current: 0,
    total: 0,
    cfi: location.start.cfi, // 添加CFI信息用于同步
  };

  // 只有在页码计算完成时才发送页码信息
  if (isLocationsReady.value && book.locations.length() > 0) {
    locationData.current = book.locations.locationFromCfi(location.start.cfi);
    locationData.total = book.locations.length();
  }
  // 如果页码未计算完成，total保持为0，这样ReaderHeader会显示"正在计算页码..."

  // 保存当前位置数据用于自动同步
  currentLocationData = {
    percentage: locationData.total > 0 ? (locationData.current / locationData.total) * 100 : 0,
    lastLocation: location.start.cfi,
    currentChapter: chapter.label,
    scrollPosition: 0, // EPUB阅读器暂时不需要滚动位置
    totalPages: locationData.total
  };

  emit('update:location', locationData);
};

let wheelTimeout = null;
const handleWheel = (event) => {
  event.preventDefault();
  if (wheelTimeout) return;

  if (event.deltaY > 0) {
    rendition?.next();
  } else if (event.deltaY < 0) {
    rendition?.prev();
  }

  wheelTimeout = setTimeout(() => {
    wheelTimeout = null;
  }, 100);
};

// --- Helper Functions ---
const findChapter = (currentSectionIndex) => {
  let bestMatch = null;

  const findRecursively = (tocItems) => {
    for (const item of tocItems) {
      const section = book.spine.get(item.href);
      if (section && section.index <= currentSectionIndex) {
        if (!bestMatch || book.spine.get(bestMatch.href).index < section.index) {
          bestMatch = item;
        }
      }
      if (item.subitems && item.subitems.length > 0) {
        findRecursively(item.subitems);
      }
    }
  };

  const toc = book.navigation.toc;
  if (!toc || toc.length === 0) return null;

  findRecursively(toc);
  
  return bestMatch ? { label: bestMatch.label.trim(), href: bestMatch.href } : null;
};

const emitToc = () => {
  if (!book || !book.navigation) return;

  const buildTocTree = (tocItems, parentIndex = '') => {
    return tocItems.map((item, index) => {
      const newIndex = parentIndex ? `${parentIndex}-${index}` : `${index}`;
      const tocNode = {
        label: item.label.trim(),
        href: decodeURIComponent(item.href),
        index: newIndex,
        children: [],
      };
      if (item.subitems && item.subitems.length > 0) {
        tocNode.children = buildTocTree(item.subitems, newIndex);
      }
      return tocNode;
    });
  };

  const tocTree = buildTocTree(book.navigation.toc);
  emit('update:toc', tocTree);
  
};


const updateFontSize = (size) => {
  rendition?.themes.fontSize(`${size}px`);
};

// --- 同步功能 ---
const startAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
  
  autoSaveTimer = setInterval(() => {
    if (currentLocationData && props.bookId) {
      // 游客模式也需要保存进度到本地
      saveProgressToServer();
    }
  }, AUTOSAVE_INTERVAL);
};

const saveProgressToServer = async () => {
  if (!currentLocationData || !props.bookId) return;
  
  try {
    console.log('保存阅读进度:', currentLocationData);
    const result = await bookStore.saveProgress(
      props.bookId,
      currentLocationData.percentage,
      currentLocationData.lastLocation,
      currentLocationData.currentChapter,
      currentLocationData.scrollPosition,
      currentLocationData.totalPages
    );
    
    if (!result.success) {
      console.error('保存进度失败:', result.message);
    }
  } catch (error) {
    console.warn('保存进度失败:', error);
  }
};

const syncProgressFromServer = async () => {
  if (!props.bookId) return;
  
  try {
    const result = await bookStore.syncProgress(props.bookId);
    if (result.success && result.progress) {
      const progress = result.progress;
      
      // 如果有更新的进度，跳转到该位置
      if (progress.lastLocation && rendition) {
        console.log('同步到进度:', progress);
        await rendition.display(progress.lastLocation);
      }
    }
  } catch (error) {
    console.warn('同步进度失败:', error);
  }
};

// --- Lifecycle & Watchers ---
onMounted(() => {
  if (viewerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      if (entries && entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          if (!isInitialized) {
            initializeReader(width, height);
          } else {
            rendition?.resize(width, height);
          }
        }
      }
    });
    resizeObserver.observe(viewerRef.value);
  }
});

onBeforeUnmount(() => {
  const iframe = viewerRef.value?.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.removeEventListener('wheel', handleWheel);
  }
  
  // 清理定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
  
  // 组件卸载前保存一次进度
  if (currentLocationData && props.bookId) {
    saveProgressToServer();
  }
  
  book?.destroy();
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch(() => props.bookData, () => {
  isInitialized = false;
  // The resize observer will trigger re-initialization when the component is ready.
});

// 监听设置变化
watch(() => settingsStore.fontSize, (newSize) => {
  updateFontSize(newSize);
});

// 监听主题变化
watch(() => settingsStore.theme, (newTheme) => {
  if (rendition) {
    // 可以在这里添加主题切换逻辑
    console.log('主题已切换为:', newTheme);
  }
});

// --- Exposed Methods ---
defineExpose({
  prev: () => {
    if (!rendition) return;
    // Add boundary check to prevent jumping issues
    const currentLocation = rendition.location;
    if (currentLocation && currentLocation.start) {
      rendition.prev();
    }
  },
  next: () => {
    if (!rendition) return;
    // Add boundary check to prevent jumping issues on last page
    const currentLocation = rendition.location;
    if (currentLocation && currentLocation.end) {
      // Check if we're not at the very end of the book
      if (!currentLocation.atEnd) {
        rendition.next();
      }
    } else {
      // Fallback to normal next if location info is not available
      rendition.next();
    }
  },
  navigateTo: (href) => {
    console.log('📖 [EpubViewer] navigateTo被调用, href:', href);
    console.log('📖 [EpubViewer] rendition存在:', !!rendition);
    
    if (!rendition) {
      console.error('📖 [EpubViewer] rendition不存在');
      return;
    }
    
    const result = rendition.display(href);
    console.log('📖 [EpubViewer] rendition.display(href)调用结果:', result);
    return result;
  },
  getCurrentLocationCfi: () => rendition?.location?.start?.cfi,
  
  // 手动保存进度
  saveProgress: () => {
    if (currentLocationData && props.bookId) {
      return saveProgressToServer();
    }
  },
  
  // 手动同步进度
  syncProgress: () => {
    return syncProgressFromServer();
  },
});

// 组件初始化时同步进度
onMounted(async () => {
  // 等待设置初始化完成
  if (!settingsStore.isInitialized) {
    await settingsStore.initializeSettings();
  }
  
  // 同步阅读进度
  if (props.bookId) {
    await syncProgressFromServer();
  }
});
</script>

<style scoped>
.epub-viewer {
  width: 100%;
  height: 100%;
}
</style>