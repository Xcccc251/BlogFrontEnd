# 知识图谱菜单配置完成

## ✅ 已完成的修改

### 1. 路由配置

**文件**: `src/router/routers.ts`

添加了知识图谱路由：

```typescript
// 知识图谱
{
    path: '/graph',
    component: () => import('@/views/Graph/index.vue'),
    name: 'graph',
    meta: {
        title: '知识图谱可视化',
    }
}
```

**位置**: 在 `layout` 的 `children` 数组中，位于 `/publish` 路由之后

---

### 2. 桌面端菜单

**文件**: `src/components/Layout/Header/index.vue`

#### 修改1: 导入图标

```typescript
import {
  // ... 其他图标
  Connection  // 新增
} from '@element-plus/icons-vue'
```

#### 修改2: 添加菜单项

```vue
<el-menu-item index="/graph">
  <el-icon>
    <Connection/>
  </el-icon>
  图谱
</el-menu-item>
```

**位置**: 在"发布"菜单项之后

---

### 3. 移动端菜单

**文件**: `src/components/Layout/Header/MoveMenu/index.vue`

#### 修改1: 导入图标

```typescript
import {
  // ... 其他图标
  Connection, Edit  // 新增
} from "@element-plus/icons-vue"
```

#### 修改2: 添加菜单项

```vue
<el-menu-item index="/publish" @click="isClose">
  <el-icon>
    <Edit/>
  </el-icon>
  发布
</el-menu-item>
<el-menu-item index="/graph" @click="isClose">
  <el-icon>
    <Connection/>
  </el-icon>
  知识图谱
</el-menu-item>
```

**位置**: 在"AI对话"和"关于"之间

---

## 🎨 效果预览

### 桌面端菜单顺序
```
首页 | 音乐 | AI助手 | 发布 | 图谱
```

### 移动端菜单顺序
```
首页
归档
  ├─ 时间轴
  ├─ 分类
  └─ 标签
其他
  ├─ 树洞
  └─ 留言板
友链
音乐（如果启用）
AI对话
发布
知识图谱  ← 新增
关于
```

---

## 🚀 使用说明

### 1. 启动服务

```bash
# 后端服务
cd my-blogv2
go run main.go

# 前端开发服务器
cd kuailemao-blog
npm run dev
```

### 2. 访问页面

- **直接访问**: `http://localhost:端口/graph`
- **通过菜单**: 点击导航栏的"图谱"按钮

### 3. 移动端访问

1. 点击左上角的菜单图标（三条横线）
2. 在侧边栏中找到"知识图谱"
3. 点击进入

---

## 📝 图标说明

使用了 Element Plus 的 `Connection` 图标：
- **含义**: 连接、网络、图谱
- **视觉**: 多个节点相互连接的图形
- **适用性**: 非常适合表示知识图谱的概念

---

## 🔧 自定义选项

### 修改菜单标题

如果想要修改显示的文字：

```vue
<!-- 桌面端 -->
<el-menu-item index="/graph">
  <el-icon>
    <Connection/>
  </el-icon>
  知识图谱  <!-- 修改这里 -->
</el-menu-item>

<!-- 移动端 -->
<el-menu-item index="/graph" @click="isClose">
  <el-icon>
    <Connection/>
  </el-icon>
  知识图谱  <!-- 修改这里 -->
</el-menu-item>
```

### 更换图标

如果想使用其他图标，可以从 Element Plus Icons 中选择：

推荐的替代图标：
- `DataLine` - 数据线图
- `Share` - 分享/连接
- `CollectionTag` - 集合标签
- `Histogram` - 直方图

```vue
import { DataLine } from '@element-plus/icons-vue'

<el-icon>
  <DataLine/>
</el-icon>
```

### 调整菜单顺序

在 `Header/index.vue` 中移动 `<el-menu-item index="/graph">` 的位置即可。

---

## ✨ 页面功能

访问 `/graph` 后，你将看到：

### 左侧面板（65%宽度）
- 图谱可视化容器
- 显示节点和边的统计信息
- 刷新按钮

### 右侧面板（35%宽度）
- AI助手对话区
- 模型选择器
- 流式消息显示
- 思考过程展示

### 交互功能
- 可拖拽分割器调整左右比例
- AI可以回答关于图谱的问题

---

## 📚 相关文档

- `src/views/Graph/README.md` - 页面使用说明
- `GRAPH_VISUALIZATION_SETUP.md` - 完整部署指南
- `GRAPH_API_USAGE.md` - 后端API文档

---

## 🐛 故障排查

### 问题1: 菜单不显示

**检查**:
1. 确保前端服务已重启
2. 清除浏览器缓存
3. 检查控制台是否有错误

### 问题2: 点击菜单无反应

**检查**:
1. 路由配置是否正确
2. 组件文件是否存在
3. 浏览器控制台是否有路由错误

### 问题3: 图标不显示

**检查**:
1. `Connection` 图标是否正确导入
2. Element Plus 版本是否支持该图标
3. 尝试使用其他图标替代

---

## 📊 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `src/router/routers.ts` | 新增 | 添加 `/graph` 路由 |
| `src/components/Layout/Header/index.vue` | 修改 | 添加桌面端菜单项 |
| `src/components/Layout/Header/MoveMenu/index.vue` | 修改 | 添加移动端菜单项 |
| `src/views/Graph/index.vue` | 新建 | 图谱页面组件 |

---

**配置完成时间**: 2024-01-15  
**状态**: ✅ 已完成并测试
