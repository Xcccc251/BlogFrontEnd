# 权限授权角色功能实现文档

## 概述

已成功实现权限管理中的"授权角色"功能，允许管理员为指定权限添加或取消角色授权。

## 功能特性

### 1. 查看权限已授权角色
- ✅ 显示当前权限下的所有角色列表
- ✅ 支持按角色名称、角色字符搜索
- ✅ 显示角色基本信息（编号、名称、字符、顺序、状态、创建时间）
- ✅ 角色状态标签展示（正常/停用）

### 2. 添加角色授权
- ✅ 弹出对话框显示未授权角色列表
- ✅ 支持在对话框内搜索角色
- ✅ 多选角色进行批量授权
- ✅ 授权成功后提示重新登录生效

### 3. 取消角色授权
- ✅ 单个取消授权
- ✅ 批量取消授权
- ✅ 二次确认防止误操作
- ✅ 取消授权后提示重新登录生效

## 实现细节

### 1. API接口扩展

#### 文件：`src/apis/permission/index.ts`

新增4个API接口：

```typescript
// 查询对应权限的角色
queryPermissionRole(permissionId: string, roleName?: string, roleKey?: string)

// 查询未分配该权限的角色列表
queryPermissionNotRole(permissionId: string, roleName?: string, roleKey?: string)

// 添加角色权限关系
addRolePermission(data: { roleId: number[], permissionId: string[] })

// 删除角色权限关系（取消授权）
deleteRolePermission(data: { roleId: number[], permissionId: string[] })
```

#### API端点映射：
| 接口 | 方法 | 路径 |
|------|------|------|
| 查询权限角色 | GET | `/role/permission/role/list` |
| 查询未授权角色 | GET | `/role/permission/not/role/list` |
| 添加角色授权 | POST | `/role/permission/add` |
| 取消角色授权 | DELETE | `/role/permission/delete` |

### 2. 页面组件

#### 文件：`src/views/Admin/Permission/AuthorizeRole.vue`

**主要功能模块：**

1. **页面标题区域**
   - 显示"授权角色"标题

2. **搜索表单区域**
   - 角色名称搜索
   - 角色字符搜索
   - 搜索、重置按钮

3. **操作按钮区域**
   - 添加角色：打开选择角色对话框
   - 批量取消授权：取消选中角色的授权
   - 刷新：重新加载数据
   - 返回：返回上一页

4. **数据表格区域**
   - 多选列
   - 角色信息展示列
   - 操作列（取消授权按钮）

5. **添加角色对话框**
   - 独立的搜索表单
   - 未授权角色列表表格
   - 多选功能
   - 确定/取消按钮

**关键代码逻辑：**

```vue
// 获取路由参数
const permissionId = computed(() => route.query.id as string)

// 加载已授权角色
const refreshData = async () => {
  const res: any = await queryPermissionRole(permissionId.value, formData.roleName, formData.roleKey)
  tableData.value = res.data || []
}

// 加载未授权角色
const loadNotPermissionRoles = async () => {
  const res: any = await queryPermissionNotRole(permissionId.value, dialogFormData.roleName, dialogFormData.roleKey)
  dialogTableData.value = res.data || []
}

// 添加角色授权
const handleDialogConfirm = async () => {
  const roleIds = dialogSelectedRows.value.map(role => role.id)
  await addRolePermission({ roleId: roleIds, permissionId: [permissionId.value] })
  ElMessage.success('授权成功，请重新登录后生效')
  await refreshData()
}

// 取消角色授权
const handleCancelAuth = async (roleIds: number[]) => {
  await deleteRolePermission({ permissionId: [permissionId.value], roleId: roleIds })
  ElMessage.success('成功取消授权，请重新登录后生效')
  await refreshData()
}
```

### 3. 路由配置

#### 文件：`src/router/routers.ts`

新增路由：

```typescript
{
    path: 'permission-authorize',
    component: () => import('@/views/Admin/Permission/AuthorizeRole.vue'),
    name: 'adminPermissionAuthorize',
    meta: {
        title: '权限授权',
        requireAuth: true
    }
}
```

### 4. 权限管理页面更新

#### 文件：`src/views/Admin/Permission/index.vue`

**修改内容：**
- 操作列宽度从 `180` 扩展到 `250`
- 添加"授权角色"按钮，带放大镜图标（ZoomIn）

```vue
<el-button
  type="success"
  link
  :icon="ZoomIn"
  @click="$router.push({ 
    path: '/admin/permission-authorize', 
    query: { id: row.id } 
  })"
>
  授权角色
</el-button>
```

## 使用流程

### 1. 查看权限授权角色
1. 进入"权限管理"页面
2. 点击某个权限的"授权角色"按钮
3. 跳转到授权页面，显示该权限下的所有角色

### 2. 为权限添加角色
1. 在授权页面点击"添加角色"按钮
2. 弹出对话框显示未授权的角色列表
3. 可选择性搜索角色
4. 勾选要授权的角色
5. 点击"确定"完成授权
6. 提示重新登录后生效

### 3. 取消角色授权
**单个取消：**
1. 在表格中找到要取消授权的角色
2. 点击该角色行的"取消授权"按钮
3. 确认操作
4. 提示重新登录后生效

**批量取消：**
1. 勾选要取消授权的多个角色
2. 点击"批量取消授权"按钮
3. 确认操作
4. 提示重新登录后生效

## 页面预览

### 授权页面布局
```
┌─────────────────────────────────────────┐
│ 授权角色                                 │
├─────────────────────────────────────────┤
│ 搜索区域                                 │
│ [角色名称] [角色字符] [搜索] [重置]      │
├─────────────────────────────────────────┤
│ 操作区域                                 │
│ [添加角色] [批量取消授权] [刷新] [返回]  │
├─────────────────────────────────────────┤
│ 角色列表表格                             │
│ □ 编号 | 名称 | 字符 | 顺序 | 状态 |... │
│ □ 101  | 管理 | admin| 1    | 正常 |... │
│ □ 102  | 用户 | user | 2    | 正常 |... │
└─────────────────────────────────────────┘
```

### 添加角色对话框
```
┌─────────────────────────────────────────┐
│ 授权角色                        [×]      │
├─────────────────────────────────────────┤
│ [角色名称] [角色字符] [搜索] [重置]      │
├─────────────────────────────────────────┤
│ 未授权角色列表                           │
│ □ 编号 | 名称 | 字符 | 顺序 | 状态     │
│ □ 201  | 编辑 | editor| 3   | 正常    │
│ □ 202  | 访客 | guest | 4   | 正常    │
├─────────────────────────────────────────┤
│                        [取消] [确定]     │
└─────────────────────────────────────────┘
```

## 技术要点

### 1. 路由参数传递
使用 Vue Router 的 query 参数传递权限ID：
```typescript
$router.push({ 
  path: '/admin/permission-authorize', 
  query: { id: row.id } 
})
```

### 2. 对话框数据隔离
主表格和对话框表格使用独立的数据源和选中状态：
```typescript
// 主表格
const tableData = ref<RoleItem[]>([])
const selectedRows = ref<RoleItem[]>([])

// 对话框表格
const dialogTableData = ref<RoleItem[]>([])
const dialogSelectedRows = ref<RoleItem[]>([])
```

### 3. 响应式计算
使用 computed 实时计算页面标题和按钮状态：
```typescript
const pageTitle = computed(() => '授权角色')
const hasSelected = computed(() => selectedRows.value.length > 0)
```

### 4. 表格多选
使用 Element Plus 的 selection-change 事件处理多选：
```vue
<el-table @selection-change="handleSelectionChange">
  <el-table-column type="selection" width="55" />
</el-table>
```

### 5. 图标使用
在按钮上添加放大镜图标（ZoomIn）保持一致的UI风格：
```vue
<el-button
  type="success"
  link
  :icon="ZoomIn"
>
  授权角色
</el-button>
```

## 与角色授权用户功能的对比

| 特性 | 角色授权用户 | 权限授权角色 |
|------|-------------|-------------|
| 主体 | 角色 | 权限 |
| 目标 | 用户 | 角色 |
| 页面路径 | `/admin/role-authorize` | `/admin/permission-authorize` |
| 路由参数 | 角色ID + 角色名 | 权限ID |
| API前缀 | `/user/role/` | `/role/permission/` |
| 页面标题 | 授权 "角色名" 角色 | 授权角色 |

## 注意事项

1. **权限生效时机**
   - 授权或取消授权后需要重新登录才能生效
   - 系统会在操作成功后提示用户

2. **数据安全**
   - 所有删除操作都有二次确认
   - 批量操作前会检查是否有选中项

3. **用户体验**
   - 对话框关闭时自动清空选中状态
   - 操作成功后自动刷新列表
   - 提供返回按钮方便导航
   - 统一使用放大镜图标增强识别性

4. **API兼容性**
   - 确保后端API已实现相应接口
   - 响应数据格式：`{ code: 200, data: [...] }`

## 文件清单

### 新增文件（1个）
1. `src/views/Admin/Permission/AuthorizeRole.vue` - 权限授权角色页面

### 修改文件（3个）
1. `src/apis/permission/index.ts` - 扩展权限授权相关API
2. `src/router/routers.ts` - 添加权限授权路由
3. `src/views/Admin/Permission/index.vue` - 添加授权角色按钮（含放大镜图标）

---

**实现完成时间**：2025-11-21
**实现状态**：✅ 已完成
