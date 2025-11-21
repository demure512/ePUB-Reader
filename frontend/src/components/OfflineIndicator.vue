<template>
  <div v-if="showIndicator" class="offline-indicator" :class="indicatorClass">
    <div class="indicator-content">
      <i class="icon" :class="iconClass"></i>
      <span class="text">{{ statusText }}</span>
      <div v-if="offlineQueue > 0" class="queue-info">
        {{ offlineQueue }} 个操作待同步
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import networkDetector from '@/utils/networkDetector.js'
import storageAdapter from '@/utils/storageAdapter.js'

export default {
  name: 'OfflineIndicator',
  setup() {
    const isOnline = ref(navigator.onLine)
    const offlineQueue = ref(0)
    const showIndicator = ref(false)
    const lastStatusChange = ref(Date.now())

    // 计算属性
    const indicatorClass = computed(() => ({
      'online': isOnline.value,
      'offline': !isOnline.value,
      'show': showIndicator.value
    }))

    const iconClass = computed(() => ({
      'fas fa-wifi': isOnline.value,
      'fas fa-wifi-slash': !isOnline.value
    }))

    const statusText = computed(() => {
      if (isOnline.value) {
        return offlineQueue.value > 0 ? '正在同步数据...' : '在线'
      } else {
        return '离线模式'
      }
    })

    // 网络状态监听器
    let networkListener = null

    const handleNetworkChange = (status, networkInfo) => {
      const wasOnline = isOnline.value
      isOnline.value = status === 'online'
      lastStatusChange.value = Date.now()

      // 更新离线队列数量
      if (storageAdapter.offlineQueue) {
        offlineQueue.value = storageAdapter.offlineQueue.length
      }

      // 显示指示器
      showIndicator.value = true

      // 如果状态没有变化且在线，3秒后隐藏指示器
      if (isOnline.value && wasOnline === isOnline.value && offlineQueue.value === 0) {
        setTimeout(() => {
          if (Date.now() - lastStatusChange.value >= 3000) {
            showIndicator.value = false
          }
        }, 3000)
      }

      // 离线模式始终显示指示器
      if (!isOnline.value) {
        showIndicator.value = true
      }

      console.log('网络状态变化:', {
        status,
        isOnline: isOnline.value,
        offlineQueue: offlineQueue.value,
        networkInfo
      })
    }

    // 定期更新离线队列数量
    const updateOfflineQueue = () => {
      if (storageAdapter.offlineQueue) {
        const newQueueLength = storageAdapter.offlineQueue.length
        if (newQueueLength !== offlineQueue.value) {
          offlineQueue.value = newQueueLength
          
          // 如果队列清空了，延迟隐藏指示器
          if (newQueueLength === 0 && isOnline.value) {
            setTimeout(() => {
              if (storageAdapter.offlineQueue.length === 0) {
                showIndicator.value = false
              }
            }, 2000)
          }
        }
      }
    }

    let queueUpdateInterval = null

    onMounted(() => {
      // 初始状态
      isOnline.value = networkDetector.getNetworkStatus().isOnline
      
      // 如果离线，显示指示器
      if (!isOnline.value) {
        showIndicator.value = true
      }

      // 添加网络状态监听器
      networkListener = networkDetector.addListener(handleNetworkChange)

      // 定期更新离线队列
      queueUpdateInterval = setInterval(updateOfflineQueue, 1000)
    })

    onUnmounted(() => {
      if (networkListener) {
        networkDetector.removeListener(networkListener)
      }
      if (queueUpdateInterval) {
        clearInterval(queueUpdateInterval)
      }
    })

    return {
      showIndicator,
      indicatorClass,
      iconClass,
      statusText,
      offlineQueue,
      isOnline
    }
  }
}
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(10px);
  transform: translateY(-100px);
  opacity: 0;
  transition: all 0.3s ease;
  min-width: 120px;
  text-align: center;
}

.offline-indicator.show {
  transform: translateY(0);
  opacity: 1;
}

.offline-indicator.online {
  background: rgba(34, 197, 94, 0.9);
}

.offline-indicator.offline {
  background: rgba(239, 68, 68, 0.9);
}

.indicator-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
}

.icon {
  font-size: 16px;
  margin-right: 8px;
}

.text {
  font-weight: 500;
}

.queue-info {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .offline-indicator {
    top: 10px;
    right: 10px;
    padding: 6px 12px;
    font-size: 12px;
    min-width: 100px;
  }
  
  .icon {
    font-size: 14px;
    margin-right: 6px;
  }
}
</style>