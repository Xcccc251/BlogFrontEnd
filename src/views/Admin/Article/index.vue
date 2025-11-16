<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, View, RefreshRight, Search } from '@element-plus/icons-vue'
import {
  articleList,
  articleSearch,
  deleteArticle,
  updateArticleStatus,
  updateArticleTop,
  articleCategory,
  articleTag
} from '@/apis/article'
import type { CategoryType, TagType } from '@/views/Publish/type'

// 文章项类型
interface ArticleItem {
  id: number
  articleCover: string
  articleTitle: string
  articleType: number
  categoryName: string
  tagsName: string[]
  status: number
  isTop: boolean
  visitCount: number
  userName: string
  createTime: string
}

// 表单数据
const formData = reactive({
  categoryId: undefined,
  tagId: undefined,
  articleTitle: '',
  articleType: undefined,
  isTop: undefined,
  status: undefined
})

// 表格数据
const tableData = ref<ArticleItem[]>([])
const loading = ref(false)
const selectedRows = ref<ArticleItem[]>([])
const allArticleData = ref<ArticleItem[]>([]) // 保存所有文章数据用于前端分页

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 分类和标签列表
const categoryList = ref<CategoryType[]>([])
const tagList = ref<TagType[]>([])

// 初始化
onMounted(async () => {
  await refreshData()
  await loadCategories()
  await loadTags()
})

// 加载分类
const loadCategories = async () => {
  try {
    const res: any = await articleCategory()
    if (res.code === 200) {
      categoryList.value = res.data
    }
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

// 加载标签
const loadTags = async () => {
  try {
    const res: any = await articleTag()
    if (res.code === 200) {
      tagList.value = res.data
    }
  } catch (error) {
    console.error('加载标签失败', error)
  }
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await articleList()
    if (res.code === 200) {
      const allData = res.data.map((item: any) => ({
        ...item,
        isTop: item.isTop === 1
      }))
      // 保存所有数据
      allArticleData.value = allData
      // 设置总数
      pagination.total = allData.length
      // 前端分页：根据当前页和每页大小截取数据
      updateTableData()
    }
  } catch (error) {
    ElMessage.error('加载文章列表失败')
  } finally {
    loading.value = false
  }
}

// 更新表格数据（用于分页）
const updateTableData = () => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = allArticleData.value.slice(start, end)
}

// 搜索
const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await articleSearch(formData)
    if (res.code === 200) {
      const allData = res.data.map((item: any) => ({
        ...item,
        isTop: item.isTop === 1
      }))
      // 保存所有数据
      allArticleData.value = allData
      // 重置到第一页
      pagination.currentPage = 1
      pagination.total = allData.length
      // 前端分页
      updateTableData()
      
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关文章')
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
  Object.assign(formData, {
    categoryId: undefined,
    tagId: undefined,
    articleTitle: '',
    articleType: undefined,
    isTop: undefined,
    status: undefined
  })
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

// 修改文章状态
const handleStatusChange = async (row: any) => {
  try {
    const res: any = await updateArticleStatus({
      id: row.id,
      status: row.status
    })
    if (res.code === 200) {
      ElMessage.success('状态修改成功')
    }
  } catch (error) {
    ElMessage.error('状态修改失败')
    // 恢复原状态
    refreshData()
  }
}

// 修改置顶状态
const handleTopChange = async (row: any) => {
  try {
    const res: any = await updateArticleTop({
      id: row.id,
      isTop: row.isTop ? 1 : 0
    })
    if (res.code === 200) {
      ElMessage.success('操作成功')
    }
  } catch (error) {
    ElMessage.error('操作失败')
    // 恢复原状态
    row.isTop = !row.isTop
  }
}

// 删除文章
const handleDelete = async (row: any) => {
  ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res: any = await deleteArticle([row.id])
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
    ElMessage.warning('请先选择要删除的文章')
    return
  }
  
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 篇文章吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map((row: any) => row.id)
      const res: any = await deleteArticle(ids)
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
const handleSelectionChange = (val: ArticleItem[]) => {
  selectedRows.value = val
}

// 查看文章
const handleView = (row: any) => {
  window.open(`/article/${row.id}`, '_blank')
}

// 编辑文章
const handleEdit = (row: any) => {
  // 跳转到发布页面，并传递文章ID
  window.open(`/publish?id=${row.id}`, '_blank')
}

// 获取文章类型文本
const getArticleTypeText = (type: number) => {
  const typeMap: any = {
    1: '原创',
    2: '转载',
    3: '翻译'
  }
  return typeMap[type] || '未知'
}

</script>

<template>
  <div class="article-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="formData" inline class="search-form">
          <el-form-item label="标题">
            <el-input
              v-model="formData.articleTitle"
              placeholder="请输入文章标题"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              v-model="formData.categoryId"
              placeholder="请选择分类"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="item in categoryList"
                :key="item.id"
                :label="item.categoryName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="formData.tagId"
              placeholder="请选择标签"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="item in tagList"
                :key="item.id"
                :label="item.tagName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="formData.status"
              placeholder="请选择状态"
              clearable
              style="width: 120px"
            >
              <el-option label="公开" :value="1" />
              <el-option label="私密" :value="2" />
              <el-option label="草稿" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="置顶">
            <el-select
              v-model="formData.isTop"
              placeholder="是否置顶"
              clearable
              style="width: 120px"
            >
              <el-option label="是" :value="1" />
              <el-option label="否" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="RefreshRight" @click="handleReset">重置</el-button>
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
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.articleCover"
              fit="cover"
              style="width: 70px; height: 50px"
              :preview-src-list="[row.articleCover]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="articleTitle" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.articleType === 1 ? 'success' : row.articleType === 2 ? 'info' : 'warning'">
              {{ getArticleTypeText(row.articleType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.categoryName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="150">
          <template #default="{ row }">
            <el-tag
              v-for="(tag, index) in row.tagsName.slice(0, 2)"
              :key="index"
              size="small"
              style="margin-right: 4px"
            >
              {{ tag }}
            </el-tag>
            <el-tag v-if="row.tagsName.length > 2" size="small">
              +{{ row.tagsName.length - 2 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-select
              v-model="row.status"
              size="small"
              @change="handleStatusChange(row)"
            >
              <el-option label="公开" :value="1" />
              <el-option label="私密" :value="2" />
              <el-option label="草稿" :value="3" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="置顶" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.isTop"
              @change="handleTopChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="visitCount" label="访问量" width="90" />
        <el-table-column prop="userName" label="作者" width="100" />
        <el-table-column prop="createTime" label="发布时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" link :icon="View" @click="handleView(row)">查看</el-button>
              <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </div>
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
  </div>
</template>

<style scoped lang="scss">
.article-manage {
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
    margin-bottom: 12px;
    margin-right: 12px;
  }
  
  :deep(.el-button) {
    margin-right: 8px;
    margin-top: 4px;
    margin-bottom: 4px;
    
    &:last-of-type {
      margin-right: 0;
    }
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

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
  
  :deep(.el-button) {
    padding: 0 8px;
    margin: 0;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
