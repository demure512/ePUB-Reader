import axios from 'axios'
import router from '@/router'

// 设置基础URL
// axios.defaults.baseURL = 'http://localhost:3000'

// 用于防止多次弹出登录提示的标志
let isTokenExpired = false

// 清除认证信息的函数
const clearAuthData = async () => {
  localStorage.removeItem('token')
  delete axios.defaults.headers.common['Authorization']
  
  // 清除Pinia store中的认证状态
  if (window.__PINIA__) {
    try {
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      authStore.logout()
    } catch (error) {
      console.error('清除认证状态失败:', error)
    }
  }
}

// 处理token过期的函数
const handleTokenExpired = async () => {
  if (isTokenExpired) return // 防止重复处理
  
  isTokenExpired = true
  console.log('Token已过期，清除认证信息并跳转到登录页')
  
  await clearAuthData()
  
  // 显示提示信息
  if (window.confirm) {
    setTimeout(() => {
      alert('登录已过期，请重新登录')
    }, 100)
  }
  
  // 跳转到登录页
  setTimeout(() => {
    if (router) {
      router.push('/login').catch(err => {
        console.error('路由跳转失败:', err)
        // 如果路由跳转失败，使用window.location
        window.location.href = '/login'
      })
    } else {
      window.location.href = '/login'
    }
    
    // 重置标志，允许下次处理
    setTimeout(() => {
      isTokenExpired = false
    }, 1000)
  }, 200)
}

// 请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
axios.interceptors.response.use(
  response => {
    return response
  },
  error => {
    console.log('axios响应错误:', error.response?.status, error.response?.statusText)
    
    // 处理401未授权错误（token过期或无效）
    if (error.response?.status === 401) {
      console.log('检测到401错误，处理token过期')
      handleTokenExpired()
    }
    
    // 处理403禁止访问错误（可能也是token相关问题）
    if (error.response?.status === 403) {
      console.log('检测到403错误，可能是权限问题')
      // 可以根据具体的错误信息决定是否也要跳转到登录页
      const errorMessage = error.response?.data?.message || ''
      if (errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('unauthorized')) {
        handleTokenExpired()
      }
    }
    
    return Promise.reject(error)
  }
)

export default axios