import { defineStore } from 'pinia'
import axios from '@/utils/axios'
import { useAuthStore } from './auth'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // 用户设置
    settings: {
      fontSize: 16,
      theme: 'light',
      readingMode: 'default',
      lineHeight: 1.5,
      pageWidth: 800,
      autoSaveProgress: true,
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'serif',
      autoSave: true,
      autoSaveInterval: 30000
    },
    
    // 同步状态
    isLoading: false,
    lastSyncTime: null,
    isInitialized: false,
    error: null,
    storageAdapter: null
  }),
  
  getters: {
    // 获取所有设置作为对象
    allSettings: (state) => ({ ...state.settings }),
    
    // 检查是否需要同步
    needsSync: (state) => {
      const authStore = useAuthStore()
      if (authStore.isGuest) return false // 游客模式不需要同步
      
      return !state.lastSyncTime || 
             (Date.now() - state.lastSyncTime) > 5 * 60 * 1000 // 5分钟
    },

    // 直接访问常用设置项
    fontSize: (state) => state.settings.fontSize,
    theme: (state) => state.settings.theme,
    readingMode: (state) => state.settings.readingMode,
    lineHeight: (state) => state.settings.lineHeight,
    pageWidth: (state) => state.settings.pageWidth,
    fontFamily: (state) => state.settings.fontFamily,
    backgroundColor: (state) => state.settings.backgroundColor,
    textColor: (state) => state.settings.textColor,

    // 获取主题相关设置
    themeSettings: (state) => ({
      theme: state.settings.theme,
      backgroundColor: state.settings.backgroundColor,
      textColor: state.settings.textColor
    }),

    // 获取阅读相关设置
    readingSettings: (state) => ({
      fontSize: state.settings.fontSize,
      fontFamily: state.settings.fontFamily,
      lineHeight: state.settings.lineHeight,
      pageWidth: state.settings.pageWidth,
      readingMode: state.settings.readingMode
    }),

    // 获取自动保存设置
    autoSaveSettings: (state) => ({
      autoSave: state.settings.autoSave,
      autoSaveInterval: state.settings.autoSaveInterval,
      autoSaveProgress: state.settings.autoSaveProgress
    })
  },
  
  actions: {
    // 获取存储适配器
    getStorageAdapter() {
      if (!this.storageAdapter) {
        const authStore = useAuthStore()
        this.storageAdapter = authStore.getStorageAdapter()
      }
      return this.storageAdapter
    },

    /**
     * 初始化设置（从存储获取）
     */
    async initializeSettings() {
      if (this.isInitialized) return
      
      try {
        this.isLoading = true
        this.error = null
        console.log('正在初始化用户设置...')
        
        const adapter = this.getStorageAdapter()
        const settings = await adapter.getSettings()
        
        if (settings && typeof settings === 'object') {
          // 合并默认设置和用户设置
          this.settings = {
            ...this.settings, // 默认设置
            ...settings       // 用户设置
          }
          console.log('用户设置初始化成功:', this.settings)
        } else {
          console.log('使用默认设置')
        }
        
        this.lastSyncTime = Date.now()
        this.isInitialized = true
        
      } catch (error) {
        console.error('初始化用户设置失败:', error)
        this.error = error.message || '获取用户设置失败'
        
        // 使用默认设置
        this.loadDefaultSettings()
        this.isInitialized = true
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 初始化游客设置
     */
    async initializeGuestSettings() {
      return await this.initializeSettings()
    },
    
    /**
     * 加载默认设置
     */
    loadDefaultSettings() {
      this.settings = {
        fontSize: 16,
        theme: 'light',
        readingMode: 'default',
        lineHeight: 1.5,
        pageWidth: 800,
        autoSaveProgress: true,
        backgroundColor: '#ffffff',
        textColor: '#333333',
        fontFamily: 'serif',
        autoSave: true,
        autoSaveInterval: 30000
      }
      
      console.log('已加载默认设置')
    },
    
    /**
     * 保存用户设置
     */
    async saveSettings(newSettings = null) {
      this.isLoading = true
      this.error = null
      
      try {
        const settingsToSave = newSettings || this.settings
        
        console.log('正在保存用户设置...', settingsToSave)
        
        const adapter = this.getStorageAdapter()
        await adapter.saveSettings(settingsToSave)
        
        // 更新本地设置
        this.settings = {
          ...this.settings,
          ...settingsToSave,
          updatedAt: new Date().toISOString()
        }
        
        this.lastSyncTime = Date.now()
        console.log('用户设置保存成功')
        return { success: true }
        
      } catch (error) {
        console.error('保存用户设置失败:', error)
        this.error = error.message || '保存用户设置失败'
        return { success: false, message: this.error }
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * 更新单个设置
     */
    async updateSetting(key, value) {
      try {
        if (!this.settings.hasOwnProperty(key)) {
          console.warn(`未知的设置项: ${key}`)
          return { success: false, message: `未知的设置项: ${key}` }
        }

        // 立即更新本地状态
        this.settings[key] = value
        this.settings.updatedAt = new Date().toISOString()
        
        // 自动保存设置
        if (this.settings.autoSave) {
          const result = await this.saveSettings()
          if (result.success) {
            console.log(`设置 ${key} 已更新为:`, value)
          }
          return result
        } else {
          console.log(`设置 ${key} 已更新为:`, value, '(未自动保存)')
          return { success: true }
        }
        
      } catch (error) {
        console.error(`更新设置 ${key} 失败:`, error)
        return { 
          success: false, 
          message: error.message || '设置更新失败' 
        }
      }
    },
    
    /**
     * 批量更新设置
     */
    async updateSettings(newSettings) {
      try {
        this.isLoading = true
        
        // 立即更新本地状态
        this.settings = {
          ...this.settings,
          ...newSettings,
          updatedAt: new Date().toISOString()
        }
        
        // 保存到存储
        const adapter = this.getStorageAdapter()
        await adapter.saveSettings(this.settings)
        
        this.lastSyncTime = Date.now()
        console.log('设置批量更新成功:', newSettings)
        
        return { success: true }
        
      } catch (error) {
        console.error('批量更新设置失败:', error)
        this.error = error.message || '设置更新失败'
        return { 
          success: false, 
          message: this.error
        }
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * 重置设置为默认值
     */
    async resetSettings() {
      try {
        this.isLoading = true
        
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：直接重置本地设置
          this.loadDefaultSettings()
          await this.saveSettings()
        } else {
          // 登录模式：调用服务器重置API
          const response = await axios.post('/api/user/settings/reset')
          const settings = response.data.settings
          
          // 更新本地状态
          this.settings = {
            ...this.settings,
            ...settings,
            updatedAt: new Date().toISOString()
          }
        }
        
        this.lastSyncTime = Date.now()
        console.log('设置已重置为默认值')
        
        return { success: true }
        
      } catch (error) {
        console.error('重置设置失败:', error)
        this.error = error.message || error.response?.data?.message || '重置设置失败'
        return { 
          success: false, 
          message: this.error
        }
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * 同步用户设置
     */
    async syncSettings() {
      const authStore = useAuthStore()
      
      if (authStore.isGuest) {
        // 游客模式不需要同步
        console.log('游客模式，无需同步设置')
        return { success: true }
      }

      if (!this.needsSync) {
        console.log('设置无需同步')
        return { success: true }
      }
      
      try {
        this.isLoading = true
        this.error = null
        console.log('正在同步设置...')
        
        const adapter = this.getStorageAdapter()
        
        // 先获取云端最新设置
        const serverSettings = await adapter.getSettingsFromCloud()
        
        if (serverSettings && typeof serverSettings === 'object') {
          // 比较本地设置和服务器设置的时间戳
          const localTimestamp = this.settings.updatedAt || 0
          const serverTimestamp = serverSettings.updatedAt || 0
          
          if (serverTimestamp > localTimestamp) {
            // 服务器设置更新，使用服务器设置
            this.settings = {
              ...this.settings,
              ...serverSettings
            }
            console.log('已同步服务器最新设置')
          } else if (localTimestamp > serverTimestamp) {
            // 本地设置更新，上传到服务器
            await adapter.saveSettingsToCloud(this.settings)
            console.log('已上传本地设置到服务器')
          } else {
            console.log('设置已是最新版本')
          }
          
          this.lastSyncTime = Date.now()
          return { success: true }
        } else {
          // 服务器没有设置，上传本地设置
          await adapter.saveSettingsToCloud(this.settings)
          this.lastSyncTime = Date.now()
          return { success: true }
        }
        
      } catch (error) {
        console.error('同步用户设置失败:', error)
        this.error = error.message || '同步用户设置失败'
        return { success: false, message: this.error }
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * 清除设置（登出时调用）
     */
    clearSettings() {
      this.loadDefaultSettings()
      this.lastSyncTime = null
      this.isInitialized = false
      this.error = null
      this.storageAdapter = null
      console.log('设置已清除')
    },

    /**
     * 导出设置
     */
    exportSettings() {
      return {
        ...this.settings,
        exportedAt: new Date().toISOString()
      }
    },

    /**
     * 导入设置
     */
    async importSettings(importedSettings) {
      if (!importedSettings || typeof importedSettings !== 'object') {
        throw new Error('无效的设置数据')
      }
      
      try {
        // 过滤掉无效的设置项
        const validSettings = {}
        const defaultSettings = {
          fontSize: 16,
          theme: 'light',
          readingMode: 'default',
          lineHeight: 1.5,
          pageWidth: 800,
          autoSaveProgress: true,
          backgroundColor: '#ffffff',
          textColor: '#333333',
          fontFamily: 'serif',
          autoSave: true,
          autoSaveInterval: 30000
        }
        
        Object.keys(defaultSettings).forEach(key => {
          if (importedSettings.hasOwnProperty(key)) {
            validSettings[key] = importedSettings[key]
          }
        })
        
        validSettings.updatedAt = new Date().toISOString()
        
        const result = await this.saveSettings(validSettings)
        if (result.success) {
          console.log('设置导入成功')
        }
        return result
      } catch (error) {
        console.error('导入设置失败:', error)
        return { success: false, message: error.message || '导入设置失败' }
      }
    },

    /**
     * 获取设置的某个分类
     */
    getSettingsByCategory(category) {
      switch (category) {
        case 'theme':
          return this.themeSettings
        case 'reading':
          return this.readingSettings
        case 'autoSave':
          return this.autoSaveSettings
        default:
          return this.allSettings
      }
    },

    /**
     * 检查设置是否有效
     */
    validateSettings(settings) {
      const errors = []
      
      if (settings.fontSize && (settings.fontSize < 12 || settings.fontSize > 24)) {
        errors.push('字体大小必须在12-24之间')
      }
      
      if (settings.lineHeight && (settings.lineHeight < 1.0 || settings.lineHeight > 3.0)) {
        errors.push('行高必须在1.0-3.0之间')
      }
      
      if (settings.pageWidth && (settings.pageWidth < 400 || settings.pageWidth > 1200)) {
        errors.push('页面宽度必须在400-1200之间')
      }
      
      if (settings.autoSaveInterval && settings.autoSaveInterval < 10000) {
        errors.push('自动保存间隔不能少于10秒')
      }
      
      return {
        isValid: errors.length === 0,
        errors
      }
    },

    /**
     * 应用主题设置
     */
    applyTheme() {
      const theme = this.settings.theme
      const backgroundColor = this.settings.backgroundColor
      const textColor = this.settings.textColor
      
      // 应用到document根元素
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.style.setProperty('--bg-color', backgroundColor)
      document.documentElement.style.setProperty('--text-color', textColor)
      
      console.log(`主题已应用: ${theme}`)
    },

    /**
     * 获取当前设置的摘要信息
     */
    getSettingsSummary() {
      return {
        theme: this.settings.theme,
        fontSize: this.settings.fontSize,
        readingMode: this.settings.readingMode,
        autoSave: this.settings.autoSave,
        lastUpdated: this.settings.updatedAt,
        isInitialized: this.isInitialized,
        needsSync: this.needsSync
      }
    }
  }
})