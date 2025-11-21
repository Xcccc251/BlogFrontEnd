<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Search, Refresh, View } from '@element-plus/icons-vue'
import {
  favoriteList,
  searchFavorite,
  isCheckFavorite,
  deleteFavorite
} from '@/apis/favorite'

// 类型定义
interface FavoriteItem {
  id: number
  userName: string
  type: number
  content: string
  isCheck: number
  createTime: string
}

// 搜索表单
const searchForm = reactive({
  userName: '',
  type: undefined as number | undefined,
  isCheck: undefined as number | undefined
})

// 表格数据
const tableData = ref<FavoriteItem[]>([])
const loading = ref(false)
const selectedRows = ref<FavoriteItem[]>([])
const allData = ref<FavoriteItem[]>([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 查看对话框
const viewDialog = reactive({
  visible: false,
  content: ''
})

// 初始化
onMounted(() => {
  loadData()
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res: any = await favoriteList()
    if (res.code === 200) {
      allData.value = res.data.map((item: any) => ({
        ...item,
        isCheck: item.isCheck
      }))
      pagination.total = allData.value.length
      pagination.currentPage = 1
      applyPagination()
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (error) {
    console.error('加载收藏列表失败', error)
    ElMessage.error('加载收藏列表失败')
  } finally {
    loading.value = false
  }
}

// 应用分页
const applyPagination = () => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = allData.value.slice(start, end)
}

// 搜索
const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await searchFavorite(searchForm)
    if (res.code === 200) {
      allData.value = res.data.map((item: any) => ({
        ...item,
        isCheck: item.isCheck
      }))
      pagination.total = allData.value.length
      pagination.currentPage = 1
      applyPagination()
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关收藏')
      }
    } else {
      ElMessage.error(res.message || '搜索失败')
    }
  } catch (error) {
    console.error('搜索失败', error)
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const handleReset = () => {
  searchForm.userName = ''
  searchForm.type = undefined
  searchForm.isCheck = undefined
  pagination.currentPage = 1
  loadData()
}

// 选择行
const handleSelectionChange = (rows: FavoriteItem[]) => {
  selectedRows.value = rows
}

// 分页改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  applyPagination()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  applyPagination()
}

// 切换是否有效
const handleCheckChange = async (row: FavoriteItem) => {
  const checkStatus = row.isCheck ? 1 : 0
  try {
    const res: any = await isCheckFavorite({
      id: row.id,
      isCheck: checkStatus
    })
    if (res.code === 200) {
      ElMessage.success('操作成功')
    } else {
      // 回滚状态
      row.isCheck = row.isCheck ? 0 : 1
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    // 回滚状态
    row.isCheck = row.isCheck ? 0 : 1
    console.error('操作失败', error)
    ElMessage.error('操作失败')
  }
}

const getFullContent = (content?: string | null): string => {
  return content && content.length > 0 ? content : '暂无内容'
}

const formatContent = (content?: string | null, maxLength = 30): string => {
  const fullContent = getFullContent(content)
  return fullContent.length > maxLength
    ? `${fullContent.substring(0, maxLength)}...`
    : fullContent
}

const formatCreateTime = (time?: string | null): string => {
  if (!time || time.length === 0) {
    return '--'
  }
  const [date] = time.split(' ')
  return date ? `${date}...` : time
}

// 查看内容
const handleView = (row: FavoriteItem) => {
  viewDialog.content = getFullContent(row.content)
  viewDialog.visible = true
}

// 批量查看
const handleBatchView = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条数据进行查看')
    return
  }
  handleView(selectedRows.value[0])
}

// 删除收藏
const handleDelete = async (row: FavoriteItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条收藏吗？删除后将无法恢复',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res: any = await deleteFavorite([row.id.toString()])
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error)
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的数据')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条收藏吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(item => item.id.toString())
    const res: any = await deleteFavorite(ids)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      selectedRows.value = []
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error)
      ElMessage.error('删除失败')
    }
  }
}

// 获取收藏类型标签
type FavoriteTagType = 'primary' | 'success'

const getFavoriteTypeTag = (type: number): { text: string; type: FavoriteTagType } => {
  return type === 1
    ? { text: '文章', type: 'primary' }
    : { text: '留言', type: 'success' }
}
</script>

<template>
  <div class="favorite-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="用户名称">
            <el-input
              v-model="searchForm.userName"
              placeholder="请输入用户名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="收藏类型">
            <el-select
              v-model="searchForm.type"
              placeholder="请选择"
              clearable
              style="width: 150px"
            >
              <el-option label="文章" :value="1" />
              <el-option label="留言" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="是否有效">
            <el-select
              v-model="searchForm.isCheck"
              placeholder="请选择"
              clearable
              style="width: 150px"
            >
              <el-option label="是" :value="1" />
              <el-option label="否" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            <el-button
              type="primary"
              :icon="View"
              :disabled="selectedRows.length !== 1"
              @click="handleBatchView"
            >
              查看
            </el-button>
            <el-button
              type="danger"
              :icon="Delete"
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
            >
              删除
            </el-button>
            <span class="selected-tip" v-if="selectedRows.length > 0">
              已选择 {{ selectedRows.length }} 条
            </span>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <div class="table-section">
        <el-table
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="编号" width="80" align="center" />
          <el-table-column prop="userName" label="用户名称" width="150" align="center" />
          <el-table-column prop="type" label="收藏类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getFavoriteTypeTag(row.type).type">
                {{ getFavoriteTypeTag(row.type).text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="收藏内容" min-width="200" align="center">
            <template #default="{ row }">
              <el-popover
                placement="top"
                :width="300"
                trigger="hover"
                :content="getFullContent(row.content)"
              >
                <template #reference>
                  <span class="content-text">
                    {{ formatContent(row.content) }}
                  </span>
                </template>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column prop="isCheck" label="是否有效" width="100" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.isCheck"
                :active-value="1"
                :inactive-value="0"
                @change="handleCheckChange(row)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="收藏时间" width="180" align="center">
            <template #default="{ row }">
              <template v-if="row.createTime">
                <el-tooltip :content="row.createTime" placement="top">
                  <span>{{ formatCreateTime(row.createTime) }}</span>
                </el-tooltip>
              </template>
              <span v-else>--</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link :icon="View" @click="handleView(row)">
                查看
              </el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="pagination.pageSizes"
            :total="pagination.total"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 查看内容对话框 -->
    <el-dialog
      v-model="viewDialog.visible"
      title="查看收藏内容"
      width="600px"
    >
      <div class="content-preview">
        {{ viewDialog.content }}
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.favorite-manage {
  /* padding is handled by admin-content */
}

.main-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  transition: all 0.3s;
  
  &:hover {
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.04);
  }
}

.header-section {
  margin-bottom: 20px;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.table-section {
  margin-top: 12px;
}

.selected-tip {
  margin-left: 12px;
  color: #409eff;
  font-size: 14px;
}

:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-table) {
  font-size: 14px;
  
  th.el-table__cell {
    background-color: #f5f7fa;
    color: #606266;
    font-weight: 600;
    height: 45px;
  }
  
  .el-table__body tr:hover > td.el-table__cell {
    background-color: #f0f9eb !important;
  }
}

:deep(.el-button--small) {
  padding: 5px 15px;
  font-size: 14px;
}

.content-text {
  cursor: pointer;
  
  &:hover {
    color: #409eff;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.content-preview {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
}
</style>
