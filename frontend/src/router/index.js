import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 静态导入所有组件，避免离线时动态导入失败
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Library from '@/views/Library.vue'
import Reader from '@/views/Reader.vue'
import Upload from '@/views/Upload.vue'
import Debug from '@/views/Debug.vue'

// Admin Components
import AdminIndex from '@/views/admin/index.vue'
import AdminDashboard from '@/views/admin/Dashboard.vue'
import AdminUsers from '@/views/admin/AllUsers.vue'
import AdminRoles from '@/views/admin/RolesControl.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  {
    path: '/library',
    name: 'Library',
    component: Library,
    meta: { requiresAuth: true }
  },
  {
    path: '/reader/:id',
    name: 'Reader',
    component: Reader,
    meta: { requiresAuth: true, layout: 'reader' }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: Upload,
    meta: { requiresAuth: true }
  },
  {
    path: '/debug',
    name: 'Debug',
    component: Debug
  },
  {
    path: '/admin',
    component: AdminIndex,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: AdminUsers,
        meta: { requiresAuth: true, requiresAdmin: true, requiresSuperAdmin: true }
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        component: AdminRoles,
        meta: { requiresAuth: true, requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 如果需要认证的页面
  if (to.meta.requiresAuth) {
    // 检查用户是否已认证或处于游客模式
    if (!authStore.isAuthenticated && !authStore.isGuest) {
      console.log('用户未认证且非游客模式，跳转到登录页')
      next('/login')
      return
    }

    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      console.log('用户无管理员权限，跳转到首页')
      next('/')
      return
    }
    
    // 检查是否需要超级管理员权限
    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      console.log('用户无超级管理员权限，跳转到管理后台首页')
      next('/admin')
      return
    }
    
    // 检查token是否仍然有效（仅在有token的情况下）
    if (authStore.token && authStore.isAuthenticated) {
      const isTokenValid = await authStore.checkTokenValidity()
      if (!isTokenValid) {
        console.log('Token无效，跳转到登录页')
        next('/login')
        return
      }
    }
  }
  
  // 如果是访客页面但用户已登录
  // 注意：游客用户应该可以访问注册页面来升级账号
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // 如果是注册页面且用户是游客，允许访问
    if (to.name === 'Register' && authStore.isGuest) {
      next()
      return
    }
    // 其他情况下，已登录用户不能访问访客页面
    if (!authStore.isGuest) {
      next('/')
      return
    }
  }
  
  next()
})

export default router
