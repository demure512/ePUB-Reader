import { defineStore } from 'pinia'
import axios from '@/utils/axios'
import { useAuthStore } from './auth'

export const useBookStore = defineStore('book', {
  state: () => ({
    books: [],
    allBooks: [], // 存储所有书籍，用于分类过滤
    categories: [],
    loading: false,
    error: null,
    currentCategory: '', // 当前选中的分类
    searchQuery: '', // 当前搜索关键词
    storageAdapter: null
  }),
  
  getters: {
    // 获取当前显示的书籍数量
    bookCount: (state) => state.books.length,
    
    // 获取有阅读进度的书籍
    booksWithProgress: (state) => {
      return state.books.filter(book => 
        book.readingProgress && book.readingProgress.percentage > 0
      )
    },
    
    // 获取最近阅读的书籍
    recentBooks: (state) => {
      return state.books
        .filter(book => book.readingProgress && book.readingProgress.percentage > 0)
        .sort((a, b) => {
          const aTime = new Date(a.readingProgress.updatedAt || 0)
          const bTime = new Date(b.readingProgress.updatedAt || 0)
          return bTime - aTime
        })
        .slice(0, 10)
    }
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

    async fetchBooks(forceRefresh = false) {
      this.loading = true
      this.error = null
      
      try {
        const authStore = useAuthStore()
        let books = []
        
        // 如果不是强制刷新且已有数据，直接返回
        if (!forceRefresh && this.allBooks.length > 0) {
          console.log('使用缓存的书籍数据:', this.allBooks.length)
          this.loading = false
          return
        }
        
        if (authStore.isGuest) {
          // 游客模式：从本地存储获取
          console.log('游客模式：从本地存储获取书籍')
          const adapter = this.getStorageAdapter()
          books = await adapter.getBooks()
          console.log('从本地存储获取到书籍数量:', books.length)
        } else if (authStore.isAuthenticated) {
          // 登录模式：从云端获取
          try {
            const response = await axios.get('/api/books')
            books = response.data || []
          } catch (error) {
            console.error('从云端获取书籍失败:', error)
            // 如果云端获取失败，尝试本地缓存
            const adapter = this.getStorageAdapter()
            books = await adapter.getBooks()
          }
        }
        
        // 确保books是数组
        this.allBooks = Array.isArray(books) ? books : []
        this.books = Array.isArray(books) ? books : []
        this.currentCategory = '' // 重置为全部分类
        
        // 自动更新分类列表
        this.updateCategoriesFromBooks()
        
        console.log('获取书籍列表成功:', this.books.length)
        console.log('书籍详情:', this.books.map(b => ({ id: b.id, title: b.title })))
      } catch (error) {
        console.error('获取书籍列表失败:', error)
        this.error = error.message || '获取书籍列表失败'
        this.books = []
        this.allBooks = []
      } finally {
        this.loading = false
      }
    },

    // 游客模式专用的获取书籍方法
    async fetchGuestBooks() {
      return await this.fetchBooks()
    },
    
    async fetchCategories() {
      try {
        // 从书籍数据中提取分类
        this.updateCategoriesFromBooks()
        console.log('获取分类列表成功:', this.categories.length)
      } catch (error) {
        console.error('获取分类列表失败:', error)
        this.categories = []
      }
    },

    // 游客模式专用的获取分类方法
    async fetchGuestCategories() {
      return await this.fetchCategories()
    },

    async fetchBooksByCategory(category) {
      this.loading = true
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：本地过滤
          this.filterBooksByCategory(category)
        } else {
          // 登录模式：从服务器获取
          const response = await axios.get(`/api/books/category/${encodeURIComponent(category)}`)
          this.books = response.data
          this.currentCategory = category
        }
        
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || '获取分类书籍失败'
      } finally {
        this.loading = false
      }
    },
    
    async uploadBook(file, bookData) {
      this.loading = true
      this.error = null
      
      try {
        const adapter = this.getStorageAdapter()
        const authStore = useAuthStore()
        
        let newBook
        if (authStore.isGuest) {
          // 游客模式：保存到本地
          newBook = await this.addLocalBook(bookData, file)
        } else {
          // 登录模式：上传到云端
          const formData = new FormData()
          formData.append('file', file)
          
          Object.keys(bookData).forEach(key => {
            if (bookData[key] !== null && bookData[key] !== undefined) {
              formData.append(key, bookData[key])
            }
          })
          
          const response = await axios.post('/api/books/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          newBook = response.data.book || response.data
        }
        
        // 添加到本地状态
        if (Array.isArray(this.allBooks)) {
          this.allBooks.unshift(newBook)
        } else {
          this.allBooks = [newBook]
        }
        
        // 更新分类列表
        if (newBook.category && !this.categories.includes(newBook.category)) {
          this.categories.push(newBook.category)
        }
        
        // 如果当前没有选择分类或选择的是新书籍的分类，更新显示
        if (!this.currentCategory || this.currentCategory === newBook.category) {
          this.books = [...this.allBooks] // 直接更新显示的书籍列表
        }
        
        console.log('书籍上传成功:', newBook.title)
        return { success: true, book: newBook }
      } catch (error) {
        console.error('书籍上传失败:', error)
        this.error = error.message || error.response?.data?.message || '书籍上传失败'
        return { success: false, message: this.error }
      } finally {
        this.loading = false
      }
    },

    // 兼容旧的上传方法
    async uploadBookAndRefresh(formData) {
      // 从FormData中提取文件和数据
      const file = formData.get('file')
      const bookData = {
        title: formData.get('title'),
        author: formData.get('author'),
        category: formData.get('category'),
        description: formData.get('description')
      }
      
      return await this.uploadBook(file, bookData)
    },
    
    async searchBooks(keyword, category = null) {
      this.loading = true
      this.searchQuery = keyword
      
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：本地搜索
          let filteredBooks = this.allBooks
          
          if (keyword) {
            const lowerKeyword = keyword.toLowerCase()
            filteredBooks = filteredBooks.filter(book => 
              book.title?.toLowerCase().includes(lowerKeyword) ||
              book.author?.toLowerCase().includes(lowerKeyword) ||
              book.category?.toLowerCase().includes(lowerKeyword)
            )
          }
          
          if (category) {
            filteredBooks = filteredBooks.filter(book => book.category === category)
          }
          
          this.books = filteredBooks
        } else {
          // 登录模式：服务器搜索
          let url = `/api/books/search?keyword=${encodeURIComponent(keyword)}`
          if (category) {
            url += `&category=${encodeURIComponent(category)}`
          }
          const response = await axios.get(url)
          this.books = response.data
        }
        
        this.error = null
      } catch (error) {
        this.error = error.response?.data?.message || '搜索失败'
      } finally {
        this.loading = false
      }
    },
    
    async deleteBook(bookId) {
      this.loading = true
      this.error = null
      
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：从本地存储删除
          const adapter = this.getStorageAdapter()
          await adapter.deleteBook(bookId)
        } else {
          // 登录模式：从云端删除
          await axios.delete(`/api/books/${bookId}`)
        }
        
        // 从本地状态中移除
        this.books = this.books.filter(book => book.id !== bookId)
        this.allBooks = this.allBooks.filter(book => book.id !== bookId)
        
        console.log('书籍删除成功')
        return { success: true }
      } catch (error) {
        console.error('书籍删除失败:', error)
        this.error = error.message || error.response?.data?.message || '书籍删除失败'
        return { success: false, message: this.error }
      } finally {
        this.loading = false
      }
    },
    
    async getBook(bookId) {
      try {
        // 先从本地状态查找
        const localBook = this.allBooks.find(book => book.id === bookId)
        if (localBook) {
          return { success: true, data: localBook }
        }
        
        // 如果本地没有，尝试从存储获取
        const adapter = this.getStorageAdapter()
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：从本地存储获取
          const books = await adapter.getBooks()
          const book = books.find(b => b.id === bookId)
          if (book) {
            return { success: true, data: book }
          }
        } else {
          // 登录模式：从云端获取
          const response = await axios.get(`/api/books/${bookId}`)
          return { success: true, data: response.data }
        }
        
        return { success: false, message: '书籍不存在' }
      } catch (error) {
        console.error('获取书籍详情失败:', error)
        return { 
          success: false, 
          message: error.message || error.response?.data?.message || '获取书籍失败' 
        }
      }
    },

    async saveProgress(bookId, percentage, lastLocation, currentChapter = null, scrollPosition = null, currentPage = null, totalPages = null) {
      try {
        const authStore = useAuthStore()
        const progressData = {
          percentage,
          lastLocation,
        }
        
        // 添加新的同步字段
        if (currentChapter !== null) {
          progressData.currentChapter = currentChapter
        }
        if (scrollPosition !== null) {
          progressData.scrollPosition = scrollPosition
        }
        if (currentPage !== null) {
          progressData.currentPage = currentPage
        }
        if (totalPages !== null) {
          progressData.totalPages = totalPages
        }
        
        if (authStore.isGuest) {
          // 游客模式：保存到本地存储
          const adapter = this.getStorageAdapter()
          await adapter.saveReadingProgress(bookId, progressData)
        } else {
          // 登录模式：保存到云端
          await axios.post(`/api/books/${bookId}/progress`, progressData)
        }
        
        // 更新本地书籍数据 - 使用与 BookResponse 一致的字段结构
        const updateBookProgress = (books) => {
          const book = books.find(b => b.id === bookId)
          if (book) {
            // 直接在书籍对象上设置进度字段（与 BookResponse 一致）
            book.percentage = percentage
            book.lastLocation = lastLocation
            
            // 同时保持 readingProgress 对象以兼容旧代码
            if (!book.readingProgress) {
              book.readingProgress = {}
            }
            book.readingProgress.percentage = percentage
            book.readingProgress.lastLocation = lastLocation
            if (currentChapter !== null) book.readingProgress.currentChapter = currentChapter
            if (scrollPosition !== null) book.readingProgress.scrollPosition = scrollPosition
            if (totalPages !== null) book.readingProgress.totalPages = totalPages
            book.readingProgress.updatedAt = new Date().toISOString()
            
            console.log(`书籍 ${bookId} 进度已更新: ${percentage}%`)
          }
        }
        
        updateBookProgress(this.books)
        updateBookProgress(this.allBooks)
        
        console.log(`书籍 ${bookId} 阅读进度已保存: ${percentage}%`)
        return { success: true }
        
      } catch (error) {
        console.error('保存阅读进度失败:', error)
        return {
          success: false,
          message: error.message || '保存进度失败'
        }
      }
    },
    
    /**
     * 同步阅读进度（从服务器获取最新进度）
     */
    async syncProgress(bookId) {
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：从本地获取进度
          const adapter = this.getStorageAdapter()
          const progress = await adapter.getReadingProgress(bookId)
          
          if (progress) {
            // 更新本地书籍数据
            const updateBookProgress = (books) => {
              const book = books.find(b => b.id === bookId)
              if (book) {
                book.readingProgress = progress
              }
            }
            
            updateBookProgress(this.books)
            updateBookProgress(this.allBooks)
            
            console.log(`书籍 ${bookId} 进度同步成功`)
            return { success: true, progress }
          } else {
            console.log(`书籍 ${bookId} 暂无阅读进度`)
            return { success: true, progress: null }
          }
        } else {
          // 登录模式：从云端同步
          const response = await axios.get(`/api/books/${bookId}/sync`)
          
          if (response.data.progress) {
            const progress = response.data.progress
            
            // 更新本地书籍数据
            const updateBookProgress = (books) => {
              const book = books.find(b => b.id === bookId)
              if (book) {
                if (!book.readingProgress) {
                  book.readingProgress = {}
                }
                Object.assign(book.readingProgress, progress)
              }
            }
            
            updateBookProgress(this.books)
            updateBookProgress(this.allBooks)
            
            console.log(`书籍 ${bookId} 进度同步成功`)
            return { success: true, progress }
          } else {
            console.log(`书籍 ${bookId} 暂无阅读进度`)
            return { success: true, progress: null }
          }
        }
        
      } catch (error) {
        console.error('同步阅读进度失败:', error)
        return {
          success: false,
          message: error.message || error.response?.data?.message || '同步进度失败'
        }
      }
    },
    
    /**
     * 获取最近阅读的书籍
     */
    async fetchRecentReading(limit = 10) {
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：从本地数据获取
          const recentBooks = this.allBooks
            .filter(book => book.readingProgress && book.readingProgress.percentage > 0)
            .sort((a, b) => {
              const aTime = new Date(a.readingProgress.updatedAt || 0)
              const bTime = new Date(b.readingProgress.updatedAt || 0)
              return bTime - aTime
            })
            .slice(0, limit)
          
          return { success: true, data: recentBooks }
        } else {
          // 登录模式：从服务器获取
          const response = await axios.get(`/api/books/recent?limit=${limit}`)
          return { success: true, data: response.data }
        }
      } catch (error) {
        console.error('获取最近阅读失败:', error)
        return {
          success: false,
          message: error.message || error.response?.data?.message || '获取最近阅读失败'
        }
      }
    },
    
    /**
     * 自动保存进度（定时调用）
     */
    async autoSaveProgress(bookId, progressData) {
      // 静默保存，不显示错误信息
      try {
        await this.saveProgress(
          bookId,
          progressData.percentage,
          progressData.lastLocation,
          progressData.currentChapter,
          progressData.scrollPosition,
          progressData.currentPage,
          progressData.totalPages
        )
      } catch (error) {
        // 静默处理错误，避免干扰用户阅读
        console.warn('自动保存进度失败:', error)
      }
    },

    // 获取书籍内容
    async getBookContent(bookId) {
      try {
        const adapter = this.getStorageAdapter()
        return await adapter.getBookContent(bookId)
      } catch (error) {
        console.error('获取书籍内容失败:', error)
        return null
      }
    },

    // 从书籍数据中提取分类
    updateCategoriesFromBooks() {
      const categorySet = new Set()
      // 确保allBooks是数组
      if (Array.isArray(this.allBooks)) {
        this.allBooks.forEach(book => {
          if (book.category && book.category.trim()) {
            categorySet.add(book.category.trim())
          }
        })
      }
      this.categories = Array.from(categorySet).sort()
    },

    // 按分类过滤书籍
    filterBooksByCategory(category) {
      this.currentCategory = category
      if (!category) {
        // 显示所有书籍
        this.books = this.allBooks
      } else {
        // 过滤指定分类的书籍
        this.books = this.allBooks.filter(book =>
          book.category && book.category.trim() === category
        )
      }
    },

    // 获取未分类的书籍
    getUncategorizedBooks() {
      this.currentCategory = 'uncategorized'
      this.books = this.allBooks.filter(book =>
        !book.category || book.category.trim() === ''
      )
    },

    // 清空搜索状态
    clearSearch() {
      this.searchQuery = ''
      this.books = this.allBooks
    },

    // 清除书籍数据
    clearBooks() {
      this.books = []
      this.allBooks = []
      this.categories = []
      this.currentCategory = ''
      this.searchQuery = ''
      this.error = null
      this.storageAdapter = null
    },

    // 更新书籍信息
    async updateBook(bookId, updateData) {
      try {
        const authStore = useAuthStore()
        
        if (authStore.isGuest) {
          // 游客模式：更新本地数据
          const updateBookInArray = (books) => {
            const bookIndex = books.findIndex(book => book.id === bookId)
            if (bookIndex !== -1) {
              books[bookIndex] = { ...books[bookIndex], ...updateData, updatedAt: new Date().toISOString() }
            }
          }
          
          updateBookInArray(this.books)
          updateBookInArray(this.allBooks)
          
          // 保存到本地存储
          const adapter = this.getStorageAdapter()
          await adapter.saveBook({ ...updateData, id: bookId })
        } else {
          // 登录模式：更新云端数据
          const response = await axios.put(`/api/books/${bookId}`, updateData)
          const updatedBook = response.data
          
          // 更新本地状态
          const updateBookInArray = (books) => {
            const bookIndex = books.findIndex(book => book.id === bookId)
            if (bookIndex !== -1) {
              books[bookIndex] = updatedBook
            }
          }
          
          updateBookInArray(this.books)
          updateBookInArray(this.allBooks)
        }
        
        return { success: true }
      } catch (error) {
        console.error('更新书籍信息失败:', error)
        return { success: false, message: error.message || '更新书籍信息失败' }
      }
    },

    // 获取存储统计信息
    async getStorageStats() {
      try {
        const adapter = this.getStorageAdapter()
        return await adapter.getStorageStats()
      } catch (error) {
        console.error('获取存储统计失败:', error)
        return {
          bookCount: 0,
          progressCount: 0,
          totalFileSize: 0,
          formattedFileSize: '0 B'
        }
      }
    },

    // 游客模式专用：添加本地书籍
    async addLocalBook(bookData) {
      try {
        const adapter = this.getStorageAdapter()
        
        // 创建与 BookResponse 一致的书籍对象
        const book = {
          id: bookData.id || Date.now().toString(),
          title: bookData.title,
          author: bookData.author || '未知作者',
          category: bookData.category || '未分类',
          fileName: bookData.fileName,
          fileSize: bookData.fileSize,
          fileType: bookData.fileType,
          coverImage: bookData.coverImage || null,
          createdAt: bookData.createdAt || new Date().toISOString(),
          updatedAt: bookData.updatedAt || new Date().toISOString(),
          // BookResponse 兼容字段
          percentage: bookData.percentage || 0,
          lastLocation: bookData.lastLocation || null,
          // 兼容旧字段
          addedAt: bookData.addedAt || bookData.createdAt || new Date().toISOString(),
          lastReadAt: bookData.lastReadAt || null,
          // 保持 readingProgress 对象以兼容现有代码
          readingProgress: {
            percentage: bookData.percentage || 0,
            lastLocation: bookData.lastLocation || null,
            updatedAt: new Date().toISOString()
          }
        }

        console.log('创建书籍对象:', book)

        // 保存书籍信息
        await adapter.addBook(book)
        
        // 如果有文件内容，保存文件内容
        if (bookData.fileContent) {
          await adapter.saveBookContent(book.id, bookData.fileContent)
        }

        // 添加到本地状态数组
        if (Array.isArray(this.allBooks)) {
          this.allBooks.unshift(book)
        } else {
          this.allBooks = [book]
        }
        
        if (Array.isArray(this.books)) {
          this.books.unshift(book)
        } else {
          this.books = [book]
        }
        
        // 更新分类列表
        if (book.category && !this.categories.includes(book.category)) {
          this.categories.push(book.category)
        }

        console.log('本地书籍添加成功:', book.title)
        return { success: true, book }
      } catch (error) {
        console.error('添加本地书籍失败:', error)
        return { success: false, message: error.message || '添加本地书籍失败' }
      }
    }
  }
})