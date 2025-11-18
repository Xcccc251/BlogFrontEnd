<script setup lang="ts">
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, DataAnalysis, Document } from '@element-plus/icons-vue'
import {
  executeQuery,
  getTableList,
  getTableStructure,
  getDatabaseStats
} from '@/apis/database'

// localStorage key
const QUERY_HISTORY_KEY = 'database-query-history'

// SQL查询相关
const sqlQuery = ref('')
const queryResult = ref<any>(null)
const queryLoading = ref(false)
const queryHistory = ref<string[]>([])

// 数据库信息
const tableList = ref<string[]>([])
const selectedTable = ref('')
const selectedTableForQuery = ref('')
const tableStructure = ref<any[]>([])
const databaseStats = ref<any>(null)

// 标签页
const activeTab = ref('query')

// 查询结果分页
const resultPagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
  pageSizes: [10, 20, 50, 100, 200]
})

// 当前页显示的数据
const pagedResultData = ref<any[]>([])

// 从 localStorage 加载查询历史
const loadQueryHistory = () => {
  try {
    const history = localStorage.getItem(QUERY_HISTORY_KEY)
    if (history) {
      queryHistory.value = JSON.parse(history)
    }
  } catch (error) {
    console.error('加载查询历史失败', error)
    queryHistory.value = []
  }
}

// 保存查询历史到 localStorage
const saveQueryHistory = () => {
  try {
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(queryHistory.value))
  } catch (error) {
    console.error('保存查询历史失败', error)
  }
}

// 注册SQL填充回调
const registerFillSqlCallback = inject<((callback: (sql: string) => void) => void) | null>('registerFillSqlCallback', null)

// SQL填充处理函数
const handleSqlFill = (sql: string) => {
  sqlQuery.value = sql
  activeTab.value = 'query'
  ElMessage.success('SQL已填充到编辑器')
}

// 初始化
onMounted(async () => {
  loadQueryHistory()
  await loadTableList()
  await loadDatabaseStats()
  
  // 注册SQL填充回调
  if (registerFillSqlCallback) {
    registerFillSqlCallback(handleSqlFill)
  }
})

// 加载表列表
const loadTableList = async () => {
  try {
    const res: any = await getTableList()
    if (res.code === 200) {
      tableList.value = res.data
    }
  } catch (error) {
    console.error('加载表列表失败', error)
  }
}

// 加载数据库统计信息
const loadDatabaseStats = async () => {
  try {
    const res: any = await getDatabaseStats()
    if (res.code === 200) {
      databaseStats.value = res.data
    }
  } catch (error) {
    console.error('加载数据库统计失败', error)
  }
}

const SEPARATORS = ' \n\r\t,();=><!*+-/`"\'[]{}'

const containsDangerousKeyword = (sql: string, keyword: string) => {
  let index = sql.indexOf(keyword)
  while (index !== -1) {
    const beforeChar = index === 0 ? '' : sql[index - 1]
    const afterIndex = index + keyword.length
    const afterChar = afterIndex >= sql.length ? '' : sql[afterIndex]
    const beforeOK = index === 0 || SEPARATORS.includes(beforeChar)
    const afterOK = afterIndex === sql.length || SEPARATORS.includes(afterChar)

    if (beforeOK && afterOK) {
      return true
    }

    index = sql.indexOf(keyword, index + keyword.length)
  }

  return false
}

// 执行SQL查询
const handleExecuteQuery = async () => {
  if (!sqlQuery.value.trim()) {
    ElMessage.warning('请输入SQL查询语句')
    return
  }

  // 简单的SQL注入防护检查
  const sql = sqlQuery.value.trim().toLowerCase()
  const dangerousKeywords = ['drop', 'delete', 'truncate', 'update', 'insert', 'alter']
  const hasDangerousKeyword = dangerousKeywords.some(keyword => containsDangerousKeyword(sql, keyword))
  if (hasDangerousKeyword) {
    ElMessage.error('仅支持SELECT查询语句，不允许执行修改操作')
    return
  }

  queryLoading.value = true
  try {
    const res: any = await executeQuery(sqlQuery.value)
    if (res.code === 200) {
      queryResult.value = res.data
      // 初始化分页
      resultPagination.total = res.data.rows?.length || 0
      resultPagination.currentPage = 1
      updatePagedData()
      
      // 添加到历史记录
      if (!queryHistory.value.includes(sqlQuery.value)) {
        queryHistory.value.unshift(sqlQuery.value)
        if (queryHistory.value.length > 10) {
          queryHistory.value.pop()
        }
        // 保存到 localStorage
        saveQueryHistory()
      }
      ElMessage.success('查询成功')
    } else {
      ElMessage.error(res.message || '查询失败')
      queryResult.value = null
      pagedResultData.value = []
    }
  } catch (error: any) {
    console.error('查询失败', error)
    ElMessage.error(error.message || '查询失败')
    queryResult.value = null
    pagedResultData.value = []
  } finally {
    queryLoading.value = false
  }
}

// 更新分页数据
const updatePagedData = () => {
  if (!queryResult.value || !queryResult.value.rows) {
    pagedResultData.value = []
    return
  }
  
  const start = (resultPagination.currentPage - 1) * resultPagination.pageSize
  const end = start + resultPagination.pageSize
  pagedResultData.value = queryResult.value.rows.slice(start, end)
}

// 分页改变
const handleResultPageChange = (page: number) => {
  resultPagination.currentPage = page
  updatePagedData()
}

const handleResultSizeChange = (size: number) => {
  resultPagination.pageSize = size
  resultPagination.currentPage = 1
  updatePagedData()
}

// 计算全局行号（考虑分页）
const getGlobalRowIndex = (index: number) => {
  return (resultPagination.currentPage - 1) * resultPagination.pageSize + index + 1
}

// 使用历史查询
const useHistoryQuery = (query: string) => {
  sqlQuery.value = query
}

// 清空查询历史
const clearQueryHistory = () => {
  queryHistory.value = []
  saveQueryHistory()
  ElMessage.success('已清空查询历史')
}

// 查看表结构
const handleTableChange = async (tableName: string) => {
  if (!tableName) return
  
  try {
    const res: any = await getTableStructure(tableName)
    if (res.code === 200) {
      tableStructure.value = res.data
    }
  } catch (error) {
    console.error('加载表结构失败', error)
    ElMessage.error('加载表结构失败')
  }
}

// 快速查询表数据
const quickQueryTable = (tableName: string) => {
  sqlQuery.value = `SELECT * FROM ${tableName} LIMIT 100;`
  activeTab.value = 'query'
}

// 在SQL查询页面快速查询
const quickQueryTableInQueryPage = async () => {
  if (!selectedTableForQuery.value) {
    ElMessage.warning('请选择数据表')
    return
  }
  sqlQuery.value = `SELECT * FROM ${selectedTableForQuery.value} LIMIT 100;`
  // 自动执行查询
  await handleExecuteQuery()
}

// 清空查询
const clearQuery = () => {
  sqlQuery.value = ''
  queryResult.value = null
  pagedResultData.value = []
  resultPagination.currentPage = 1
  resultPagination.total = 0
}

// 导出结果为CSV
const exportToCSV = () => {
  if (!queryResult.value || !queryResult.value.rows) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  const columns = queryResult.value.columns || []
  const rows = queryResult.value.rows || []

  // 生成CSV内容
  let csv = columns.join(',') + '\n'
  rows.forEach((row: any) => {
    const values = columns.map((col: string) => {
      const value = row[col]
      // 如果值包含逗号或引号，需要用引号包裹
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csv += values.join(',') + '\n'
  })

  // 创建下载链接
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `query_result_${Date.now()}.csv`
  link.click()
  
  ElMessage.success('导出成功')
}

// 计算查询结果的统计信息
const resultStats = computed(() => {
  if (!queryResult.value) return null
  
  return {
    rowCount: queryResult.value.rows?.length || 0,
    columnCount: queryResult.value.columns?.length || 0,
    executeTime: queryResult.value.executeTime || 0
  }
})
</script>

<template>
  <div class="database-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <el-tabs v-model="activeTab">
        <!-- SQL查询标签页 -->
        <el-tab-pane label="SQL查询" name="query">
          <div class="query-section">
            <!-- 编辑器和历史左右布局 -->
            <div class="editor-history-layout">
              <!-- 左侧：SQL输入区 -->
              <div class="sql-input-area">
                <div class="input-header">
                  <span class="header-title">
                    <el-icon><Document /></el-icon>
                    SQL查询编辑器
                  </span>
                  <div class="input-actions">
                    <el-button size="small" @click="clearQuery">清空</el-button>
                    <el-button 
                      type="primary" 
                      size="small" 
                      :icon="Search" 
                      :loading="queryLoading"
                      @click="handleExecuteQuery"
                    >
                      执行查询
                    </el-button>
                  </div>
                </div>
                <el-input
                  v-model="sqlQuery"
                  type="textarea"
                  :rows="12"
                  placeholder="请输入SQL查询语句（仅支持SELECT查询）&#10;例如：SELECT * FROM users LIMIT 10;"
                  class="sql-textarea"
                />
                <div class="query-hint">
                  <el-alert
                    title="安全提示"
                    type="warning"
                    :closable="false"
                    show-icon
                  >
                    为了数据安全，仅支持SELECT查询语句。DROP、DELETE、UPDATE、INSERT等修改操作将不被允许。
                  </el-alert>
                </div>
              </div>

              <!-- 右侧：表选择器 + 查询历史 -->
              <div class="query-history-wrapper">
                <!-- 表选择器 -->
                <div class="table-selector">
                  <span class="selector-label">选择表：</span>
                  <el-select
                    v-model="selectedTableForQuery"
                    placeholder="选择数据表"
                    clearable
                    filterable
                    size="small"
                    style="flex: 1"
                  >
                    <el-option
                      v-for="table in tableList"
                      :key="table"
                      :label="table"
                      :value="table"
                    />
                  </el-select>
                  <el-button 
                    type="primary" 
                    size="small"
                    :disabled="!selectedTableForQuery"
                    @click="quickQueryTableInQueryPage"
                  >
                    快速查询
                  </el-button>
                </div>

                <!-- 查询历史 -->
                <div class="query-history">
                  <div class="history-header">
                    <div class="history-title">
                      <el-icon><Refresh /></el-icon>
                      查询历史
                    </div>
                    <el-button 
                      v-if="queryHistory.length > 0"
                      link 
                      size="small"
                      class="clear-history-btn"
                      @click="clearQueryHistory"
                    >
                      清空
                    </el-button>
                  </div>
                  <div class="history-list">
                    <div
                      v-for="(query, index) in queryHistory"
                      :key="index"
                      class="history-item"
                      @click="useHistoryQuery(query)"
                    >
                      <div class="history-index">{{ index + 1 }}</div>
                      <div class="history-query">{{ query }}</div>
                    </div>
                  </div>
                  <div v-if="queryHistory.length === 0" class="empty-history">
                    <el-empty description="暂无查询历史" :image-size="80" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 查询结果 -->
            <div v-if="queryResult" class="query-result">
              <div class="result-header">
                <div class="result-title">
                  <el-icon><DataAnalysis /></el-icon>
                  查询结果
                </div>
                <div class="result-stats">
                  <el-tag type="info" size="small">{{ resultStats?.rowCount }} 行</el-tag>
                  <el-tag type="info" size="small">{{ resultStats?.columnCount }} 列</el-tag>
                  <el-tag type="success" size="small">{{ resultStats?.executeTime }}ms</el-tag>
                  <el-button size="small" @click="exportToCSV">导出CSV</el-button>
                </div>
              </div>
              
              <el-table
                :data="pagedResultData"
                border
                stripe
                style="width: 100%"
                max-height="450"
              >
                <!-- 行号列 -->
                <el-table-column
                  label="#"
                  width="70"
                  align="center"
                  fixed="left"
                >
                  <template #default="{ $index }">
                    <span class="row-number">{{ getGlobalRowIndex($index) }}</span>
                  </template>
                </el-table-column>
                
                <!-- 数据列 -->
                <el-table-column
                  v-for="column in queryResult.columns"
                  :key="column"
                  :prop="column"
                  :label="column"
                  min-width="120"
                  show-overflow-tooltip
                />
              </el-table>
              
              <!-- 分页 -->
              <div v-if="resultPagination.total > 0" class="result-pagination">
                <el-pagination
                  v-model:current-page="resultPagination.currentPage"
                  v-model:page-size="resultPagination.pageSize"
                  :page-sizes="resultPagination.pageSizes"
                  :total="resultPagination.total"
                  :background="true"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleResultSizeChange"
                  @current-change="handleResultPageChange"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 表结构标签页 -->
        <el-tab-pane label="表结构" name="structure">
          <div class="structure-section">
            <div class="table-selector">
              <span>选择表：</span>
              <el-select
                v-model="selectedTable"
                placeholder="请选择数据表"
                style="width: 300px"
                @change="handleTableChange"
              >
                <el-option
                  v-for="table in tableList"
                  :key="table"
                  :label="table"
                  :value="table"
                />
              </el-select>
              <el-button
                v-if="selectedTable"
                type="primary"
                size="small"
                style="margin-left: 10px"
                @click="quickQueryTable(selectedTable)"
              >
                快速查询
              </el-button>
            </div>

            <div v-if="tableStructure.length > 0" class="table-structure">
              <h3>表结构：{{ selectedTable }}</h3>
              <el-table
                :data="tableStructure"
                border
                stripe
                style="width: 100%"
              >
                <el-table-column prop="Field" label="字段名" width="200" />
                <el-table-column prop="Type" label="数据类型" width="150" />
                <el-table-column prop="Null" label="允许NULL" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.Null === 'YES' ? 'success' : 'danger'" size="small">
                      {{ row.Null }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="Key" label="键" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag v-if="row.Key === 'PRI'" type="warning" size="small">主键</el-tag>
                    <el-tag v-else-if="row.Key === 'UNI'" type="info" size="small">唯一</el-tag>
                    <el-tag v-else-if="row.Key === 'MUL'" type="success" size="small">索引</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="Default" label="默认值" width="120" />
                <el-table-column prop="Extra" label="额外信息" width="150" />
                <el-table-column prop="Comment" label="字段注释" min-width="200" show-overflow-tooltip />
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <!-- 数据库统计标签页 -->
        <el-tab-pane label="数据库统计" name="stats">
          <div v-if="databaseStats" class="stats-section">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="stat-item">
                    <div class="stat-value">{{ databaseStats.tableCount || 0 }}</div>
                    <div class="stat-label">数据表数量</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="stat-item">
                    <div class="stat-value">{{ databaseStats.totalRows || 0 }}</div>
                    <div class="stat-label">总记录数</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="stat-item">
                    <div class="stat-value">{{ databaseStats.databaseSize || '0 MB' }}</div>
                    <div class="stat-label">数据库大小</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <div class="stat-item">
                    <div class="stat-value">{{ databaseStats.indexSize || '0 MB' }}</div>
                    <div class="stat-label">索引大小</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <div v-if="databaseStats.tables" class="tables-stats">
              <h3>各表统计信息</h3>
              <el-table
                :data="databaseStats.tables"
                border
                stripe
                style="width: 100%"
              >
                <el-table-column prop="name" label="表名" width="200" />
                <el-table-column prop="rows" label="记录数" width="120" align="right" />
                <el-table-column prop="dataSize" label="数据大小" width="120" align="right" />
                <el-table-column prop="indexSize" label="索引大小" width="120" align="right" />
                <el-table-column prop="engine" label="存储引擎" width="120" />
                <el-table-column prop="collation" label="字符集" min-width="150" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.database-manage {
  padding: 20px;
  height: 100%;
  overflow: auto;
}

.main-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  min-height: calc(100vh - 125px);
}

:deep(.el-card__body) {
  padding: 20px;
}

// SQL查询区域
.query-section {
  .editor-history-layout {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .sql-input-area {
    flex: 1;
    min-width: 0;
    
    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      .header-title {
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .input-actions {
        display: flex;
        gap: 10px;
      }
    }
    
    .sql-textarea {
      :deep(textarea) {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 14px;
        line-height: 1.6;
      }
    }
    
    .query-hint {
      margin-top: 10px;
    }
  }
  
  .query-history-wrapper {
    width: 350px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .table-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    border: 1px solid #e8e8e8;
    
    .selector-label {
      font-size: 13px;
      font-weight: 500;
      color: #606266;
      white-space: nowrap;
    }
  }
  
  .query-history {
    flex: 1;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .history-title {
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #333;
    }
    
    .clear-history-btn {
      color: #909399 !important;
      
      &:hover {
        color: #606266 !important;
      }
    }
    
    .history-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 5px;
      
      &::-webkit-scrollbar {
        width: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
        
        &:hover {
          background: #bbb;
        }
      }
      
      .history-item {
        display: flex;
        gap: 10px;
        padding: 10px 12px;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
        
        &:hover {
          background: #e6f7ff;
          border-color: #409eff;
          transform: translateX(2px);
        }
        
        .history-index {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #409eff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 500;
        }
        
        .history-query {
          flex: 1;
          font-size: 13px;
          font-family: 'Consolas', 'Monaco', monospace;
          color: #333;
          word-break: break-all;
          line-height: 1.5;
        }
      }
    }
    
    .empty-history {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .query-result {
    margin-top: 20px;
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e8e8e8;
      
      .result-title {
        font-size: 16px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .result-stats {
        display: flex;
        gap: 10px;
        align-items: center;
      }
    }
    
    .row-number {
      font-weight: 500;
      color: #909399;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .result-pagination {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e8e8e8;
    }
  }
}

// 表结构区域
.structure-section {
  .table-selector {
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
    display: flex;
    align-items: center;
    
    span {
      font-weight: 500;
      margin-right: 10px;
    }
  }
  
  .table-structure {
    h3 {
      margin-bottom: 15px;
      color: #333;
    }
  }
}

// 统计信息区域
.stats-section {
  .stat-item {
    text-align: center;
    padding: 20px;
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #409eff;
      margin-bottom: 10px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #666;
    }
  }
  
  .tables-stats {
    margin-top: 30px;
    
    h3 {
      margin-bottom: 15px;
      color: #333;
    }
  }
}

:deep(.el-table) {
  font-size: 14px;
  
  th {
    background: #fafafa;
    color: #666;
    font-weight: 500;
  }
}
</style>
