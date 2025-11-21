<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight, Search, Plus } from '@element-plus/icons-vue'
import {
  queryPermissionRole,
  queryPermissionNotRole,
  addRolePermission,
  deleteRolePermission
} from '@/apis/permission'

interface RoleItem {
  id: number
  roleName: string
  roleKey: string
  orderNum: number
  status: number
  createTime: string
}

const route = useRoute()
const router = useRouter()

const formData = reactive({
  roleName: '',
  roleKey: ''
})

const tableData = ref<RoleItem[]>([])
const loading = ref(false)
const selectedRows = ref<RoleItem[]>([])

// 获取权限ID
const permissionId = computed(() => route.query.id as string)
const pageTitle = computed(() => `授权角色`)

// 添加角色对话框
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogTableData = ref<RoleItem[]>([])
const dialogSelectedRows = ref<RoleItem[]>([])
const dialogFormData = reactive({
  roleName: '',
  roleKey: ''
})

const hasSelected = computed(() => selectedRows.value.length > 0)

onMounted(async () => {
  await refreshData()
})

const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await queryPermissionRole(permissionId.value, formData.roleName, formData.roleKey)
    if (res.code === 200) {
      tableData.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  await refreshData()
}

const handleReset = () => {
  Object.assign(formData, {
    roleName: '',
    roleKey: ''
  })
  refreshData()
}

const handleSelectionChange = (selection: RoleItem[]) => {
  selectedRows.value = selection
}

// 打开添加角色对话框
const handleAddRole = async () => {
  dialogVisible.value = true
  await loadNotPermissionRoles()
}

// 加载未授权的角色列表
const loadNotPermissionRoles = async () => {
  dialogLoading.value = true
  try {
    const res: any = await queryPermissionNotRole(permissionId.value, dialogFormData.roleName, dialogFormData.roleKey)
    if (res.code === 200) {
      dialogTableData.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('加载角色列表失败')
  } finally {
    dialogLoading.value = false
  }
}

// 对话框搜索
const handleDialogSearch = async () => {
  await loadNotPermissionRoles()
}

// 对话框重置
const handleDialogReset = () => {
  Object.assign(dialogFormData, {
    roleName: '',
    roleKey: ''
  })
  loadNotPermissionRoles()
}

// 对话框选择
const handleDialogSelectionChange = (selection: RoleItem[]) => {
  dialogSelectedRows.value = selection
}

// 确认添加角色
const handleDialogConfirm = async () => {
  if (dialogSelectedRows.value.length === 0) {
    ElMessage.warning('请选择要授权的角色')
    return
  }

  try {
    const roleIds = dialogSelectedRows.value.map(role => role.id)
    const res: any = await addRolePermission({
      roleId: roleIds,
      permissionId: [permissionId.value]
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
const handleCancelAuth = async (roleIds: number[]) => {
  if (roleIds.length === 0) {
    ElMessage.warning('请选择要取消授权的角色')
    return
  }

  ElMessageBox.confirm(
    `确定取消授权编号为 ${roleIds.join(',')} 的角色吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res: any = await deleteRolePermission({
        permissionId: [permissionId.value],
        roleId: roleIds
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
  const roleIds = selectedRows.value.map(row => row.id)
  handleCancelAuth(roleIds)
}

// 返回
const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="authorize-role-container">
    <!-- 页面标题 -->
    <el-card class="title-card">
      <h3>{{ pageTitle }}</h3>
    </el-card>

    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :model="formData" inline label-width="100px">
        <el-form-item label="角色名称">
          <el-input
            v-model="formData.roleName"
            placeholder="请输入角色名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="角色字符">
          <el-input
            v-model="formData.roleKey"
            placeholder="请输入角色字符"
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
      <el-button type="primary" :icon="Plus" @click="handleAddRole">
        添加角色
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
        <el-table-column prop="id" label="角色编号" width="100" align="center" />
        <el-table-column prop="roleName" label="角色名称" min-width="150" />
        <el-table-column prop="roleKey" label="角色字符" min-width="150" />
        <el-table-column prop="orderNum" label="角色顺序" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="success">正常</el-tag>
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

    <!-- 添加角色对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="pageTitle"
      width="70%"
      @close="dialogSelectedRows = []"
    >
      <!-- 对话框搜索表单 -->
      <el-form :model="dialogFormData" inline style="margin-bottom: 20px">
        <el-form-item label="角色名称">
          <el-input
            v-model="dialogFormData.roleName"
            placeholder="请输入角色名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="角色字符">
          <el-input
            v-model="dialogFormData.roleKey"
            placeholder="请输入角色字符"
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
        <el-table-column prop="roleName" label="角色名称" min-width="120" />
        <el-table-column prop="roleKey" label="角色字符" min-width="120" />
        <el-table-column prop="orderNum" label="角色顺序" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="success">正常</el-tag>
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
.authorize-role-container {
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
