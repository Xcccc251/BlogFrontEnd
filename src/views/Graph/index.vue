<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Check, Close, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { agentAPI } from '@/apis/aiChat'

// 图谱数据
const graphData = ref<any>(null)
const graphContainer = ref<HTMLElement | null>(null)

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
const leftPanelWidth = ref(65)
const isDragging = ref(false)

// 加载图谱数据
const loadGraphData = async () => {
  try {
    const response = await fetch('http://localhost:7000/graph/overview?limit=100')
    const result = await response.json()
    
    if (result.code === 200) {
      graphData.value = result.data
      ElMessage.success('图谱数据加载成功')
      // TODO: 初始化图谱可视化
      initGraph()
    } else {
      ElMessage.error('加载图谱数据失败')
    }
  } catch (error: any) {
    ElMessage.error('加载图谱数据失败: ' + error.message)
  }
}

// 初始化图谱可视化
const initGraph = () => {
  // TODO: 使用 G6 或其他库初始化图谱
  console.log('图谱数据:', graphData.value)
  
  if (!graphContainer.value) return
  
  // 临时显示基本信息
  const summary = graphData.value?.summary
  if (summary) {
    graphContainer.value.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>知识图谱概览</h2>
        <div style="margin-top: 20px;">
          <p>总节点数: ${summary.totalNodes}</p>
          <p>总边数: ${summary.totalEdges}</p>
          <div style="margin-top: 10px;">
            <strong>节点类型:</strong>
            <ul style="list-style: none; padding: 0;">
              ${Object.entries(summary.nodeTypes).map(([type, count]) => `<li>${type}: ${count}</li>`).join('')}
            </ul>
          </div>
          <div style="margin-top: 10px;">
            <strong>关系类型:</strong>
            <ul style="list-style: none; padding: 0;">
              ${Object.entries(summary.edgeTypes).map(([type, count]) => `<li>${type}: ${count}</li>`).join('')}
            </ul>
          </div>
        </div>
        <p style="margin-top: 20px; color: #666;">
          图谱可视化库（如 G6）将在此处渲染
        </p>
      </div>
    `
  }
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
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

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
  flex-direction: column;
  overflow: hidden;
  transition: width 0.1s ease;
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
  overflow: auto;
  padding: 20px;
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
