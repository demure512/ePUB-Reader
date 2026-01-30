<template>
  <div class="home-page">
    <div class="container">
      <div class="hero-section">
        <h1 class="hero-title">简阅</h1>
        <p class="hero-subtitle">极简电子书库，专注阅读本身</p>
        <div class="hero-actions">
          <router-link to="/library" class="btn btn-primary">我的书库</router-link>
          <router-link to="/upload" class="btn">上传书籍</router-link>
        </div>
      </div>
      
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">{{ books.length }}</div>
          <div class="stat-label">藏书</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ categories.length }}</div>
          <div class="stat-label">分类</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ readingProgress }}</div>
          <div class="stat-label">阅读进度</div>
        </div>
      </div>
      
      <div class="recent-section" v-if="recentBooks.length > 0">
        <h2 class="section-title">最近阅读</h2>
        <div class="book-grid">
          <div 
            v-for="book in recentBooks" 
            :key="book.id"
            class="book-card"
            @click="openBook(book.id)"
          >
            <div class="book-title">{{ book.title }}</div>
            <div class="book-author">{{ book.author || '未知作者' }}</div>
            <div class="book-meta">{{ book.fileType }} • {{ formatFileSize(book.fileSize) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBookStore } from '@/stores/book'
import { useRouter } from 'vue-router'

const bookStore = useBookStore()
const router = useRouter()

const books = computed(() => bookStore.books)
const categories = computed(() => bookStore.categories)
const recentBooks = computed(() => books.value.slice(0, 6))
const readingProgress = computed(() => {
  console.log(books.value);
  
  return books.value.filter(book => book.percentage > 0).length
})

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

onMounted(async () => {
  await bookStore.fetchBooks()
  await bookStore.fetchCategories()
})
</script>

<style scoped>
.home-page {
  min-height: 60vh;
}

.hero-section {
  text-align: center;
  padding: 60px 0;
  border-bottom: 1px solid var(--border-color);
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 20px;
  letter-spacing: 3px;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.stats-section {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 40px 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-card {
  text-align: center;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.recent-section {
  padding: 40px 0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .stats-section {
    flex-direction: column;
    gap: 20px;
  }
}
</style>