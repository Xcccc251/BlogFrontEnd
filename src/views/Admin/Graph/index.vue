<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, ArrowLeft, ArrowRight, Search } from '@element-plus/icons-vue'
// @ts-ignore - d3 类型声明
import * as d3 from 'd3'
import { getGraphOverview, executeGraphQuery } from '@/apis/graph'

// 图谱数据
const graphData = ref<any>(null)
const graphContainer = ref<HTMLElement | null>(null)

// 查询相关
const queryCommand = ref('')
const queryLoading = ref(false)
const isQueryMode = ref(false) // 是否为查询模式
let svg: any = null // D3 SVG 实例
let simulation: any = null // D3 力导向模拟
let graphWidth = 0 // 图谱宽度
let graphHeight = 0 // 图谱高度
let centerX = 0 // 圆形边界中心X
let centerY = 0 // 圆形边界中心Y
let boundaryRadius = 0 // 圆形边界半径
let boundaryCircle: any = null // 圆形边界元素
let resizeObserver: ResizeObserver | null = null // ResizeObserver 实例
let resizeTimer: number | null = null // 防抖定时器

// 侧边栏相关
const sidebarCollapsed = ref(true)
const selectedNodeTypes = ref<string[]>([]) // 选中的节点类型过滤
const selectedEdgeTypes = ref<string[]>([]) // 选中的边类型过滤
const isHovering = ref(false) // 鼠标悬浮状态

// 加载图谱数据
const loadGraphData = async () => {
  try {
    isQueryMode.value = false
    const result: any = await getGraphOverview({ limit: 100 })
    
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

// 转换查询结果为图谱数据格式
const convertQueryResultToGraphData = (queryResult: any) => {
  const nodesMap = new Map()
  const edgesMap = new Map()
  
  if (!queryResult.records || queryResult.records.length === 0) {
    return { nodes: [], edges: [], summary: { totalNodes: 0, totalEdges: 0, nodeTypes: {}, edgeTypes: {} } }
  }
  
  // 遍历查询结果记录
  queryResult.records.forEach((record: any) => {
    // 遍历记录中的每个字段
    Object.values(record).forEach((item: any) => {
      if (!item) return
      
      // 判断是节点还是关系
      if (item.labels && Array.isArray(item.labels)) {
        // 这是一个节点
        const nodeId = item.id || item.properties?.id || Math.random().toString()
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            label: item.labels[0] || 'Unknown',
            properties: item.properties || {}
          })
        }
      } else if (item.type) {
        // 这是一个关系/边
        const edgeId = `${item.start}-${item.type}-${item.end}`
        if (!edgesMap.has(edgeId)) {
          edgesMap.set(edgeId, {
            source: item.start,
            target: item.end,
            label: item.type,
            properties: item.properties || {}
          })
        }
      }
    })
  })
  
  const nodes = Array.from(nodesMap.values())
  const edges = Array.from(edgesMap.values())
  
  // 生成统计信息
  const nodeTypes: Record<string, number> = {}
  const edgeTypes: Record<string, number> = {}
  
  nodes.forEach(node => {
    nodeTypes[node.label] = (nodeTypes[node.label] || 0) + 1
  })
  
  edges.forEach(edge => {
    edgeTypes[edge.label] = (edgeTypes[edge.label] || 0) + 1
  })
  
  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes
    }
  }
}

// 执行查询
const executeQuery = async () => {
  if (!queryCommand.value.trim()) {
    ElMessage.warning('请输入查询命令')
    return
  }
  
  queryLoading.value = true
  
  try {
    const result: any = await executeGraphQuery(queryCommand.value.trim())
    
    if (result.code === 200) {
      isQueryMode.value = true
      // 转换查询结果为图谱数据格式
      const convertedData = convertQueryResultToGraphData(result.data)
      
      if (convertedData.nodes.length === 0) {
        ElMessage.warning('查询结果为空，未找到任何节点')
        return
      }
      
      graphData.value = convertedData
      ElMessage.success(`查询执行成功，找到 ${convertedData.nodes.length} 个节点`)
      // 渲染查询结果图谱
      nextTick(() => {
        initGraph()
      })
    } else {
      ElMessage.error(result.message || '查询失败')
    }
  } catch (error: any) {
    ElMessage.error('查询执行失败: ' + error.message)
  } finally {
    queryLoading.value = false
  }
}

// 清空查询
const clearQuery = () => {
  queryCommand.value = ''
  if (isQueryMode.value) {
    loadGraphData()
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

// 侧边栏鼠标悬浮
const handleSidebarMouseEnter = () => {
  isHovering.value = true
  sidebarCollapsed.value = false
}

// 侧边栏鼠标移开
const handleSidebarMouseLeave = () => {
  isHovering.value = false
  sidebarCollapsed.value = true
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

onMounted(async () => {
  await loadGraphData()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 使用 ResizeObserver 监听容器大小变化（更精确，包括侧边栏展开/收起等情况）
  if (graphContainer.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(graphContainer.value)
  }
})

onUnmounted(() => {
  // 清理窗口监听
  window.removeEventListener('resize', handleResize)
  
  // 清理 ResizeObserver
  if (resizeObserver && graphContainer.value) {
    resizeObserver.unobserve(graphContainer.value)
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  // 清理防抖定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

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

// 处理窗口大小变化（带防抖）
const handleResize = () => {
  // 清除之前的定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  
  // 设置防抖，300ms 后执行
  resizeTimer = window.setTimeout(() => {
    if (svg && simulation && graphContainer.value) {
      const newWidth = graphContainer.value.offsetWidth
      const newHeight = graphContainer.value.offsetHeight
      
      // 如果尺寸没有变化，不执行更新
      if (newWidth === graphWidth && newHeight === graphHeight) {
        return
      }
      
      graphWidth = newWidth
      graphHeight = newHeight

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
  }, 300)
}
</script>

<template>
  <div class="graph-admin-container">
    <!-- 图谱可视化区域 - 填满整个内容区 -->
    <div class="graph-visualization-section full-width">
      <!-- 侧边栏 -->
      <div 
        class="graph-sidebar" 
        :class="{ 'collapsed': sidebarCollapsed }"
        @mouseenter="handleSidebarMouseEnter"
        @mouseleave="handleSidebarMouseLeave"
      >
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

        <!-- 查询框区域 -->
        <div class="query-section">
          <div class="query-input-wrapper">
            <el-input
              v-model="queryCommand"
              placeholder="输入 Cypher 查询语句，例如：MATCH (n:User)-[r:WROTE]->(a:Article) RETURN n, r, a LIMIT 10"
              class="query-input"
              @keydown.enter="executeQuery"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <div class="query-buttons">
              <el-button 
                type="primary" 
                :loading="queryLoading" 
                @click="executeQuery"
                :disabled="!queryCommand.trim()"
              >
                执行查询
              </el-button>
              <el-button @click="clearQuery" :disabled="!queryCommand.trim()">
                清空
              </el-button>
            </div>
          </div>
          <div v-if="isQueryMode" class="query-mode-indicator">
            <el-tag type="success" size="small">查询模式</el-tag>
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
  </div>
</template>

<style scoped lang="scss">
.graph-admin-container {
  padding: 20px;
  height: 100%;
  background: #F0F8FF;
}

// 图谱可视化区域
.graph-visualization-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  height: calc(100vh - 125px);
  
  &.full-width {
    width: 100%;
  }
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

// 查询区域
.query-section {
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.query-input-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.query-input {
  flex: 1;
  
  :deep(.el-input__wrapper) {
    background: white;
  }
}

.query-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.query-mode-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #67c23a;
}

.graph-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  
  // 确保 SVG 能够自适应容器大小
  :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
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
</style>
