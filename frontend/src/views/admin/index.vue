<template>
  <el-container class="admin-container">
    <!-- Sidebar -->
    <el-aside width="220px" class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo-section">
          <el-icon class="logo-icon"><DataAnalysis /></el-icon>
          <span class="logo-text">管理后台</span>
        </div>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#1a1f2e"
        text-color="#a0aec0"
        active-text-color="#60a5fa"
        router
      >
        <el-menu-item index="/admin">
          <el-icon><TrendCharts /></el-icon>
          <span>数据分析</span>
        </el-menu-item>
        <el-menu-item index="/admin/roles">
          <el-icon><User /></el-icon>
          <span>角色管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/users" v-if="authStore.isSuperAdmin">
          <el-icon><UserFilled /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <div class="user-info">
          <el-avatar :size="36" class="user-avatar">
            {{ authStore.user?.username?.charAt(0)?.toUpperCase() || 'A' }}
          </el-avatar>
          <div class="user-details">
            <span class="user-name">{{ authStore.user?.username || '管理员' }}</span>
            <span class="user-role">{{ roleDisplayName }}</span>
          </div>
        </div>
      </div>
    </el-aside>

    <!-- Main Content Area -->
    <el-container class="main-container">
      <!-- Header -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-tooltip content="返回前台" placement="bottom">
            <el-button 
              type="info" 
              plain 
              circle
              @click="goToHome"
            >
              <el-icon><HomeFilled /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button type="primary" class="user-dropdown-btn">
              <el-icon class="mr-1"><User /></el-icon>
              {{ authStore.user?.username }}
              <el-icon class="ml-1"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" disabled>
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- Main Content -->
      <el-main class="admin-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  DataAnalysis, 
  TrendCharts, 
  User, 
  UserFilled,
  HomeFilled,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Computed properties
const activeMenu = computed(() => {
  return route.path
})

const currentPageTitle = computed(() => {
  const titles = {
    '/admin': '数据分析',
    '/admin/roles': '角色管理',
    '/admin/users': '用户管理'
  }
  return titles[route.path] || '数据分析'
})

const roleDisplayName = computed(() => {
  const roleMap = {
    'ROLE_SUPER_ADMIN': '超级管理员',
    'ROLE_ADMIN': '管理员',
    'ROLE_USER': '普通用户',
    'ROLE_GUEST': '游客'
  }
  return roleMap[authStore.user?.role] || '管理员'
})

// Methods
const goToHome = () => {
  router.push('/')
}

const handleCommand = (command) => {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-container {
  height: 100vh;
  background: #0f1219;
}

/* Sidebar Styles */
.admin-sidebar {
  background: linear-gradient(180deg, #1a1f2e 0%, #151922 100%);
  border-right: 1px solid rgba(96, 165, 250, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  color: #60a5fa;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
  padding: 8px;
  border-radius: 12px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  padding: 12px 8px;
}

.sidebar-menu .el-menu-item {
  margin: 4px 0;
  border-radius: 8px;
  height: 48px;
  line-height: 48px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.sidebar-menu .el-menu-item:hover {
  background: rgba(96, 165, 250, 0.1) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%) !important;
  border-left: 3px solid #60a5fa;
}

.sidebar-menu .el-menu-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(96, 165, 250, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  color: #fff;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
}

.user-role {
  color: #64748b;
  font-size: 12px;
}

/* Main Container Styles */
.main-container {
  flex-direction: column;
  background: #0f1219;
}

/* Header Styles */
.admin-header {
  background: linear-gradient(180deg, #1a1f2e 0%, #151922 100%);
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
}

:deep(.el-breadcrumb__item) {
  .el-breadcrumb__inner {
    color: #64748b;
    font-weight: 400;
    
    &.is-link:hover {
      color: #60a5fa;
    }
  }
  
  &:last-child .el-breadcrumb__inner {
    color: #e2e8f0;
    font-weight: 500;
  }
}

:deep(.el-breadcrumb__separator) {
  color: #475569;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-dropdown-btn {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  border: none;
  font-weight: 500;
}

.user-dropdown-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
}

.mr-1 {
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}

/* Main Content Styles */
.admin-main {
  padding: 24px;
  background: #0f1219;
  overflow-y: auto;
}

/* Transition Animations */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Scrollbar Styles */
.admin-sidebar::-webkit-scrollbar,
.admin-main::-webkit-scrollbar {
  width: 6px;
}

.admin-sidebar::-webkit-scrollbar-thumb,
.admin-main::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.3);
  border-radius: 3px;
}

.admin-sidebar::-webkit-scrollbar-track,
.admin-main::-webkit-scrollbar-track {
  background: transparent;
}
</style>
