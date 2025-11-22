<script setup lang="ts">
import { ref, reactive, onMounted, computed, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshRight, Search, Plus, Edit, ZoomIn } from '@element-plus/icons-vue'
import {
  permissionList,
  searchPermissionList,
  permissionMenuList,
  addPermission,
  updatePermission,
  getPermission,
  deletePermission
} from '@/apis/permission'

interface PermissionItem {
  id: number
  permissionKey: string
  permissionDesc: string
  menuName: string
  menuId: number
}

interface MenuOption {
  value: number
  label: string
}

const formData = reactive({
  permissionKey: '',
  permissionDesc: '',
  permissionMenuId: undefined as number | undefined
})

const tableData = ref<PermissionItem[]>([])
const allTableData = ref<PermissionItem[]>([]) // 保存所有数据用于前端分页
const loading = ref(false)
const selectedRows = ref<PermissionItem[]>([])
const menuList = ref<MenuOption[]>([])

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
  permissionKey: '',
  permissionDesc: '',
  permissionMenuId: undefined as number | undefined
})

const hasSelected = computed(() => selectedRows.value.length > 0)
const hasOneSelected = computed(() => selectedRows.value.length === 1)

// 注入回调注册函数
const registerUpdateQueryResultCallback = inject<((callback: (data: any) => void) => void) | null>('registerUpdateQueryResultCallback', null)

// 处理来自 SQL 查询的数据更新
const handleQueryResultUpdate = (rows: any[]) => {
  // 保存所有数据
  allTableData.value = rows
  // 更新分页
  pagination.total = rows.length
  pagination.currentPage = 1
  updateTableData()
  
  console.log('Permission 页面已接收并更新数据，共', rows.length, '条')
}

onMounted(async () => {
  await refreshData()
  await loadMenuList()
  
  // 注册数据更新回调
  if (registerUpdateQueryResultCallback) {
    registerUpdateQueryResultCallback(handleQueryResultUpdate)
  }
})

const loadMenuList = async () => {
  try {
    const res: any = await permissionMenuList()
    if (res.code === 200 && res.data) {
      menuList.value = res.data.map((item: any) => ({
        value: item.menuId,
        label: item.menuName
      }))
    }
  } catch (error) {
    console.error('加载菜单列表失败', error)
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    const res: any = await permissionList()
    if (res.code === 200) {
      allTableData.value = res.data || []
      pagination.total = allTableData.value.length
      pagination.currentPage = 1
      updateTableData()
    }
  } catch (error) {
    ElMessage.error('加载权限列表失败')
  } finally {
    loading.value = false
  }
}

// 更新表格数据（用于分页）
const updateTableData = () => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = allTableData.value.slice(start, end)
}

const handleSearch = async () => {
  loading.value = true
  try {
    const res: any = await searchPermissionList(
      formData.permissionDesc,
      formData.permissionKey,
      formData.permissionMenuId?.toString()
    )
    if (res.code === 200) {
      allTableData.value = res.data || []
      pagination.total = allTableData.value.length
      pagination.currentPage = 1
      updateTableData()
      if (res.data.length === 0) {
        ElMessage.warning('没有查询到相关权限')
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
    permissionKey: '',
    permissionDesc: '',
    permissionMenuId: undefined
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

const handleAdd = () => {
  dialogTitle.value = '新增权限'
  Object.assign(dialogFormData, {
    id: undefined,
    permissionKey: '',
    permissionDesc: '',
    permissionMenuId: undefined
  })
  dialogVisible.value = true
}

const handleEdit = async (row?: PermissionItem) => {
  const id = row ? row.id : selectedRows.value[0]?.id
  if (!id) return

  try {
    const res: any = await getPermission(id.toString())
    if (res.code === 200) {
      dialogTitle.value = '修改权限'
      Object.assign(dialogFormData, res.data)
      dialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取权限信息失败')
  }
}

const handleDialogConfirm = async () => {
  if (!dialogFormData.permissionKey || !dialogFormData.permissionDesc || !dialogFormData.permissionMenuId) {
    ElMessage.warning('请填写完整信息')
    return
  }

  try {
    const apiFunc = dialogFormData.id ? updatePermission : addPermission
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

const handleDelete = async (id: number) => {
  ElMessageBox.confirm('确定要删除该权限吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res: any = await deletePermission(id.toString())
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

const handleSelectionChange = (selection: PermissionItem[]) => {
  selectedRows.value = selection
}
</script>

<template>
  <div class="permission-management-container">
    <!-- 统一卡片容器 -->
    <el-card class="main-card" shadow="never">
      <!-- 搜索表单和操作按钮 -->
      <div class="header-section">
        <el-form :model="formData" inline class="search-form">
        <el-form-item label="权限字符">
          <el-input
            v-model="formData.permissionKey"
            placeholder="请输入权限字符"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="权限说明">
          <el-input
            v-model="formData.permissionDesc"
            placeholder="请输入权限说明"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="权限菜单">
          <el-select
            v-model="formData.permissionMenuId"
            placeholder="请选择权限菜单"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="menu in menuList"
              :key="menu.value"
              :label="menu.label"
              :value="menu.value"
            />
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
        <el-table-column prop="id" label="权限编号" width="100" align="center" />
        <el-table-column prop="permissionKey" label="权限字符" min-width="180" />
        <el-table-column prop="menuName" label="权限菜单" min-width="150">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.menuName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="permissionDesc" label="权限说明" min-width="200" />
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
              @click="handleDelete(row.id)"
            >
              删除
            </el-button>
            <el-button
              type="success"
              link
              :icon="ZoomIn"
              @click="$router.push({ path: '/admin/permission-authorize', query: { id: row.id } })"
            >
              授权角色
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
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
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
        <el-form-item label="权限字符" required>
          <el-input v-model="dialogFormData.permissionKey" placeholder="请输入权限字符" />
        </el-form-item>
        <el-form-item label="权限说明" required>
          <el-input v-model="dialogFormData.permissionDesc" placeholder="请输入权限说明" />
        </el-form-item>
        <el-form-item label="权限菜单" required>
          <el-select
            v-model="dialogFormData.permissionMenuId"
            placeholder="请选择权限菜单"
            style="width: 100%"
          >
            <el-option
              v-for="menu in menuList"
              :key="menu.value"
              :label="menu.label"
              :value="menu.value"
            />
          </el-select>
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
.permission-management-container {
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
