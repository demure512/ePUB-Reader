/**
 * 网络状态检测工具
 * 用于检测网络连接状态，支持离线模式
 */

class NetworkDetector {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = new Set()
    this.lastCheckTime = 0
    this.checkInterval = 5000 // 5秒检查一次
    this.setupEventListeners()
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听浏览器的在线/离线事件
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners('online')
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners('offline')
    })

    // 定期检查网络状态（用于更准确的检测）
    setInterval(() => {
      this.checkNetworkStatus()
    }, this.checkInterval)
  }

  /**
   * 主动检查网络状态
   */
  async checkNetworkStatus() {
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return this.isOnline
    }

    this.lastCheckTime = now

    try {
      // 简化网络检测，主要依赖浏览器的在线状态
      const wasOnline = this.isOnline
      this.isOnline = navigator.onLine
      
      if (wasOnline !== this.isOnline) {
        this.notifyListeners(this.isOnline ? 'online' : 'offline')
      }
    } catch (error) {
      // 静默处理错误，不影响应用正常运行
      console.debug('网络状态检测错误:', error)
    }

    return this.isOnline
  }

  /**
   * 获取当前网络状态
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      lastCheck: this.lastCheckTime,
      browserOnline: navigator.onLine
    }
  }

  /**
   * 添加网络状态变化监听器
   */
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * 移除监听器
   */
  removeListener(callback) {
    this.listeners.delete(callback)
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.getNetworkStatus())
      } catch (error) {
        console.error('网络状态监听器执行错误:', error)
      }
    })
  }

  /**
   * 等待网络连接
   */
  async waitForConnection(timeout = 30000) {
    if (this.isOnline) {
      return true
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeListener(onlineListener)
        reject(new Error('等待网络连接超时'))
      }, timeout)

      const onlineListener = (status) => {
        if (status === 'online') {
          clearTimeout(timeoutId)
          this.removeListener(onlineListener)
          resolve(true)
        }
      }

      this.addListener(onlineListener)
    })
  }

  /**
   * 检查是否可以访问特定的API端点
   */
  async canAccessAPI(endpoint = '/api/health') {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 获取网络质量信息（如果支持）
   */
  getNetworkQuality() {
    if ('connection' in navigator) {
      const connection = navigator.connection
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      }
    }
    return null
  }
}

// 创建单例实例
const networkDetector = new NetworkDetector()

export default networkDetector