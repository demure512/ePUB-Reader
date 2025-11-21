<template>
  <header class="header">
    <div class="container">
      <div class="flex-between">
        <div class="flex gap-20">
          <router-link to="/" class="logo">一本</router-link>
          <nav class="nav">
            <router-link to="/library" class="nav-link">书库</router-link>
            <router-link to="/upload" class="nav-link">上传</router-link>
          </nav>
        </div>
        
        <div class="flex gap-10">
          <!-- 游客模式指示器 -->
          <div v-if="authStore.isGuest" class="guest-indicator">
            <span class="guest-badge">游客模式</span>
            <button @click="handleExitGuest" class="btn btn-sm btn-outline">退出游客模式</button>
          </div>
          
          <!-- 正常用户界面 -->
          <template v-else>
            <SearchBox />
            <div class="user-info">
              <span class="username">{{ authStore.user?.username }}</span>
              <button @click="handleLogout" class="btn">退出</button>
            </div>
          </template>
        </div>
      </div>
    </div>
    
    <!-- 升级对话框 -->
    <div v-if="showUpgradeModal" class="upgrade-modal" @click="closeUpgradeModal">
      <div class="upgrade-dialog" @click.stop>
        <h3 class="upgrade-title">升级到正式账户</h3>
        <div class="upgrade-content">
          <p>升级到正式账户后，您将享受：</p>
          <ul>
            <li>云端数据同步，多设备访问</li>
            <li>数据永久保存，不会丢失</li>
            <li>更多高级功能</li>
          </ul>
          <p>您的游客数据将会被保留并导入到新账户中。</p>
        </div>
        <div class="upgrade-actions">
          <button @click="closeUpgradeModal" class="btn btn-outline">取消</button>
          <button @click="handleUpgrade" class="btn btn-primary">立即升级</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import SearchBox from '@/components/SearchBox.vue'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleExitGuest = () => {
  // 退出游客模式，返回登录页面
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.logo {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
  text-decoration: none;
  letter-spacing: 1px;
}

.nav {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--primary-color);
}

/* 游客模式样式 */
.guest-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.guest-badge {
  background: linear-gradient(135deg, #ff6b6b, #ffa500);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  box-shadow: 0 2px 4px rgba(255,107,107,0.3);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 14px;
}

/* 升级对话框样式 */
.upgrade-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.upgrade-dialog {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.upgrade-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 15px;
  text-align: center;
}

.upgrade-content {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 25px;
}

.upgrade-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-outline:hover {
  background: var(--hover-color);
}
</style>