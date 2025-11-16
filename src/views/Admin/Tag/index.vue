<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import {
  tagBackList,
  searchTag,
  addTag,
  updateTag,
  deleteTagByIds
} from '@/apis/tag'

// 搜索表单
const searchForm = reactive({
  tagName: ''
})

// 表格数据
const tableData = ref([])
const loading = ref(false)
const selectedRows = ref([])
const allTagData = ref([]) // 保存所有标签数据用于前端分页

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('新增标签')
const dialogLoading = ref(false)

// 标签表单
const tagForm = reactive({
  id: undefined,
  tagName: ''
})

const tagFormRef = ref()

// 表单验证规则
const tagRules = {
  tagName: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ]
}

// 初始化
onMounted(() => {
  refreshData()
})

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await tagBackList()
    if (res.code === 200) {
      // 保存所有数据
      allTagData.value = res.data
      // 设置总数
      pagination.total = res.data.length
      // 前端分页
      updateTableData()
    }
  } catch (error) {
    ElMessage.error('加载标签列表失败')
  } finally {
    loading.value = false
  }
}

// 更新表格数据（用于分页）
const updateTableData = () => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = allTagData.value.slice(start, end)
}

// 搜索
const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await searchTag(searchForm)
    if (res.code === 200) {
      // 保存所有数据
      allTagData.value = res.data
      // 重置到第一页
      pagination.currentPage = 1
      pagination.total = res.data.length
      // 前端分页
      updateTableData()
      
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关标签')
      }
    }
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const handleReset = () => {
  searchForm.tagName = ''
  pagination.currentPage = 1
  refreshData()
}

// 分页：页码改变
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  updateTableData()
}

// 分页：每页大小改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  updateTableData()
}

// 打开新增弹窗
const handleAdd = () => {
  dialogTitle.value = '新增标签'
  Object.assign(tagForm, {
    id: undefined,
    tagName: ''
  })
  dialogVisible.value = true
}

// 打开编辑弹窗
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑标签'
  Object.assign(tagForm, {
    id: row.id,
    tagName: row.tagName
  })
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!tagFormRef.value) return
  
  await tagFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      dialogLoading.value = true
      try {
        let res: any
        if (tagForm.id) {
          // 编辑
          res = await updateTag(tagForm)
        } else {
          // 新增
          res = await addTag(tagForm)
        }
        
        if (res.code === 200) {
          ElMessage.success(tagForm.id ? '修改成功' : '添加成功')
          dialogVisible.value = false
          refreshData()
        }
      } catch (error) {
        ElMessage.error(tagForm.id ? '修改失败' : '添加失败')
      } finally {
        dialogLoading.value = false
      }
    }
  })
}

// 删除标签
const handleDelete = async (row: any) => {
  ElMessageBox.confirm('确定要删除这个标签吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res: any = await deleteTagByIds([row.id])
      if (res.code === 200) {
        ElMessage.success('删除成功')
        refreshData()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的标签')
    return
  }
  
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个标签吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map((row: any) => row.id)
      const res: any = await deleteTagByIds(ids)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        selectedRows.value = []
        refreshData()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 选择行
const handleSelectionChange = (val: any[]) => {
  selectedRows.value = val
}

// 关闭弹窗
const handleClose = () => {
  tagFormRef.value?.resetFields()
  dialogVisible.value = false
}
</script>

<template>
  <div class="tag-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="标签名称">
            <el-input
              v-model="searchForm.tagName"
              placeholder="请输入标签名称"
              clearable
              style="width: 200px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="RefreshRight" @click="handleReset">重置</el-button>
            <el-button type="primary" :icon="Plus" @click="handleAdd">新增标签</el-button>
            <el-button
              type="danger"
              :icon="Delete"
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
            >
              批量删除
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
        :data="tableData"
        :loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
        stripe
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="标签编号" width="100" />
        <el-table-column prop="tagName" label="标签名称" min-width="200" />
        <el-table-column prop="articleCount" label="文章数量" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="updateTime" label="更新时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :before-close="handleClose"
    >
      <el-form
        ref="tagFormRef"
        :model="tagForm"
        :rules="tagRules"
        label-width="100px"
      >
        <el-form-item label="标签名称" prop="tagName">
          <el-input
            v-model="tagForm.tagName"
            placeholder="请输入标签名称"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :loading="dialogLoading" @click="handleSubmit">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.tag-manage {
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

.table-section {
  // 表格区域样式
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

:deep(.el-dialog) {
  border-radius: 8px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
