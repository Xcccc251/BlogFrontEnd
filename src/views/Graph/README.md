# 知识图谱可视化页面

## 📁 文件说明

`src/views/Graph/index.vue` - 知识图谱可视化主页面

## 🎯 功能特性

### 已实现功能

#### 1. 左侧 - 图谱可视化区域
- ✅ 基础容器结构
- ✅ 图谱数据加载（从后端API获取）
- ✅ 简单的统计信息展示
- ⏳ 图谱可视化库集成（待实现）

#### 2. 右侧 - AI对话助手
- ✅ 完整的AI聊天功能（复制自Publish页面）
- ✅ 流式消息显示
- ✅ 思考过程展示（可折叠）
- ✅ 模型选择器
- ✅ 自动滚动
- ✅ 消息格式化（Markdown简化版）

#### 3. 分割器
- ✅ 可拖拽调整左右区域大小
- ✅ 平滑动画效果

## 🚀 使用方法

### 1. 配置路由

在 `src/router/index.ts` 中添加路由：

```typescript
{
  path: '/graph',
  name: 'Graph',
  component: () => import('@/views/Graph/index.vue'),
  meta: {
    title: '知识图谱'
  }
}
```

### 2. 添加导航菜单

在导航栏添加入口链接：

```vue
<router-link to="/graph">知识图谱</router-link>
```

### 3. 启动后端服务

确保后端知识图谱API服务已启动：

```bash
# 在 my-blogv2 目录
go run main.go
```

### 4. 访问页面

浏览器访问：`http://localhost:端口/graph`

## 📊 数据流

```
前端页面 
  ↓ loadGraphData()
后端 GET /graph/overview
  ↓ 返回图谱数据
initGraph() 初始化可视化
  ↓
用户与AI对话
  ↓ sendAiMessage()
流式响应处理
  ↓
更新聊天界面
```

## 🔧 下一步开发

### 优先级1：集成图可视化库

推荐使用 **AntV G6**：

```bash
npm install @antv/g6
```

**实现步骤：**

1. 在 `initGraph()` 函数中初始化G6实例
2. 将 `graphData.value.nodes` 和 `graphData.value.edges` 转换为G6格式
3. 配置节点样式（根据nodeType区分颜色）
4. 添加交互功能（点击、拖拽、缩放）

**示例代码：**

```typescript
import G6 from '@antv/g6'

const initGraph = () => {
  if (!graphContainer.value || !graphData.value) return
  
  const graph = new G6.Graph({
    container: graphContainer.value,
    width: graphContainer.value.offsetWidth,
    height: graphContainer.value.offsetHeight,
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeStrength: -50,
      edgeStrength: 0.3,
    },
    defaultNode: {
      size: 30,
      labelCfg: {
        style: {
          fontSize: 12,
        },
      },
    },
    defaultEdge: {
      style: {
        stroke: '#e2e2e2',
        endArrow: {
          path: G6.Arrow.triangle(),
        },
      },
    },
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
    },
  })

  // 节点颜色映射
  const nodeColorMap = {
    User: '#5B8FF9',
    Article: '#5AD8A6',
    Category: '#F6BD16',
    Tag: '#E86452',
  }

  // 处理数据
  const g6Data = {
    nodes: graphData.value.nodes.map((node: any) => ({
      id: node.id,
      label: node.properties.title || node.properties.username || node.properties.name,
      style: {
        fill: nodeColorMap[node.label] || '#ccc',
      },
    })),
    edges: graphData.value.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
  }

  graph.data(g6Data)
  graph.render()
  
  // 节点点击事件
  graph.on('node:click', (evt) => {
    const node = evt.item
    const nodeData = node.getModel()
    console.log('点击节点:', nodeData)
    // 可以触发AI对话，询问节点详情
  })
}
```

### 优先级2：增强AI对话功能

**图谱相关工具函数：**

1. **查询节点详情**
   - 用户点击节点 → AI显示节点属性
   - AI消息：`获取节点 article_1 的详细信息...`

2. **查询节点邻居**
   - 用户询问："这篇文章被谁点赞了？"
   - AI调用 `/graph/nodes/:id/neighbors` 接口

3. **路径查找**
   - 用户询问："用户A和文章B有什么关系？"
   - AI调用 `/graph/path` 接口

4. **统计分析**
   - 用户询问："哪些文章最受欢迎？"
   - AI调用 `/graph/stats` 接口

### 优先级3：图谱交互功能

**节点操作：**
- 右键菜单（查看详情、展开邻居、隐藏节点）
- 双击节点展开一度邻居
- 高亮选中节点及其关系

**布局切换：**
- 力导向布局（Force）
- 同心圆布局（Concentric）
- 树形布局（Tree）
- 径向布局（Radial）

**过滤器：**
- 按节点类型过滤
- 按关系类型过滤
- 按属性搜索

### 优先级4：数据编辑功能

**图谱编辑：**
- 创建新节点
- 删除节点
- 创建关系
- 删除关系
- 编辑节点属性

需要后端编辑接口支持（已预留路由）。

## 📝 代码说明

### 核心函数

| 函数名 | 功能 | 说明 |
|--------|------|------|
| `loadGraphData()` | 加载图谱数据 | 调用 GET /graph/overview |
| `initGraph()` | 初始化可视化 | 待集成G6库 |
| `sendAiMessage()` | 发送AI消息 | 支持流式响应 |
| `buildGraphContext()` | 构建图谱上下文 | 提供给AI的图谱信息 |
| `startDrag()` | 开始拖拽分割器 | 调整左右区域大小 |

### 关键变量

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `graphData` | ref | 图谱数据（nodes + edges + summary） |
| `aiMessages` | ref | AI聊天消息列表 |
| `selectedModel` | ref | 当前选择的AI模型 |
| `leftPanelWidth` | ref | 左侧面板宽度百分比 |

## 🎨 样式定制

### 主题色

- 主色调：`#007bff`（蓝色）
- 背景色：`#F0F8FF`（浅蓝色）
- 容器背景：`white`

### 自定义节点颜色

在 `initGraph()` 中修改 `nodeColorMap`：

```typescript
const nodeColorMap = {
  User: '#5B8FF9',      // 蓝色
  Article: '#5AD8A6',   // 绿色
  Category: '#F6BD16',  // 黄色
  Tag: '#E86452',       // 红色
}
```

## 🐛 已知问题

1. **图谱可视化**：目前只显示统计信息，未集成可视化库
2. **响应式设计**：小屏幕下布局可能不理想
3. **性能优化**：大量节点时可能卡顿（需要虚拟化或分页加载）

## 💡 扩展建议

### 1. 多视图切换
- 图谱视图（G6）
- 表格视图（节点列表）
- 统计视图（图表）

### 2. 数据导出
- 导出为PNG/SVG图片
- 导出为JSON数据
- 导出为Cypher查询

### 3. 协作功能
- 多用户同时查看
- 实时更新通知
- 操作历史记录

### 4. AI增强
- 图谱自动分析
- 异常检测
- 推荐优化建议

## 📚 参考资料

- [AntV G6 官方文档](https://g6.antv.antgroup.com/)
- [Neo4j 图数据库文档](https://neo4j.com/docs/)
- [Vue 3 组合式API](https://cn.vuejs.org/guide/introduction.html)

---

**最后更新：** 2024-01-15
