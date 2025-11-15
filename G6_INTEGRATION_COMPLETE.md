# G6 知识图谱可视化集成完成

## ✅ 已完成的功能

### 1. G6库安装

```bash
npm install @antv/g6@4.8.24
```

版本：`@antv/g6@4.8.24` （稳定版本）

---

### 2. 核心功能实现

#### 🎨 图谱可视化
- ✅ 使用G6 Force力导向布局
- ✅ 节点自动排布，避免重叠
- ✅ 边带箭头显示方向
- ✅ 节点大小根据入度（点赞数）动态调整
- ✅ 支持缩放、拖拽画布
- ✅ 支持拖拽节点

#### 🎨 节点样式差异化
根据节点类型设置不同颜色：
- **User（用户）**: 蓝色 `#5B8FF9`
- **Article（文章）**: 绿色 `#5AD8A6`
- **Category（分类）**: 黄色 `#F6BD16`
- **Tag（标签）**: 红色 `#E86452`

#### 🖱️ 交互功能
- ✅ **节点悬停**: 显示高亮边框（蓝色）
- ✅ **节点点击**: 选中状态（红色边框）+ 触发AI对话
- ✅ **边悬停**: 显示高亮效果
- ✅ **Tooltip提示**: 悬停显示节点类型和完整标签
- ✅ **节点拖拽**: 可以拖动调整位置
- ✅ **画布缩放**: 鼠标滚轮缩放
- ✅ **画布平移**: 拖拽空白区域移动视图

#### 🤖 AI联动
- ✅ 点击节点自动生成AI问题
- ✅ 根据节点类型生成不同的询问语句
- ✅ AI回答直接显示在右侧对话区

#### 📐 响应式布局
- ✅ 窗口大小变化时自动调整图谱大小
- ✅ 分割器拖动时同步调整图谱尺寸
- ✅ 自适应画布（fitView）

---

## 🎯 使用说明

### 启动服务

```bash
# 1. 后端服务
cd my-blogv2
go run main.go

# 2. 前端服务
cd kuailemao-blog
npm run dev

# 3. 访问页面
浏览器打开: http://localhost:端口/graph
```

### 操作指南

#### 基本操作
- **平移画布**: 鼠标拖拽空白区域
- **缩放画布**: 鼠标滚轮
- **拖动节点**: 鼠标拖拽节点
- **选择节点**: 单击节点
- **查看详情**: 悬停在节点上查看Tooltip

#### AI交互
1. **点击节点**: 会自动在右侧AI对话框中发起询问
2. **询问格式**:
   - User节点: "请介绍一下用户节点：张三（ID: user_1）"
   - Article节点: "请介绍一下文章节点：Vue3响应式原理（ID: article_1）"
   - Category节点: "请介绍一下分类节点：前端开发（ID: category_1）"
   - Tag节点: "请介绍一下标签节点：Vue（ID: tag_1）"

3. **AI回答**: 基于图谱数据和上下文自动生成

---

## 🎨 视觉效果

### 节点状态

| 状态 | 边框颜色 | 边框宽度 | 说明 |
|------|---------|---------|------|
| 默认 | 节点类型色 | 2px | 正常显示 |
| 悬停 | 蓝色 `#1890ff` | 3px | 鼠标悬停 |
| 选中 | 红色 `#f5222d` | 3px | 点击选中 |

### 节点大小

```javascript
size = 25 + (inDegree * 2)
// 最小: 25px
// 最大: 50px
// inDegree: 节点入度（被多少用户点赞）
```

热门节点（高入度）会显示得更大。

---

## 📊 技术细节

### G6配置

```typescript
graph = new G6.Graph({
  container: graphContainer.value,
  width, height,
  layout: {
    type: 'force',              // 力导向布局
    preventOverlap: true,       // 防止节点重叠
    nodeSpacing: 100,           // 节点间距
    linkDistance: 150,          // 边长度
    nodeStrength: -50,          // 节点斥力
    edgeStrength: 0.3,          // 边引力
    collideStrength: 0.8,       // 碰撞强度
  },
  modes: {
    default: [
      'drag-canvas',   // 拖拽画布
      'zoom-canvas',   // 缩放画布
      'drag-node',     // 拖拽节点
      { type: 'tooltip' }  // 提示框
    ],
  },
})
```

### 数据格式转换

后端返回格式 → G6格式：

```typescript
// 后端格式
{
  id: "article_1",
  label: "Article",
  properties: { title: "Vue3响应式原理", ... }
}

// G6格式
{
  id: "article_1",
  label: "Vue3响应式原理",
  type: "Article",
  style: { fill: "#5AD8A6", stroke: "#5AD8A6" },
  size: 35,  // 根据入度计算
}
```

### 事件处理

```typescript
// 节点点击
graph.on('node:click', (evt) => {
  const node = evt.item
  const model = node.getModel()
  
  // 1. 更新选中状态
  graph.setItemState(node, 'selected', true)
  
  // 2. 触发AI对话
  sendAiMessage(`请介绍节点: ${model.label}`)
})

// 节点悬停
graph.on('node:mouseenter', (evt) => {
  graph.setItemState(evt.item, 'hover', true)
})

// 窗口resize
window.addEventListener('resize', () => {
  graph.changeSize(newWidth, newHeight)
  graph.fitView(20)
})
```

---

## 🔧 自定义配置

### 修改节点颜色

在 `Graph/index.vue` 中修改 `nodeColorMap`：

```typescript
const nodeColorMap: Record<string, string> = {
  User: '#5B8FF9',       // 蓝色
  Article: '#5AD8A6',    // 绿色  
  Category: '#F6BD16',   // 黄色
  Tag: '#E86452',        // 红色
  // 添加新类型
  CustomType: '#8B5CF6', // 紫色
}
```

### 修改布局算法

```typescript
layout: {
  type: 'circular',  // 改为圆形布局
  // type: 'radial',    // 径向布局
  // type: 'dagre',     // 层次布局
  // type: 'grid',      // 网格布局
}
```

### 修改节点大小规则

```typescript
size: Math.max(30, Math.min(60, 30 + (node.stats?.inDegree || 0) * 3)),
//    最小值30   最大值60   基础大小30 + 入度*3
```

### 修改边的样式

```typescript
defaultEdge: {
  style: {
    stroke: '#999',      // 边颜色
    lineWidth: 2,        // 边宽度
    lineDash: [4, 2],    // 虚线 [实线长度, 间隔长度]
  },
}
```

---

## 🐛 常见问题

### Q1: 图谱不显示

**检查**:
1. 后端服务是否启动（端口7001）
2. 图谱数据是否加载成功（查看控制台）
3. Neo4j数据是否已同步
4. graphContainer容器是否存在

**解决**:
```bash
# 检查后端接口
curl http://localhost:7001/graph/overview

# 同步Neo4j数据
curl -X POST http://localhost:7001/neo4j/sync/all
```

### Q2: 节点重叠

**原因**: 数据量太大或布局参数不合适

**解决**:
```typescript
layout: {
  nodeSpacing: 150,      // 增加节点间距
  linkDistance: 200,     // 增加边长度
  preventOverlap: true,  // 确保开启防重叠
}
```

### Q3: 性能卡顿

**原因**: 节点数量过多（> 500个）

**解决**:
1. 减少 `limit` 参数
2. 使用分页加载
3. 启用G6的性能优化模式

```typescript
// 修改加载数据的limit
const response = await fetch('http://localhost:7001/graph/overview?limit=50')
```

### Q4: 点击节点无反应

**检查**:
1. 事件监听是否正确注册
2. 控制台是否有错误
3. AI对话功能是否正常

**调试**:
```typescript
graph.on('node:click', (evt) => {
  console.log('节点被点击:', evt.item.getModel())
})
```

### Q5: 窗口resize后图谱变形

**原因**: 没有监听resize事件

**已解决**: 代码中已添加resize监听和自动调整

---

## 📈 性能优化建议

### 1. 大数据量优化

```typescript
// 使用分页加载
const loadMoreNodes = async (page: number) => {
  const response = await fetch(`/graph/nodes?page=${page}&size=50`)
  const newNodes = response.data.nodes
  
  // 增量添加节点
  graph.addItem('node', newNodes)
}
```

### 2. 降低渲染质量

```typescript
graph = new G6.Graph({
  // ...其他配置
  pixelRatio: 1,           // 降低像素比
  renderer: 'canvas',      // 使用canvas渲染（默认）
  animate: false,          // 关闭动画
})
```

### 3. 按需加载邻居节点

```typescript
// 双击节点展开邻居
graph.on('node:dblclick', async (evt) => {
  const nodeId = evt.item.getModel().id
  const neighbors = await fetchNeighbors(nodeId)
  
  neighbors.forEach(neighbor => {
    graph.addItem('node', neighbor)
  })
})
```

---

## 🚀 扩展功能建议

### 1. 右键菜单

```typescript
import { ContextMenu } from '@antv/g6'

graph = new G6.Graph({
  plugins: [
    new ContextMenu({
      getContent(evt) {
        return `
          <ul>
            <li>查看详情</li>
            <li>展开邻居</li>
            <li>隐藏节点</li>
          </ul>
        `
      },
    }),
  ],
})
```

### 2. 图例

```typescript
import { Legend } from '@antv/g6'

graph = new G6.Graph({
  plugins: [
    new Legend({
      data: {
        nodes: [
          { id: 'User', label: '用户', color: '#5B8FF9' },
          { id: 'Article', label: '文章', color: '#5AD8A6' },
          { id: 'Category', label: '分类', color: '#F6BD16' },
          { id: 'Tag', label: '标签', color: '#E86452' },
        ],
      },
    }),
  ],
})
```

### 3. 搜索高亮

```typescript
const searchNode = (keyword: string) => {
  const nodes = graph.getNodes()
  
  nodes.forEach(node => {
    const model = node.getModel()
    const label = model.fullLabel || model.label
    
    if (label.includes(keyword)) {
      graph.setItemState(node, 'highlight', true)
    } else {
      graph.clearItemStates(node, 'highlight')
    }
  })
}
```

### 4. 导出图片

```typescript
const exportImage = () => {
  graph.downloadFullImage('knowledge-graph', 'image/png', {
    backgroundColor: '#fff',
    padding: [20, 20, 20, 20],
  })
}
```

---

## 📚 参考资料

- [G6 官方文档](https://g6.antv.antgroup.com/)
- [G6 API文档](https://g6.antv.antgroup.com/api/graph)
- [G6 示例库](https://g6.antv.antgroup.com/examples)
- [Force布局文档](https://g6.antv.antgroup.com/api/graphLayout/force)

---

## 📝 文件清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `package.json` | 新增依赖 | 添加 @antv/g6@4.8.24 |
| `src/views/Graph/index.vue` | 重大修改 | 集成G6，实现完整可视化 |
| `G6_INTEGRATION_COMPLETE.md` | 新建 | 本文档 |

---

**集成完成时间**: 2024-01-15  
**G6版本**: 4.8.24  
**状态**: ✅ 完整可用
