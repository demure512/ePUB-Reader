import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import './styles/element-override.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 初始化认证状态
async function initializeApp() {
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()
  await authStore.initializeAuth()
}

// 在应用挂载前初始化认证状态
initializeApp().then(() => {
  console.log('应用初始化完成')
}).catch(error => {
  console.error('应用初始化失败:', error)
})

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue全局错误:', err, info);
  
  // 如果是在阅读器页面，不要让错误传播
  if (window.location.pathname.startsWith('/reader/')) {
    console.log('阅读器页面发生错误，阻止错误传播');
    return true;
  }
};

// 捕获未处理的Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise rejection:', event.reason);
  
  // 如果是在阅读器页面，阻止默认行为
  if (window.location.pathname.startsWith('/reader/')) {
    console.log('阅读器页面发生Promise rejection，阻止默认行为');
    event.preventDefault();
  }
});

app.mount('#app')