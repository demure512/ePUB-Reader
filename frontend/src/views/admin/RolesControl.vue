<template>
  <div class="roles-container">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><UserFilled /></el-icon>
          角色管理
        </h1>
        <p class="page-description">管理用户角色和权限</p>
      </div>
      
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或邮箱..."
          prefix-icon="Search"
          clearable
          class="search-input"
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- Role Statistics -->
    <div class="role-stats">
      <div class="role-stat-card super-admin">
        <div class="role-stat-icon">
          <el-icon><Star /></el-icon>
        </div>
        <div class="role-stat-info">
          <span class="role-stat-value">{{ roleStats.superAdmin }}</span>
          <span class="role-stat-label">超级管理员</span>
        </div>
      </div>
      
      <div class="role-stat-card admin">
        <div class="role-stat-icon">
          <el-icon><UserFilled /></el-icon>
        </div>
        <div class="role-stat-info">
          <span class="role-stat-value">{{ roleStats.admin }}</span>
          <span class="role-stat-label">管理员</span>
        </div>
      </div>
      
      <div class="role-stat-card user">
        <div class="role-stat-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="role-stat-info">
          <span class="role-stat-value">{{ roleStats.user }}</span>
          <span class="role-stat-label">普通用户</span>
        </div>
      </div>
      
      <div class="role-stat-card guest">
        <div class="role-stat-icon">
          <el-icon><View /></el-icon>
        </div>
        <div class="role-stat-info">
          <span class="role-stat-value">{{ roleStats.guest }}</span>
          <span class="role-stat-label">游客</span>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-card">
      <el-table
        :data="filteredUsers"
        v-loading="loading"
        element-loading-text="加载用户数据..."
        element-loading-background="rgba(15, 18, 25, 0.9)"
        class="users-table"
        stripe
      >
        <el-table-column label="用户" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="40" class="user-avatar" :class="getRoleClass(row.role)">
                {{ row.username?.charAt(0)?.toUpperCase() || 'U' }}
              </el-avatar>
              <div class="user-info">
                <span class="user-name">{{ row.username }}</span>
                <span class="user-email">{{ row.email || '未设置邮箱' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="当前角色" min-width="140">
          <template #default="{ row }">
            <el-tag 
              :type="getRoleTagType(row.role)" 
              effect="dark"
              class="role-tag"
            >
              <el-icon class="role-tag-icon"><component :is="getRoleIcon(row.role)" /></el-icon>
              {{ getRoleDisplayName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="注册时间" min-width="160">
          <template #default="{ row }">
            <span class="text-secondary">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="更新时间" min-width="160">
          <template #default="{ row }">
            <span class="text-secondary">{{ formatDateTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-dropdown 
                trigger="click" 
                @command="(cmd) => handleRoleChange(row, cmd)"
                :disabled="!canChangeRole(row)"
              >
                <el-button 
                  type="primary" 
                  size="small"
                  :disabled="!canChangeRole(row)"
                >
                  更改角色
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      command="ROLE_ADMIN"
                      :disabled="!authStore.isSuperAdmin || row.role === 'ROLE_ADMIN'"
                    >
                      <el-icon><UserFilled /></el-icon>
                      设为管理员
                    </el-dropdown-item>
                    <el-dropdown-item 
                      command="ROLE_USER"
                      :disabled="row.role === 'ROLE_USER'"
                    >
                      <el-icon><User /></el-icon>
                      设为普通用户
                    </el-dropdown-item>
                    <el-dropdown-item 
                      command="ROLE_GUEST"
                      :disabled="row.role === 'ROLE_GUEST'"
                    >
                      <el-icon><View /></el-icon>
                      设为游客
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-popconfirm
                title="确定要删除此用户吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleDeleteUser(row)"
                :disabled="!canDeleteUser(row)"
              >
                <template #reference>
                  <el-button 
                    type="danger" 
                    size="small"
                    :disabled="!canDeleteUser(row)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Permission Info -->
    <div class="permission-info">
      <el-alert
        title="权限说明"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <ul class="permission-list">
            <li><strong>超级管理员</strong>: 最高权限，可以提升/降级管理员角色，管理所有用户</li>
            <li><strong>管理员</strong>: 可以访问后台，查看数据统计，管理普通用户和游客</li>
            <li><strong>普通用户</strong>: 可以使用所有前台功能，上传和阅读书籍</li>
            <li><strong>游客</strong>: 受限访问，仅可浏览公开内容</li>
          </ul>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/utils/axios'
import { useAuthStore } from '@/stores/auth'
import { 
  UserFilled, 
  User, 
  Star,
  View,
  ArrowDown,
  Delete,
  Search
} from '@element-plus/icons-vue'

const authStore = useAuthStore()

// State
const users = ref([])
const loading = ref(true)
const searchQuery = ref('')

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => 
    user.username?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query)
  )
})

const roleStats = computed(() => {
  const stats = {
    superAdmin: 0,
    admin: 0,
    user: 0,
    guest: 0
  }
  
  users.value.forEach(user => {
    switch (user.role) {
      case 'ROLE_SUPER_ADMIN':
        stats.superAdmin++
        break
      case 'ROLE_ADMIN':
        stats.admin++
        break
      case 'ROLE_USER':
        stats.user++
        break
      case 'ROLE_GUEST':
        stats.guest++
        break
    }
  })
  
  return stats
})

// Methods
const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/admin/users')
    users.value = response.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // Debounced search is handled by computed property
}

const handleRoleChange = async (user, newRole) => {
  if (user.role === newRole) return
  
  try {
    await axios.put(`/api/admin/users/${user.id}/role`, { role: newRole })
    ElMessage.success('角色更新成功')
    await fetchUsers()
  } catch (error) {
    console.error('Failed to update role:', error)
    ElMessage.error(error.response?.data?.message || '角色更新失败')
  }
}

const handleDeleteUser = async (user) => {
  try {
    await axios.delete(`/api/admin/users/${user.id}`)
    ElMessage.success('用户删除成功')
    await fetchUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
    ElMessage.error(error.response?.data?.message || '用户删除失败')
  }
}

const canChangeRole = (user) => {
  // Cannot change Super Admin's role
  if (user.role === 'ROLE_SUPER_ADMIN') return false
  // Admin cannot change other Admin's role
  if (user.role === 'ROLE_ADMIN' && !authStore.isSuperAdmin) return false
  return true
}

const canDeleteUser = (user) => {
  // Cannot delete Super Admin
  if (user.role === 'ROLE_SUPER_ADMIN') return false
  // Admin cannot delete other Admins
  if (user.role === 'ROLE_ADMIN' && !authStore.isSuperAdmin) return false
  // Cannot delete yourself
  if (user.id === authStore.user?.id) return false
  return true
}

const getRoleDisplayName = (role) => {
  const roleMap = {
    'ROLE_SUPER_ADMIN': '超级管理员',
    'ROLE_ADMIN': '管理员',
    'ROLE_USER': '普通用户',
    'ROLE_GUEST': '游客'
  }
  return roleMap[role] || '未知角色'
}

const getRoleTagType = (role) => {
  const typeMap = {
    'ROLE_SUPER_ADMIN': 'danger',
    'ROLE_ADMIN': 'warning',
    'ROLE_USER': 'success',
    'ROLE_GUEST': 'info'
  }
  return typeMap[role] || 'info'
}

const getRoleIcon = (role) => {
  const iconMap = {
    'ROLE_SUPER_ADMIN': Star,
    'ROLE_ADMIN': UserFilled,
    'ROLE_USER': User,
    'ROLE_GUEST': View
  }
  return iconMap[role] || User
}

const getRoleClass = (role) => {
  const classMap = {
    'ROLE_SUPER_ADMIN': 'super-admin-avatar',
    'ROLE_ADMIN': 'admin-avatar',
    'ROLE_USER': 'user-avatar',
    'ROLE_GUEST': 'guest-avatar'
  }
  return classMap[role] || ''
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '—'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.roles-container {
  min-height: 100%;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 8px 0;
}

.page-title .el-icon {
  color: #60a5fa;
}

.page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.search-input {
  width: 280px;
}

:deep(.search-input .el-input__wrapper) {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 10px;
}

:deep(.search-input .el-input__wrapper:hover) {
  border-color: rgba(96, 165, 250, 0.4);
}

:deep(.search-input .el-input__wrapper.is-focus) {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

:deep(.search-input .el-input__inner) {
  color: #e2e8f0;
}

:deep(.search-input .el-input__inner::placeholder) {
  color: #64748b;
}

/* Role Statistics */
.role-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.role-stat-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.3s ease;
}

.role-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.role-stat-card.super-admin {
  border-color: rgba(239, 68, 68, 0.3);
}

.role-stat-card.admin {
  border-color: rgba(245, 158, 11, 0.3);
}

.role-stat-card.user {
  border-color: rgba(16, 185, 129, 0.3);
}

.role-stat-card.guest {
  border-color: rgba(96, 165, 250, 0.3);
}

.role-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.super-admin .role-stat-icon {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.admin .role-stat-icon {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.user .role-stat-icon {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.guest .role-stat-icon {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}

.role-stat-info {
  display: flex;
  flex-direction: column;
}

.role-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.2;
}

.role-stat-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

/* Table Card */
.table-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

/* Table Styles */
.users-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(96, 165, 250, 0.05);
  --el-table-row-hover-bg-color: rgba(96, 165, 250, 0.08);
  --el-table-border-color: rgba(96, 165, 250, 0.1);
  --el-table-header-text-color: #94a3b8;
  --el-table-text-color: #e2e8f0;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-table__header th) {
  font-weight: 600;
  padding: 16px 12px;
}

:deep(.el-table__body td) {
  padding: 14px 12px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(96, 165, 250, 0.03);
}

/* User Cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-avatar {
  font-weight: 600;
  color: #fff;
}

.super-admin-avatar {
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.admin-avatar {
  background: linear-gradient(135deg, #f59e0b, #eab308);
}

.user-avatar-avatar {
  background: linear-gradient(135deg, #10b981, #14b8a6);
}

.guest-avatar {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
  color: #e2e8f0;
  font-size: 14px;
}

.user-email {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

/* Role Tag */
.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-weight: 500;
}

.role-tag-icon {
  font-size: 14px;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  border: none;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

:deep(.el-button--danger) {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

:deep(.el-button--danger:hover) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

/* Text Styles */
.text-secondary {
  color: #94a3b8;
}

/* Permission Info */
.permission-info {
  margin-top: 8px;
}

:deep(.el-alert) {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 12px;
}

:deep(.el-alert__title) {
  color: #60a5fa;
  font-weight: 600;
}

.permission-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.8;
}

.permission-list strong {
  color: #e2e8f0;
}

/* Dropdown Menu */
:deep(.el-dropdown-menu) {
  background: #1a1f2e;
  border: 1px solid rgba(96, 165, 250, 0.2);
}

:deep(.el-dropdown-menu__item) {
  color: #94a3b8;
}

:deep(.el-dropdown-menu__item:hover) {
  background: rgba(96, 165, 250, 0.1);
  color: #e2e8f0;
}

:deep(.el-dropdown-menu__item.is-disabled) {
  color: #475569;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgba(15, 18, 25, 0.9);
}

:deep(.el-loading-text) {
  color: #94a3b8;
}
</style>
