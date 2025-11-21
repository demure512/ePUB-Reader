/**
 * Electron存储实现
 * 使用文件系统进行数据存储
 * - 书籍数据存储在用户数据目录
 * - 支持大文件存储
 * - 提供完整的离线功能
 */

class ElectronStorage {
  constructor() {
    this.isInitialized = false
    this.userDataPath = null
    this.booksPath = null
    this.contentsPath = null
    this.progressPath = null
    this.settingsPath = null
    
    // Electron模块引用
    this.fs = null
    this.path = null
    this.electron = null
  }

  /**
   * 初始化存储
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // 检查Electron环境
      if (!this.checkElectronEnvironment()) {
        throw new Error('不在Electron环境中')
      }

      // 初始化模块引用
      this.initializeModules()

      // 设置存储路径
      this.setupPaths()

      // 创建必要的目录
      await this.createDirectories()

      this.isInitialized = true
      console.log('Electron存储初始化完成')
    } catch (error) {
      console.error('Electron存储初始化失败:', error)
      throw error
    }
  }

  /**
   * 检查Electron环境
   */
  checkElectronEnvironment() {
    try {
      return typeof window !== 'undefined' && window.require
    } catch (error) {
      return false
    }
  }

  /**
   * 初始化模块引用
   */
  initializeModules() {
    try {
      this.electron = window.require('electron')
      this.fs = window.require('fs').promises
      this.path = window.require('path')
    } catch (error) {
      throw new Error('无法加载Electron模块')
    }
  }

  /**
   * 设置存储路径
   */
  setupPaths() {
    // 获取用户数据目录
    this.userDataPath = this.electron.remote.app.getPath('userData')
    
    // 设置各种数据存储路径
    const appDataPath = this.path.join(this.userDataPath, 'EbookLibrary')
    this.booksPath = this.path.join(appDataPath, 'books.json')
    this.contentsPath = this.path.join(appDataPath, 'contents')
    this.progressPath = this.path.join(appDataPath, 'progress.json')
    this.settingsPath = this.path.join(appDataPath, 'settings.json')
  }

  /**
   * 创建必要的目录
   */
  async createDirectories() {
    const directories = [
      this.path.dirname(this.booksPath),
      this.contentsPath
    ]

    for (const dir of directories) {
      try {
        await this.fs.mkdir(dir, { recursive: true })
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error
        }
      }
    }
  }

  /**
   * 读取JSON文件
   */
  async readJsonFile(filePath, defaultValue = null) {
    try {
      const data = await this.fs.readFile(filePath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return defaultValue
      }
      console.error(`读取文件失败 ${filePath}:`, error)
      return defaultValue
    }
  }

  /**
   * 写入JSON文件
   */
  async writeJsonFile(filePath, data) {
    try {
      const jsonData = JSON.stringify(data, null, 2)
      await this.fs.writeFile(filePath, jsonData, 'utf8')
      return true
    } catch (error) {
      console.error(`写入文件失败 ${filePath}:`, error)
      return false
    }
  }

  /**
   * 读取二进制文件
   */
  async readBinaryFile(filePath) {
    try {
      return await this.fs.readFile(filePath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      console.error(`读取二进制文件失败 ${filePath}:`, error)
      return null
    }
  }

  /**
   * 写入二进制文件
   */
  async writeBinaryFile(filePath, data) {
    try {
      await this.fs.writeFile(filePath, data)
      return true
    } catch (error) {
      console.error(`写入二进制文件失败 ${filePath}:`, error)
      return false
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath) {
    try {
      await this.fs.unlink(filePath)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true // 文件不存在，视为删除成功
      }
      console.error(`删除文件失败 ${filePath}:`, error)
      return false
    }
  }

  // ==================== 书籍相关方法 ====================

  /**
   * 获取所有书籍
   */
  async getBooks() {
    try {
      const books = await this.readJsonFile(this.booksPath, [])
      return books || []
    } catch (error) {
      console.error('获取书籍列表失败:', error)
      return []
    }
  }

  /**
   * 保存书籍列表
   */
  async saveBooks(books) {
    try {
      const booksWithTimestamp = books.map(book => ({
        ...book,
        updatedAt: new Date().toISOString()
      }))
      return await this.writeJsonFile(this.booksPath, booksWithTimestamp)
    } catch (error) {
      console.error('保存书籍列表失败:', error)
      return false
    }
  }

  /**
   * 添加单本书籍
   */
  async addBook(book) {
    try {
      const books = await this.getBooks()
      const bookWithTimestamp = {
        ...book,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      books.push(bookWithTimestamp)
      return await this.saveBooks(books)
    } catch (error) {
      console.error('添加书籍失败:', error)
      return false
    }
  }

  /**
   * 更新书籍信息
   */
  async updateBook(bookId, updates) {
    try {
      const books = await this.getBooks()
      const bookIndex = books.findIndex(book => book.id === bookId)
      
      if (bookIndex === -1) {
        console.error('书籍不存在:', bookId)
        return false
      }

      books[bookIndex] = {
        ...books[bookIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }

      return await this.saveBooks(books)
    } catch (error) {
      console.error('更新书籍失败:', error)
      return false
    }
  }

  /**
   * 删除书籍
   */
  async deleteBook(bookId) {
    try {
      // 删除书籍信息
      const books = await this.getBooks()
      const filteredBooks = books.filter(book => book.id !== bookId)
      await this.saveBooks(filteredBooks)

      // 删除书籍内容文件
      const contentPath = this.path.join(this.contentsPath, `${bookId}.dat`)
      await this.deleteFile(contentPath)

      // 删除阅读进度
      const progressList = await this.getAllReadingProgress()
      const filteredProgress = progressList.filter(progress => progress.bookId !== bookId)
      await this.writeJsonFile(this.progressPath, filteredProgress)

      return true
    } catch (error) {
      console.error('删除书籍失败:', error)
      return false
    }
  }

  /**
   * 获取书籍内容
   */
  async getBookContent(bookId) {
    try {
      const contentPath = this.path.join(this.contentsPath, `${bookId}.dat`)
      const content = await this.readBinaryFile(contentPath)
      return content
    } catch (error) {
      console.error('获取书籍内容失败:', error)
      return null
    }
  }

  /**
   * 保存书籍内容
   */
  async saveBookContent(bookId, content) {
    try {
      const contentPath = this.path.join(this.contentsPath, `${bookId}.dat`)
      
      // 如果content是ArrayBuffer，转换为Buffer
      let buffer
      if (content instanceof ArrayBuffer) {
        buffer = Buffer.from(content)
      } else if (Buffer.isBuffer(content)) {
        buffer = content
      } else if (typeof content === 'string') {
        buffer = Buffer.from(content, 'utf8')
      } else {
        buffer = Buffer.from(JSON.stringify(content))
      }

      return await this.writeBinaryFile(contentPath, buffer)
    } catch (error) {
      console.error('保存书籍内容失败:', error)
      return false
    }
  }

  // ==================== 阅读进度相关方法 ====================

  /**
   * 获取阅读进度
   */
  async getReadingProgress(bookId) {
    try {
      const progressList = await this.getAllReadingProgress()
      return progressList.find(progress => progress.bookId === bookId) || null
    } catch (error) {
      console.error('获取阅读进度失败:', error)
      return null
    }
  }

  /**
   * 保存阅读进度
   */
  async saveReadingProgress(bookId, progress) {
    try {
      const progressList = await this.getAllReadingProgress()
      const existingIndex = progressList.findIndex(p => p.bookId === bookId)
      
      const progressData = {
        bookId,
        ...progress,
        lastReadAt: new Date().toISOString()
      }

      if (existingIndex >= 0) {
        progressList[existingIndex] = progressData
      } else {
        progressList.push(progressData)
      }

      return await this.writeJsonFile(this.progressPath, progressList)
    } catch (error) {
      console.error('保存阅读进度失败:', error)
      return false
    }
  }

  /**
   * 获取所有阅读进度
   */
  async getAllReadingProgress() {
    try {
      const progressList = await this.readJsonFile(this.progressPath, [])
      return progressList || []
    } catch (error) {
      console.error('获取所有阅读进度失败:', error)
      return []
    }
  }

  // ==================== 用户设置相关方法 ====================

  /**
   * 获取用户设置
   */
  async getSettings() {
    try {
      return await this.readJsonFile(this.settingsPath, {})
    } catch (error) {
      console.error('获取用户设置失败:', error)
      return {}
    }
  }

  /**
   * 保存用户设置
   */
  async saveSettings(settings) {
    try {
      const settingsWithTimestamp = {
        ...settings,
        updatedAt: new Date().toISOString()
      }
      return await this.writeJsonFile(this.settingsPath, settingsWithTimestamp)
    } catch (error) {
      console.error('保存用户设置失败:', error)
      return false
    }
  }

  // ==================== 数据管理方法 ====================

  /**
   * 清除所有数据
   */
  async clearAllData() {
    try {
      // 删除所有数据文件
      const filesToDelete = [
        this.booksPath,
        this.progressPath,
        this.settingsPath
      ]

      for (const filePath of filesToDelete) {
        await this.deleteFile(filePath)
      }

      // 清空内容目录
      try {
        const files = await this.fs.readdir(this.contentsPath)
        for (const file of files) {
          await this.deleteFile(this.path.join(this.contentsPath, file))
        }
      } catch (error) {
        // 目录可能不存在，忽略错误
      }

      console.log('所有本地数据已清除')
      return true
    } catch (error) {
      console.error('清除数据失败:', error)
      return false
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats() {
    try {
      const [books, progress] = await Promise.all([
        this.getBooks(),
        this.getAllReadingProgress()
      ])

      // 计算内容文件大小
      let contentsSize = 0
      let contentsCount = 0
      
      try {
        const contentFiles = await this.fs.readdir(this.contentsPath)
        for (const file of contentFiles) {
          const filePath = this.path.join(this.contentsPath, file)
          const stats = await this.fs.stat(filePath)
          contentsSize += stats.size
          contentsCount++
        }
      } catch (error) {
        // 目录可能不存在
      }

      // 计算其他文件大小
      const booksSize = JSON.stringify(books).length
      const progressSize = JSON.stringify(progress).length

      return {
        books: {
          count: books.length,
          size: booksSize
        },
        contents: {
          count: contentsCount,
          size: contentsSize
        },
        progress: {
          count: progress.length,
          size: progressSize
        },
        total: {
          size: booksSize + contentsSize + progressSize
        },
        environment: 'electron',
        paths: {
          userData: this.userDataPath,
          books: this.booksPath,
          contents: this.contentsPath,
          progress: this.progressPath,
          settings: this.settingsPath
        }
      }
    } catch (error) {
      console.error('获取存储统计失败:', error)
      return null
    }
  }

  /**
   * 备份数据
   */
  async backupData(backupPath) {
    try {
      const data = {
        books: await this.getBooks(),
        progress: await this.getAllReadingProgress(),
        settings: await this.getSettings(),
        backedUpAt: new Date().toISOString()
      }

      await this.writeJsonFile(backupPath, data)
      console.log('数据备份完成:', backupPath)
      return true
    } catch (error) {
      console.error('数据备份失败:', error)
      return false
    }
  }

  /**
   * 恢复数据
   */
  async restoreData(backupPath) {
    try {
      const data = await this.readJsonFile(backupPath)
      if (!data) {
        throw new Error('备份文件无效')
      }

      if (data.books) {
        await this.saveBooks(data.books)
      }

      if (data.progress) {
        await this.writeJsonFile(this.progressPath, data.progress)
      }

      if (data.settings) {
        await this.saveSettings(data.settings)
      }

      console.log('数据恢复完成')
      return true
    } catch (error) {
      console.error('数据恢复失败:', error)
      return false
    }
  }
}

export default ElectronStorage