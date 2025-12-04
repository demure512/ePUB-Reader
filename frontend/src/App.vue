<template>
  <div id="app">
    <Header v-if="$route.meta.layout !== 'reader' && $route.meta.requiresAuth && (authStore.isAuthenticated || authStore.isGuest)" />
    <main class="main-content" :class="{ 'reader-layout': $route.meta.layout === 'reader' }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'

const authStore = useAuthStore()
const router = useRouter()

let tokenCheckInterval = null

// 定期检查token有效性
const startTokenValidityCheck = () => {
  // 每5分钟检查一次token有效性
  tokenCheckInterval = setInterval(async () => {
    if (authStore.isAuthenticated && authStore.token) {
      console.log('定期检查token有效性...')
      const isValid = await authStore.checkTokenValidity()
      if (!isValid) {
        console.log('定期检查发现token无效，跳转到登录页')
        clearInterval(tokenCheckInterval)
        router.push('/login')
      }
    }
  }, 5 * 60 * 1000) // 5分钟
}

onMounted(async () => {
  authStore.initializeAuth()
  
  // 如果是游客模式，需要重新初始化存储适配器
  if (authStore.isGuest) {
    try {
      authStore.storageAdapter = authStore.getStorageAdapter()
      await authStore.storageAdapter.initialize(true)
      console.log('游客模式存储适配器重新初始化完成')
    } catch (error) {
      console.error('游客模式存储适配器初始化失败:', error)
    }
  }
  
  // 如果用户已登录，开始定期检查token
  if (authStore.isAuthenticated) {
    startTokenValidityCheck()
  }
})

onBeforeUnmount(() => {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval)
  }
})
</script>

<style>
.main-content {
  flex: 1;
  padding-top: 65px; /* Header 高度补偿 */
}

.reader-layout {
  padding: 0 !important;
  padding-top: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
}
</style>