<script setup lang="ts">
import { ref, reactive, onMounted, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight, Search, View } from '@element-plus/icons-vue'
import {
  userList,
  userSearch,
  userUpdateStatus,
  userDetail,
  userDelete
} from '@/apis/user'

interface UserItem {
  id: number
  username: string
  email: string
  avatar: string
  nickname: string
  isDisable: number
  registerType: number
  loginAddress: string
  createTime: string
  roleName?: string
}

const formData = reactive({
  username: '',
  email: '',
  isDisable: undefined as number | undefined,
  createTimeStart: '',
  createTimeEnd: ''
})

const tableData = ref<UserItem[]>([])
const loading = ref(false)
const selectedRows = ref<UserItem[]>([])

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 注册类型映射
const registerTypeMap: Record<number, string> = {
  0: '邮箱/用户名',
  1: 'Gitee',
  2: 'Github'
}

// 计算是否有选中行
const hasSelected = computed(() => selectedRows.value.length > 0)

// 注入回调注册函数
const registerUpdateQueryResultCallback = inject<((callback: (data: any) => void) => void) | null>('registerUpdateQueryResultCallback', null)

// 处理来自 SQL 查询的数据更新
const handleQueryResultUpdate = (rows: any[]) => {
  // 直接更新表格数据
  tableData.value = rows
  pagination.total = rows.length
  pagination.currentPage = 1
  
  console.log('User 页面已接收并更新数据，共', rows.length, '条')
}

onMounted(async () => {
  await refreshData()
  
  // 注册数据更新回调
  if (registerUpdateQueryResultCallback) {
    registerUpdateQueryResultCallback(handleQueryResultUpdate)
  }
})

const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await userList()
    if (res.code === 200) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
    }
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await userSearch(formData)
    if (res.code === 200) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关用户')
      }
    }
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  Object.assign(formData, {
    username: '',
    email: '',
    isDisable: undefined,
    createTimeStart: '',
    createTimeEnd: ''
  })
  refreshData()
}

const handleStatusChange = async (row: UserItem) => {
  try {
    const res: any = await userUpdateStatus(row.id.toString(), row.isDisable)
    if (res.code === 200) {
      ElMessage.success(row.isDisable === 0 ? '已启用' : '已停用')
    }
  } catch (error) {
    ElMessage.error('状态修改失败')
    row.isDisable = row.isDisable === 0 ? 1 : 0
  }
}

const handleDelete = async (ids: number[]) => {
  ElMessageBox.confirm('确定要删除选中的用户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res: any = await userDelete(ids.map(id => id.toString()))
      if (res.code === 200) {
        ElMessage.success('删除成功')
        selectedRows.value = []
        await refreshData()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleBatchDelete = () => {
  const ids = selectedRows.value.map(row => row.id)
  handleDelete(ids)
}

const handleSelectionChange = (selection: UserItem[]) => {
  selectedRows.value = selection
}

const handleViewDetail = async (row: UserItem) => {
  try {
    const res: any = await userDetail(row.id.toString())
    if (res.code === 200) {
      ElMessageBox.alert(
        `<div style="text-align: left;">
          <p><strong>用户名：</strong>${res.data.username}</p>
          <p><strong>邮箱：</strong>${res.data.email}</p>
          <p><strong>注册方式：</strong>${registerTypeMap[res.data.registerType]}</p>
          <p><strong>登录地址：</strong>${res.data.loginAddress || '-'}</p>
          <p><strong>创建时间：</strong>${res.data.createTime}</p>
          <p><strong>角色：</strong>${res.data.roleName || '-'}</p>
        </div>`,
        '用户详情',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '关闭'
        }
      )
    }
  } catch (error) {
    ElMessage.error('获取用户详情失败')
  }
}
</script>

<template>
  <div class="user-management-container">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="formData" inline class="search-form">
          <el-form-item label="用户名称">
            <el-input
              v-model="formData.username"
              placeholder="请输入用户名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="用户邮箱">
            <el-input
              v-model="formData.email"
              placeholder="请输入用户邮箱"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="formData.isDisable"
              placeholder="请选择状态"
              clearable
              style="width: 150px"
            >
              <el-option label="正常" :value="0" />
              <el-option label="停用" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button :icon="RefreshRight" @click="handleReset">
              重置
            </el-button>
            <el-button
              type="danger"
              :icon="Delete"
              :disabled="!hasSelected"
              @click="handleBatchDelete"
            >
              批量删除
            </el-button>
            <el-button :icon="RefreshRight" @click="refreshData">
              刷新
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <div class="table-section">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="用户编号" width="120" align="center" />
        <el-table-column label="用户头像" width="100" align="center">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="50" />
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名称" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="email" label="用户邮箱" min-width="180" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.isDisable"
              :active-value="0"
              :inactive-value="1"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="注册方式" width="130" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ registerTypeMap[row.registerType] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="loginAddress" label="登录地址" min-width="150" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="View"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete([row.id])"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="pagination.pageSizes"
          :total="pagination.total"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="refreshData"
          @current-change="refreshData"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.user-management-container {
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
    margin-bottom: 16px;
    margin-right: 16px;
  }
  
  :deep(.el-button) {
    margin-right: 12px;
    
    &:last-of-type {
      margin-right: 0;
    }
  }
}

:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-table) {
  font-size: 14px;
  
  // 表头样式
  th.el-table__cell {
    background-color: #f5f7fa;
    color: #606266;
    font-weight: 600;
    height: 45px;
  }
  
  // 斑马纹样式
  &.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
    background: #fafafa;
  }
  
  // 悬停样式
  .el-table__body tr:hover > td.el-table__cell {
    background-color: #f0f9eb !important;
  }
}

:deep(.el-button--small) {
  padding: 5px 15px;
  font-size: 14px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}
</style>
