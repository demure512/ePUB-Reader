<template>
  <div class="debug-page">
    <div class="container">
      <h1>调试信息</h1>
      
      <div class="debug-section">
        <h2>后端连接测试</h2>
        <button @click="testConnection" class="btn">测试后端连接</button>
        <div v-if="connectionResult" class="result">
          <pre>{{ connectionResult }}</pre>
        </div>
      </div>
      
      <div class="debug-section">
        <h2>注册测试</h2>
        <form @submit.prevent="testRegister">
          <input v-model="registerForm.username" placeholder="用户名" class="input" />
          <input v-model="registerForm.password" type="password" placeholder="密码" class="input" />
          <input v-model="registerForm.email" placeholder="邮箱（可选）" class="input" />
          <button type="submit" class="btn">测试注册</button>
        </form>
        <div v-if="registerResult" class="result">
          <pre>{{ registerResult }}</pre>
        </div>
      </div>
      
      <div class="debug-section">
        <h2>认证测试</h2>
        <button @click="testAuth" class="btn">测试认证状态</button>
        <div v-if="authResult" class="result">
          <pre>{{ authResult }}</pre>
        </div>
      </div>
      
      <div class="debug-section">
        <h2>登录测试</h2>
        <form @submit.prevent="testLogin">
          <input v-model="loginForm.username" placeholder="用户名" class="input" />
          <input v-model="loginForm.password" type="password" placeholder="密码" class="input" />
          <button type="submit" class="btn">测试登录</button>
        </form>
        <div v-if="loginResult" class="result">
          <pre>{{ loginResult }}</pre>
        </div>
      </div>
      
      <div class="debug-section">
        <h2>文件上传测试</h2>
        <form @submit.prevent="testUpload">
          <input type="file" @change="handleFileSelect" accept=".txt,.epub" />
          <button type="submit" class="btn" :disabled="!selectedFile">测试上传</button>
        </form>
        <div v-if="uploadResult" class="result">
          <pre>{{ uploadResult }}</pre>
        </div>
      </div>
      
      <div class="debug-section">
        <h2>Token信息</h2>
        <button @click="showTokenInfo" class="btn">显示Token信息</button>
        <div v-if="tokenInfo" class="result">
          <pre>{{ tokenInfo }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from '@/utils/axios'

const connectionResult = ref('')
const registerResult = ref('')
const authResult = ref('')
const loginResult = ref('')
const uploadResult = ref('')
const tokenInfo = ref('')

const registerForm = ref({
  username: 'newuser',
  password: 'newpass123',
  email: ''
})

const loginForm = ref({
  username: 'test',
  password: 'password'
})

const selectedFile = ref(null)

const testConnection = async () => {
  try {
    const response = await axios.get('/api/test/health')
    connectionResult.value = JSON.stringify(response.data, null, 2)
  } catch (error) {
    connectionResult.value = `Error: ${error.message}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
  }
}

const testRegister = async () => {
  try {
    const response = await axios.post('/api/debug/register-test', registerForm.value)
    registerResult.value = JSON.stringify(response.data, null, 2)
  } catch (error) {
    registerResult.value = `Error: ${error.message}\nStatus: ${error.response?.status}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
  }
}

const testAuth = async () => {
  try {
    const response = await axios.get('/api/debug/auth-test')
    authResult.value = JSON.stringify(response.data, null, 2)
  } catch (error) {
    authResult.value = `Error: ${error.message}\nStatus: ${error.response?.status}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
  }
}

const testLogin = async () => {
  try {
    const response = await axios.post('/api/auth/signin', loginForm.value)
    loginResult.value = JSON.stringify(response.data, null, 2)
    
    // 保存token
    const token = response.data.token
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
  } catch (error) {
    loginResult.value = `Error: ${error.message}\nStatus: ${error.response?.status}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
  }
}

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]
}

const testUpload = async () => {
  if (!selectedFile.value) {
    uploadResult.value = 'No file selected'
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    const response = await axios.post('/api/debug/upload-test', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    uploadResult.value = JSON.stringify(response.data, null, 2)
  } catch (error) {
    uploadResult.value = `Error: ${error.message}\nStatus: ${error.response?.status}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
  }
}

const showTokenInfo = () => {
  const token = localStorage.getItem('token')
  const authHeader = axios.defaults.headers.common['Authorization']
  
  tokenInfo.value = JSON.stringify({
    token: token,
    authHeader: authHeader,
    hasToken: !!token
  }, null, 2)
}
</script>

<style scoped>
.debug-page {
  padding: 20px;
}

.debug-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.result {
  margin-top: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.result pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.input {
  display: block;
  width: 200px;
  margin: 10px 0;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn {
  margin: 5px;
  padding: 10px 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>