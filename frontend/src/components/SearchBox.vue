<template>
  <div class="search-box">
    <input 
      v-model="searchQuery"
      @keyup.enter="handleSearch"
      placeholder="搜索书籍..."
      class="input search-input"
    />
    <button @click="handleSearch" class="btn search-btn">搜索</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBookStore } from '@/stores/book'
import { useRouter } from 'vue-router'

const bookStore = useBookStore()
const router = useRouter()

// 本地搜索状态
const searchQuery = ref('')

// 监听store中的searchQuery变化，同步到本地
watch(() => bookStore.searchQuery, (newValue) => {
  searchQuery.value = newValue
})

// 获取当前选择的分类
const currentCategory = computed(() => bookStore.currentCategory)

const handleSearch = async () => {
  // 更新store中的搜索状态
  bookStore.searchQuery = searchQuery.value
  
  // 根据当前分类状态决定搜索范围
  let category = null
  if (currentCategory.value === 'uncategorized') {
    category = 'uncategorized'
  } else if (currentCategory.value && currentCategory.value !== '') {
    category = currentCategory.value
  }
  // category为null时进行全局搜索
  
  // 无论搜索框是否为空，都调用搜索接口
  await bookStore.searchBooks(searchQuery.value.trim(), category)
  if (router.currentRoute.value.name !== 'Library') {
    router.push('/library')
  }
}

</script>

<style scoped>
.search-box {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  width: 200px;
  margin: 0;
}

.search-btn {
  white-space: nowrap;
}
</style>