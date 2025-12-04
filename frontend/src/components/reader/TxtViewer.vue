<template>
  <div class="txt-viewer" ref="viewerRef" :style="containerStyle">
    <pre :style="contentStyle">{{ currentPageContent }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps({
  bookData: ArrayBuffer,
  fontSize: Number,
  lineHeight: Number,
  pageWidth: Number,
  fontFamily: String,
  readingMode: String,
  initialLocation: String,
});

const settingsStore = useSettingsStore();

const emit = defineEmits(['update:location', 'update:toc', 'initialization-error']);

// --- DOM Refs ---
const viewerRef = ref(null);

// --- Core Data ---
const textContent = ref('');
const toc = ref([]);
const pages = ref([]); // Pages for the current chapter

// --- State ---
const currentChapterIndex = ref(0);
const currentPageInChapter = ref(1);
const isPaginating = ref(false);

// --- Computed ---
const currentChapter = computed(() => toc.value[currentChapterIndex.value]);
const currentPageContent = computed(() => pages.value[currentPageInChapter.value - 1] || '');

// 计算样式
const fontSize = computed(() => props.fontSize || settingsStore.fontSize);
const lineHeight = computed(() => props.lineHeight || settingsStore.lineHeight);
const fontFamily = computed(() => props.fontFamily || settingsStore.fontFamily);
const backgroundColor = computed(() => settingsStore.backgroundColor);
const textColor = computed(() => settingsStore.textColor);
const pageWidth = computed(() => props.pageWidth || settingsStore.pageWidth);

const containerStyle = computed(() => ({
  backgroundColor: backgroundColor.value,
  maxWidth: `${pageWidth.value}px`,
  margin: '0 auto',
}));

const contentStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  lineHeight: lineHeight.value,
  fontFamily: fontFamily.value,
  color: textColor.value,
}));

// --- 全书进度计算 ---
const totalChars = computed(() => textContent.value.length);
const readChars = computed(() => {
  if (!currentChapter.value || !pages.value.length) return 0;
  
  const chapterStartChar = parseInt(currentChapter.value.href, 10);
  
  // 计算当前章节之前页面的字符数
  const charsInPrevPages = pages.value
    .slice(0, currentPageInChapter.value - 1)
    .reduce((sum, page) => sum + page.length, 0);
    
  return chapterStartChar + charsInPrevPages;
});

// --- Initialization & Parsing ---
const initializeReader = async () => {
  if (!props.bookData) return;
  
  console.log('TxtViewer: 开始初始化阅读器');
  
  try {
    const decoder = new TextDecoder('utf-8');
    textContent.value = decoder.decode(props.bookData);
    console.log('TxtViewer: 文本解码成功，长度:', textContent.value.length);
    
    parseToc();
    console.log('TxtViewer: 目录解析完成，章节数:', toc.value.length);
    
    await nextTick();
    if (props.initialLocation && props.initialLocation !== 'null' && props.initialLocation.trim() !== '') {
      console.log('TxtViewer: 使用初始位置:', props.initialLocation);
      const location = parseInt(props.initialLocation, 10);
      // Find the chapter that this location belongs to
      let chapterIndexToLoad = toc.value.findIndex((chap, index) => {
        const chapStart = parseInt(chap.href, 10);
        const nextChapStart = (index + 1 < toc.value.length) ? parseInt(toc.value[index + 1].href, 10) : textContent.value.length;
        return location >= chapStart && location < nextChapStart;
      });

      if (chapterIndexToLoad === -1) {
        chapterIndexToLoad = 0; // Default to first chapter if not found
      }
      console.log('TxtViewer: 切换到章节:', chapterIndexToLoad);
      await changeChapter(chapterIndexToLoad);

    } else if (toc.value.length > 0) {
      console.log('TxtViewer: 切换到第一章');
      await changeChapter(0);
    } else {
      console.log('TxtViewer: 直接分页整个文本');
      await paginateContent(textContent.value);
    }
    
    console.log('TxtViewer: 初始化完成');
  } catch (error) {
    console.error('TxtViewer: 初始化失败:', error);
    emit('initialization-error', error.message || 'TXT初始化失败');
  }
};

const parseToc = () => {
  // Regex to find potential chapter titles (Chinese, English, Markdown style)
  const chapterRegex = /^\s*(?:(第[一二三四五六七八九十百千万零\d]+章(?:[^\n]{0,50}))|(Chapter\s+\d+.*)|(#+\s+.*))\s*$/gm;
  const newToc = [];
  let match;
  while ((match = chapterRegex.exec(textContent.value)) !== null) {
    // Find the first non-null capture group to use as the label
    const label = (match[1] || match[2] || match[3] || '').trim();
    if (label) {
      newToc.push({
        label: label.replace(/#/g, '').trim(),
        href: match.index.toString(), // Use string href for consistency with EPUB
        index: newToc.length,
      });
    }
  }

  // If no chapters found, create a single "start" chapter
  if (newToc.length === 0) {
    newToc.push({ label: '正文', href: '0', index: 0 });
  }

  toc.value = newToc;
  emit('update:toc', toc.value);
};

// --- Pagination ---
const paginateContent = async (content) => {
  if (!viewerRef.value || !content || isPaginating.value) {
    console.log('TxtViewer: 分页跳过，条件不满足');
    return;
  }
  
  console.log('TxtViewer: 开始分页，内容长度:', content.length);
  isPaginating.value = true;
  
  try {
    await nextTick();

    // 防御性检查：确保DOM元素还存在
    if (!viewerRef.value) {
      console.log('TxtViewer: viewerRef.value不存在，停止分页');
      return;
    }

    const viewerStyle = window.getComputedStyle(viewerRef.value);
    const viewerWidth = viewerRef.value.clientWidth - parseFloat(viewerStyle.paddingLeft) - parseFloat(viewerStyle.paddingRight);
    const viewerHeight = viewerRef.value.clientHeight - parseFloat(viewerStyle.paddingTop) - parseFloat(viewerStyle.paddingBottom);

    console.log('TxtViewer: 容器尺寸:', viewerWidth, 'x', viewerHeight);

    // 防御性检查：确保尺寸有效
    if (viewerWidth <= 0 || viewerHeight <= 0) {
      console.log('TxtViewer: 容器尺寸无效，停止分页');
      return;
    }

    const tempPre = document.createElement('pre');
    Object.assign(tempPre.style, {
      position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
      fontFamily: 'serif', fontSize: `${props.fontSize}px`, lineHeight: '1.8',
      whiteSpace: 'pre-wrap', wordWrap: 'break-word',
      width: `${viewerWidth}px`,
    });
    
    // 防御性检查：确保可以添加临时元素
    if (!viewerRef.value) {
      console.log('TxtViewer: 无法添加临时元素，停止分页');
      return;
    }
    
    viewerRef.value.appendChild(tempPre);

    const newPages = [];
    let remainingContent = content;
    
    while (remainingContent.length > 0) {
      let low = 0, high = remainingContent.length, bestFit = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        tempPre.textContent = remainingContent.substring(0, mid);
        if (tempPre.offsetHeight <= viewerHeight) {
          bestFit = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      if (bestFit === 0 && remainingContent.length > 0) bestFit = 1;

      newPages.push(remainingContent.substring(0, bestFit));
      remainingContent = remainingContent.substring(bestFit);
    }

    // 防御性检查：清理临时元素
    if (viewerRef.value && viewerRef.value.contains(tempPre)) {
      viewerRef.value.removeChild(tempPre);
    }
    
    pages.value = newPages;
    console.log('TxtViewer: 分页完成，页数:', newPages.length);
    
  } catch (error) {
    console.error('TxtViewer: 分页失败:', error);
    throw error;
  } finally {
    isPaginating.value = false;
  }
};

const changeChapter = async (chapterIndex) => {
  if (chapterIndex < 0 || (toc.value.length > 0 && chapterIndex >= toc.value.length)) return;

  currentChapterIndex.value = chapterIndex;
  const chapterStart = parseInt(toc.value[chapterIndex]?.href || '0', 10);
  const nextChapterStart = (chapterIndex + 1 < toc.value.length) ? parseInt(toc.value[chapterIndex + 1].href, 10) : textContent.value.length;
  const chapterContent = textContent.value.substring(chapterStart, nextChapterStart);

  await paginateContent(chapterContent);
  
  currentPageInChapter.value = 1;
  emitLocation();
};

// --- Navigation ---
const emitLocation = () => {
  if (!currentChapter.value) return; // 安全检查
  emit('update:location', {
    // 使用基于字符的全书进度
    current: readChars.value,
    total: totalChars.value,
    
    // 保留章节信息
    chapterLabel: currentChapter.value?.label || '正文',
    currentChapterHref: currentChapter.value?.href || '0',
    currentChapterIndex: currentChapterIndex.value,
  });
};

const next = async () => {
  if (currentPageInChapter.value < pages.value.length) {
    currentPageInChapter.value++;
    emitLocation();
  } else if (toc.value.length > 0 && currentChapterIndex.value < toc.value.length - 1) {
    await changeChapter(currentChapterIndex.value + 1);
  }
};

const prev = async () => {
  if (currentPageInChapter.value > 1) {
    currentPageInChapter.value--;
    emitLocation();
  } else if (toc.value.length > 0 && currentChapterIndex.value > 0) {
    await changeChapter(currentChapterIndex.value - 1);
    currentPageInChapter.value = pages.value.length || 1;
    emitLocation();
  }
};

const navigateTo = async (location) => {
  // For TXT, location is the chapter's href (start index as a string)
  const chapterIndex = toc.value.findIndex(chap => chap.href === location);
  if (chapterIndex !== -1) {
    await changeChapter(chapterIndex);
  }
};

// --- Lifecycle & Watchers ---
let resizeObserver = null;
const rePaginate = async () => {
  console.log('TxtViewer: 触发重新分页');
  
  // 防止在组件卸载时重新分页
  if (!viewerRef.value) {
    console.log('TxtViewer: 组件已卸载，跳过重新分页');
    return;
  }
  
  try {
    if (toc.value.length > 0) {
      await changeChapter(currentChapterIndex.value);
    } else {
      await paginateContent(textContent.value);
    }
  } catch (error) {
    console.error('TxtViewer: 重新分页失败:', error);
    // 发送错误到父组件
    emit('initialization-error', error.message || '重新分页失败');
  }
}

onMounted(() => {
  console.log('TxtViewer: 组件挂载');
  initializeReader();
  if (viewerRef.value) {
    console.log('TxtViewer: 设置ResizeObserver');
    resizeObserver = new ResizeObserver((entries) => {
      console.log('TxtViewer: ResizeObserver触发');
      rePaginate();
    });
    resizeObserver.observe(viewerRef.value);
  }
});

onBeforeUnmount(() => {
  console.log('TxtViewer: 组件卸载');
  if (resizeObserver) {
    console.log('TxtViewer: 断开ResizeObserver');
    resizeObserver.disconnect();
  }
});

watch(() => props.bookData, initializeReader);

// 监听设置变化，重新分页
watch(() => [fontSize.value, lineHeight.value], () => {
  console.log('TxtViewer: 字体设置变化，重新分页');
  rePaginate();
}, { deep: true });

defineExpose({
  prev,
  next,
  navigateTo,
  getCurrentLocationCfi: () => {
    // For TXT files, we use the start character index of the current chapter as the location marker.
    return currentChapter.value?.href || '0';
  }
});
</script>

<style scoped>
.txt-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 20px;
  box-sizing: border-box;
  background: #fff;
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: serif;
  margin: 0;
  height: 100%;
}
</style>