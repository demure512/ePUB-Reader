<template>
  <div class="upload-page">
    <div class="container">
      <div class="upload-header">
        <h1>{{ authStore.isGuest ? '添加书籍' : '上传书籍' }}</h1>
        <p v-if="authStore.isGuest">游客模式：书籍将保存在本地设备</p>
        <p v-else>支持EPUB、TXT格式，最大100MB</p>
      </div>
      
      <div class="upload-form-container">
        <form @submit.prevent="handleUpload" class="upload-form">
          <div class="form-group">
            <label>选择文件</label>
            <div class="file-input-container">
              <input
                type="file"
                @change="handleFileSelect"
                accept=".epub,.txt"
                class="file-input"
                id="file-input"
                required
              />
              <label for="file-input" class="file-input-label">
                <span v-if="selectedFile">{{ selectedFile.name }}</span>
                <span v-else>点击选择文件</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="title">书名</label>
            <input 
              v-model="form.title"
              type="text"
              id="title"
              placeholder="请输入书名"
              class="input"
            />
          </div>
          
          <div class="form-group">
            <label for="author">作者</label>
            <input 
              v-model="form.author"
              type="text"
              id="author"
              placeholder="请输入作者"
              class="input"
            />
          </div>
          
          <div class="form-group">
            <label for="category">分类</label>
            <div class="category-input-container">
              <input
                v-model="form.category"
                type="text"
                id="category"
                placeholder="请输入分类（可选）"
                class="input"
                @input="onCategoryInput"
                @focus="showCategorySuggestions = true"
                @blur="hideCategorySuggestions"
              />
              <div v-if="showCategorySuggestions && filteredCategories.length > 0" class="category-suggestions">
                <div
                  v-for="category in filteredCategories"
                  :key="category"
                  class="category-suggestion"
                  @mousedown="selectCategory(category)"
                >
                  {{ category }}
                </div>
              </div>
            </div>
            <div class="category-help">
              <small>常用分类：小说、技术、历史、科幻、文学等</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary upload-btn" :disabled="uploading || !selectedFile">
              {{ uploading ? (authStore.isGuest ? '添加中...' : '上传中...') : (authStore.isGuest ? '添加到本地' : '上传') }}
            </button>
            <router-link to="/library" class="btn">取消</router-link>
          </div>
        </form>
        
        <div v-if="uploadProgress > 0" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p>{{ authStore.isGuest ? '处理进度' : '上传进度' }}: {{ uploadProgress }}%</p>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookStore } from '@/stores/book'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import ePub from 'epubjs'

const bookStore = useBookStore()
const authStore = useAuthStore()
const router = useRouter()

const selectedFile = ref(null)
const coverImageFile = ref(null)
const form = ref({
  title: '',
  author: '',
  category: ''
})

const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref('')
const success = ref('')

// 分类建议相关
const showCategorySuggestions = ref(false)
const filteredCategories = computed(() => {
  if (!form.value.category) {
    return bookStore.categories.slice(0, 5) // 显示前5个分类
  }
  return bookStore.categories.filter(category =>
    category.toLowerCase().includes(form.value.category.toLowerCase())
  ).slice(0, 5)
})

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    error.value = ''
    
    // 如果是epub文件，尝试解析
    if (file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub')) {
      parseEpub(file)
    } else {
      // 如果没有输入书名，使用文件名
      if (!form.value.title) {
        form.value.title = file.name.replace(/\.[^/.]+$/, '')
      }
    }
  }
}

const parseEpub = (file) => {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const book = ePub(e.target.result)
      const metadata = await book.loaded.metadata
      
      // Only set from metadata if the user hasn't already typed something
      if (!form.value.title && metadata.title) {
        form.value.title = metadata.title;
      }
      
      if (!form.value.author && metadata.creator) {
        form.value.author = metadata.creator;
      }
      
      // 参考后端实现的封面提取逻辑
      try {
        // 方法1：使用 book.coverUrl() - 对应后端的 epub.getCoverImage()
        try {
          const coverUrl = await book.coverUrl()
          if (coverUrl) {
            const response = await fetch(coverUrl)
            if (response.ok) {
              const blob = await response.blob()
              if (blob.size > 0) {
                // 转换为base64格式存储
                const base64 = await blobToBase64(blob)
                coverImageFile.value = base64
                return // 成功提取，直接返回
              }
            }
          }
        } catch (method1Error) {
          console.warn('封面提取方法1失败:', method1Error)
        }
        
        // 方法2：直接从spine中查找封面
        try {
          console.log('尝试方法2：从spine中查找封面...')
          const spine = await book.loaded.spine
          console.log('EPUB spine:', spine)
          
          // 查找第一个图片资源作为封面
          for (let item of spine.spineItems) {
            if (item.href && (item.href.toLowerCase().includes('cover') ||
                             item.href.toLowerCase().includes('title'))) {
              console.log('找到可能的封面页面:', item.href)
              try {
                const section = book.section(item.href)
                const content = await section.load()
                
                // 从HTML内容中提取图片
                const parser = new DOMParser()
                const doc = parser.parseFromString(content, 'text/html')
                const images = doc.querySelectorAll('img')
                
                if (images.length > 0) {
                  const imgSrc = images[0].src
                  console.log('找到封面图片:', imgSrc)
                  
                  // 获取图片资源
                  const imgResource = book.resources.get(imgSrc)
                  if (imgResource) {
                    const imgData = await imgResource.getData()
                    if (imgData && imgData.byteLength > 0) {
                      const blob = new Blob([imgData], { type: 'image/jpeg' })
                      const base64 = await blobToBase64(blob)
                      console.log('方法2成功：封面转换为base64，长度:', base64.length)
                      coverImageFile.value = base64
                      return
                    }
                  }
                }
              } catch (sectionError) {
                console.warn('处理section失败:', sectionError)
              }
            }
          }
        } catch (method2Error) {
          console.warn('方法2失败:', method2Error)
        }
        
        // 方法3：从resources中查找第一个图片
        try {
          console.log('尝试方法3：从resources中查找第一个图片...')
          const resources = await book.loaded.resources
          console.log('EPUB resources数量:', resources.length)
          
          // 查找第一个图片资源
          for (let resource of resources) {
            if (resource.type && resource.type.startsWith('image/')) {
              console.log('找到图片资源:', resource.href, resource.type)
              try {
                const imgData = await resource.getData()
                if (imgData && imgData.byteLength > 0) {
                  const blob = new Blob([imgData], { type: resource.type })
                  const base64 = await blobToBase64(blob)
                  console.log('方法3成功：封面转换为base64，长度:', base64.length)
                  coverImageFile.value = base64
                  return
                }
              } catch (resourceError) {
                console.warn('处理resource失败:', resourceError)
              }
            }
          }
        } catch (method3Error) {
          console.warn('方法3失败:', method3Error)
        }
        
        console.log('所有封面提取方法都失败了')
        
      } catch (coverError) {
        console.error('封面提取过程中发生错误:', coverError)
      }
    } catch (err) {
      console.error('解析EPUB失败:', err)
      // 解析失败，回退到使用文件名
      if (!form.value.title) {
        form.value.title = file.name.replace(/\.[^/.]+$/, '')
      }
    }
  }
  reader.readAsArrayBuffer(file)
}

// 分类建议相关方法
const onCategoryInput = () => {
  showCategorySuggestions.value = true
}

const selectCategory = (category) => {
  form.value.category = category
  showCategorySuggestions.value = false
}

const hideCategorySuggestions = () => {
  // 延迟隐藏，让点击事件能够触发
  setTimeout(() => {
    showCategorySuggestions.value = false
  }, 200)
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    error.value = '请选择文件'
    return
  }
  
  uploading.value = true
  uploadProgress.value = 0
  error.value = ''
  success.value = ''
  
  try {
    let result
    
    if (authStore.isGuest) {
      // 游客模式：处理本地文件
      result = await handleGuestUpload()
    } else {
      // 登录模式：上传到服务器
      result = await handleServerUpload()
    }
    
    uploadProgress.value = 100
    
    if (result.success) {
      const successMsg = authStore.isGuest
        ? '书籍已添加到本地！正在跳转到书库...'
        : '上传成功！正在跳转到书库...'
      success.value = successMsg
      
      // 重置表单
      resetForm()
      
      console.log(authStore.isGuest ? '本地添加成功' : '上传成功')
      
      // 延迟跳转到书库页面，让用户看到成功消息
      setTimeout(() => {
        router.push('/library')
      }, 1500)
    } else {
      error.value = result.message
    }
  } catch (err) {
    const errorMsg = authStore.isGuest ? '添加失败，请重试' : '上传失败，请重试'
    error.value = errorMsg
    console.error('处理文件失败:', err)
  } finally {
    uploading.value = false
  }
}

// 游客模式文件处理
const handleGuestUpload = async () => {
  // 模拟处理进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += 15
    }
  }, 200)
  
  try {
    // 读取文件内容
    const fileContent = await readFileAsArrayBuffer(selectedFile.value)
    
    // 创建书籍对象 - 与登录模式的 BookResponse 结构保持一致
    const bookData = {
      id: Date.now().toString(), // 使用时间戳作为ID
      title: form.value.title || selectedFile.value.name.replace(/\.[^/.]+$/, ''),
      author: form.value.author || '未知作者',
      category: form.value.category || '未分类',
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      fileType: selectedFile.value.name.split('.').pop().toUpperCase(),
      fileContent: fileContent, // 存储文件内容
      coverImage: coverImageFile.value || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 使用与 BookResponse 一致的字段名
      percentage: 0,  // 而不是 progress
      lastLocation: null  // 而不是 lastReadAt
    }
    
    console.log('书籍添加成功:', bookData.title)
    
    // 通过bookStore添加本地书籍
    const result = await bookStore.addLocalBook(bookData)
    
    clearInterval(progressInterval)
    return result
    
  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

// 服务器上传处理
const handleServerUpload = async () => {
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  
  if (form.value.title) formData.append('title', form.value.title)
  if (form.value.author) formData.append('author', form.value.author)
  if (form.value.category) formData.append('category', form.value.category)
  if (coverImageFile.value) {
    formData.append('coverImage', coverImageFile.value)
  }
  
  // 模拟上传进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += 10
    }
  }, 100)
  
  try {
    const result = await bookStore.uploadBookAndRefresh(formData)
    clearInterval(progressInterval)
    return result
  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

// 重置表单
const resetForm = () => {
  selectedFile.value = null
  form.value = {
    title: '',
    author: '',
    category: ''
  }
  coverImageFile.value = null
  
  // 清空文件输入
  const fileInput = document.getElementById('file-input')
  if (fileInput) {
    fileInput.value = ''
  }
}

// 读取文件为ArrayBuffer
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// 读取文件为DataURL
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 将Blob转换为Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 组件挂载时加载现有分类
onMounted(async () => {
  // 直接从后端获取分类列表
  await bookStore.fetchCategories()
})
</script>

<style scoped>
.upload-page {
  min-height: 70vh;
}

.upload-header {
  text-align: center;
  padding: 40px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 40px;
}

.upload-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.upload-header p {
  color: var(--text-secondary);
  font-size: 16px;
}

.upload-form-container {
  max-width: 500px;
  margin: 0 auto;
}

.upload-form {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 30px;
  box-shadow: var(--shadow);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.file-input-container {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-input-label {
  display: block;
  padding: 40px 20px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  text-align: center;
  background: var(--surface-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.file-input-label:hover {
  border-color: var(--primary-color);
  background: var(--background-color);
}

.file-input:focus + .file-input-label {
  border-color: var(--primary-color);
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

.upload-btn {
  min-width: 120px;
}

.upload-progress {
  margin-top: 20px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--surface-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.error-message {
  color: #dc3545;
  margin-top: 20px;
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
}

.success-message {
  color: #155724;
  margin-top: 20px;
  padding: 15px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  text-align: center;
}

@media (max-width: 768px) {
  .upload-form-container {
    margin: 0 15px;
  }
  
  .upload-form {
    padding: 20px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>