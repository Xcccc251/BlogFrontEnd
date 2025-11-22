<script setup lang="ts">
import { ref, reactive, onMounted, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight, Search, Plus, Edit, ZoomIn } from '@element-plus/icons-vue'
import {
  roleList,
  roleSearch,
  roleUpdateStatus,
  roleDelete,
  roleInfoById,
  roleInsert,
  roleUpdate
} from '@/apis/role'

interface RoleItem {
  id: number
  roleName: string
  roleKey: string
  orderNum: number
  status: number
  createTime: string
}

const formData = reactive({
  roleName: '',
  roleKey: '',
  status: undefined as number | undefined
})

const tableData = ref<RoleItem[]>([])
const loading = ref(false)
const selectedRows = ref<RoleItem[]>([])

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  pageSizes: [10, 20, 30, 50, 100]
})

// 对话框相关
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogFormData = reactive({
  id: undefined as number | undefined,
  roleName: '',
  roleKey: '',
  orderNum: 0,
  status: 0,
  remark: ''
})

const hasSelected = computed(() => selectedRows.value.length > 0)
const hasOneSelected = computed(() => selectedRows.value.length === 1)

// 注入回调注册函数
const registerUpdateQueryResultCallback = inject<((callback: (data: any) => void) => void) | null>('registerUpdateQueryResultCallback', null)

// 处理来自 SQL 查询的数据更新
const handleQueryResultUpdate = (rows: any[]) => {
  // 直接更新表格数据
  tableData.value = rows
  pagination.total = rows.length
  pagination.currentPage = 1
  
  console.log('Role 页面已接收并更新数据，共', rows.length, '条')
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
    const res: any = await roleList()
    if (res.code === 200) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
    }
  } catch (error) {
    ElMessage.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await roleSearch(formData)
    if (res.code === 200) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关角色')
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
    roleName: '',
    roleKey: '',
    status: undefined
  })
  refreshData()
}

const handleStatusChange = async (row: RoleItem) => {
  try {
    const res: any = await roleUpdateStatus(row.id.toString(), row.status)
    if (res.code === 200) {
      ElMessage.success(row.status === 0 ? '已启用' : '已停用')
    }
  } catch (error) {
    ElMessage.error('状态修改失败')
    row.status = row.status === 0 ? 1 : 0
  }
}

const handleAdd = () => {
  dialogTitle.value = '新增角色'
  Object.assign(dialogFormData, {
    id: undefined,
    roleName: '',
    roleKey: '',
    orderNum: 0,
    status: 0,
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = async (row?: RoleItem) => {
  const id = row ? row.id : selectedRows.value[0]?.id
  if (!id) return

  try {
    const res: any = await roleInfoById(id.toString())
    if (res.code === 200) {
      dialogTitle.value = '修改角色'
      Object.assign(dialogFormData, res.data)
      dialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取角色信息失败')
  }
}

const handleDialogConfirm = async () => {
  try {
    const apiFunc = dialogFormData.id ? roleUpdate : roleInsert
    const res: any = await apiFunc(dialogFormData)
    if (res.code === 200) {
      ElMessage.success(dialogFormData.id ? '修改成功' : '新增成功')
      dialogVisible.value = false
      await refreshData()
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (ids: number[]) => {
  ElMessageBox.confirm('确定要删除选中的角色吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res: any = await roleDelete(ids.map(id => id.toString()))
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

const handleSelectionChange = (selection: RoleItem[]) => {
  selectedRows.value = selection
}
</script>

<template>
  <div class="role-management-container">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="formData" inline class="search-form">
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
        <el-form-item label="状态">
          <el-select
            v-model="formData.status"
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
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            新增
          </el-button>
          <el-button
            type="success"
            :icon="Edit"
            :disabled="!hasOneSelected"
            @click="handleEdit()"
          >
            修改
          </el-button>
          <el-button
            type="danger"
            :icon="Delete"
            :disabled="!hasSelected"
            @click="handleBatchDelete"
          >
            删除
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
        <el-table-column prop="id" label="角色编号" width="100" align="center" />
        <el-table-column prop="roleName" label="角色名称" min-width="150" />
        <el-table-column prop="roleKey" label="角色字符" min-width="150" />
        <el-table-column prop="orderNum" label="显示顺序" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="0"
              :inactive-value="1"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="Edit"
              @click="handleEdit(row)"
            >
              修改
            </el-button>
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete([row.id])"
            >
              删除
            </el-button>
            <el-button
              type="success"
              link
              :icon="ZoomIn"
              @click="$router.push({ path: '/admin/role-authorize', query: { id: row.id, name: row.roleName } })"
            >
              授权用户
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="dialogVisible = false"
    >
      <el-form :model="dialogFormData" label-width="100px">
        <el-form-item label="角色名称" required>
          <el-input v-model="dialogFormData.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色字符" required>
          <el-input v-model="dialogFormData.roleKey" placeholder="请输入角色字符" />
        </el-form-item>
        <el-form-item label="显示顺序">
          <el-input-number v-model="dialogFormData.orderNum" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dialogFormData.status">
            <el-radio :value="0">正常</el-radio>
            <el-radio :value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="dialogFormData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.role-management-container {
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
