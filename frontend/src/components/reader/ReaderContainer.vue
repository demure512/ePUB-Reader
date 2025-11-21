<template>
  <div class="reader-container">
    <div v-if="loading" class="loading-indicator">
      <p>正在加载书籍...</p>
    </div>
    <div v-else-if="error" class="error-indicator">
      <p>{{ error }}</p>
      <button @click="loadBookData">重试</button>
    </div>
    <component
      v-else-if="book"
      :is="viewerComponent"
      ref="viewerRef"
      :book-data="bookData"
      :book-id="book.id"
      :font-size="fontSize"
      :initial-location="book.lastLocation"
      @update:location="onLocationUpdate"
      @update:toc="$emit('update:toc', $event)"
      @initialization-error="handleInitializationError"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef, defineEmits, defineProps, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';
import EpubViewer from './EpubViewer.vue';
import TxtViewer from './TxtViewer.vue';

const props = defineProps({
  fontSize: Number,
});

const route = useRoute();
const bookStore = useBookStore();
const authStore = useAuthStore();
const emit = defineEmits(['update:toc', 'update:location', 'update:book', 'error', 'book-loaded']);

const book = ref(null);
const bookData = ref(null);
const loading = ref(true);
const error = ref(null);
const viewerRef = ref(null);

const currentLocation = ref(0);
const totalLocations = ref(0);

const viewerComponent = shallowRef(null);

const viewerMap = {
  EPUB: EpubViewer,
  TXT: TxtViewer,
};

const loadBookData = async () => {
  loading.value = true;
  error.value = null;
  try {
    console.log('开始加载书籍数据，ID:', route.params.id);
    const metaResult = await bookStore.getBook(route.params.id);
    if (!metaResult.success) {
      console.error('获取书籍信息失败:', metaResult.message);
      throw new Error(metaResult.message || '获取书籍信息失败');
    }
    
    book.value = metaResult.data;
    console.log('书籍信息获取成功:', book.value);
    emit('update:book', book.value);

    // 等待DOM更新，确保book.value在后续操作中可用
    await nextTick();

    if (book.value && book.value.id) {
      console.log('开始获取书籍文件...');
      
      if (authStore.isGuest) {
        // 游客模式：从本地存储获取书籍内容
        console.log('游客模式：从本地存储获取书籍内容');
        const content = await bookStore.getBookContent(book.value.id);
        if (!content) {
          throw new Error('无法从本地存储获取书籍内容');
        }
        bookData.value = content;
        console.log('本地书籍内容获取成功，大小:', bookData.value.byteLength);
      } else {
        // 登录模式：从服务器下载书籍
        console.log('登录模式：从服务器下载书籍');
        const response = await axios.get(`/api/books/download/${book.value.id}`, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/octet-stream'
          },
        });
        
        console.log('下载响应状态:', response.status);
        bookData.value = response.data;
        console.log('书籍文件下载成功，大小:', bookData.value.byteLength);
      }

      viewerComponent.value = viewerMap[book.value.fileType] || null;
      console.log('选择的查看器组件:', book.value.fileType);
    } else {
      console.error('无效的书籍数据:', book.value);
      throw new Error('无法获取有效的书籍ID');
    }
    
    if (!viewerComponent.value) {
      console.error('不支持的文件格式:', book.value.fileType);
      throw new Error(`不支持的文件格式: ${book.value.fileType}`);
    }
    
    // 通知父组件书籍加载完成
    emit('book-loaded');
  } catch (err) {
    console.error('loadBookData 错误:', err);
    error.value = err.message || '加载书籍失败';
    emit('error', error.value);
  } finally {
    loading.value = false;
  }
};

const handleInitializationError = (errorMessage) => {
  console.error('阅读器初始化失败:', errorMessage);
  error.value = `初始化失败: ${errorMessage}`;
  emit('error', error.value);
  loading.value = false;
};

const onLocationUpdate = (location) => {
  // 直接将完整的 location 对象向上传递
  emit('update:location', location);
};

onMounted(loadBookData);

defineExpose({
  prev: () => {
    if (viewerRef.value) {
      viewerRef.value.prev();
    }
  },
  next: () => {
    if (viewerRef.value) {
      viewerRef.value.next();
    }
  },
  navigateTo: (location) => {
    console.log('📚 [ReaderContainer] 接收到导航请求, location:', location);
    console.log('📚 [ReaderContainer] viewerRef存在:', !!viewerRef.value);
    console.log('📚 [ReaderContainer] viewerRef类型:', viewerRef.value?.constructor?.name);
    
    if (viewerRef.value) {
      console.log('📚 [ReaderContainer] 调用 viewerRef.navigateTo()');
      viewerRef.value.navigateTo(location);
    } else {
      console.error('📚 [ReaderContainer] viewerRef不存在，无法导航');
    }
  },
  getCurrentLocationCfi: () => {
    if (viewerRef.value && typeof viewerRef.value.getCurrentLocationCfi === 'function') {
      return viewerRef.value.getCurrentLocationCfi();
    }
    return null;
  },
  loadBookData: () => {
    loadBookData();
  }
});
</script>

<style scoped>
.reader-container {
  flex-grow: 1;
  position: relative;
  overflow: hidden; /* Let the viewer handle its own scrolling */
}
.loading-indicator, .error-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>