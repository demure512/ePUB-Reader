<template>
  <div class="users-container">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Avatar /></el-icon>
          用户管理
        </h1>
        <p class="page-description">管理系统中的所有用户账户</p>
      </div>
      
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        
        <el-select v-model="roleFilter" placeholder="筛选角色" clearable class="role-filter">
          <el-option label="全部角色" value="" />
          <el-option label="超级管理员" value="ROLE_SUPER_ADMIN" />
          <el-option label="管理员" value="ROLE_ADMIN" />
          <el-option label="普通用户" value="ROLE_USER" />
          <el-option label="游客" value="ROLE_GUEST" />
        </el-select>
      </div>
    </div>

    <!-- Users Grid -->
    <div 
      class="users-grid"
      v-loading="loading"
      element-loading-text="加载用户数据..."
      element-loading-background="rgba(15, 18, 25, 0.9)"
    >
      <div 
        v-for="user in filteredUsers" 
        :key="user.id" 
        class="user-card"
        :class="getRoleCardClass(user.role)"
      >
        <div class="user-card-header">
          <el-avatar :size="56" class="user-avatar" :class="getRoleAvatarClass(user.role)">
            {{ user.username?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          
          <el-dropdown 
            trigger="click" 
            @command="(cmd) => handleAction(user, cmd)"
            class="user-actions-dropdown"
          >
            <el-button type="text" class="actions-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="view" disabled>
                  <el-icon><View /></el-icon>
                  查看详情
                </el-dropdown-item>
                <el-dropdown-item 
                  command="delete" 
                  :disabled="!canDeleteUser(user)"
                  divided
                >
                  <el-icon><Delete /></el-icon>
                  删除用户
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        
        <div class="user-card-body">
          <h3 class="user-name">{{ user.username }}</h3>
          <p class="user-email">{{ user.email || '未设置邮箱' }}</p>
          
          <el-tag 
            :type="getRoleTagType(user.role)" 
            effect="dark"
            size="small"
            class="role-tag"
          >
            <el-icon class="role-icon"><component :is="getRoleIcon(user.role)" /></el-icon>
            {{ getRoleDisplayName(user.role) }}
          </el-tag>
        </div>
        
        <div class="user-card-footer">
          <div class="user-meta">
            <span class="meta-label">注册时间</span>
            <span class="meta-value">{{ formatDate(user.createdAt) }}</span>
          </div>
          <div class="user-meta">
            <span class="meta-label">最后更新</span>
            <span class="meta-value">{{ formatDate(user.updatedAt) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="!loading && filteredUsers.length === 0" class="empty-state">
        <el-icon class="empty-icon"><User /></el-icon>
        <p class="empty-text">没有找到匹配的用户</p>
      </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
      :close-on-click-modal="false"
      class="delete-dialog"
    >
      <div class="delete-warning">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <p>确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？</p>
        <p class="warning-text">此操作不可恢复，用户的所有数据将被永久删除。</p>
      </div>
      
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete" :loading="deleting">
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/utils/axios'
import { useAuthStore } from '@/stores/auth'
import { 
  Avatar, 
  User,
  UserFilled, 
  Star,
  View,
  MoreFilled,
  Delete,
  Warning,
  Search
} from '@element-plus/icons-vue'

const authStore = useAuthStore()

// State
const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('')
const deleteDialogVisible = ref(false)
const userToDelete = ref(null)
const deleting = ref(false)

// Computed
const filteredUsers = computed(() => {
  let result = users.value
  
  // Filter by role
  if (roleFilter.value) {
    result = result.filter(user => user.role === roleFilter.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => 
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  }
  
  return result
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

const handleAction = (user, command) => {
  if (command === 'delete') {
    userToDelete.value = user
    deleteDialogVisible.value = true
  }
}

const confirmDelete = async () => {
  if (!userToDelete.value) return
  
  deleting.value = true
  try {
    await axios.delete(`/api/admin/users/${userToDelete.value.id}`)
    ElMessage.success('用户删除成功')
    deleteDialogVisible.value = false
    userToDelete.value = null
    await fetchUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
    ElMessage.error(error.response?.data?.message || '删除用户失败')
  } finally {
    deleting.value = false
  }
}

const canDeleteUser = (user) => {
  // Cannot delete Super Admin
  if (user.role === 'ROLE_SUPER_ADMIN') return false
  // Admin cannot delete other Admins (only Super Admin can)
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

const getRoleCardClass = (role) => {
  const classMap = {
    'ROLE_SUPER_ADMIN': 'super-admin-card',
    'ROLE_ADMIN': 'admin-card',
    'ROLE_USER': 'user-card-role',
    'ROLE_GUEST': 'guest-card'
  }
  return classMap[role] || ''
}

const getRoleAvatarClass = (role) => {
  const classMap = {
    'ROLE_SUPER_ADMIN': 'super-admin-avatar',
    'ROLE_ADMIN': 'admin-avatar',
    'ROLE_USER': 'user-avatar-color',
    'ROLE_GUEST': 'guest-avatar'
  }
  return classMap[role] || ''
}

const formatDate = (dateTime) => {
  if (!dateTime) return '—'
  const date = new Date(dateTime)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-container {
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

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.role-filter {
  width: 150px;
}

:deep(.search-input .el-input__wrapper),
:deep(.role-filter .el-input__wrapper) {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 10px;
}

:deep(.search-input .el-input__wrapper:hover),
:deep(.role-filter .el-input__wrapper:hover) {
  border-color: rgba(96, 165, 250, 0.4);
}

:deep(.search-input .el-input__inner),
:deep(.role-filter .el-input__inner) {
  color: #e2e8f0;
}

/* Users Grid */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  min-height: 200px;
}

/* User Card */
.user-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.super-admin-card {
  border-color: rgba(239, 68, 68, 0.3);
}

.super-admin-card:hover {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 12px 32px rgba(239, 68, 68, 0.15);
}

.admin-card {
  border-color: rgba(245, 158, 11, 0.3);
}

.admin-card:hover {
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow: 0 12px 32px rgba(245, 158, 11, 0.15);
}

.user-card-role {
  border-color: rgba(16, 185, 129, 0.3);
}

.user-card-role:hover {
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.15);
}

.guest-card {
  border-color: rgba(96, 165, 250, 0.3);
}

.guest-card:hover {
  border-color: rgba(96, 165, 250, 0.5);
  box-shadow: 0 12px 32px rgba(96, 165, 250, 0.15);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.user-avatar {
  font-weight: 600;
  font-size: 20px;
  color: #fff;
}

.super-admin-avatar {
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.admin-avatar {
  background: linear-gradient(135deg, #f59e0b, #eab308);
}

.user-avatar-color {
  background: linear-gradient(135deg, #10b981, #14b8a6);
}

.guest-avatar {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
}

.actions-btn {
  padding: 4px;
  color: #64748b;
}

.actions-btn:hover {
  color: #94a3b8;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 6px;
}

.user-card-body {
  margin-bottom: 16px;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 4px 0;
}

.user-email {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px 0;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.role-icon {
  font-size: 12px;
}

.user-card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(96, 165, 250, 0.1);
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.meta-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 2px;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #475569;
}

.empty-text {
  font-size: 16px;
  margin: 0;
}

/* Delete Dialog */
:deep(.delete-dialog .el-dialog) {
  background: #1a1f2e;
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 16px;
}

:deep(.delete-dialog .el-dialog__header) {
  padding: 20px 24px 0;
}

:deep(.delete-dialog .el-dialog__title) {
  color: #e2e8f0;
  font-weight: 600;
}

:deep(.delete-dialog .el-dialog__body) {
  padding: 20px 24px;
}

:deep(.delete-dialog .el-dialog__footer) {
  padding: 0 24px 20px;
}

.delete-warning {
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  color: #f59e0b;
  margin-bottom: 16px;
}

.delete-warning p {
  color: #e2e8f0;
  margin: 0 0 8px 0;
}

.delete-warning strong {
  color: #ef4444;
}

.warning-text {
  font-size: 13px;
  color: #64748b !important;
}

/* Dropdown */
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

/* Loading */
:deep(.el-loading-mask) {
  background: rgba(15, 18, 25, 0.9);
}
</style>
