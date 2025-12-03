<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card card">
        <h1 class="register-title">加入简阅</h1>
        <p class="register-subtitle">开始你的阅读之旅</p>
        
        <form @submit.prevent="handleRegister" class="register-form">
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
              v-model="form.email"
              type="email"
              placeholder="邮箱（可选）"
              class="input"
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
          
          <button type="submit" class="btn btn-primary register-btn" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>
        
        <div class="register-footer">
          <span>已有账号？</span>
          <router-link to="/login" class="link">登录</router-link>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>
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
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  
  const result = await authStore.register(form.value)
  
  if (result.success) {
    success.value = result.message
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } else {
    error.value = result.message
  }
  
  loading.value = false
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-color);
}

.register-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.register-card {
  text-align: center;
  padding: 40px;
}

.register-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.register-subtitle {
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 16px;
}

.register-form {
  text-align: left;
}

.form-group {
  margin-bottom: 20px;
}

.register-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
}

.register-footer {
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

.success-message {
  color: #155724;
  margin-top: 15px;
  padding: 10px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  text-align: center;
}
</style>