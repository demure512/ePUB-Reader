<template>
  <div class="library-page">
    <div class="container">
      <div class="library-header">
        <h1>{{ authStore.isGuest ? '本地书库' : '我的书库' }}</h1>
        <div class="library-actions">
          <select v-model="selectedCategory" @change="filterByCategory" class="category-select">
            <option value="">全部分类</option>
            <option value="uncategorized">未分类</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <router-link to="/upload" class="btn btn-primary">
            {{ authStore.isGuest ? '添加书籍' : '上传书籍' }}
          </router-link>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载中...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
      </div>
      
      <div v-else>
        <div v-if="books.length === 0" class="empty-state">
          <p v-if="authStore.isGuest">
            还没有书籍，去 <router-link to="/upload">添加一本</router-link> 吧
          </p>
          <p v-else>
            还没有书籍，去 <router-link to="/upload">上传一本</router-link> 吧
          </p>
        </div>
        
        <div v-else class="book-grid">
          <div 
            v-for="book in books" 
            :key="book.id"
            class="book-card"
            @click="openBook(book.id)"
          >
            <div class="book-cover">
              <img v-if="book.coverImage" :src="getCoverUrl(book.coverImage)" alt="封面" class="cover-image"/>
              <div v-else class="book-type">{{ book.fileType }}</div>
            </div>
            <div class="book-info">
              <h3 class="book-title">{{ book.title }}</h3>
              <p class="book-author">{{ book.author || '未知作者' }}</p>
              <div class="book-meta">
                <span class="book-size">{{ formatFileSize(book.fileSize) }}</span>
                <span class="book-category" v-if="book.category">{{ book.category }}</span>
              </div>
              <div v-if="getBookProgress(book) > 0" class="progress-bar">
                <div class="progress-bar-inner" :style="{ width: getBookProgress(book) + '%' }"></div>
              </div>
            </div>
            <div class="book-actions">
              <button @click.stop="deleteBook(book.id)" class="btn-icon" title="删除">
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBookStore } from '@/stores/book'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const bookStore = useBookStore()
const authStore = useAuthStore()
const router = useRouter()

const selectedCategory = ref('')
const books = computed(() => bookStore.books)
const categories = computed(() => bookStore.categories)
const loading = computed(() => bookStore.loading)
const error = computed(() => bookStore.error)

const getCoverUrl = (coverImagePath) => {
  if (!coverImagePath) {
    return ''
  }
  
  if (authStore.isGuest) {
    // 游客模式：coverImagePath应该是base64数据URL
    if (coverImagePath.startsWith('data:')) {
      console.log('游客模式：使用base64封面')
      return coverImagePath
    }
    // 如果不是base64格式，可能是路径，直接返回
    console.log('游客模式：封面格式异常，路径:', coverImagePath)
    return coverImagePath
  } else {
    // 登录模式：从服务器获取封面
    const serverUrl = `http://localhost:8080/${coverImagePath}`
    console.log('登录模式：服务器封面URL:', serverUrl)
    return serverUrl
  }
}

const getBookProgress = (book) => {
  // 优先使用 percentage 字段（与 BookResponse 一致）
  if (book.percentage !== undefined && book.percentage !== null) {
    return book.percentage
  }
  // 兼容旧的数据结构
  if (book.readingProgress && book.readingProgress.percentage) {
    return book.readingProgress.percentage
  }
  if (book.progress !== undefined && book.progress !== null) {
    return book.progress
  }
  return 0
}

const formatFileSize = (size) => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

const openBook = (id) => {
  router.push(`/reader/${id}`)
}

const deleteBook = async (id) => {
  if (confirm('确定要删除这本书吗？')) {
    const result = await bookStore.deleteBook(id)
    if (!result.success) {
      alert(result.message)
    }
  }
}

const filterByCategory = async () => {
  // 切换分类时清空搜索框
  bookStore.clearSearch()
  
  if (selectedCategory.value === 'uncategorized') {
    // 显示未分类的书籍
    bookStore.getUncategorizedBooks()
  } else if (selectedCategory.value === '') {
    // 显示全部书籍
    bookStore.currentCategory = '' // 重要：设置当前分类为空，表示全部分类
    await bookStore.fetchBooks()
  } else {
    // 按分类获取书籍（使用后端API）
    await bookStore.fetchBooksByCategory(selectedCategory.value)
  }
}

onMounted(async () => {
  // 强制刷新以确保从存储加载最新数据
  await bookStore.fetchBooks(true)
  // 单独获取分类列表
  await bookStore.fetchCategories()
  
  // 调试：输出书籍对象的完整结构
  if (bookStore.books.length > 0) {
    console.log('=== 书籍对象完整结构调试 ===')
    bookStore.books.forEach((book, index) => {
      console.log(`书籍 ${index + 1}:`, book)
      console.log(`- ID: ${book.id}`)
      console.log(`- 标题: ${book.title}`)
      console.log(`- 封面字段 (coverImage): ${book.coverImage}`)
      console.log(`- 封面字段类型: ${typeof book.coverImage}`)
      console.log(`- 封面字段长度: ${book.coverImage ? book.coverImage.length : 'N/A'}`)
      if (book.coverImage && book.coverImage.startsWith('data:')) {
        console.log(`- 封面格式: base64 (${book.coverImage.substring(0, 50)}...)`)
      }
      console.log('- 完整对象:', JSON.stringify(book, null, 2))
    })
    console.log('=== 调试结束 ===')
  }
})
</script>

<style scoped>
.library-page {
  min-height: 70vh;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 30px;
}

.library-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
}

.library-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.category-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-primary);
  font-size: 14px;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state a {
  color: var(--primary-color);
  text-decoration: none;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.book-card {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.book-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.book-cover {
  height: 200px;
  background: var(--surface-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  position: relative;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.book-type {
  background: var(--primary-color);
  color: var(--background-color);
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.book-info {
  margin-bottom: 10px;
}

.book-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.book-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
}

.book-category {
  background: var(--surface-color);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.progress-bar {
  background-color: #e9ecef;
  border-radius: .25rem;
  height: 8px;
  margin-top: 10px;
}

.progress-bar-inner {
  background-color: var(--primary-color);
  height: 100%;
  border-radius: .25rem;
  transition: width 0.6s ease;
}

.book-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.book-card:hover .book-actions {
  opacity: 1;
}

.btn-icon {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--background-color);
  color: var(--text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #dc3545;
  color: white;
}

@media (max-width: 768px) {
  .library-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .library-actions {
    justify-content: space-between;
  }
  
  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;
  }
}
</style>