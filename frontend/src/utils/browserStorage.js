/**
 * 浏览器存储实现
 * 使用 localStorage + IndexedDB 进行数据存储
 * - localStorage: 存储小量数据（设置、书籍元数据等）
 * - IndexedDB: 存储大量数据（书籍内容、封面图片等）
 */

class BrowserStorage {
  constructor() {
    this.dbName = 'EbookLibrary'
    this.dbVersion = 1
    this.db = null
    this.isInitialized = false
  }

  /**
   * 初始化存储
   */
  async initialize() {
    if (this.isInitialized) return

    try {
      // 检查浏览器支持
      if (!this.checkSupport()) {
        throw new Error('浏览器不支持所需的存储功能')
      }

      // 初始化IndexedDB
      await this.initIndexedDB()
      
      this.isInitialized = true
      console.log('浏览器存储初始化完成')
    } catch (error) {
      console.error('浏览器存储初始化失败:', error)
      throw error
    }
  }

  /**
   * 确保存储已初始化
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  /**
   * 检查浏览器支持
   */
  checkSupport() {
    return (
      typeof Storage !== 'undefined' && // localStorage支持
      typeof indexedDB !== 'undefined'   // IndexedDB支持
    )
  }

  /**
   * 初始化IndexedDB
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('无法打开IndexedDB数据库'))
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 创建书籍存储
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' })
          bookStore.createIndex('title', 'title', { unique: false })
          bookStore.createIndex('author', 'author', { unique: false })
          bookStore.createIndex('category', 'category', { unique: false })
        }

        // 创建书籍内容存储
        if (!db.objectStoreNames.contains('bookContents')) {
          db.createObjectStore('bookContents', { keyPath: 'bookId' })
        }

        // 创建阅读进度存储
        if (!db.objectStoreNames.contains('readingProgress')) {
          const progressStore = db.createObjectStore('readingProgress', { keyPath: 'bookId' })
          progressStore.createIndex('lastReadAt', 'lastReadAt', { unique: false })
        }

        console.log('IndexedDB数据库结构创建完成')
      }
    })
  }

  /**
   * 执行IndexedDB事务
   */
  async executeTransaction(storeName, mode, operation) {
    await this.ensureInitialized()
    
    if (!this.db) {
      throw new Error('数据库未初始化')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], mode)
      const store = transaction.objectStore(storeName)

      transaction.oncomplete = () => {
        // 只有在没有返回值的操作（如 add, put, delete）时才在这里 resolve
        if (!operation.hasReturnValue) {
          resolve()
        }
      }
      
      transaction.onerror = () => reject(transaction.error)

      try {
        const result = operation(store)
        if (result && typeof result.onsuccess !== 'undefined') {
          // 这是一个 IDBRequest 对象
          result.onsuccess = (event) => resolve(event.target.result)
          result.onerror = () => reject(result.error)
        } else {
          // 这是一个直接返回值
          resolve(result)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // ==================== localStorage 操作方法 ====================

  /**
   * 从localStorage获取数据
   */
  getFromLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`从localStorage读取${key}失败:`, error)
      return defaultValue
    }
  }

  /**
   * 保存数据到localStorage
   */
  saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`保存${key}到localStorage失败:`, error)
      return false
    }
  }

  /**
   * 从localStorage删除数据
   */
  removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`从localStorage删除${key}失败:`, error)
      return false
    }
  }

  // ==================== 书籍相关方法 ====================

  /**
   * 获取所有书籍
   */
  async getBooks() {
    try {
      await this.ensureInitialized()
      
      const books = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['books'], 'readonly')
        const store = transaction.objectStore('books')
        const request = store.getAll()
        
        request.onsuccess = (event) => {
          const result = event.target.result || []
          console.log('IndexedDB getBooks 成功，获取到书籍数量:', result.length)
          resolve(result)
        }
        
        request.onerror = (event) => {
          console.error('IndexedDB getBooks 失败:', event.target.error)
          reject(event.target.error)
        }
        
        transaction.onerror = (event) => {
          console.error('IndexedDB 事务失败:', event.target.error)
          reject(event.target.error)
        }
      })
      
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
      await this.ensureInitialized()
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['books'], 'readwrite')
        const store = transaction.objectStore('books')
        
        transaction.oncomplete = () => {
          console.log('保存书籍列表成功，数量:', books.length)
          resolve(true)
        }
        
        transaction.onerror = (event) => {
          console.error('保存书籍列表事务失败:', event.target.error)
          reject(event.target.error)
        }
        
        // 清空现有数据
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => {
          // 添加新数据
          books.forEach(book => {
            const addRequest = store.add(book)
            addRequest.onerror = (event) => {
              console.error('添加书籍失败:', book.title, event.target.error)
            }
          })
        }
        
        clearRequest.onerror = (event) => {
          console.error('清空书籍数据失败:', event.target.error)
          reject(event.target.error)
        }
      })
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
      await this.ensureInitialized()
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['books'], 'readwrite')
        const store = transaction.objectStore('books')
        const request = store.add(book)
        
        request.onsuccess = () => {
          console.log('添加书籍成功:', book.title)
          resolve(true)
        }
        
        request.onerror = (event) => {
          console.error('添加书籍失败:', book.title, event.target.error)
          reject(event.target.error)
        }
        
        transaction.onerror = (event) => {
          console.error('添加书籍事务失败:', event.target.error)
          reject(event.target.error)
        }
      })
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
      await this.ensureInitialized()
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['books'], 'readwrite')
        const store = transaction.objectStore('books')
        const getRequest = store.get(bookId)
        
        getRequest.onsuccess = (event) => {
          const existingBook = event.target.result
          if (existingBook) {
            const updatedBook = { ...existingBook, ...updates, updatedAt: new Date().toISOString() }
            const putRequest = store.put(updatedBook)
            
            putRequest.onsuccess = () => {
              console.log('更新书籍成功:', bookId)
              resolve(true)
            }
            
            putRequest.onerror = (event) => {
              console.error('更新书籍失败:', bookId, event.target.error)
              reject(event.target.error)
            }
          } else {
            console.log('书籍不存在，无法更新:', bookId)
            resolve(false)
          }
        }
        
        getRequest.onerror = (event) => {
          console.error('获取书籍失败:', bookId, event.target.error)
          reject(event.target.error)
        }
        
        transaction.onerror = (event) => {
          console.error('更新书籍事务失败:', event.target.error)
          reject(event.target.error)
        }
      })
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
      await this.executeTransaction('books', 'readwrite', (store) => {
        return store.delete(bookId)
      })

      // 删除书籍内容
      await this.executeTransaction('bookContents', 'readwrite', (store) => {
        return store.delete(bookId)
      })

      // 删除阅读进度
      await this.executeTransaction('readingProgress', 'readwrite', (store) => {
        return store.delete(bookId)
      })

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
      await this.ensureInitialized()
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookContents'], 'readonly')
        const store = transaction.objectStore('bookContents')
        const request = store.get(bookId)
        
        request.onsuccess = (event) => {
          const result = event.target.result
          const content = result?.content || null
          console.log('获取书籍内容:', bookId, content ? '成功' : '未找到')
          resolve(content)
        }
        
        request.onerror = (event) => {
          console.error('获取书籍内容失败:', bookId, event.target.error)
          reject(event.target.error)
        }
        
        transaction.onerror = (event) => {
          console.error('获取书籍内容事务失败:', event.target.error)
          reject(event.target.error)
        }
      })
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
      await this.ensureInitialized()
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['bookContents'], 'readwrite')
        const store = transaction.objectStore('bookContents')
        const contentData = {
          bookId,
          content,
          savedAt: new Date().toISOString()
        }
        const request = store.put(contentData)
        
        request.onsuccess = () => {
          console.log('保存书籍内容成功:', bookId)
          resolve(true)
        }
        
        request.onerror = (event) => {
          console.error('保存书籍内容失败:', bookId, event.target.error)
          reject(event.target.error)
        }
        
        transaction.onerror = (event) => {
          console.error('保存书籍内容事务失败:', event.target.error)
          reject(event.target.error)
        }
      })
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
      const progress = await this.executeTransaction('readingProgress', 'readonly', (store) => {
        return store.get(bookId)
      })
      return progress || null
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
      const progressData = {
        bookId,
        ...progress,
        lastReadAt: new Date().toISOString()
      }

      await this.executeTransaction('readingProgress', 'readwrite', (store) => {
        return store.put(progressData)
      })
      return true
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
      const progressList = await this.executeTransaction('readingProgress', 'readonly', (store) => {
        return store.getAll()
      })
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
    return this.getFromLocalStorage('userSettings', {})
  }

  /**
   * 保存用户设置
   */
  async saveSettings(settings) {
    const settingsWithTimestamp = {
      ...settings,
      updatedAt: new Date().toISOString()
    }
    return this.saveToLocalStorage('userSettings', settingsWithTimestamp)
  }

  // ==================== 数据管理方法 ====================

  /**
   * 清除所有数据
   */
  async clearAllData() {
    try {
      // 清除IndexedDB数据
      const storeNames = ['books', 'bookContents', 'readingProgress']
      for (const storeName of storeNames) {
        await this.executeTransaction(storeName, 'readwrite', (store) => {
          return store.clear()
        })
      }

      // 清除localStorage数据
      const localStorageKeys = ['userSettings', 'authToken', 'guestData']
      localStorageKeys.forEach(key => {
        this.removeFromLocalStorage(key)
      })

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
      const [books, contents, progress] = await Promise.all([
        this.getBooks(),
        this.executeTransaction('bookContents', 'readonly', (store) => store.getAll()),
        this.getAllReadingProgress()
      ])

      // 计算存储大小（近似值）
      const booksSize = JSON.stringify(books).length
      const contentsSize = contents.reduce((total, item) => {
        return total + (item.content ? item.content.length : 0)
      }, 0)
      const progressSize = JSON.stringify(progress).length

      return {
        books: {
          count: books.length,
          size: booksSize
        },
        contents: {
          count: contents.length,
          size: contentsSize
        },
        progress: {
          count: progress.length,
          size: progressSize
        },
        total: {
          size: booksSize + contentsSize + progressSize
        },
        environment: 'browser'
      }
    } catch (error) {
      console.error('获取存储统计失败:', error)
      return null
    }
  }

  /**
   * 检查存储空间
   */
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          usagePercentage: (estimate.usage / estimate.quota) * 100
        }
      } catch (error) {
        console.error('检查存储配额失败:', error)
      }
    }
    return null
  }
}

export default BrowserStorage