<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Document, Collection, Connection, Loading, ArrowRight, Check, Close, FolderOpened, ChatDotSquare, Star, Coin } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import useUserStore from '@/store/modules/user'
import { backendAgentAPI } from '@/apis/aiChat'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 当前激活的菜单
const activeMenu = ref('article')

// SQL填充功能 - 用于与Database页面通信
const fillSqlCallback = ref<((sql: string) => void) | null>(null)
const registerFillSqlCallback = (callback: (sql: string) => void) => {
  fillSqlCallback.value = callback
}
// 提供给子组件使用
provide('registerFillSqlCallback', registerFillSqlCallback)

// 检查用户是否登录
const isLoggedIn = computed(() => {
  return userStore.userInfo !== undefined && userStore.userInfo !== null
})

// 菜单项
const menuItems = [
  {
    key: 'article',
    label: '文章管理',
    icon: Document,
    path: '/admin/article'
  },
  {
    key: 'category',
    label: '分类管理',
    icon: FolderOpened,
    path: '/admin/category'
  },
  {
    key: 'tag',
    label: '标签管理',
    icon: Collection,
    path: '/admin/tag'
  },
  {
    key: 'comment',
    label: '评论管理',
    icon: ChatDotSquare,
    path: '/admin/comment'
  },
  {
    key: 'favorite',
    label: '收藏管理',
    icon: Star,
    path: '/admin/favorite'
  },
  {
    key: 'database',
    label: '数据库管理',
    icon: Coin,
    path: '/admin/database'
  },
  {
    key: 'graph',
    label: '知识图谱',
    icon: Connection,
    path: '/admin/graph'
  }
]

// 菜单点击
const handleMenuClick = (item: any) => {
  activeMenu.value = item.key
  router.push(item.path)
}

// AI对话相关
const aiMessages = ref<any[]>([])
const aiInputMessage = ref('')
const isAiTyping = ref(false)
const aiChatMessages = ref<HTMLElement | null>(null)
const aiMessageInput = ref<HTMLTextAreaElement | null>(null)
const aiMode = ref('ask') // admin页面默认使用ask模式
const showModeDropdown = ref(false)

// 模型选择相关
const availableModels = ref<any[]>([])
const selectedModel = ref('gemini_flash')
const showModelDropdown = ref(false)

// 分割器相关
const contentWidth = ref(80) // 内容区占比（百分比）
const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 加载模型
const loadModels = async () => {
  try {
    const response = await backendAgentAPI.getModels()
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

// AI相关函数
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
    ElMessage.error('发送消息失败')
    aiMessages.value.push({
      role: 'assistant',
      content: '抱歉，发生了错误，请稍后重试。'
    })
  } finally {
    isAiTyping.value = false
  }
}

const sendAiStreamMessage = async (message: string) => {
  // 后台Agent API使用简化的参数
  const response = await backendAgentAPI.sendMessage(
    message,
    null, // sessionId - 暂时不使用会话管理
    selectedModel.value
  )
  
  if (!response.ok) {
    throw new Error('HTTP ' + response.status)
  }
  
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  // 用于跟踪不同气泡的内容
  const bubbleContents = new Map<string, string>()
  // 用于跟踪不同气泡的工具信息
  const bubbleTools = new Map<string, string>()
  
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
            
            // 处理不同类型的消息
            if (parsed.type === 'thinking_start') {
              // 思考开始，创建新的思考气泡
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
              // 思考内容，逐步更新思考气泡
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
              // 思考结束，收起思考气泡
              const bubbleId = parsed.bubble_id
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                aiMessages.value[messageIndex].messageType = 'thinking_complete'
                aiMessages.value[messageIndex].collapsed = true
              }
            } else if (parsed.type === 'tool_start') {
              // 工具开始，创建新的气泡
              const bubbleId = parsed.bubble_id
              bubbleContents.set(bubbleId, '')
              bubbleTools.set(bubbleId, parsed.tool_name)
              
              aiMessages.value.push({
                role: 'assistant',
                content: `🔍 正在使用工具: ${parsed.tool_name}...`,
                bubbleId: bubbleId,
                messageType: 'tool_start',
                toolName: parsed.tool_name
              })
            } else if (parsed.type === 'tool_result') {
              // 工具结果
              const bubbleId = parsed.bubble_id
              if (bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
                
                const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
                if (messageIndex !== -1) {
                  aiMessages.value[messageIndex].name = parsed.name
                  // 保存原始工具数据
                  aiMessages.value[messageIndex].toolData = bubbleContents.get(bubbleId)
                }
              }
            } else if (parsed.type === 'tool_end') {
              // 工具结束
              const bubbleId = parsed.bubble_id
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                setTimeout(() => {
                  aiMessages.value[messageIndex].messageType = 'tool_complete'
                  const content = bubbleContents.get(bubbleId)
                  const toolName = aiMessages.value[messageIndex].name
                  let isSuccess = true
                  if (content) {
                    try {
                      let summary = ''
                      // Backend Agent 工具处理
                      if (toolName === 'get_table_list') {
                        summary = 'QUERY: 获取表列表'
                      } else if (toolName === 'get_table_structure') {
                        summary = 'QUERY: 查看表结构'
                      } else if (toolName === 'generate_sql') {
                        const toolData = JSON.parse(content)
                        summary = 'SQL: ' + (toolData.explanation || '生成查询')
                        // 保存SQL内容和说明
                        aiMessages.value[messageIndex].sqlContent = toolData.sql || ''
                        aiMessages.value[messageIndex].sqlExplanation = toolData.explanation || ''
                        aiMessages.value[messageIndex].collapsed = true // 默认收起
                        // 自动填充SQL到编辑器（如果在数据库页面）
                        if (activeMenu.value === 'database' && toolData.sql && fillSqlCallback.value) {
                          fillSqlCallback.value(toolData.sql)
                        }
                      } else if (toolName === 'execute_sql') {
                        summary = 'EXEC: 执行SQL查询'
                      } else if (toolName === 'analyze_query_result') {
                        summary = 'ANALYZE: 分析结果'
                      } else if (toolName === 'get_database_stats') {
                        summary = 'STATS: 数据库统计'
                      } 
                      // Article Agent 工具处理（保留兼容性）
                      else if (toolName === 'read_article') {
                        summary = 'READ: 读取文章'
                      } else if (toolName === 'edit_article' || toolName === 'edit_article_batch') {
                        const toolData = JSON.parse(content)
                        summary = 'EDIT: ' + (toolData.summary || '编辑文章')
                      } else if (toolName === 'get_categories' || toolName === 'get_tags') {
                        summary = 'GET: 获取分类/标签'
                      } else {
                        // 默认处理
                        try {
                          const toolData = JSON.parse(content)
                          summary = 'TOOL: ' + (toolData.summary || toolName)
                        } catch {
                          summary = 'TOOL: ' + toolName
                        }
                      }
                      if (summary.trim()) {
                        aiMessages.value[messageIndex].summary = summary
                      }
                    } catch (err) {
                      isSuccess = false
                      aiMessages.value[messageIndex].summary = 'ERROR: 工具执行失败'
                    }
                  }
                  aiMessages.value[messageIndex].success = isSuccess
                }, 1500)
              }
            } else if (parsed.type === 'content') {
              // 普通内容，创建或更新最终回答气泡
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
            console.warn('解析AI流式数据失败:', e, '数据:', data)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// Backend Agent 不需要 buildContext，因为系统提示已在后端定义

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
  nextTick(() => {
    if (aiChatMessages.value) {
      aiChatMessages.value.scrollTop = aiChatMessages.value.scrollHeight
    }
  })
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

const clearChat = () => {
  aiMessages.value = []
}

// 切换thinking消息的展开/收起状态
const toggleThinkingCollapse = (index: number) => {
  if (aiMessages.value[index]) {
    aiMessages.value[index].collapsed = !aiMessages.value[index].collapsed
  }
}

// 复制SQL到剪贴板
const copySqlToClipboard = async (sql: string) => {
  try {
    await navigator.clipboard.writeText(sql)
    ElMessage.success('SQL已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 填充SQL到编辑器
const fillSqlToEditor = (sql: string) => {
  if (fillSqlCallback.value) {
    fillSqlCallback.value(sql)
    ElMessage.success('SQL已填充到编辑器')
  } else {
    ElMessage.warning('请先打开数据库管理页面')
  }
}

// 格式化工具summary，将前缀加粗
const formatToolSummary = (summary: string) => {
  if (!summary) return ''
  // 支持Backend Agent和Article Agent的所有工具前缀
  const formatted = summary.replace(/^(UPDATE:|GET:|ERROR:|EDIT:|READ:|QUERY:|SQL:|EXEC:|ANALYZE:|STATS:|TOOL:)(.*)$/, '<strong>$1</strong>$2')
  return formatted
}

// 获取消息类型样式类
const getMessageTypeClass = (messageType?: string) => {
  switch (messageType) {
    case 'thinking':
      return 'thinking-message'
    case 'thinking_complete':
      return 'thinking-complete-message'
    case 'tool_start':
      return 'tool-start-message'
    case 'tool_result':
      return 'tool-result-message'
    case 'tool_complete':
      return 'tool-complete-message'
    case 'content':
      return 'content-message'
    default:
      return ''
  }
}

// 切换模式下拉框
const toggleModeDropdown = () => {
  showModeDropdown.value = !showModeDropdown.value
}

// 选择模式
const selectMode = (mode: string) => {
  aiMode.value = mode
  showModeDropdown.value = false
}

// Model选择相关方法
const toggleModelDropdown = () => {
  showModelDropdown.value = !showModelDropdown.value
}

const selectModel = (model: string) => {
  selectedModel.value = model
  showModelDropdown.value = false
}

// 获取当前选中模型的显示名称
const getSelectedModelName = () => {
  const modelInfo = availableModels.value.find((m: any) => m.model === selectedModel.value)
  return modelInfo?.model_name || selectedModel.value
}

// 获取当前选中模型的图标
const getSelectedModelIcon = () => {
  const modelInfo = availableModels.value.find((m: any) => m.model === selectedModel.value)
  return modelInfo?.icon_url || ''
}

// 处理图标加载错误
const handleIconError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgZmlsbD0iIzY2NjY2NiIvPgo8Y2lyY2xlIGN4PSI3IiBjeT0iOCIgcj0iMSIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iMTMiIGN5PSI4IiByPSIxIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNyAxM0M3IDEzIDguNSAxNCAxMCAxNFMxMyAxMyAxMyAxMyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'
}

// 点击外部关闭下拉框
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.mode-selector') && !target.closest('.model-selector')) {
    showModeDropdown.value = false
    showModelDropdown.value = false
  }
}

// 分割器拖动
const handleDividerMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  startX.value = e.clientX
  startWidth.value = contentWidth.value
  
  document.addEventListener('mousemove', handleDividerMouseMove)
  document.addEventListener('mouseup', handleDividerMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleDividerMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const containerWidth = window.innerWidth - 200 // 减去侧边栏宽度
  const deltaX = e.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  
  let newWidth = startWidth.value + deltaPercent
  newWidth = Math.max(40, Math.min(80, newWidth)) // 限制在 40%-80% 之间
  
  contentWidth.value = newWidth
}

const handleDividerMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDividerMouseMove)
  document.removeEventListener('mouseup', handleDividerMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 监听消息变化
watch(aiMessages, () => {
  scrollAiChatToBottom()
}, { deep: true })

// 初始化活动菜单
onMounted(async () => {
  const currentPath = route.path
  const currentItem = menuItems.find(item => item.path === currentPath)
  if (currentItem) {
    activeMenu.value = currentItem.key
  } else if (currentPath === '/admin') {
    // 默认跳转到文章管理
    router.push('/admin/article')
  }
  
  await loadModels()
  
  // 添加点击外部关闭下拉框的事件监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="admin-container">
    <!-- 左侧菜单 -->
    <div class="admin-sidebar">
      <div class="sidebar-header">
        <h2>后台管理</h2>
      </div>
      <div class="sidebar-menu">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="menu-item"
          :class="{ active: activeMenu === item.key }"
          @click="handleMenuClick(item)"
        >
          <el-icon class="menu-icon">
            <component :is="item.icon" />
          </el-icon>
          <span class="menu-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 中间内容区 -->
    <div class="admin-content" :style="{ width: contentWidth + '%' }">
      <router-view />
    </div>

    <!-- 分割器 -->
    <div 
      class="divider" 
      :class="{ 'dragging': isDragging }"
      @mousedown="handleDividerMouseDown"
    >
      <div class="divider-handle"></div>
    </div>

    <!-- 右侧AI聊天区 -->
    <div class="ai-chat-section" :style="{ width: (100 - contentWidth) + '%' }">
      <div class="ai-chat-header">
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
      
      <div ref="aiChatMessages" class="ai-chat-messages">
        <div v-if="aiMessages.length === 0" class="welcome-message">
          <div class="feature-tip">
            <p><strong>🔍 数据库查询助手</strong></p>
            <p>我可以帮助你：</p>
            <ul style="text-align: left; margin: 10px 0; padding-left: 30px;">
              <li>查看数据库表结构</li>
              <li>编写SQL查询语句</li>
              <li>执行安全的SELECT查询</li>
              <li>分析查询结果</li>
              <li>获取数据库统计信息</li>
            </ul>
            <p style="color: #999; font-size: 0.85rem; margin-top: 10px;">
              💡 提示：所有查询都是只读的，不会修改数据库
            </p>
          </div>
        </div>
        
        <div 
          v-for="(message, index) in aiMessages" 
          :key="index"
          class="ai-message"
          :class="[`${message.role}-message`, getMessageTypeClass(message.messageType)]"
        >
          <!-- 如果是思考消息，显示可折叠的思考内容 -->
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
          <!-- 工具消息使用欢迎消息样式 -->
          <div v-else-if="message.messageType === 'tool_start' || message.messageType === 'tool_complete'" class="welcome-message">
            <div class="feature-tip" :class="{ 'sql-tool-tip': message.name === 'generate_sql' }">
              <div v-if="message.messageType === 'tool_start'" class="tool-status">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>Invocating Tools ...</span>
              </div>
              <div v-else-if="message.messageType === 'tool_complete'" class="tool-status" :class="{ 'tool-success': message.success !== false, 'tool-error': message.success === false }">
                <el-icon v-if="message.success !== false" class="check-icon"><Check /></el-icon>
                <el-icon v-else class="error-icon"><Close /></el-icon>
                <span v-if="message.summary" v-html="formatToolSummary(message.summary)"></span>
              </div>
              <!-- generate_sql 特殊处理 - 显示可展开的SQL -->
              <div v-if="message.messageType === 'tool_complete' && message.name === 'generate_sql' && message.sqlContent" class="sql-detail-wrapper">
                <div class="sql-detail-header" @click="message.collapsed = !message.collapsed">
                  <span class="sql-detail-title">
                    <i class="fas fa-code"></i>
                    点击{{ message.collapsed ? '展开' : '收起' }}查看SQL
                  </span>
                  <el-icon :class="{ 'rotate': !message.collapsed }">
                    <ArrowRight />
                  </el-icon>
                </div>
                <transition name="sql-expand">
                  <div v-show="!message.collapsed" class="sql-detail-content">
                    <div class="sql-code-block">
                      <pre><code>{{ message.sqlContent }}</code></pre>
                    </div>
                    <div class="sql-actions">
                      <el-button size="small" @click="copySqlToClipboard(message.sqlContent)">
                        <i class="fas fa-copy"></i>
                        复制SQL
                      </el-button>
                      <el-button 
                        v-if="activeMenu === 'database'" 
                        type="primary" 
                        size="small"
                        @click="fillSqlToEditor(message.sqlContent)"
                      >
                        <i class="fas fa-arrow-right"></i>
                        填充到编辑器
                      </el-button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
          <!-- 普通消息显示内容 -->
          <div v-else class="ai-message-content">
            <div v-html="formatAiMessage(message.content)"></div>
          </div>
        </div>
      </div>
      
      <div class="ai-chat-input-container">
        <div class="ai-input-wrapper">
          <!-- Admin页面使用专门的SQL查询助手，不需要模式选择器 -->
          
          <textarea 
            ref="aiMessageInput"
            v-model="aiInputMessage"
            class="ai-message-input"
            placeholder="Ask Anything ..." 
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
.admin-container {
  display: flex;
  height: calc(100vh - 45px);
  margin-top: 45px;
  background: #F0F8FF;
}

.admin-sidebar {
  width: 200px;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;

  h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
    font-weight: 600;
  }
}

.sidebar-menu {
  flex: 1;
  padding: 10px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  margin: 4px 8px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
  border-radius: 6px;
  position: relative;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }

  &.active {
    background: linear-gradient(90deg, #e6f7ff 0%, #f0f9ff 100%);
    color: #409eff;
    font-weight: 500;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 24px;
      background: #409eff;
      border-radius: 0 2px 2px 0;
    }
  }

  .menu-icon {
    font-size: 18px;
    margin-right: 12px;
  }

  .menu-label {
    font-size: 14px;
  }
}

.admin-content {
  overflow: auto;
  background: #F0F8FF;
  transition: width 0.1s ease;
}

// 分割器
.divider {
  width: 6px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  
  // 悬停时显示微妙的提示线
  &:hover {
    background: rgba(64, 158, 255, 0.1);
    
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      width: 10px;
      background: rgba(64, 158, 255, 0.3);
    }
  }
  
  // 拖拽时显示更明显的提示线
  &.dragging {
    background: rgba(64, 158, 255, 0.15);
    
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      width: 2px;
      background: #409eff;
    }
  }
  
  .divider-handle {
    display: none;
  }
}

// AI聊天区域
.ai-chat-section {
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 1px solid #e8e8e8;
  transition: width 0.1s ease;
  overflow: hidden;
}

.ai-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  
  .ai-title-section {
    display: flex;
    align-items: center;
    
    h3 {
      margin: 0;
      color: #303133;
      font-size: 1.2rem;
    }
  }
  
  .ai-actions {
    display: flex;
    gap: 10px;
  }
}

// Model选择器样式
.model-selector {
  position: relative;
  margin-left: 12px;
  flex-shrink: 0;
}

.model-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  
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
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.model-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
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
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  color: #333333;
  
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
  
  .option-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
  }
  
  .option-text {
    font-weight: 500;
  }
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #ffffff;
}

.welcome-message {
  text-align: center;
  padding: 0px 20px;
  color: #666666;
  
  h4 {
    font-size: 1.2rem;
    font-weight: 500;
    margin-bottom: 15px;
    color: #333333;
  }
  
  p {
    margin: 10px 0;
    font-size: 0.9rem;
  }
  
  .feature-tip {
    margin-top: 20px;
    padding: 15px;
    background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
    border-radius: 8px;
    border-left: 4px solid #2196f3;
    
    p {
      margin: 5px 0;
      font-size: 0.85rem;
      color: #1976d2;
      
      &:first-child {
        font-weight: 500;
      }
    }
  }
}

// AI消息样式
.ai-message {
  display: flex;
  margin-bottom: 20px;
  animation: fadeInUp 0.4s ease;
}

.user-message {
  justify-content: flex-end;
}

.assistant-message {
  justify-content: flex-start;
}

.ai-message-content {
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.6;
  word-wrap: break-word;
  max-width: 85%;
  text-align: left;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.ai-message-content:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-message .ai-message-content {
  background: linear-gradient(135deg, #adb5bd 0%, #6c757d 100%);
  color: white;
  border-radius: 18px;
}

.assistant-message .ai-message-content {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e5e5e5;
  border-radius: 18px;
}

/* 思考消息样式 */
.thinking-message,
.thinking-complete-message {
  justify-content: flex-start;
  width: 100%;
  
  .ai-message-content {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #fbbf24;
    color: #78350f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
    position: relative;
    padding: 0;
    overflow: hidden;
    max-width: 85%;
  }
}

.thinking-wrapper {
  width: 100%;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 12px 45px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  position: relative;
  
  &:hover {
    background: rgba(251, 191, 36, 0.1);
  }
  
  &::before {
    content: '💭';
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.2rem;
  }
}

.thinking-title {
  font-weight: 500;
  font-style: italic;
  font-size: 0.95rem;
  color: #666666;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  
  .el-icon {
    transition: transform 0.3s ease;
    
    &.rotate {
      transform: rotate(90deg);
    }
  }
}

.thinking-content {
  padding: 0 16px 16px 45px;
  font-style: italic;
  line-height: 1.6;
  overflow: hidden;
  color: #666666;
}

/* Transition动画 */
.thinking-expand-enter-active {
  transition: all 0.3s ease;
  max-height: 1000px;
}

.thinking-expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
}

.thinking-expand-enter-from {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.thinking-expand-enter-to {
  opacity: 1;
  max-height: 1000px;
}

.thinking-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}

.thinking-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.thinking-message .ai-message-content {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
  }
  50% {
    box-shadow: 0 4px 16px rgba(251, 191, 36, 0.4);
  }
}

/* 工具消息样式 */
.tool-start-message {
  justify-content: flex-start;
  width: 100%;
}

.tool-complete-message {
  justify-content: flex-start;
  width: 100%;
}

.tool-start-message .welcome-message {
  width: fit-content;
  border-radius: 10px;
  margin: 0;
}

.tool-complete-message .welcome-message {
  width: fit-content;
  border-radius: 10px;
  margin: 0;
}

.tool-start-message .feature-tip {
  width: fit-content;
}

.tool-complete-message .feature-tip {
  width: fit-content;
}

/* 工具状态样式 */
.tool-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 500;
  font-style: italic;
  color: #666666;
}

.tool-status .el-icon {
  font-size: 18px;
}

.tool-start-message .tool-status {
  color: #1976d2;
  justify-content: flex-start;
}

.tool-complete-message .tool-status {
  color: #10b981;
}

/* 对号图标动画效果 */
.check-icon {
  animation: checkmark 0.6s ease-in-out;
}

@keyframes checkmark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 错误图标动画效果 */
.error-icon {
  animation: error-mark 0.6s ease-in-out;
}

@keyframes error-mark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 工具状态颜色 */
.tool-status.tool-success {
  color: #10b981;
  justify-content: flex-start;
}

.tool-status.tool-error {
  color: #ef4444;
  justify-content: flex-start;
}

/* SQL详情展示样式 */
.sql-tool-tip {
  min-width: 400px !important;
}

.sql-detail-wrapper {
  margin-top: 12px;
  border-top: 1px solid rgba(64, 158, 255, 0.2);
  padding-top: 12px;
}

.sql-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  border-radius: 6px;
  background: rgba(64, 158, 255, 0.05);
  
  &:hover {
    background: rgba(64, 158, 255, 0.1);
  }
}

.sql-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  color: #409eff;
  
  i {
    font-size: 1rem;
  }
}

.sql-detail-content {
  margin-top: 8px;
  overflow: hidden;
}

.sql-code-block {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  text-align: left;
  
  pre {
    margin: 0;
    text-align: left;
    
    code {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d4;
      display: block;
      white-space: pre-wrap;
      word-break: break-all;
      text-align: left;
    }
  }
}

.sql-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  
  .el-button {
    i {
      margin-right: 4px;
    }
  }
}

/* SQL展开动画 */
.sql-expand-enter-active {
  transition: all 0.3s ease;
  max-height: 600px;
}

.sql-expand-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
}

.sql-expand-enter-from {
  opacity: 0;
  max-height: 0;
}

.sql-expand-enter-to {
  opacity: 1;
  max-height: 600px;
}

.sql-expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

.sql-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* 不同类型消息的样式 */
.content-message .ai-message-content {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  color: #333333;
  border-radius: 18px;
}

.ai-message-content code {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9em;
  color: #333333;
  border: 1px solid #e1e4e8;
}

.user-message .ai-message-content code {
  background: rgba(255,255,255,0.25);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

// AI输入区域
.ai-chat-input-container {
  padding: 20px;
  background: #ffffff;
  flex-shrink: 0;
}

.ai-input-wrapper {
  position: relative;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 0;
}

// 自定义模式选择器样式（在输入框左侧）
.ai-input-wrapper .mode-selector {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.ai-input-wrapper .mode-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  
  &:hover {
    background: #e9ecef;
    border-color: #007bff;
  }
  
  &.active {
    background: #e3f2fd;
    border-color: #007bff;
  }
}

.ai-input-wrapper .mode-icon {
  font-size: 1.1rem;
  font-weight: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
}

.ai-input-wrapper .mode-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
}

.ai-input-wrapper .mode-arrow {
  font-size: 0.8rem;
  color: #666;
  transition: transform 0.2s ease;
}

.ai-input-wrapper .mode-dropdown.active .mode-arrow {
  transform: rotate(180deg);
}

.ai-input-wrapper .mode-options {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-bottom: 4px;
  overflow: hidden;
}

.ai-input-wrapper .mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  color: #333333;
  
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

.ai-input-wrapper .option-icon {
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
}

.ai-input-wrapper .option-text {
  font-weight: 500;
}

.ai-message-input {
  flex: 1;
  border: 1px solid #e5e5e5;
  border-radius: 30px;
  padding: 12px 50px 12px 16px;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.5;
  min-height: 45px;
  max-height: 100px;
  background: #f8f9fa;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  
  &:focus {
    border-color: #007bff;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &::placeholder {
    color: #999999;
  }
}

.ai-send-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #007bff;
  color: white;
  border: none;
  border-radius: 50%;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  
  &:hover {
    background: #0056b3;
    transform: translateY(-50%) scale(1.05);
  }
  
  &:disabled {
    background: #e0e0e0;
    color: #999999;
    cursor: not-allowed;
    transform: translateY(-50%);
  }
}

.ai-input-footer {
  margin-top: 8px;
  height: 20px;
}

.ai-typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666666;
  font-size: 0.8rem;
  
  i {
    animation: typing 1.4s infinite;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 响应式设计
@media screen and (max-width: 768px) {
  .admin-sidebar {
    width: 60px;
  }

  .sidebar-header h2 {
    font-size: 14px;
    writing-mode: vertical-rl;
    text-align: center;
  }

  .menu-label {
    display: none;
  }

  .menu-item {
    justify-content: center;
    padding: 12px;
    
    &.active::before {
      left: 50%;
      transform: translateX(-50%) translateY(-50%);
      top: 0;
      width: 24px;
      height: 3px;
    }
  }
  
  .ai-chat-section {
    display: none;
  }
  
  .divider {
    display: none;
  }
  
  .admin-content {
    width: 100% !important;
  }
}
</style>
