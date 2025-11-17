<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Search, Refresh, Link } from '@element-plus/icons-vue'
import {
  commentList,
  searchComment,
  isCheckComment,
  deleteComment
} from '@/apis/comment'

// 类型定义
interface CommentItem {
  id: number
  parentId: number
  type: number
  typeId: number
  commentContent: string
  commentUserName: string
  isCheck: number
  createTime: string
  children?: CommentItem[]
}

// 搜索表单
const searchForm = reactive({
  commentUserName: '',
  commentContent: '',
  type: undefined as number | undefined,
  isCheck: undefined as number | undefined
})

// 表格数据
const tableData = ref<CommentItem[]>([])
const loading = ref(false)
const allData = ref<CommentItem[]>([])
const allTreeData = ref<CommentItem[]>([]) // 保存所有树形数据

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 初始化
onMounted(() => {
  loadData()
})

// 构建树形数据
const buildTree = (data: any[]): CommentItem[] => {
  const tree = data.filter(item => item.parentId === 0)
  tree.forEach((root) => {
    root.isCheck = root.isCheck
    const children = buildChildren(root, data)
    if (children.length > 0) {
      root.children = children
    }
  })
  return tree
}

// 应用分页到树形数据
const applyPagination = () => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = allTreeData.value.slice(start, end)
}

// 构建子节点
const buildChildren = (parent: CommentItem, data: any[]): CommentItem[] => {
  const children = data.filter(item => item.parentId === parent.id)
  children.forEach((child) => {
    child.isCheck = child.isCheck
    const grandChildren = buildChildren(child, data)
    if (grandChildren.length > 0) {
      child.children = grandChildren
    }
  })
  return children
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res: any = await commentList()
    if (res.code === 200) {
      allData.value = res.data
      allTreeData.value = buildTree(res.data)
      pagination.total = allTreeData.value.length
      pagination.currentPage = 1
      applyPagination()
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (error) {
    console.error('加载评论列表失败', error)
    ElMessage.error('加载评论列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await searchComment(searchForm)
    if (res.code === 200) {
      allData.value = res.data
      allTreeData.value = buildTree(res.data)
      pagination.total = allTreeData.value.length
      pagination.currentPage = 1
      applyPagination()
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关评论')
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
  searchForm.commentUserName = ''
  searchForm.commentContent = ''
  searchForm.type = undefined
  searchForm.isCheck = undefined
  pagination.currentPage = 1
  loadData()
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

// 切换审核状态
const handleCheckChange = async (row: CommentItem) => {
  const checkStatus = row.isCheck ? 1 : 0
  try {
    const res: any = await isCheckComment({
      id: row.id,
      isCheck: checkStatus
    })
    if (res.code === 200) {
      ElMessage.success('操作成功，相关子评论将变成同一状态')
      loadData()
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

// 删除评论
const handleDelete = async (row: CommentItem) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条评论吗？删除后将无法恢复',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res: any = await deleteComment(row.id.toString())
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

// 跳转到对应页面
const handleJump = (row: CommentItem) => {
  const domain = import.meta.env.VITE_APP_DOMAIN_NAME_FRONT || ''
  const url = row.type === 1
    ? `${domain}/article/${row.typeId}`
    : `${domain}/message/detail/${row.typeId}`
  window.open(url, '_blank')
}

// 获取评论类型标签
type CommentTagType = 'primary' | 'success'

const getCommentTypeTag = (type: number): { text: string; type: CommentTagType } => {
  return type === 1
    ? { text: '文章', type: 'primary' }
    : { text: '留言', type: 'success' }
}

// 表格行类名
const tableRowClassName = ({ row }: { row: CommentItem }) => {
  // 如果是子评论（parentId !== 0）
  if (row.parentId !== 0) {
    return 'child-comment-row'
  }
  // 如果有子评论，添加特殊类名
  if (row.children && row.children.length > 0) {
    return 'has-children-row'
  }
  return ''
}

// 计算子评论总数（递归计算所有后代评论）
const getChildrenCount = (comment: CommentItem): number => {
  if (!comment.children || comment.children.length === 0) {
    return 0
  }
  
  let count = comment.children.length
  comment.children.forEach(child => {
    count += getChildrenCount(child)
  })
  
  return count
}

// 处理评论内容（避免空值导致报错）
const getFullCommentContent = (content?: string | null): string => {
  return content && content.length > 0 ? content : '暂无内容'
}

const formatCommentContent = (content?: string | null, maxLength = 30): string => {
  const fullContent = getFullCommentContent(content)
  return fullContent.length > maxLength
    ? `${fullContent.substring(0, maxLength)}...`
    : fullContent
}

// 处理时间展示
const formatCreateTime = (createTime?: string | null): string => {
  if (!createTime || createTime.length === 0) {
    return '--'
  }
  const [date] = createTime.split(' ')
  return date ? `${date}...` : createTime
}
</script>

<template>
  <div class="comment-manage">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单 -->
      <div class="header-section">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="评论用户">
            <el-input
              v-model="searchForm.commentUserName"
              placeholder="请输入评论用户"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="评论内容">
            <el-input
              v-model="searchForm.commentContent"
              placeholder="请输入评论内容"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="评论类型">
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
          <el-form-item label="是否通过">
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
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <div class="table-section">
    <el-table
      v-loading="loading"
      :data="tableData"
      style="width: 100%"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      :row-class-name="tableRowClassName"
    >
      <el-table-column prop="id" label="编号" width="80" align="center" />
      <el-table-column prop="type" label="评论类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getCommentTypeTag(row.type).type">
            {{ getCommentTypeTag(row.type).text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="typeId" label="类型编号" width="100" align="center">
        <template #default="{ row }">
          <el-tag>{{ row.typeId }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="commentContent" label="评论内容" min-width="200" align="center">
        <template #default="{ row }">
          <el-popover
            placement="top"
            :width="300"
            trigger="hover"
            :content="getFullCommentContent(row.commentContent)"
          >
            <template #reference>
              <span class="comment-content">
                {{ formatCommentContent(row.commentContent) }}
              </span>
            </template>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column prop="commentUserName" label="评论用户" width="150" align="center" />
      <el-table-column label="回复数" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.children && row.children.length > 0" type="warning" effect="plain">
            {{ getChildrenCount(row) }} 条回复
          </el-tag>
          <span v-else style="color: #999;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="isCheck" label="是否通过" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            v-model="row.isCheck"
            :active-value="1"
            :inactive-value="0"
            @change="handleCheckChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="评论时间" width="180" align="center">
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
          <el-button type="primary" link :icon="Link" @click="handleJump(row)">
            跳转
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
  </div>
</template>

<style scoped lang="scss">
.comment-manage {
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
  margin-top: 12px;
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

.comment-content {
  cursor: pointer;
  
  &:hover {
    color: #409eff;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

// 有子评论的行特殊样式（父评论）
:deep(.has-children-row) {
  background: #f0f9ff !important;
  
  &:hover > td {
    background: #e6f7ff !important;
  }
  
  td {
    font-weight: 500;
  }
}

// 子评论行特殊样式
:deep(.child-comment-row) {
  background: #fef9e7 !important;
  
  &:hover > td {
    background: #fef5d4 !important;
  }
  
  td {
    font-style: italic;
    color: #666;
    
    // // 第一个单元格添加左边距，显示层级关系
    // &:first-child {
    //   padding-left: 30px;
    // }
  }
  
  // 子评论的标签样式调整
  .el-tag {
    opacity: 0.9;
  }
}

// 展开图标样式
:deep(.el-table__expand-icon) {
  color: #409eff;
  font-size: 14px;
  
  &.el-table__expand-icon--expanded {
    color: #67c23a;
  }
}

// 树形表格缩进线条
:deep(.el-table__indent) {
  padding-left: 20px;
}
</style>
