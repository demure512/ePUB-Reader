<template>
  <header class="reader-header">
    <button @click="goBack" class="btn-nav">← 返回书库</button>
    <div class="book-info">
      <h1 class="book-title">{{ book?.title || '加载中...' }}</h1>
      <p class="location-info">
        <span v-if="chapterLabel">{{ chapterLabel }}&nbsp;&nbsp;</span>
        <!-- EPUB页码显示：只在正文内容时显示 -->
        <span v-if="book.fileType === 'EPUB' && isMainContent && totalLocations === 0">正在计算页码...</span>
        <span v-else-if="book.fileType === 'EPUB' && isMainContent && totalLocations > 0">{{ currentLocation }} / {{ totalLocations }}</span>
        <!-- TXT进度显示：始终显示（TXT没有封面等概念） -->
        <span v-else-if="book.fileType === 'TXT' && totalLocations > 0">
          进度: {{ ((currentLocation / totalLocations) * 100).toFixed(1) }}%
        </span>
      </p>
    </div>
    <div class="actions">
      <div class="font-size-controls">
        <button @click="changeFontSize(-1)" class="btn-action">A-</button>
        <button @click="changeFontSize(1)" class="btn-action">A+</button>
      </div>
      <button @click="downloadBook" class="btn-action">下载</button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const props = defineProps({
  book: Object,
  currentLocation: Number,
  totalLocations: Number,
  chapterLabel: String,
});

const emit = defineEmits(['change-font-size']);
const router = useRouter();

// 判断当前是否是正文内容（排除封面、版权信息、前言等）
const isMainContent = computed(() => {
  if (!props.chapterLabel) return false;
  
  const label = props.chapterLabel.toLowerCase();
  const excludeKeywords = /封面|cover|版权|copyright|前言|preface|序言|introduction|致谢|acknowledgment|about|info|publisher|出版|作者|author|title|目录|contents|toc/i;
  
  return !excludeKeywords.test(label);
});

const changeFontSize = (delta) => {
  emit('change-font-size', delta);
};

const goBack = () => {
  // 如果是新书籍（没有阅读进度），询问确认
  if (props.currentLocation === 0 && props.totalLocations > 0) {
    if (confirm('确定要返回书库吗？\n\n提示：您还没有开始阅读这本书。')) {
      router.push('/library');
    }
  } else {
    // 有阅读进度的书籍直接返回
    router.push('/library');
  }
};

const downloadBook = async () => {
  if (!props.book) return;
  
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const { useBookStore } = await import('@/stores/book')
    const authStore = useAuthStore()
    const bookStore = useBookStore()
    
    if (authStore.isGuest) {
      // 游客模式：从本地存储获取文件内容
      const content = await bookStore.getBookContent(props.book.id)
      if (!content) {
        throw new Error('无法获取书籍内容')
      }
      
      // 创建下载链接
      let blob
      if (content instanceof ArrayBuffer) {
        blob = new Blob([content])
      } else if (typeof content === 'string') {
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      } else {
        blob = new Blob([JSON.stringify(content)])
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = props.book.fileName || `${props.book.title}.${props.book.fileType.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } else {
      // 登录模式：从服务器下载
      const response = await fetch(`/api/books/download/${props.book.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('下载失败')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = props.book.fileName || 'book'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  } catch (err) {
    console.error('下载失败:', err)
    alert('下载失败: ' + err.message)
  }
}
</script>

<style scoped>
.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.book-info {
  text-align: center;
  flex-grow: 1;
}
.book-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.book-author {
  font-size: 12px;
  color: #666;
  margin: 0;
}
.location-info {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
}
.btn-nav, .btn-action {
  background: none;
  border: 1px solid #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s ease;
}

.btn-nav:hover {
  background: #f5f5f5;
  border-color: #999;
}

.btn-action:hover {
  background: #f5f5f5;
  border-color: #999;
}
.actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.font-size-controls {
  display: flex;
}

.font-size-controls .btn-action:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.font-size-controls .btn-action:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style>