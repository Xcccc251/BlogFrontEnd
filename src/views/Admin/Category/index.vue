<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  categoryBackList,
  searchCategory,
  searchCategoryById,
  addCategory,
  updateCategory,
  deleteCategoryByIds
} from '@/apis/category'

// 类型定义
interface CategoryItem {
  id: number
  categoryName: string
  articleCount: number
  createTime: string
  updateTime: string
}

// 搜索表单
const searchForm = reactive({
  categoryName: '',
  startTime: '',
  endTime: ''
})

// 表格数据
const tableData = ref<CategoryItem[]>([])
const loading = ref(false)
const selectedRows = ref<CategoryItem[]>([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增分类')
const categoryForm = reactive({
  id: null as number | null,
  categoryName: ''
})

// 初始化
onMounted(() => {
  loadData()
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res: any = await categoryBackList()
    if (res.code === 200) {
      tableData.value = res.data
      pagination.total = res.data.length
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (error) {
    console.error('加载分类列表失败', error)
    ElMessage.error('加载分类列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = async () => {
  if (!searchForm.categoryName.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  
  loading.value = true
  try {
    const res: any = await searchCategory(searchForm)
    if (res.code === 200) {
      tableData.value = res.data
      pagination.total = res.data.length
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关分类')
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
  searchForm.categoryName = ''
  searchForm.startTime = ''
  searchForm.endTime = ''
  loadData()
}

// 选择行
const handleSelectionChange = (rows: CategoryItem[]) => {
  selectedRows.value = rows
}

// 新增分类
const handleAdd = () => {
  dialogTitle.value = '新增分类'
  categoryForm.id = null
  categoryForm.categoryName = ''
  dialogVisible.value = true
}

// 编辑分类
const handleEdit = async (row: CategoryItem) => {
  dialogTitle.value = '编辑分类'
  try {
    const res: any = await searchCategoryById(row.id.toString())
    if (res.code === 200) {
      categoryForm.id = res.data.id
      categoryForm.categoryName = res.data.categoryName
      dialogVisible.value = true
    } else {
      ElMessage.error(res.message || '加载分类信息失败')
    }
  } catch (error) {
    console.error('加载分类信息失败', error)
    ElMessage.error('加载分类信息失败')
  }
}

// 批量编辑
const handleBatchEdit = () => {
  if (selectedRows.value.length !== 1) {
    ElMessage.warning('请选择一条数据进行编辑')
    return
  }
  handleEdit(selectedRows.value[0])
}

// 删除分类
const handleDelete = async (row: CategoryItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类【${row.categoryName}】吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res: any = await deleteCategoryByIds([row.id])
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
      `确定要删除选中的 ${selectedRows.value.length} 条分类吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(item => item.id)
    const res: any = await deleteCategoryByIds(ids)
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

// 保存分类
const handleSave = async () => {
  if (!categoryForm.categoryName.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  
  try {
    const res: any = categoryForm.id
      ? await updateCategory(categoryForm)
      : await addCategory(categoryForm)
    
    if (res.code === 200) {
      ElMessage.success(categoryForm.id ? '修改成功' : '添加成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('保存失败', error)
    ElMessage.error('保存失败')
  }
}

// 分页改变
const handlePageChange = (page: number) => {
  pagination.currentPage = page
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}
</script>

<template>
  <div class="category-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="分类名称">
            <el-input
              v-model="searchForm.categoryName"
              placeholder="请输入分类名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
            <el-button
              type="success"
              :icon="Edit"
              :disabled="selectedRows.length !== 1"
              @click="handleBatchEdit"
            >
              编辑
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
      <el-table-column prop="id" label="分类编号" width="100" align="center" />
      <el-table-column prop="categoryName" label="分类名称" align="center">
        <template #default="{ row }">
          <el-tag type="info">{{ row.categoryName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="articleCount" label="文章数量" width="120" align="center">
        <template #default="{ row }">
          <el-tag>{{ row.articleCount }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
      <el-table-column prop="updateTime" label="更新时间" width="180" align="center" />
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-tooltip
            :content="row.articleCount > 0 ? `该分类下还有 ${row.articleCount} 篇文章，无法删除` : '删除分类'"
            placement="top"
          >
            <el-button 
              type="danger" 
              link 
              :icon="Delete" 
              :disabled="row.articleCount > 0"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50]"
        :total="pagination.total"
        :background="true"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    </div>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称">
          <el-input
            v-model="categoryForm.categoryName"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.category-manage {
  padding: 20px;
  height: 100%;
  overflow: auto;
}

.main-card {
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
}

.header-section {
  margin-bottom: 16px;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.selected-tip {
  margin-left: 10px;
  color: #409eff;
  font-size: 14px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
  
  th {
    background: #fafafa;
    color: #666;
    font-weight: 500;
  }
  
  .el-table__body tr:hover > td {
    background: #fafafa !important;
  }
}

:deep(.el-button--small) {
  padding: 5px 15px;
  font-size: 14px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
