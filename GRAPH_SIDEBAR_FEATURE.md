# 知识图谱侧边栏功能说明

## ✅ 新增功能

### 📊 左侧侧边栏（Neo4j风格）

参考Neo4j Browser的UI设计，在图谱可视化页面左侧添加了数据统计侧边栏。

---

## 🎨 界面预览

```
+--------------------------------------------------------------+
| [侧边栏]  |  [图谱主体]           |  [AI助手]              |
|           |                      |                        |
| 数据统计 ⇄ |  知识图谱可视化       |  模型选择器             |
|           |                      |                        |
| Node      |  [G6力导向图谱]       |  聊天消息区             |
| labels    |                      |                        |
| (26) Arti |  • 蓝色节点 = 用户     |  User: ...             |
| (10) Cate |  • 绿色节点 = 文章     |  AI: ...               |
| (5) User  |  • 黄色节点 = 分类     |                        |
|           |  • 红色节点 = 标签     |  输入框                 |
| Relation  |                      |                        |
| types     |                      |                        |
| (114) BEL |                      |                        |
+--------------------------------------------------------------+
```

---

## 🌟 核心功能

### 1. **数据统计展示**

#### Node labels（节点标签）
- 显示所有节点类型及数量
- 彩色圆形徽章表示节点颜色
- 实时统计数字

示例：
```
Node labels
━━━━━━━━━━━━━━━
(26) Article    # 绿色徽章
(10) Category   # 黄色徽章
(5)  User       # 蓝色徽章
(3)  Tag        # 红色徽章
```

#### Relationship types（关系类型）
- 显示所有边类型及数量
- 灰色圆形徽章
- 实时统计数字

示例：
```
Relationship types
━━━━━━━━━━━━━━━━━━
(114) BELONGS_TO
(50)  LIKED
(15)  HAS_TAG
```

### 2. **交互过滤功能**

#### 点击过滤
- **点击节点类型**: 只显示该类型的节点
- **点击关系类型**: 只显示该类型的边
- **再次点击**: 取消过滤，恢复显示

#### 多选过滤
- 可以同时选择多个节点类型
- 可以同时选择多个关系类型
- 图谱实时响应过滤变化

#### 视觉反馈
- **未选中**: 半透明显示（opacity: 0.7）
- **选中/激活**: 高亮显示，带蓝色边框
- **悬停**: 背景色变深

### 3. **侧边栏折叠**

- **展开状态**: 宽度240px，显示完整信息
- **折叠状态**: 宽度50px，只显示切换按钮
- **平滑过渡**: 0.3s动画效果

---

## 🎯 使用说明

### 查看统计信息

1. 打开 `/graph` 页面
2. 左侧自动显示侧边栏
3. 查看节点和关系的数量统计

### 过滤特定类型

**示例1: 只查看文章节点**
1. 点击"Article"标签
2. 图谱只显示绿色的文章节点
3. 其他类型节点隐藏

**示例2: 同时查看用户和文章**
1. 点击"User"标签
2. 再点击"Article"标签
3. 图谱只显示蓝色用户节点和绿色文章节点

**示例3: 只查看点赞关系**
1. 点击"LIKED"标签
2. 图谱只显示点赞关系的边
3. 其他关系的边隐藏

### 恢复显示全部

- **方式1**: 再次点击已选中的标签（取消选择）
- **方式2**: 依次取消所有选中的标签
- 当没有任何标签选中时，自动显示全部

### 折叠/展开侧边栏

- **点击按钮**: 侧边栏右上角的箭头按钮
- **展开**: 显示完整的统计信息
- **折叠**: 只保留切换按钮，释放更多空间给图谱

---

## 🎨 UI设计说明

### 颜色方案（Neo4j风格）

| 元素 | 颜色 | 说明 |
|------|------|------|
| 背景 | #2d2d2d | 深灰色（Neo4j经典配色） |
| 文字 | #e0e0e0 | 浅灰色 |
| 标题 | #888 | 中灰色，大写字母 |
| 分隔线 | #444 | 深灰线条 |
| 悬停背景 | #3a3a3a | 略浅灰色 |
| 激活边框 | rgba(94, 158, 214, 0.3) | 蓝色发光效果 |

### 节点徽章颜色

- User: `#5B8FF9` （蓝色）
- Article: `#5AD8A6` （绿色）
- Category: `#F6BD16` （黄色）
- Tag: `#E86452` （红色）
- 关系: `#666` （灰色）

### 尺寸规格

- 侧边栏宽度: 240px（展开）/ 50px（折叠）
- 徽章大小: 32px × 22px
- 徽章圆角: 11px（圆角矩形）
- 项目间距: 8px
- 内边距: 15px

---

## 🔧 技术实现

### 关键代码

#### 1. 响应式状态管理

```typescript
// 侧边栏状态
const sidebarCollapsed = ref(false)

// 过滤器状态
const selectedNodeTypes = ref<string[]>([])
const selectedEdgeTypes = ref<string[]>([])
```

#### 2. 过滤逻辑

```typescript
const applyFilters = () => {
  if (!graph) return
  
  const nodes = graph.getNodes()
  const edges = graph.getEdges()
  
  // 无选择时显示全部
  const showAllNodes = selectedNodeTypes.value.length === 0
  const showAllEdges = selectedEdgeTypes.value.length === 0
  
  // 过滤节点
  nodes.forEach((node: any) => {
    const model = node.getModel()
    const visible = showAllNodes || selectedNodeTypes.value.includes(model.type)
    if (visible) {
      graph.showItem(node)
    } else {
      graph.hideItem(node)
    }
  })
  
  // 过滤边
  edges.forEach((edge: any) => {
    const model = edge.getModel()
    const visible = showAllEdges || selectedEdgeTypes.value.includes(model.label)
    if (visible) {
      graph.showItem(edge)
    } else {
      graph.hideItem(edge)
    }
  })
}
```

#### 3. 切换过滤器

```typescript
const toggleNodeTypeFilter = (type: string) => {
  const index = selectedNodeTypes.value.indexOf(type)
  if (index > -1) {
    // 取消选择
    selectedNodeTypes.value.splice(index, 1)
  } else {
    // 添加选择
    selectedNodeTypes.value.push(type)
  }
  applyFilters()
}
```

### 布局结构

```html
<div class="graph-visualization-section">
  <!-- 侧边栏 -->
  <div class="graph-sidebar">
    <div class="sidebar-header">
      <h3>数据统计</h3>
      <button @click="toggleSidebar">⇄</button>
    </div>
    <div class="sidebar-content">
      <!-- Node labels -->
      <!-- Relationship types -->
    </div>
  </div>
  
  <!-- 图谱主体 -->
  <div class="graph-main">
    <div class="graph-header">...</div>
    <div class="graph-content">...</div>
  </div>
</div>
```

---

## 💡 使用场景

### 场景1: 快速了解图谱结构
```
用户：打开图谱页面
侧边栏：显示"26个文章，10个分类，5个用户"
用户：一眼看出数据分布
```

### 场景2: 分析特定类型关系
```
用户：想查看哪些文章属于哪个分类
操作：点击"Article"和"Category"，再点击"BELONGS_TO"
结果：只显示文章→分类的归属关系
```

### 场景3: 聚焦用户行为
```
用户：想看用户点赞了哪些文章
操作：点击"User"和"Article"，再点击"LIKED"
结果：只显示用户→文章的点赞关系
```

### 场景4: 探索分类体系
```
用户：想了解分类的完整结构
操作：点击"Category"
结果：只显示所有分类节点及其关系
```

---

## 🎓 操作提示

### ✅ 推荐操作

1. **初次使用**: 先查看侧边栏统计，了解整体数据规模
2. **过滤节点**: 单击类型标签，快速聚焦
3. **组合过滤**: 同时选择多个类型，分析特定关系
4. **空间优化**: 折叠侧边栏，查看更大的图谱
5. **恢复视图**: 取消所有选择，回到全局视图

### ⚠️ 注意事项

1. **过滤不会删除数据**: 只是隐藏，随时可以恢复
2. **统计数字不变**: 过滤后统计数字仍显示总数
3. **边的依赖关系**: 隐藏节点会同时隐藏相关的边
4. **性能考虑**: 大量节点时，过滤能提升可视化性能

---

## 📊 数据来源

统计数据来自后端API：

```typescript
GET /graph/overview

Response:
{
  "summary": {
    "totalNodes": 44,
    "totalEdges": 114,
    "nodeTypes": {
      "Article": 26,
      "Category": 10,
      "User": 5,
      "Tag": 3
    },
    "edgeTypes": {
      "BELONGS_TO": 114,
      "LIKED": 50,
      "HAS_TAG": 15
    }
  }
}
```

---

## 🔄 与其他功能的配合

### 与图谱可视化

- 过滤器实时更新G6图谱显示
- 使用G6的 `showItem()` / `hideItem()` API
- 不影响图谱的拖拽、缩放等交互

### 与AI助手

- 点击节点仍可触发AI对话
- 过滤后点击节点，AI会介绍该节点
- 过滤器不影响AI功能

### 与搜索功能（未来）

- 可结合搜索功能，先过滤后搜索
- 搜索结果只在已显示的节点中查找

---

## 🚀 未来扩展

### 计划功能

1. **搜索框**: 在侧边栏顶部添加搜索，快速定位节点
2. **统计图表**: 使用ECharts显示类型分布饼图
3. **保存过滤器**: 记住用户的过滤偏好
4. **快捷过滤**: 预设常用过滤组合（如"用户行为"、"内容结构"）
5. **导出视图**: 导出当前过滤后的图谱

### 可能的增强

- 支持反向选择（显示除选中外的所有类型）
- 支持AND/OR逻辑组合
- 显示过滤后的节点/边数量
- 添加"重置"按钮一键清除所有过滤

---

## 📝 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/views/Graph/index.vue` | 新增侧边栏组件和过滤功能 |
| - Script部分 | 添加侧边栏状态管理和过滤逻辑 |
| - Template部分 | 添加侧边栏UI结构 |
| - Style部分 | 添加Neo4j风格的侧边栏样式 |

---

## 🎯 设计参考

本功能的UI设计参考了：
- **Neo4j Browser**: 左侧数据统计面板
- **Neo4j Bloom**: 节点类型过滤器
- **Gephi**: 节点类型图例

保持了Neo4j的经典深色配色方案和交互模式。

---

## 📖 相关文档

- `G6_INTEGRATION_COMPLETE.md` - G6集成文档
- `GRAPH_API_USAGE.md` - 后端API文档
- `QUICK_START.md` - 快速开始指南

---

**创建时间**: 2024-01-15  
**状态**: ✅ 已完成并可用
