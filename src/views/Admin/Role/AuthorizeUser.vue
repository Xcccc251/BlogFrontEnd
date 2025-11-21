<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight, Search, Plus } from '@element-plus/icons-vue'
import {
  queryRoleUser,
  queryNotRoleUser,
  addUserRole,
  deleteUserRole
} from '@/apis/role'

interface UserItem {
  id: number
  username: string
  nickname: string
  email: string
  isDisable: number
  createTime: string
}

const route = useRoute()
const router = useRouter()

const formData = reactive({
  username: '',
  email: ''
})

const tableData = ref<UserItem[]>([])
const loading = ref(false)
const selectedRows = ref<UserItem[]>([])

// 获取角色ID和名称
const roleId = computed(() => route.query.id as string)
const roleName = computed(() => route.query.name as string)
const pageTitle = computed(() => `授权 "${roleName.value}" 角色`)

// 添加用户对话框
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogTableData = ref<UserItem[]>([])
const dialogSelectedRows = ref<UserItem[]>([])
const dialogFormData = reactive({
  username: '',
  email: ''
})

const hasSelected = computed(() => selectedRows.value.length > 0)

onMounted(async () => {
  await refreshData()
})

const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await queryRoleUser(roleId.value, formData.username, formData.email)
    if (res.code === 200) {
      tableData.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  await refreshData()
}

const handleReset = () => {
  Object.assign(formData, {
    username: '',
    email: ''
  })
  refreshData()
}

const handleSelectionChange = (selection: UserItem[]) => {
  selectedRows.value = selection
}

// 打开添加用户对话框
const handleAddUser = async () => {
  dialogVisible.value = true
  await loadNotRoleUsers()
}

// 加载未授权的用户列表
const loadNotRoleUsers = async () => {
  dialogLoading.value = true
  try {
    const res: any = await queryNotRoleUser(roleId.value, dialogFormData.username, dialogFormData.email)
    if (res.code === 200) {
      dialogTableData.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    dialogLoading.value = false
  }
}

// 对话框搜索
const handleDialogSearch = async () => {
  await loadNotRoleUsers()
}

// 对话框重置
const handleDialogReset = () => {
  Object.assign(dialogFormData, {
    username: '',
    email: ''
  })
  loadNotRoleUsers()
}

// 对话框选择
const handleDialogSelectionChange = (selection: UserItem[]) => {
  dialogSelectedRows.value = selection
}

// 确认添加用户
const handleDialogConfirm = async () => {
  if (dialogSelectedRows.value.length === 0) {
    ElMessage.warning('请选择要授权的用户')
    return
  }

  try {
    const userIds = dialogSelectedRows.value.map(user => user.id)
    const res: any = await addUserRole({
      userId: userIds,
      roleId: roleId.value
    })
    if (res.code === 200) {
      ElMessage.success('授权成功，请重新登录后生效')
      dialogVisible.value = false
      dialogSelectedRows.value = []
      await refreshData()
    }
  } catch (error) {
    ElMessage.error('授权失败')
  }
}

// 取消授权
const handleCancelAuth = async (userIds: number[]) => {
  if (userIds.length === 0) {
    ElMessage.warning('请选择要取消授权的用户')
    return
  }

  ElMessageBox.confirm(
    `确定取消授权编号为 ${userIds.join(',')} 的用户吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res: any = await deleteUserRole({
        roleId: roleId.value,
        userId: userIds
      })
      if (res.code === 200) {
        ElMessage.success('成功取消授权，请重新登录后生效')
        selectedRows.value = []
        await refreshData()
      }
    } catch (error) {
      ElMessage.error('取消授权失败')
    }
  }).catch(() => {})
}

// 批量取消授权
const handleBatchCancelAuth = () => {
  const userIds = selectedRows.value.map(row => row.id)
  handleCancelAuth(userIds)
}

// 返回
const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="authorize-user-container">
    <!-- 页面标题 -->
    <el-card class="title-card">
      <h3>{{ pageTitle }}</h3>
    </el-card>

    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :model="formData" inline label-width="100px">
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
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="RefreshRight" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <el-card class="toolbar-card">
      <el-button type="primary" :icon="Plus" @click="handleAddUser">
        添加用户
      </el-button>
      <el-button
        type="danger"
        :icon="Delete"
        :disabled="!hasSelected"
        @click="handleBatchCancelAuth"
      >
        批量取消授权
      </el-button>
      <el-button :icon="RefreshRight" @click="refreshData">
        刷新
      </el-button>
      <el-button @click="handleBack">
        返回
      </el-button>
    </el-card>

    <!-- 表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="用户编号" width="100" align="center" />
        <el-table-column prop="username" label="用户名称" min-width="150" />
        <el-table-column prop="nickname" label="用户昵称" min-width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDisable === 0" type="success">正常</el-tag>
            <el-tag v-else type="danger">停用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleCancelAuth([row.id])"
            >
              取消授权
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="pageTitle"
      width="70%"
      @close="dialogSelectedRows = []"
    >
      <!-- 对话框搜索表单 -->
      <el-form :model="dialogFormData" inline style="margin-bottom: 20px">
        <el-form-item label="用户名称">
          <el-input
            v-model="dialogFormData.username"
            placeholder="请输入用户名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="电子邮箱">
          <el-input
            v-model="dialogFormData.email"
            placeholder="请输入电子邮箱"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleDialogSearch">
            搜索
          </el-button>
          <el-button :icon="RefreshRight" @click="handleDialogReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 对话框表格 -->
      <el-table
        v-loading="dialogLoading"
        :data="dialogTableData"
        border
        stripe
        max-height="400"
        @selection-change="handleDialogSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="角色编号" width="100" align="center" />
        <el-table-column prop="username" label="用户名称" min-width="120" />
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDisable === 0" type="success">正常</el-tag>
            <el-tag v-else type="danger">停用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.authorize-user-container {
  padding: 20px;
  background: transparent;

  .title-card,
  .search-card,
  .toolbar-card,
  .table-card {
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
  }

  .title-card {
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }
}
</style>
