import { defineStore } from 'pinia'
import axios from '@/utils/axios'
import storageAdapter from '@/utils/storageAdapter'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isGuest: false,
    isAdmin: false,
    isSuperAdmin: false,
    mode: 'login', // 'login' | 'guest'
    storageAdapter: null
  }),
  
  getters: {
    // 获取用户显示名称
    userDisplayName: (state) => {
      if (state.isGuest) {
        return '游客用户'
      }
      return state.user?.username || '未知用户'
    },

    // 检查是否为管理员 (包括超级管理员)
    checkIsAdmin: (state) => {
      return state.user?.role === 'ROLE_ADMIN' || state.user?.role === 'ROLE_SUPER_ADMIN'
    },
    
    // 检查是否为超级管理员
    checkIsSuperAdmin: (state) => {
      return state.user?.role === 'ROLE_SUPER_ADMIN'
    },
    
    // 获取用户角色显示名称
    userRoleDisplayName: (state) => {
      const roleMap = {
        'ROLE_SUPER_ADMIN': '超级管理员',
        'ROLE_ADMIN': '管理员',
        'ROLE_USER': '普通用户',
        'ROLE_GUEST': '游客'
      }
      return roleMap[state.user?.role] || '未知角色'
    },
    
    // 获取用户头像URL
    userAvatarUrl: (state) => {
      if (state.isGuest) {
        return '/images/guest-avatar.png'
      }
      return state.user?.avatar || '/images/default-avatar.png'
    },
    
    // 检查是否可以访问云端功能
    canAccessCloud: (state) => {
      return state.isAuthenticated && !state.isGuest && navigator.onLine
    },
    
    // 检查是否为有效用户（登录用户或游客）
    isValidUser: (state) => {
      return state.isAuthenticated || state.isGuest
    }
  },
  
  actions: {
    async login(credentials) {
      try {
        const response = await axios.post('/api/auth/signin', credentials)
        const { token, id, username, email, role } = response.data
        
        this.token = token
        this.user = { id, username, email, role }
        this.isAuthenticated = true
        this.isGuest = false
        this.isSuperAdmin = role === 'ROLE_SUPER_ADMIN'
        this.isAdmin = role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN'
        this.mode = 'login'
        
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(this.user))
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        // 初始化云端存储适配器
        this.storageAdapter = storageAdapter
        await this.storageAdapter.initialize(false) // false表示非游客模式
        
        // 登录成功后初始化用户数据
        await this.initializeUserData()
        
        return { success: true }
      } catch (error) {
        console.error('Login error:', error)
        return {
          success: false,
          message: error.response?.data?.message || '登录失败'
        }
      }
    },
    
    async enterGuestMode() {
      try {
        // 只清除登录状态，不清除数据
        this.user = {
          id: 'guest',
          username: '游客用户',
          email: null
        }
        this.token = null
        this.isAuthenticated = false
        this.isGuest = true
        this.mode = 'guest'
        
        // 清除登录相关的localStorage项，但保留游客数据
        localStorage.removeItem('token')
        localStorage.setItem('guestMode', 'true')
        delete axios.defaults.headers.common['Authorization']
        
        // 初始化游客存储适配器
        this.storageAdapter = storageAdapter
        await this.storageAdapter.initialize(true) // true表示游客模式
        
        // 初始化游客数据
        await this.initializeGuestData()
        
        console.log('游客模式初始化成功')
        return { success: true }
      } catch (error) {
        console.error('游客模式初始化失败:', error)
        return {
          success: false,
          message: '游客模式初始化失败'
        }
      }
    },
    
    async register(userData) {
      try {
        console.log('Registering user:', userData)
        const response = await axios.post('/api/auth/signup', userData)
        console.log('Registration response:', response.data)
        return { success: true, message: response.data.message }
      } catch (error) {
        console.error('Registration error:', error)
        return { 
          success: false, 
          message: error.response?.data?.message || '注册失败' 
        }
      }
    },
    
    logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      this.isGuest = false
      this.isAdmin = false
      this.isSuperAdmin = false
      this.mode = 'login'
      
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('guestMode')
      delete axios.defaults.headers.common['Authorization']
      
      // 重置存储适配器
      this.storageAdapter = null
      
      // 清除用户数据
      this.clearUserData()
    },
    
    switchToLogin() {
      // 从游客模式切换到登录模式
      this.logout()
    },
    
    async switchToGuest() {
      // 从登录模式切换到游客模式
      this.logout()
      return await this.enterGuestMode()
    },
    
    // 检查token是否有效的方法
    async checkTokenValidity() {
      if (!this.token) {
        this.isAuthenticated = false
        return false
      }
      
      try {
        // 使用现有的books API来验证token，这个端点肯定存在且需要认证
        await axios.get('/api/books')
        return true
      } catch (error) {
        console.log('Token验证失败:', error.response?.status)
        if (error.response?.status === 401 || error.response?.status === 403) {
          this.logout()
          return false
        }
        // 对于其他错误（如404、500等），暂时认为token有效
        return true
      }
    },
    
    async initializeAuth() {
      const token = localStorage.getItem('token')
      const guestMode = localStorage.getItem('guestMode')
      const userStr = localStorage.getItem('user')
      
      console.log('初始化认证状态:', { token: !!token, guestMode });
      
      if (token) {
        this.token = token
        this.isAuthenticated = true
        this.isGuest = false
        this.mode = 'login'
        
        if (userStr) {
          try {
            this.user = JSON.parse(userStr)
            this.isSuperAdmin = this.user.role === 'ROLE_SUPER_ADMIN'
            this.isAdmin = this.user.role === 'ROLE_ADMIN' || this.user.role === 'ROLE_SUPER_ADMIN'
          } catch (e) {
            console.error('Failed to parse user from localStorage')
          }
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        console.log('认证状态设置为true');
        
        // 初始化云端存储适配器
        this.storageAdapter = storageAdapter
        await this.storageAdapter.initialize(false)
        
      } else if (guestMode === 'true') {
        // 恢复游客模式状态
        this.user = {
          id: 'guest',
          username: '游客用户',
          email: null
        }
        this.token = null
        this.isAuthenticated = false
        this.isGuest = true
        this.mode = 'guest'
        
        // 初始化游客存储适配器
        this.storageAdapter = storageAdapter
        await this.storageAdapter.initialize(true)
        
        console.log('恢复游客模式状态');
      } else {
        console.log('没有找到token或游客模式标识，认证状态为false');
      }
    },
    
    /**
     * 初始化用户数据（登录后调用）
     */
    async initializeUserData() {
      try {
        console.log('正在初始化用户数据...')
        
        // 动态导入stores以避免循环依赖
        const { useSettingsStore } = await import('@/stores/settings')
        const { useBookStore } = await import('@/stores/book')
        
        const settingsStore = useSettingsStore()
        const bookStore = useBookStore()
        
        // 并行初始化用户设置和书籍数据
        await Promise.all([
          settingsStore.initializeSettings(),
          bookStore.fetchBooks(),
          bookStore.fetchCategories()
        ])
        
        console.log('用户数据初始化完成')
        
      } catch (error) {
        console.error('初始化用户数据失败:', error)
        // 不抛出错误，允许用户继续使用应用
      }
    },
    
    /**
     * 初始化游客数据
     */
    async initializeGuestData() {
      try {
        console.log('正在初始化游客数据...')
        
        // 动态导入stores以避免循环依赖
        const { useSettingsStore } = await import('@/stores/settings')
        const { useBookStore } = await import('@/stores/book')
        
        const settingsStore = useSettingsStore()
        const bookStore = useBookStore()
        
        // 初始化游客模式的设置和书籍数据
        await Promise.all([
          settingsStore.initializeGuestSettings(),
          bookStore.fetchGuestBooks(),
          bookStore.fetchGuestCategories()
        ])
        
        console.log('游客数据初始化完成')
        
      } catch (error) {
        console.error('初始化游客数据失败:', error)
        // 不抛出错误，允许用户继续使用应用
      }
    },
    
    /**
     * 清除用户数据（登出时调用）
     */
    async clearUserData() {
      try {
        // 动态导入stores以避免循环依赖
        const { useSettingsStore } = await import('@/stores/settings')
        const { useBookStore } = await import('@/stores/book')
        
        const settingsStore = useSettingsStore()
        const bookStore = useBookStore()
        
        // 清除用户设置和书籍数据
        settingsStore.clearSettings()
        bookStore.clearBooks()
        
        console.log('用户数据已清除')
        
      } catch (error) {
        console.error('清除用户数据失败:', error)
      }
    },
    
    /**
     * 同步用户数据（手动触发）
     */
    async syncUserData() {
      if (!this.isAuthenticated) {
        console.log('用户未登录，无法同步数据')
        return { success: false, message: '用户未登录' }
      }
      
      try {
        console.log('正在同步用户数据...')
        
        const { useSettingsStore } = await import('@/stores/settings')
        const settingsStore = useSettingsStore()
        
        // 同步用户设置
        const result = await settingsStore.syncSettings()
        
        if (result.success) {
          console.log('用户数据同步完成')
          return { success: true }
        } else {
          console.error('用户数据同步失败:', result.message)
          return { success: false, message: result.message }
        }
        
      } catch (error) {
        console.error('同步用户数据失败:', error)
        return { success: false, message: '同步失败' }
      }
    },
    
    /**
     * 获取当前存储适配器
     */
    getStorageAdapter() {
      if (!this.storageAdapter) {
        this.storageAdapter = storageAdapter
      }
      return this.storageAdapter
    },
    
    /**
     * 导出游客数据
     */
    async exportGuestData() {
      if (!this.isGuest) {
        throw new Error('只有游客模式支持数据导出')
      }
      
      const adapter = this.getStorageAdapter()
      return await adapter.exportAllData()
    },
    
    /**
     * 导入游客数据
     */
    async importGuestData(data) {
      if (!this.isGuest) {
        throw new Error('只有游客模式支持数据导入')
      }
      
      const adapter = this.getStorageAdapter()
      const result = await adapter.importAllData(data)
      
      if (result.success) {
        // 重新初始化游客数据
        await this.initializeGuestData()
      }
      
      return result
    },
    
    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
      const adapter = this.getStorageAdapter()
      return await adapter.getStorageStats()
    },
    
    /**
     * 清理本地数据
     */
    async clearLocalData() {
      const adapter = this.getStorageAdapter()
      return await adapter.clearAllData()
    },
    
    /**
     * 准备账号升级（导出游客数据）
     */
    async prepareAccountUpgrade() {
      if (!this.isGuest) {
        throw new Error('只有游客用户可以升级账号')
      }
      
      try {
        const guestData = await this.exportGuestData()
        
        // 将数据保存到localStorage，供注册页面使用
        localStorage.setItem('guestUpgradeData', JSON.stringify(guestData))
        
        return { success: true, data: guestData }
      } catch (error) {
        console.error('准备账号升级失败:', error)
        return { success: false, message: '准备升级失败' }
      }
    },

    /**
     * 完成账号升级（注册后导入数据）
     */
    async completeAccountUpgrade() {
      try {
        const upgradeDataStr = localStorage.getItem('guestUpgradeData')
        if (!upgradeDataStr) {
          return { success: true, message: '没有需要迁移的数据' }
        }

        const guestData = JSON.parse(upgradeDataStr)
        
        // 这里可以实现将游客数据上传到云端的逻辑
        // 目前先简单地清除本地升级数据
        localStorage.removeItem('guestUpgradeData')
        
        console.log('账号升级完成，游客数据已处理')
        return { success: true, message: '账号升级完成' }
      } catch (error) {
        console.error('完成账号升级失败:', error)
        return { success: false, message: '升级完成失败' }
      }
    }
  }
})
