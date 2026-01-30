<template>
  <div class="dashboard-container">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalUsers || 0 }}</span>
          <span class="stat-label">总用户数</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon books-icon">
          <el-icon><Reading /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalBooks || 0 }}</span>
          <span class="stat-label">书籍总数</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon progress-icon">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalReadingProgress || 0 }}</span>
          <span class="stat-label">阅读记录</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon admin-icon">
          <el-icon><Avatar /></el-icon>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ (stats.usersByRole?.ROLE_ADMIN || 0) + (stats.usersByRole?.ROLE_SUPER_ADMIN || 0) }}</span>
          <span class="stat-label">管理员数</span>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="chart-section">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><TrendCharts /></el-icon>
          用户阅读量统计
        </h2>
        <span class="section-subtitle">过去12个月阅读进度汇总</span>
      </div>
      
      <div class="chart-container" ref="chartContainer">
        <div 
          ref="chartRef" 
          class="chart-wrapper"
          v-loading="chartLoading"
          element-loading-text="加载图表数据..."
          element-loading-background="rgba(15, 18, 25, 0.9)"
        ></div>
      </div>
    </div>

    <!-- Books Table Section -->
    <div class="table-section">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Reading /></el-icon>
          书籍列表
        </h2>
        <span class="section-subtitle">所有用户上传的书籍</span>
      </div>
      
      <el-table
        :data="books"
        v-loading="tableLoading"
        element-loading-text="加载书籍数据..."
        element-loading-background="rgba(15, 18, 25, 0.9)"
        class="books-table"
        stripe
      >
        <el-table-column label="书名" prop="title" min-width="180">
          <template #default="{ row }">
            <div class="book-title-cell">
              <el-icon class="book-icon"><Reading /></el-icon>
              <span class="book-title">{{ row.title || '未知书名' }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="作者" prop="author" min-width="120">
          <template #default="{ row }">
            <span class="text-secondary">{{ row.author || '未知作者' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="分类" prop="category" min-width="100">
          <template #default="{ row }">
            <el-tag v-if="row.category" type="info" size="small" effect="dark">
              {{ row.category }}
            </el-tag>
            <span v-else class="text-muted">未分类</span>
          </template>
        </el-table-column>
        
        <el-table-column label="上传者" prop="uploaderUsername" min-width="100">
          <template #default="{ row }">
            <div class="uploader-cell">
              <el-avatar :size="24" class="uploader-avatar">
                {{ row.uploaderUsername?.charAt(0)?.toUpperCase() || 'U' }}
              </el-avatar>
              <span>{{ row.uploaderUsername || '未知' }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="当前章节" prop="currentChapter" min-width="140">
          <template #default="{ row }">
            <span class="text-secondary">{{ row.currentChapter || '尚未阅读' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="阅读进度" prop="readingProgress" min-width="120">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress 
                :percentage="Math.round(row.readingProgress || 0)" 
                :stroke-width="6"
                :color="getProgressColor(row.readingProgress)"
              />
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="上传时间" prop="uploadTime" min-width="140">
          <template #default="{ row }">
            <span class="text-secondary">{{ formatDateTime(row.uploadTime) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="最后阅读" prop="lastReadTime" min-width="140">
          <template #default="{ row }">
            <span class="text-secondary">{{ formatDateTime(row.lastReadTime) }}</span>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalBooks"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import axios from '@/utils/axios'
import { 
  User, 
  Reading, 
  TrendCharts,
  Avatar
} from '@element-plus/icons-vue'

// Refs
const chartRef = ref(null)
const chartContainer = ref(null)
let chartInstance = null

// State
const stats = ref({})
const chartData = ref([])
const books = ref([])
const chartLoading = ref(true)
const tableLoading = ref(true)
const currentPage = ref(1)
const pageSize = ref(10)
const totalBooks = ref(0)

// Methods
const fetchStats = async () => {
  try {
    const response = await axios.get('/api/admin/stats')
    stats.value = response.data
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

const fetchChartData = async () => {
  chartLoading.value = true
  try {
    const response = await axios.get('/api/admin/stats/reading-volume')
    chartData.value = response.data
    await nextTick()
    initChart()
  } catch (error) {
    console.error('Failed to fetch chart data:', error)
    // Initialize with empty data
    chartData.value = []
    await nextTick()
    initChart()
  } finally {
    chartLoading.value = false
  }
}

const fetchBooks = async () => {
  tableLoading.value = true
  try {
    const response = await axios.get('/api/admin/books', {
      params: {
        page: currentPage.value - 1,
        size: pageSize.value
      }
    })
    books.value = response.data.books || []
    totalBooks.value = response.data.totalItems || 0
  } catch (error) {
    console.error('Failed to fetch books:', error)
  } finally {
    tableLoading.value = false
  }
}

const initChart = () => {
  if (!chartRef.value) return
  
  // Dispose existing chart
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value, 'dark')
  
  // Generate last 12 months labels
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toISOString().slice(0, 7))
  }
  
  // Map chart data to months
  const dataMap = {}
  chartData.value.forEach(item => {
    dataMap[item.month] = item.totalProgress || 0
  })
  
  const seriesData = months.map(month => dataMap[month] || 0)
  const displayMonths = months.map(m => {
    const [year, month] = m.split('-')
    return `${year}年${month}月`
  })
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 31, 46, 0.95)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0'
      },
      formatter: (params) => {
        const data = params[0]
        return `
          <div style="padding: 8px;">
            <div style="color: #94a3b8; margin-bottom: 4px;">${data.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: linear-gradient(135deg, #60a5fa, #a78bfa);"></span>
              <span style="color: #e2e8f0; font-weight: 600;">阅读进度: ${data.value}%</span>
            </div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: displayMonths,
      axisLine: {
        lineStyle: {
          color: 'rgba(96, 165, 250, 0.2)'
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        rotate: 45
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      name: '阅读进度总和 (%)',
      nameTextStyle: {
        color: '#64748b',
        fontSize: 12
      },
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(96, 165, 250, 0.1)'
        }
      }
    },
    series: [
      {
        name: '阅读进度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        sampling: 'lttb',
        itemStyle: {
          color: '#60a5fa',
          borderColor: '#1a1f2e',
          borderWidth: 2
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#a78bfa' }
          ])
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(96, 165, 250, 0.4)' },
            { offset: 0.5, color: 'rgba(96, 165, 250, 0.1)' },
            { offset: 1, color: 'rgba(96, 165, 250, 0)' }
          ])
        },
        data: seriesData,
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: '#a78bfa',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(167, 139, 250, 0.5)'
          }
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchBooks()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchBooks()
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '—'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getProgressColor = (progress) => {
  if (progress >= 80) return '#10b981'
  if (progress >= 50) return '#60a5fa'
  if (progress >= 20) return '#f59e0b'
  return '#64748b'
}

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchStats(), fetchChartData(), fetchBooks()])
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100%;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(96, 165, 250, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(96, 165, 250, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.users-icon {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(96, 165, 250, 0.05) 100%);
  color: #60a5fa;
}

.books-icon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%);
  color: #10b981;
}

.progress-icon {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.05) 100%);
  color: #a78bfa;
}

.admin-icon {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
  color: #f59e0b;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

/* Section Styles */
.chart-section,
.table-section {
  background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 4px 0;
}

.section-title .el-icon {
  color: #60a5fa;
}

.section-subtitle {
  font-size: 13px;
  color: #64748b;
}

/* Chart */
.chart-container {
  border-radius: 12px;
  overflow: hidden;
}

.chart-wrapper {
  width: 100%;
  height: 380px;
}

/* Table Styles */
.books-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(96, 165, 250, 0.05);
  --el-table-row-hover-bg-color: rgba(96, 165, 250, 0.08);
  --el-table-border-color: rgba(96, 165, 250, 0.1);
  --el-table-header-text-color: #94a3b8;
  --el-table-text-color: #e2e8f0;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-table__header th) {
  font-weight: 600;
  padding: 16px 12px;
}

:deep(.el-table__body td) {
  padding: 14px 12px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(96, 165, 250, 0.03);
}

.book-title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.book-icon {
  color: #60a5fa;
  font-size: 16px;
}

.book-title {
  font-weight: 500;
  color: #e2e8f0;
}

.uploader-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.uploader-avatar {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.progress-cell {
  width: 100%;
}

:deep(.el-progress__text) {
  font-size: 12px !important;
  color: #94a3b8 !important;
}

.text-secondary {
  color: #94a3b8;
}

.text-muted {
  color: #64748b;
  font-style: italic;
}

/* Pagination */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #94a3b8;
  --el-pagination-button-color: #94a3b8;
  --el-pagination-hover-color: #60a5fa;
  --el-pagination-button-bg-color: rgba(96, 165, 250, 0.1);
  --el-pagination-button-disabled-bg-color: transparent;
}

:deep(.el-pagination .el-select .el-input__wrapper) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.2);
}

:deep(.el-pagination .el-input__wrapper) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.2);
}

:deep(.el-pager li) {
  background: transparent;
}

:deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  color: #fff;
}

/* Tags */
:deep(.el-tag--info) {
  --el-tag-bg-color: rgba(96, 165, 250, 0.15);
  --el-tag-border-color: rgba(96, 165, 250, 0.3);
  --el-tag-text-color: #60a5fa;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgba(15, 18, 25, 0.9);
}

:deep(.el-loading-text) {
  color: #94a3b8;
}
</style>
