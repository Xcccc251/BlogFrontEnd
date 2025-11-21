# 角色授权用户功能实现文档

## 概述

已成功实现角色管理中的"授权用户"功能，允许管理员为指定角色添加或取消用户授权。

## 功能特性

### 1. 查看角色已授权用户
- ✅ 显示当前角色下的所有用户列表
- ✅ 支持按用户名、邮箱搜索
- ✅ 显示用户基本信息（编号、用户名、昵称、邮箱、状态、创建时间）
- ✅ 用户状态标签展示（正常/停用）

### 2. 添加用户授权
- ✅ 弹出对话框显示未授权用户列表
- ✅ 支持在对话框内搜索用户
- ✅ 多选用户进行批量授权
- ✅ 授权成功后提示重新登录生效

### 3. 取消用户授权
- ✅ 单个取消授权
- ✅ 批量取消授权
- ✅ 二次确认防止误操作
- ✅ 取消授权后提示重新登录生效

## 实现细节

### 1. API接口扩展

#### 文件：`src/apis/role/index.ts`

新增4个API接口：

```typescript
// 查询对应角色的用户
queryRoleUser(roleId: string, username?: string, email?: string)

// 查询没有对应角色的用户
queryNotRoleUser(roleId: string, username?: string, email?: string)

// 给用户添加角色权限
addUserRole(data: { userId: number[], roleId: string })

// 取消用户授权
deleteUserRole(data: { userId: number[], roleId: string })
```

#### API端点映射：
| 接口 | 方法 | 路径 |
|------|------|------|
| 查询角色用户 | GET | `/user/role/user/list` |
| 查询未授权用户 | GET | `/user/role/not/user/list` |
| 添加用户授权 | POST | `/user/role/add` |
| 取消用户授权 | DELETE | `/user/role/delete` |

### 2. 页面组件

#### 文件：`src/views/Admin/Role/AuthorizeUser.vue`

**主要功能模块：**

1. **页面标题区域**
   - 动态显示当前授权的角色名称
   - 格式：`授权 "角色名" 角色`

2. **搜索表单区域**
   - 用户名称搜索
   - 用户邮箱搜索
   - 搜索、重置按钮

3. **操作按钮区域**
   - 添加用户：打开选择用户对话框
   - 批量取消授权：取消选中用户的授权
   - 刷新：重新加载数据
   - 返回：返回上一页

4. **数据表格区域**
   - 多选列
   - 用户信息展示列
   - 操作列（取消授权按钮）

5. **添加用户对话框**
   - 独立的搜索表单
   - 未授权用户列表表格
   - 多选功能
   - 确定/取消按钮

**关键代码逻辑：**

```vue
// 获取路由参数
const roleId = computed(() => route.query.id as string)
const roleName = computed(() => route.query.name as string)

// 加载已授权用户
const refreshData = async () => {
  const res: any = await queryRoleUser(roleId.value, formData.username, formData.email)
  tableData.value = res.data || []
}

// 加载未授权用户
const loadNotRoleUsers = async () => {
  const res: any = await queryNotRoleUser(roleId.value, dialogFormData.username, dialogFormData.email)
  dialogTableData.value = res.data || []
}

// 添加用户授权
const handleDialogConfirm = async () => {
  const userIds = dialogSelectedRows.value.map(user => user.id)
  await addUserRole({ userId: userIds, roleId: roleId.value })
  ElMessage.success('授权成功，请重新登录后生效')
  await refreshData()
}

// 取消用户授权
const handleCancelAuth = async (userIds: number[]) => {
  await deleteUserRole({ roleId: roleId.value, userId: userIds })
  ElMessage.success('成功取消授权，请重新登录后生效')
  await refreshData()
}
```

### 3. 路由配置

#### 文件：`src/router/routers.ts`

新增路由：

```typescript
{
    path: 'role-authorize',
    component: () => import('@/views/Admin/Role/AuthorizeUser.vue'),
    name: 'adminRoleAuthorize',
    meta: {
        title: '角色授权',
        requireAuth: true
    }
}
```

### 4. 角色管理页面更新

#### 文件：`src/views/Admin/Role/index.vue`

**修改内容：**
- 操作列宽度从 `180` 扩展到 `250`
- 添加"授权用户"按钮

```vue
<el-button
  type="success"
  link
  @click="$router.push({ 
    path: '/admin/role-authorize', 
    query: { id: row.id, name: row.roleName } 
  })"
>
  授权用户
</el-button>
```

## 使用流程

### 1. 查看角色授权用户
1. 进入"角色管理"页面
2. 点击某个角色的"授权用户"按钮
3. 跳转到授权页面，显示该角色下的所有用户

### 2. 为角色添加用户
1. 在授权页面点击"添加用户"按钮
2. 弹出对话框显示未授权的用户列表
3. 可选择性搜索用户
4. 勾选要授权的用户
5. 点击"确定"完成授权
6. 提示用户重新登录后生效

### 3. 取消用户授权
**单个取消：**
1. 在表格中找到要取消授权的用户
2. 点击该用户行的"取消授权"按钮
3. 确认操作
4. 提示重新登录后生效

**批量取消：**
1. 勾选要取消授权的多个用户
2. 点击"批量取消授权"按钮
3. 确认操作
4. 提示重新登录后生效

## 页面预览

### 授权页面布局
```
┌─────────────────────────────────────────┐
│ 授权 "管理员" 角色                       │
├─────────────────────────────────────────┤
│ 搜索区域                                 │
│ [用户名称] [用户邮箱] [搜索] [重置]      │
├─────────────────────────────────────────┤
│ 操作区域                                 │
│ [添加用户] [批量取消授权] [刷新] [返回]  │
├─────────────────────────────────────────┤
│ 用户列表表格                             │
│ □ 编号 | 用户名 | 昵称 | 邮箱 | 状态 |... │
│ □ 1001 | admin  | 管理 | xx@  | 正常 |... │
│ □ 1002 | user1  | 用户 | yy@  | 正常 |... │
└─────────────────────────────────────────┘
```

### 添加用户对话框
```
┌─────────────────────────────────────────┐
│ 授权 "管理员" 角色              [×]      │
├─────────────────────────────────────────┤
│ [用户名称] [邮箱] [搜索] [重置]          │
├─────────────────────────────────────────┤
│ 未授权用户列表                           │
│ □ 编号 | 用户名 | 昵称 | 邮箱 | 状态     │
│ □ 2001 | user2  | 用户2| zz@  | 正常    │
│ □ 2002 | user3  | 用户3| aa@  | 正常    │
├─────────────────────────────────────────┤
│                        [取消] [确定]     │
└─────────────────────────────────────────┘
```

## 技术要点

### 1. 路由参数传递
使用 Vue Router 的 query 参数传递角色ID和名称：
```typescript
$router.push({ 
  path: '/admin/role-authorize', 
  query: { id: row.id, name: row.roleName } 
})
```

### 2. 对话框数据隔离
主表格和对话框表格使用独立的数据源和选中状态：
```typescript
// 主表格
const tableData = ref<UserItem[]>([])
const selectedRows = ref<UserItem[]>([])

// 对话框表格
const dialogTableData = ref<UserItem[]>([])
const dialogSelectedRows = ref<UserItem[]>([])
```

### 3. 响应式计算
使用 computed 实时计算页面标题和按钮状态：
```typescript
const pageTitle = computed(() => `授权 "${roleName.value}" 角色`)
const hasSelected = computed(() => selectedRows.value.length > 0)
```

### 4. 表格多选
使用 Element Plus 的 selection-change 事件处理多选：
```vue
<el-table @selection-change="handleSelectionChange">
  <el-table-column type="selection" width="55" />
</el-table>
```

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

4. **API兼容性**
   - 确保后端API已实现相应接口
   - 响应数据格式：`{ code: 200, data: [...] }`

## 文件清单

### 新增文件（1个）
1. `src/views/Admin/Role/AuthorizeUser.vue` - 角色授权用户页面

### 修改文件（3个）
1. `src/apis/role/index.ts` - 扩展角色授权相关API
2. `src/router/routers.ts` - 添加角色授权路由
3. `src/views/Admin/Role/index.vue` - 添加授权用户按钮

---

**实现完成时间**：2025-11-21
**实现状态**：✅ 已完成
