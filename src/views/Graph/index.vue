<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { agentAPI } from '@/apis/aiChat'
// @ts-ignore - d3 类型声明
import * as d3 from 'd3'

// 图谱数据
const graphData = ref<any>(null)
const graphContainer = ref<HTMLElement | null>(null)
let svg: any = null // D3 SVG 实例
let simulation: any = null // D3 力导向模拟
let graphWidth = 0 // 图谱宽度
let graphHeight = 0 // 图谱高度
let centerX = 0 // 圆形边界中心X
let centerY = 0 // 圆形边界中心Y
let boundaryRadius = 0 // 圆形边界半径
let boundaryCircle: any = null // 圆形边界元素

// AI对话相关
const aiMessages = ref<any[]>([])
const aiInputMessage = ref('')
const isAiTyping = ref(false)
const aiChatMessages = ref<HTMLElement | null>(null)
const aiMessageInput = ref<HTMLTextAreaElement | null>(null)

// 模型选择
const availableModels = ref<any[]>([])
const selectedModel = ref('gemini_flash')
const showModelDropdown = ref(false)

// 分割器
const leftPanelWidth = ref(75)
const isDragging = ref(false)

// 当前选中的节点（保留用于未来功能）
// const selectedNode = ref<any>(null)

// 侧边栏相关
const sidebarCollapsed = ref(false)
const selectedNodeTypes = ref<string[]>([]) // 选中的节点类型过滤
const selectedEdgeTypes = ref<string[]>([]) // 选中的边类型过滤

// 加载图谱数据
const loadGraphData = async () => {
  try {
    const response = await fetch('http://localhost:7000/graph/overview?limit=100')
    const result = await response.json()
    
    if (result.code === 200) {
      graphData.value = result.data
      ElMessage.success('图谱数据加载成功')
      // 初始化图谱可视化
      nextTick(() => {
        initGraph()
      })
    } else {
      ElMessage.error('加载图谱数据失败')
    }
  } catch (error: any) {
    ElMessage.error('加载图谱数据失败: ' + error.message)
  }
}

// 节点颜色映射
const nodeColorMap: Record<string, string> = {
  User: '#5B8FF9',       // 蓝色
  Article: '#5AD8A6',    // 绿色  
  Category: '#F6BD16',   // 黄色
  Tag: '#E86452',        // 红色
}

// 生成颜色的深色版本
const getDarkerColor = (color: string): string => {
  const c = d3.rgb(color)
  return d3.rgb(c.r * 0.6, c.g * 0.6, c.b * 0.6).toString()
}

// 初始化图谱可视化
const initGraph = () => {
  if (!graphContainer.value || !graphData.value) return
  
  // 如果已有实例，先清理
  if (simulation) {
    simulation.stop()
  }
  if (svg) {
    svg.remove()
  }
  
  // 清空容器
  graphContainer.value.innerHTML = ''
  
  graphWidth = graphContainer.value.offsetWidth
  graphHeight = graphContainer.value.offsetHeight
  
  // 处理数据格式
  const nodes = graphData.value.nodes.map((node: any) => {
    const label = node.properties.title || node.properties.username || node.properties.name || node.id
    const nodeType = node.label
    
    return {
      id: node.id,
      label: label.length > 5 ? label.substring(0, 3) + '...' : label,
      fullLabel: label,
      type: nodeType,
      color: nodeColorMap[nodeType] || '#ccc',
      size: Math.max(60, Math.min(120, 60 + (node.stats?.inDegree || 0) * 3)),
      x: graphWidth / 2 + Math.random() * 100 - 50,
      y: graphHeight / 2 + Math.random() * 100 - 50,
    }
  })
  
  const links = graphData.value.edges.map((edge: any) => ({
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }))
  
  // 创建SVG
  svg = d3.select(graphContainer.value)
    .append('svg')
    .attr('width', graphWidth)
    .attr('height', graphHeight)
    .style('background', '#F0F8FF')
  
  // 添加缩放行为
  const g = svg.append('g')
  
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr('transform', event.transform)
    })
  
  svg.call(zoom as any)
  
  // 定义箭头标记
  const defs = svg.append('defs')

  // 普通箭头
  defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 39)
    .attr('refY', 0)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#999')

  // 悬停时的箭头
  defs.append('marker')
    .attr('id', 'arrow-hover')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 39)
    .attr('refY', 0)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#999')
  
  // 计算圆形边界
  centerX = graphWidth / 2
  centerY = graphHeight / 2
  boundaryRadius = Math.min(graphWidth, graphHeight) / 2 - 30 // 留30px边距
  
  // 绘制圆形边界
  boundaryCircle = g.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', boundaryRadius)
    .attr('fill', 'none')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')
    .style('pointer-events', 'none')
  
  // 创建力导向模拟
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-80))
    .force('center', d3.forceCenter(centerX, centerY))
    .force('collision', d3.forceCollide().radius((d: any) => d.size + 5).strength(0.7))
  
  // 绘制边
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter().append('line')
    .attr('stroke', '#999')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrow)')
    .style('opacity', 1)
  
  // 绘制边标签
  const linkLabel = g.append('g')
    .attr('class', 'link-labels')
    .selectAll('g')
    .data(links)
    .enter().append('g')
  
  // 边标签背景
  linkLabel.append('rect')
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 1)
    .attr('rx', 3)
    .attr('ry', 3)
    .style('pointer-events', 'none')
  
  // 边标签文字
  linkLabel.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '11px')
    .style('fill', '#666')
    .style('pointer-events', 'none')
    .text((d: any) => d.label)
  
  // 计算并设置背景矩形大小
  linkLabel.each(function(this: SVGGElement) {
    const text = d3.select(this).select('text').node() as SVGTextElement
    const bbox = text.getBBox()
    d3.select(this).select('rect')
      .attr('width', bbox.width + 8)
      .attr('height', bbox.height + 4)
  })
  
  // 绘制节点组
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter().append('g')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended) as any)
  
  // 绘制节点圆形
  node.append('circle')
    .attr('r', (d: any) => d.size / 2)
    .attr('fill', (d: any) => d.color)
    .attr('stroke', (d: any) => getDarkerColor(d.color))
    .attr('stroke-width', 3)
    .on('mouseenter', function(this: SVGCircleElement, event: MouseEvent, d: any) {
      d3.select(this)
        .attr('stroke', '#1890ff')
        .attr('stroke-width', 3)
      
      // 显示tooltip
      tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`<strong>类型:</strong> ${d.type}<br/><strong>标签:</strong> ${d.fullLabel}`)
    })
    .on('mouseleave', function(this: SVGCircleElement, _event: MouseEvent, d: any) {
      if (!d.selected) {
        d3.select(this)
          .attr('stroke', getDarkerColor(d.color))
          .attr('stroke-width', 3)
      }
      tooltip.style('display', 'none')
    })
    .on('click', function(this: SVGCircleElement, event: MouseEvent, d: any) {
      event.stopPropagation()
      
      // 清除之前的选中状态
      node.selectAll('circle').each(function(this: SVGCircleElement, d: any) {
        d3.select(this)
          .attr('stroke', getDarkerColor(d.color))
          .attr('stroke-width', 3)
      })
      nodes.forEach((n: any) => n.selected = false)
      
      // 设置新的选中状态
      d.selected = true
      d3.select(this)
        .attr('stroke', '#1890ff')
        .attr('stroke-width', 3)
    })
  
  // 添加文本标签
  node.append('text')
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .style('font-size', '13px')
    .style('font-weight', '500')
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text((d: any) => d.label)
  
  // 创建tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('display', 'none')
    .style('background', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '10000')
  
  // 更新位置
  simulation.on('tick', () => {
    // 应用圆形边界约束
    nodes.forEach((d: any) => {
      const dx = d.x - centerX
      const dy = d.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const nodeRadius = d.size / 2
      
      // 如果节点超出圆形边界，将其拉回
      if (distance + nodeRadius > boundaryRadius) {
        const angle = Math.atan2(dy, dx)
        const maxDistance = boundaryRadius - nodeRadius
        d.x = centerX + Math.cos(angle) * maxDistance
        d.y = centerY + Math.sin(angle) * maxDistance
      }
    })
    
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
    
    // 更新边标签位置到线条中点
    linkLabel.attr('transform', (d: any) => {
      const x = (d.source.x + d.target.x) / 2
      const y = (d.source.y + d.target.y) / 2
      return `translate(${x},${y})`
    })
    
    // 更新背景矩形位置（居中对齐）
    linkLabel.each(function(this: SVGGElement) {
      const rect = d3.select(this).select('rect')
      const width = parseFloat(rect.attr('width'))
      const height = parseFloat(rect.attr('height'))
      rect
        .attr('x', -width / 2)
        .attr('y', -height / 2)
    })
    
    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })
  
  // 拖拽函数
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.05).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }
  
  function dragged(event: any) {
    const nodeRadius = event.subject.size / 2
    const dx = event.x - centerX
    const dy = event.y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // 应用圆形边界约束
    if (distance + nodeRadius > boundaryRadius) {
      const angle = Math.atan2(dy, dx)
      const maxDistance = boundaryRadius - nodeRadius
      event.subject.fx = centerX + Math.cos(angle) * maxDistance
      event.subject.fy = centerY + Math.sin(angle) * maxDistance
    } else {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }
  }
  
  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }
  
  console.log('D3图谱初始化完成，节点数:', nodes.length, '边数:', links.length)
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换节点类型过滤
const toggleNodeTypeFilter = (type: string) => {
  const index = selectedNodeTypes.value.indexOf(type)
  if (index > -1) {
    selectedNodeTypes.value.splice(index, 1)
  } else {
    selectedNodeTypes.value.push(type)
  }
  applyFilters()
}

// 切换边类型过滤
const toggleEdgeTypeFilter = (type: string) => {
  const index = selectedEdgeTypes.value.indexOf(type)
  if (index > -1) {
    selectedEdgeTypes.value.splice(index, 1)
  } else {
    selectedEdgeTypes.value.push(type)
  }
  applyFilters()
}

// 应用过滤器
const applyFilters = () => {
  if (!svg) return
  
  const hasNodeFilter = selectedNodeTypes.value.length > 0
  const hasEdgeFilter = selectedEdgeTypes.value.length > 0
  
  // 如果没有任何过滤器，显示全部
  if (!hasNodeFilter && !hasEdgeFilter) {
    svg.selectAll('.nodes g').style('display', 'block')
    svg.selectAll('.links line').style('display', 'block')
    svg.selectAll('.link-labels g').style('display', 'block')
    return
  }
  
  // 收集需要显示的节点ID
  const visibleNodeIds = new Set<string>()
  
  // 1. 根据节点类型过滤收集节点
  if (hasNodeFilter) {
    svg.selectAll('.nodes g').each(function(d: any) {
      if (selectedNodeTypes.value.includes(d.type)) {
        visibleNodeIds.add(d.id)
      }
    })
  }
  
  // 2. 根据边类型过滤，收集边两端的节点
  if (hasEdgeFilter) {
    svg.selectAll('.links line').each(function(d: any) {
      if (selectedEdgeTypes.value.includes(d.label)) {
        visibleNodeIds.add(d.source.id)
        visibleNodeIds.add(d.target.id)
      }
    })
  }
  
  // 3. 显示/隐藏节点
  svg.selectAll('.nodes g')
    .style('display', function(d: any) {
      return visibleNodeIds.has(d.id) ? 'block' : 'none'
    })
  
  // 4. 显示/隐藏边
  svg.selectAll('.links line')
    .style('display', function(d: any) {
      // 边的显示条件：
      // - 如果只有节点过滤：边的两端节点都可见时显示
      // - 如果有边过滤：边类型被选中且两端节点都可见时显示
      const sourceVisible = visibleNodeIds.has(d.source.id)
      const targetVisible = visibleNodeIds.has(d.target.id)
      const bothEndsVisible = sourceVisible && targetVisible
      
      if (hasEdgeFilter) {
        return selectedEdgeTypes.value.includes(d.label) && bothEndsVisible ? 'block' : 'none'
      } else {
        return bothEndsVisible ? 'block' : 'none'
      }
    })
  
  // 5. 显示/隐藏边标签（与边的显示状态保持一致）
  svg.selectAll('.link-labels g')
    .style('display', function(d: any) {
      const sourceVisible = visibleNodeIds.has(d.source.id)
      const targetVisible = visibleNodeIds.has(d.target.id)
      const bothEndsVisible = sourceVisible && targetVisible
      
      if (hasEdgeFilter) {
        return selectedEdgeTypes.value.includes(d.label) && bothEndsVisible ? 'block' : 'none'
      } else {
        return bothEndsVisible ? 'block' : 'none'
      }
    })
}

// 加载可用模型
const loadModels = async () => {
  try {
    const response = await agentAPI.getModels()
    if (response.data.success) {
      availableModels.value = response.data.models
      if (!availableModels.value.some((m: any) => m.model === selectedModel.value)) {
        selectedModel.value = availableModels.value[0]?.model || 'gemini_flash'
      }
    }
  } catch (error: any) {
    console.error('加载模型失败:', error)
  }
}

onMounted(async () => {
  await loadGraphData()
  await loadModels()
  document.addEventListener('click', handleClickOutside)
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  
  // 清理D3实例
  if (simulation) {
    simulation.stop()
    simulation = null
  }
  if (svg) {
    svg.remove()
    svg = null
  }
  // 清理tooltip
  d3.selectAll('.d3-tooltip').remove()
})

// 处理窗口大小变化
const handleResize = () => {
  if (svg && simulation && graphContainer.value) {
    graphWidth = graphContainer.value.offsetWidth
    graphHeight = graphContainer.value.offsetHeight
    
    // 更新圆形边界参数
    centerX = graphWidth / 2
    centerY = graphHeight / 2
    boundaryRadius = Math.min(graphWidth, graphHeight) / 2 - 30
    
    // 更新SVG大小
    svg
      .attr('width', graphWidth)
      .attr('height', graphHeight)
    
    // 更新圆形边界位置和大小
    if (boundaryCircle) {
      boundaryCircle
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', boundaryRadius)
    }
    
    // 更新力导向中心
    simulation
      .force('center', d3.forceCenter(centerX, centerY))
      .alpha(0.3)
      .restart()
  }
}

// 监听AI消息变化，自动滚动
watch(() => aiMessages.value, () => {
  nextTick(() => {
    scrollAiChatToBottom()
  })
}, { deep: true })

// AI消息处理
const sendAiMessage = async (message: string) => {
  if (!message.trim()) return
  
  aiMessages.value.push({
    role: 'user',
    content: message
  })
  
  isAiTyping.value = true
  
  try {
    await sendAiStreamMessage(message)
  } catch (error: any) {
    console.error('发送AI消息失败:', error)
    ElMessage.error('发送消息失败: ' + (error.message || error))
    aiMessages.value.push({
      role: 'assistant',
      content: '抱歉，发生了错误，请稍后重试。'
    })
  } finally {
    isAiTyping.value = false
  }
}

// 发送流式消息
const sendAiStreamMessage = async (message: string) => {
  // 构建图谱上下文
  const graphContext = buildGraphContext()
  
  const response = await agentAPI.sendMessage(
    graphContext,
    message,
    '',  // 没有文章内容
    null, // 没有会话ID
    'ask', // 使用ask模式
    selectedModel.value
  )
  
  if (!response.ok) {
    throw new Error('HTTP ' + response.status)
  }
  
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  const bubbleContents = new Map<string, string>()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '' || data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            
            if (parsed.type === 'thinking_start') {
              const bubbleId = parsed.bubble_id
              bubbleContents.set(bubbleId, '')
              
              aiMessages.value.push({
                role: 'assistant',
                content: '',
                bubbleId: bubbleId,
                messageType: 'thinking',
                collapsed: false
              })
            } else if (parsed.type === 'thinking') {
              const bubbleId = parsed.bubble_id
              
              if (!bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, '')
                aiMessages.value.push({
                  role: 'assistant',
                  content: '',
                  bubbleId: bubbleId,
                  messageType: 'thinking',
                  collapsed: false
                })
              }
              
              bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
              
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                aiMessages.value[messageIndex].content = bubbleContents.get(bubbleId)!
              }
            } else if (parsed.type === 'thinking_end') {
              const bubbleId = parsed.bubble_id
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                aiMessages.value[messageIndex].messageType = 'thinking_complete'
                aiMessages.value[messageIndex].collapsed = true
              }
            } else if (parsed.type === 'content') {
              const bubbleId = parsed.bubble_id || 'final_answer'
              if (!bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, '')
                aiMessages.value.push({
                  role: 'assistant',
                  content: '',
                  bubbleId: bubbleId,
                  messageType: 'content'
                })
              }
              
              bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
              
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                aiMessages.value[messageIndex].content = bubbleContents.get(bubbleId)!
              }
            }
          } catch (e) {
            console.warn('解析AI流式数据失败:', e)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

const buildGraphContext = () => {
  const summary = graphData.value?.summary
  if (!summary) {
    return '当前图谱数据：未加载'
  }
  
  return `
当前知识图谱信息：
- 总节点数：${summary.totalNodes}
- 总边数：${summary.totalEdges}
- 节点类型分布：${Object.entries(summary.nodeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- 关系类型分布：${Object.entries(summary.edgeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}

你可以帮助用户：
1. 分析图谱结构
2. 查询节点和关系
3. 提供图谱优化建议
4. 解答知识图谱相关问题
`
}

// UI交互函数
const handleAiKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleAiSendMessage()
  }
}

const handleAiSendMessage = () => {
  const message = aiInputMessage.value.trim()
  if (message) {
    sendAiMessage(message)
    aiInputMessage.value = ''
    nextTick(() => {
      autoResizeAiInput()
    })
  }
}

const autoResizeAiInput = () => {
  if (aiMessageInput.value) {
    aiMessageInput.value.style.height = 'auto'
    aiMessageInput.value.style.height = Math.min(aiMessageInput.value.scrollHeight, 120) + 'px'
  }
}

const scrollAiChatToBottom = () => {
  if (aiChatMessages.value) {
    aiChatMessages.value.scrollTop = aiChatMessages.value.scrollHeight
  }
}

const formatAiMessage = (content: string) => {
  if (!content) return ''
  
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
  
  return formatted
}

const getMessageTypeClass = (messageType?: string) => {
  switch (messageType) {
    case 'thinking':
      return 'thinking-message'
    case 'thinking_complete':
      return 'thinking-complete-message'
    case 'content':
      return 'content-message'
    default:
      return ''
  }
}

const toggleThinkingCollapse = (index: number) => {
  if (aiMessages.value[index]) {
    aiMessages.value[index].collapsed = !aiMessages.value[index].collapsed
  }
}

const clearChat = () => {
  aiMessages.value = []
}

const toggleModelDropdown = () => {
  showModelDropdown.value = !showModelDropdown.value
}

const selectModel = (model: string) => {
  selectedModel.value = model
  showModelDropdown.value = false
}

const getSelectedModelName = () => {
  const modelInfo = availableModels.value.find((m: any) => m.model === selectedModel.value)
  return modelInfo?.model_name || selectedModel.value
}

const getSelectedModelIcon = () => {
  const modelInfo = availableModels.value.find((m: any) => m.model === selectedModel.value)
  return modelInfo?.icon_url || ''
}

const handleIconError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iIzY2NjY2NiIvPgo8Y2lyY2xlIGN4PSI3IiBjeT0iOCIgcj0iMSIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTMiIGN5PSI4IiByPSIxIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNyAxM0M3IDEzIDguNSAxNCAxMCAxNFMxMyAxMyAxMyAxMyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'
}

const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.model-selector')) {
    showModelDropdown.value = false
  }
}

// 分割器拖拽
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const container = document.querySelector('.graph-container') as HTMLElement
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  const mouseX = e.clientX - containerRect.left
  const containerWidth = containerRect.width
  
  let newLeftWidth = (mouseX / containerWidth) * 100
  newLeftWidth = Math.max(30, Math.min(80, newLeftWidth))
  
  leftPanelWidth.value = newLeftWidth
  
  // 调整图谱大小
  if (svg) {
    nextTick(() => {
      handleResize()
    })
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}
</script>

<template>
  <div class="graph-container">
    <!-- 左侧图谱可视化区域 -->
    <div class="graph-visualization-section" :style="{ width: leftPanelWidth + '%' }">
      <!-- 侧边栏 -->
      <div class="graph-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
        <div class="sidebar-header">
          <h3 v-if="!sidebarCollapsed">数据统计</h3>
          <button class="sidebar-toggle" @click="toggleSidebar" :title="sidebarCollapsed ? '展开' : '收起'">
            <el-icon>
              <ArrowRight v-if="sidebarCollapsed" />
              <ArrowLeft v-else />
            </el-icon>
          </button>
        </div>
        
        <div class="sidebar-content" v-if="!sidebarCollapsed && graphData">
          <!-- Node labels -->
          <div class="sidebar-section">
            <h4 class="section-title">Node labels (*{{ graphData.summary?.totalNodes || 0 }})</h4>
            <div class="label-list">
              <div 
                v-for="(count, type) in graphData.summary?.nodeTypes" 
                :key="String(type)"
                class="label-item"
                :class="{ 'active': selectedNodeTypes.includes(String(type)) }"
                @click="toggleNodeTypeFilter(String(type))"
              >
                <span 
                  class="label-badge" 
                  :style="{ backgroundColor: nodeColorMap[String(type)] || '#ccc' }"
                >
                  {{ count }}
                </span>
                <span class="label-text">{{ type }}</span>
              </div>
            </div>
          </div>
          
          <!-- Relationship types -->
          <div class="sidebar-section">
            <h4 class="section-title">Relationship types (*{{ graphData.summary?.totalEdges || 0 }})</h4>
            <div class="label-list">
              <div 
                v-for="(count, type) in graphData.summary?.edgeTypes" 
                :key="String(type)"
                class="label-item"
                :class="{ 'active': selectedEdgeTypes.includes(String(type)) }"
                @click="toggleEdgeTypeFilter(String(type))"
              >
                <span class="label-badge relationship-badge">
                  {{ count }}
                </span>
                <span class="label-text">{{ type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 图谱主体区域 -->
      <div class="graph-main">
        <div class="graph-header">
          <h2>知识图谱可视化</h2>
          <div class="header-actions">
            <el-button size="small" @click="loadGraphData">刷新数据</el-button>
          </div>
        </div>
        
        <div class="graph-content" ref="graphContainer">
          <div v-if="!graphData" class="loading-container">
            <el-icon class="is-loading" style="font-size: 48px;"><Loading /></el-icon>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 分割器 -->
    <div 
      class="splitter" 
      @mousedown="startDrag"
      :class="{ 'dragging': isDragging }"
    >
      <div class="splitter-handle">
        <div class="splitter-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>

    <!-- 右侧AI助手区域 -->
    <div class="ai-assistant-section" :style="{ width: (100 - leftPanelWidth) + '%' }">
      <div class="ai-header">
        <div class="ai-title-section">
          <div class="model-selector">
            <div class="model-dropdown" @click="toggleModelDropdown" :class="{ active: showModelDropdown }">
              <img 
                :src="getSelectedModelIcon()" 
                :alt="getSelectedModelName()"
                class="model-icon"
                @error="handleIconError"
              />
              <span class="model-text">{{ getSelectedModelName() }}</span>
              <i class="fas fa-chevron-down model-arrow"></i>
            </div>
            <div class="model-options" v-show="showModelDropdown">
              <div 
                v-for="modelInfo in availableModels" 
                :key="modelInfo.model"
                class="model-option" 
                @click="selectModel(modelInfo.model)" 
                :class="{ active: selectedModel === modelInfo.model }"
              >
                <img 
                  :src="modelInfo.icon_url" 
                  :alt="modelInfo.model_name"
                  class="option-icon"
                  @error="handleIconError"
                />
                <span class="option-text">{{ modelInfo.model_name }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-actions">
          <el-button size="small" @click="clearChat">清空对话</el-button>
        </div>
      </div>
      
      <div class="ai-chat-messages" ref="aiChatMessages">
        <div v-if="aiMessages.length === 0" class="welcome-message">
          <div class="feature-tip">
            <p><strong>AI助手：</strong>我可以帮你分析知识图谱，回答相关问题</p>
          </div>
        </div>
        
        <div 
          v-for="(message, index) in aiMessages" 
          :key="index"
          class="ai-message"
          :class="[`${message.role}-message`, getMessageTypeClass(message.messageType)]"
        >
          <div v-if="message.messageType === 'thinking' || message.messageType === 'thinking_complete'" class="thinking-wrapper">
            <div class="thinking-header" @click="toggleThinkingCollapse(index)">
              <span class="thinking-title">Thinking ...</span>
              <span class="thinking-toggle">
                <el-icon :class="{ 'rotate': !message.collapsed }">
                  <ArrowRight />
                </el-icon>
              </span>
            </div>
            <transition name="thinking-expand">
              <div v-show="!message.collapsed" class="thinking-content" v-html="formatAiMessage(message.content)"></div>
            </transition>
          </div>
          
          <div v-else class="ai-message-content">
            <div v-html="formatAiMessage(message.content)"></div>
          </div>
        </div>
      </div>

      <div class="ai-chat-input-container">
        <div class="ai-input-wrapper">
          <textarea 
            ref="aiMessageInput"
            v-model="aiInputMessage"
            class="ai-message-input"
            placeholder="询问关于图谱的问题..." 
            rows="1"
            @keydown="handleAiKeyDown"
            @input="autoResizeAiInput"
          ></textarea>
          <button 
            class="ai-send-btn" 
            @click="handleAiSendMessage"
            :disabled="!aiInputMessage.trim() || isAiTyping"
          >
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        <div class="ai-input-footer">
          <span class="ai-typing-indicator" v-if="isAiTyping">
            <i class="fas fa-circle"></i>
            <i class="fas fa-circle"></i>
            <i class="fas fa-circle"></i>
            Streaming ...
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.graph-container {
  display: flex;
  height: calc(100vh - 45px);
  margin-top: 45px;
  background: #F0F8FF;
  padding: 10px;
  max-width: 100%;
  overflow: hidden;
  gap: 0;
}

// 左侧图谱可视化区域
.graph-visualization-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  transition: width 0.1s ease;
}

// 侧边栏
.graph-sidebar {
  width: 240px;
  background: #2d2d2d;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #444;
  transition: width 0.3s ease;
  flex-shrink: 0;
  
  &.collapsed {
    width: 50px;
  }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #444;
  min-height: 60px;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  
  &:hover {
    background: #444;
  }
  
  .el-icon {
    font-size: 18px;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #2d2d2d;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
    
    &:hover {
      background: #666;
    }
  }
}

.sidebar-section {
  margin-bottom: 25px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.7;
  
  &:hover {
    background: #3a3a3a;
    opacity: 1;
  }
  
  &.active {
    background: #3a3a3a;
    opacity: 1;
    box-shadow: 0 0 0 2px rgba(94, 158, 214, 0.3);
  }
}

.label-badge {
  min-width: 32px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  padding: 0 8px;
  flex-shrink: 0;
}

.relationship-badge {
  background: #666;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 图谱主体区域
.graph-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
  
  h2 {
    margin: 0;
    color: #303133;
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.graph-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  gap: 20px;
}

// 分割器
.splitter {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  margin: 0 4px;
  
  &:hover .splitter-handle,
  &.dragging .splitter-handle {
    opacity: 1;
    background: #007bff;
  }
  
  &:hover,
  &.dragging {
    background: rgba(0, 123, 255, 0.1);
  }
}

.splitter-handle {
  width: 4px;
  height: 60px;
  background: #e0e0e0;
  border-radius: 2px;
  opacity: 0.6;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.splitter-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dot {
  width: 2px;
  height: 2px;
  background: #666;
  border-radius: 50%;
  opacity: 0.7;
}

.splitter:hover .dot,
.splitter.dragging .dot {
  background: white;
  opacity: 1;
}

// 右侧AI助手区域
.ai-assistant-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 300px;
  transition: width 0.1s ease;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
  
  .ai-title-section {
    display: flex;
    align-items: center;
  }
  
  .ai-actions {
    display: flex;
    gap: 10px;
  }
}

.model-selector {
  position: relative;
  flex-shrink: 0;
}

.model-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;
  
  &:hover {
    background: #e9ecef;
    border-color: #007bff;
  }
  
  &.active {
    background: #e3f2fd;
    border-color: #007bff;
  }
}

.model-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.model-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.model-arrow {
  font-size: 0.8rem;
  color: #666;
  transition: transform 0.2s ease;
}

.model-dropdown.active .model-arrow {
  transform: rotate(180deg);
}

.model-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.active {
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 500;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }
}

.option-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.option-text {
  font-size: 0.9rem;
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  
  .feature-tip {
    background: #f0f8ff;
    padding: 20px;
    border-radius: 12px;
    border: 2px dashed #bfdbfe;
    
    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.6;
    }
  }
}

.ai-message {
  animation: fadeIn 0.3s ease;
  
  &.user-message {
    align-self: flex-end;
    max-width: 70%;
    background: #007bff;
    color: white;
    padding: 12px 16px;
    border-radius: 12px 12px 0 12px;
  }
  
  &.assistant-message {
    align-self: flex-start;
    max-width: 85%;
    background: #f5f5f5;
    padding: 12px 16px;
    border-radius: 12px 12px 12px 0;
  }
}

.thinking-wrapper {
  background: #fff3cd;
  border-radius: 8px;
  overflow: hidden;
}

.thinking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background: #fef3c7;
  
  &:hover {
    background: #fef08a;
  }
}

.thinking-title {
  font-weight: 500;
  color: #92400e;
}

.thinking-toggle {
  color: #92400e;
  transition: transform 0.3s ease;
  
  &.rotate {
    transform: rotate(90deg);
  }
}

.thinking-content {
  padding: 12px;
  color: #78350f;
  border-top: 1px solid #fde68a;
}

.thinking-expand-enter-active,
.thinking-expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
}

.thinking-expand-enter-from,
.thinking-expand-leave-to {
  max-height: 0;
  padding: 0;
  opacity: 0;
}

.ai-message-content {
  line-height: 1.6;
  
  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
  }
  
  strong {
    font-weight: 600;
  }
}

.ai-chat-input-container {
  padding: 20px;
  border-top: 1px solid #e5e5e5;
  background: white;
}

.ai-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #f8f9fa;
  border-radius: 24px;
  padding: 8px 16px;
  border: 2px solid #e5e5e5;
  transition: border-color 0.2s ease;
  
  &:focus-within {
    border-color: #007bff;
  }
}

.ai-message-input {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  outline: none;
  font-size: 0.95rem;
  line-height: 1.5;
  max-height: 120px;
  min-height: 24px;
  
  &::placeholder {
    color: #999;
  }
}

.ai-send-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover:not(:disabled) {
    background: #0056b3;
    transform: scale(1.05);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}

.ai-input-footer {
  margin-top: 8px;
  min-height: 20px;
}

.ai-typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 0.85rem;
  
  i {
    font-size: 6px;
    animation: blink 1.4s infinite;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  0%, 20%, 50%, 80%, 100% {
    opacity: 1;
  }
  40% {
    opacity: 0.3;
  }
  60% {
    opacity: 0.3;
  }
}
</style>
