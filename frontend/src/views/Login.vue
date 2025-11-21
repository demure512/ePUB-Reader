<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card card">
        <h1 class="login-title">一本</h1>
        <p class="login-subtitle">极简电子书库</p>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <input 
              v-model="form.username"
              type="text"
              placeholder="用户名"
              class="input"
              required
            />
          </div>
          
          <div class="form-group">
            <input 
              v-model="form.password"
              type="password"
              placeholder="密码"
              class="input"
              required
            />
          </div>
          
          <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <!-- 游客模式按钮 -->
        <div class="guest-mode-section">
          <div class="divider">
            <span>或</span>
          </div>
          <button
            type="button"
            class="btn btn-secondary guest-btn"
            @click="handleGuestMode"
            :disabled="loading"
          >
            <i class="icon-user"></i>
            游客模式体验
          </button>
          <p class="guest-description">
            无需注册，立即体验本地阅读功能
          </p>
        </div>
        
        <div class="login-footer">
          <span>没有账号？</span>
          <router-link to="/register" class="link">注册</router-link>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await authStore.login(form.value)
  
  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message
  }
  
  loading.value = false
}

const handleGuestMode = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const result = await authStore.enterGuestMode()
    
    if (result.success) {
      router.push('/')
    } else {
      error.value = result.message || '进入游客模式失败'
    }
  } catch (err) {
    error.value = '进入游客模式失败，请重试'
    console.error('游客模式错误:', err)
  }
  
  loading.value = false
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-color);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  text-align: center;
  padding: 40px;
}

.login-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.login-subtitle {
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 16px;
}

.login-form {
  text-align: left;
}

.form-group {
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
}

.login-footer {
  margin-top: 20px;
  color: var(--text-secondary);
}

.link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  margin-left: 5px;
}

.link:hover {
  text-decoration: underline;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
}

/* 游客模式样式 */
.guest-mode-section {
  margin: 30px 0 20px 0;
}

.divider {
  position: relative;
  text-align: center;
  margin: 20px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-color);
}

.divider span {
  background: var(--card-bg);
  padding: 0 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.guest-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  background: var(--surface-color);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.guest-btn:hover {
  background: var(--hover-color);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.guest-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.icon-user::before {
  content: '👤';
  font-style: normal;
}

.guest-description {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.4;
}
</style>