/**
 * 统一存储适配器
 * 自动检测环境并选择合适的存储方式
 * - 浏览器环境：使用 localStorage + IndexedDB
 * - Electron环境：使用文件系统
 * - 游客模式：本地存储
 * - 登录模式：云端存储
 */

import BrowserStorage from './browserStorage.js'
import ElectronStorage from './electronStorage.js'
import axios from './axios.js'
import networkDetector from './networkDetector.js'

class StorageAdapter {
  constructor() {
    this.storage = null
    this.isInitialized = false
    this.environment = this.detectEnvironment()
    this.isOfflineMode = false
    this.offlineQueue = []
    this.setupNetworkListener()
  }

  /**
   * 设置网络状态监听器
   */
  setupNetworkListener() {
    networkDetector.addListener((status, networkInfo) => {
      console.log(`网络状态变化: ${status}`, networkInfo)
      
      if (status === 'online' && this.offlineQueue.length > 0) {
        this.processOfflineQueue()
      }
    })
  }

  /**
   * 处理离线队列中的操作
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return

    console.log(`处理离线队列中的 ${this.offlineQueue.length} 个操作`)
    
    const queue = [...this.offlineQueue]
    this.offlineQueue = []

    for (const operation of queue) {
      try {
        await this.executeOperation(operation)
      } catch (error) {
        console.error('处理离线操作失败:', error)
        // 如果失败，重新加入队列
        this.offlineQueue.push(operation)
      }
    }
  }

  /**
   * 执行操作
   */
  async executeOperation(operation) {
    const { type, data } = operation
    
    switch (type) {
      case 'saveProgress':
        return await this.saveReadingProgressToCloud(data.bookId, data.progress)
      case 'uploadBook':
        return await this.uploadBookToCloud(data.formData)
      case 'saveSettings':
        return await this.saveSettingsToCloud(data.settings)
      default:
        console.warn('未知的离线操作类型:', type)
    }
  }

  /**
   * 添加操作到离线队列
   */
  addToOfflineQueue(type, data) {
    this.offlineQueue.push({
      type,
      data,
      timestamp: Date.now()
    })
    console.log(`添加操作到离线队列: ${type}`, data)
  }

  /**
   * 检测运行环境
   */
  detectEnvironment() {
    // 检测是否在Electron环境中
    if (typeof window !== 'undefined' && window.require) {
      try {
        window.require('electron')
        return 'electron'
      } catch (e) {
        // 不是Electron环境
      }
    }
    
    // 检测是否在Node.js环境中
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return 'node'
    }
    
    // 默认为浏览器环境
    return 'browser'
  }

  /**
   * 初始化存储适配器
   */
  async initialize(isGuest = false) {
    if (this.isInitialized) return

    try {
      if (this.environment === 'electron') {
        this.storage = new ElectronStorage()
      } else {
        this.storage = new BrowserStorage()
      }

      await this.storage.initialize()
      this.isInitialized = true
      
      console.log(`存储适配器初始化完成 - 环境: ${this.environment}, 模式: ${isGuest ? '游客' : '登录'}`)
    } catch (error) {
      console.error('存储适配器初始化失败:', error)
      throw error
    }
  }

  /**
   * 确保适配器已初始化
   */
  async ensureInitialized(isGuest = false) {
    if (!this.isInitialized) {
      await this.initialize(isGuest)
    }
  }

  // ==================== 书籍相关方法 ====================

  /**
   * 获取所有书籍
   */
  async getBooks() {
    await this.ensureInitialized()
    return await this.storage.getBooks()
  }

  /**
   * 保存书籍列表
   */
  async saveBooks(books) {
    await this.ensureInitialized()
    return await this.storage.saveBooks(books)
  }

  /**
   * 添加单本书籍
   */
  async addBook(book) {
    await this.ensureInitialized()
    return await this.storage.addBook(book)
  }

  /**
   * 保存单本书籍（更新或添加）
   */
  async saveBook(book) {
    await this.ensureInitialized()
    // 如果书籍已存在则更新，否则添加
    try {
      return await this.storage.updateBook(book.id, book)
    } catch (error) {
      // 如果更新失败，尝试添加
      return await this.storage.addBook(book)
    }
  }

  /**
   * 更新书籍信息
   */
  async updateBook(bookId, updates) {
    await this.ensureInitialized()
    return await this.storage.updateBook(bookId, updates)
  }

  /**
   * 删除书籍
   */
  async deleteBook(bookId) {
    await this.ensureInitialized()
    return await this.storage.deleteBook(bookId)
  }

  /**
   * 获取书籍内容
   */
  async getBookContent(bookId) {
    await this.ensureInitialized()
    return await this.storage.getBookContent(bookId)
  }

  /**
   * 保存书籍内容
   */
  async saveBookContent(bookId, content) {
    await this.ensureInitialized()
    return await this.storage.saveBookContent(bookId, content)
  }

  // ==================== 阅读进度相关方法 ====================

  /**
   * 获取阅读进度
   */
  async getReadingProgress(bookId) {
    await this.ensureInitialized()
    return await this.storage.getReadingProgress(bookId)
  }

  /**
   * 保存阅读进度
   */
  async saveReadingProgress(bookId, progress) {
    await this.ensureInitialized()
    return await this.storage.saveReadingProgress(bookId, progress)
  }

  /**
   * 获取所有阅读进度
   */
  async getAllReadingProgress() {
    await this.ensureInitialized()
    return await this.storage.getAllReadingProgress()
  }

  // ==================== 用户设置相关方法 ====================

  /**
   * 获取用户设置
   */
  async getSettings() {
    await this.ensureInitialized()
    return await this.storage.getSettings()
  }

  /**
   * 保存用户设置
   */
  async saveSettings(settings) {
    await this.ensureInitialized()
    return await this.storage.saveSettings(settings)
  }

  // ==================== 云端同步方法（仅登录模式） ====================

  /**
   * 从云端获取书籍（支持离线模式）
   */
  async getBooksFromCloud() {
    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：从本地获取书籍')
      return await this.getBooks()
    }

    try {
      const response = await axios.get('/api/books')
      return response.data || []
    } catch (error) {
      console.error('从云端获取书籍失败，尝试从本地获取:', error)
      // 网络请求失败时，回退到本地存储
      try {
        return await this.getBooks()
      } catch (localError) {
        console.error('本地获取书籍也失败:', localError)
        return []
      }
    }
  }

  /**
   * 上传书籍到云端（支持离线模式）
   */
  async uploadBookToCloud(formData) {
    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：将上传操作加入队列')
      this.addToOfflineQueue('uploadBook', { formData })
      throw new Error('当前处于离线模式，书籍上传已加入队列，将在网络恢复后自动上传')
    }

    try {
      const response = await axios.post('/api/books/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      console.error('上传书籍到云端失败:', error)
      // 如果是网络错误，加入离线队列
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        this.addToOfflineQueue('uploadBook', { formData })
      }
      throw error
    }
  }

  /**
   * 从云端获取阅读进度（支持离线模式）
   */
  async getReadingProgressFromCloud() {
    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：从本地获取阅读进度')
      return await this.getAllReadingProgress()
    }

    try {
      const response = await axios.get('/api/reading-progress')
      return response.data || []
    } catch (error) {
      console.error('从云端获取阅读进度失败，尝试从本地获取:', error)
      // 网络请求失败时，回退到本地存储
      try {
        return await this.getAllReadingProgress()
      } catch (localError) {
        console.error('本地获取阅读进度也失败:', localError)
        return []
      }
    }
  }

  /**
   * 保存阅读进度到云端（支持离线模式）
   */
  async saveReadingProgressToCloud(bookId, progress) {
    // 先保存到本地
    await this.saveReadingProgress(bookId, progress)

    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：阅读进度已保存到本地，将在网络恢复后同步到云端')
      this.addToOfflineQueue('saveProgress', { bookId, progress })
      return { success: true, offline: true }
    }

    try {
      const response = await axios.post('/api/reading-progress', {
        bookId,
        ...progress
      })
      return response.data
    } catch (error) {
      console.error('保存阅读进度到云端失败:', error)
      // 如果是网络错误，加入离线队列
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        this.addToOfflineQueue('saveProgress', { bookId, progress })
      }
      throw error
    }
  }

  /**
   * 从云端获取用户设置（支持离线模式）
   */
  async getSettingsFromCloud() {
    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：从本地获取用户设置')
      return await this.getSettings()
    }

    try {
      const response = await axios.get('/api/user/settings')
      return response.data
    } catch (error) {
      if (error.response?.status === 404) {
        // 用户还没有设置，返回null
        return null
      }
      console.error('从云端获取用户设置失败，尝试从本地获取:', error)
      // 网络请求失败时，回退到本地存储
      try {
        return await this.getSettings()
      } catch (localError) {
        console.error('本地获取用户设置也失败:', localError)
        return null
      }
    }
  }

  /**
   * 保存用户设置到云端（支持离线模式）
   */
  async saveSettingsToCloud(settings) {
    // 先保存到本地
    await this.saveSettings(settings)

    // 检查网络状态
    const networkStatus = await networkDetector.checkNetworkStatus()
    if (!networkStatus) {
      console.log('离线模式：用户设置已保存到本地，将在网络恢复后同步到云端')
      this.addToOfflineQueue('saveSettings', { settings })
      return { success: true, offline: true }
    }

    try {
      const response = await axios.put('/api/user/settings', settings)
      return response.data
    } catch (error) {
      console.error('保存用户设置到云端失败:', error)
      // 如果是网络错误，加入离线队列
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        this.addToOfflineQueue('saveSettings', { settings })
      }
      throw error
    }
  }

  // ==================== 数据导出导入方法 ====================

  /**
   * 导出所有数据
   */
  async exportAllData() {
    await this.ensureInitialized()
    
    try {
      const [books, progress, settings] = await Promise.all([
        this.getBooks(),
        this.getAllReadingProgress(),
        this.getSettings()
      ])

      return {
        books: books || [],
        readingProgress: progress || [],
        settings: settings || {},
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  /**
   * 导入所有数据
   */
  async importAllData(data) {
    await this.ensureInitialized()
    
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('无效的导入数据')
      }

      const results = []

      // 导入书籍
      if (data.books && Array.isArray(data.books)) {
        await this.saveBooks(data.books)
        results.push(`导入了 ${data.books.length} 本书籍`)
      }

      // 导入阅读进度
      if (data.readingProgress && Array.isArray(data.readingProgress)) {
        for (const progress of data.readingProgress) {
          if (progress.bookId) {
            await this.saveReadingProgress(progress.bookId, progress)
          }
        }
        results.push(`导入了 ${data.readingProgress.length} 条阅读进度`)
      }

      // 导入用户设置
      if (data.settings && typeof data.settings === 'object') {
        await this.saveSettings(data.settings)
        results.push('导入了用户设置')
      }

      console.log('数据导入完成:', results)
      return { success: true, results }
    } catch (error) {
      console.error('导入数据失败:', error)
      throw error
    }
  }

  // ==================== 清理方法 ====================

  /**
   * 清除所有本地数据
   */
  async clearAllData() {
    await this.ensureInitialized()
    return await this.storage.clearAllData()
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats() {
    await this.ensureInitialized()
    return await this.storage.getStorageStats()
  }
}


// 创建单例实例
const storageAdapter = new StorageAdapter()

export default storageAdapter