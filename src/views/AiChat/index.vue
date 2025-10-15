<template>
  <div class="ai-chat-container">
    <!-- 侧边栏 -->
    <div 
      class="chat-sidebar" 
      :class="{ 
        'sidebar-collapsed': sidebarCollapsed,
        'sidebar-hovered': sidebarHovered
      }"
      @mouseenter="handleSidebarMouseEnter"
      @mouseleave="handleSidebarMouseLeave"
    >
      <div class="sidebar-header">
        <div class="header-content">
          <h3 v-if="!sidebarCollapsed || sidebarHovered"></h3>
          <button class="collapse-btn" @click="toggleSidebar">
            <i :class="sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
          </button>
        </div>
        <button class="new-chat-btn" @click="createNewSession" v-if="!sidebarCollapsed || sidebarHovered">
          <i class="fas fa-edit"></i> 发起新对话
        </button>
      </div>
      
      <div class="session-list" v-if="!sidebarCollapsed || sidebarHovered">
        <div v-if="!sessions || sessions.length === 0" class="empty-sessions">
          <i class="fas fa-comments"></i>
          <p>暂无对话记录</p>
          <p>点击"新聊天"开始聊天</p>
        </div>
        
        <div 
          v-for="session in sessions" 
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === currentSessionId }"
          @click="loadSession(session.id)"
        >
          <div class="session-content">
            <div class="session-name">{{ session.name || '新对话' }}</div>
            <div class="session-meta">
              <span class="session-time">{{ formatTime(session.updated_at) }}</span>
            </div>
          </div>
          <div class="session-actions" @click.stop>
            <button 
              class="delete-session-btn" 
              @click="showDeleteModal(session.id)" 
              title="删除对话"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-chat-area">
      <div class="chat-header">
        <div class="chat-title">
          <h3>{{ currentSessionName }}</h3>
          <div class="session-info" v-if="currentSessionId">
            会话ID: {{ currentSessionId.slice(-8) }}
          </div>
        </div>
        <div class="chat-actions">
          <button class="action-btn" @click="clearCurrentSession">
            <i class="fas fa-trash"></i> 清空对话
          </button>
        </div>
      </div>

      <div class="chat-messages" ref="chatMessages">
        <div v-if="messages.length === 0" class="welcome-message">
          <br>
          <h3>有什么可以帮忙的？</h3>
        </div>
        
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          class="message"
          :class="[`${message.role}-message`, getMessageTypeClass(message.messageType)]"
        >
          <div class="message-content">
            <!-- 如果是图片生成工具结果，显示图片 -->
            <div v-if="message.messageType === 'image_result'" class="image-container">
              <div class="image-header">
                <h4>生成的图片</h4>
              </div>
              <div class="generated-image">
                <img 
                  :src="message.content" 
                  :alt="'生成的图片'"
                  @error="handleGeneratedImageError($event)"
                  @load="handleGeneratedImageLoad"
                  @click="openImageInNewTab(message.content)"
                />
              </div>
            </div>
            <!-- 如果是工具结果消息且有文章数据，显示文章卡片 -->
            <div v-else-if="message.messageType === 'tool_result' && message.articles && message.articles.length > 0" class="articles-container">
              <div class="articles-header">
                <h4>{{ getArticleHeader(message.content) }}</h4>
              </div>
              <div class="articles-grid">
                <div 
                  v-for="article in message.articles" 
                  :key="article.id"
                  class="article-card"
                  @click="openArticle(article.url)"
                >
                  <div class="article-cover" v-if="article.cover">
                    <img 
                      :src="article.cover" 
                      :alt="article.title" 
                      @error="handleImageError($event, article)"
                      @load="handleImageLoad"
                      :key="`${article.id}-${article.cover}`"
                    />
                  </div>
                  <div class="article-info">
                    <h5 class="article-title">{{ article.title }}</h5>
                    <div class="article-meta">
                      <span class="article-category">{{ article.category }}</span>
                      <span class="article-id">ID: {{ article.id }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 普通消息内容 -->
            <div v-else v-html="formatMessage(message.content)"></div>
          </div>
          <div v-if="message.messageType === 'tool_start'" class="message-indicator">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <div v-else-if="message.messageType === 'tool_complete'" class="message-indicator">
            <i class="fas fa-check-circle"></i>
          </div>
        </div>
      </div>

      <div class="chat-input-container">
        <div class="input-wrapper">
          <textarea 
            ref="messageInput"
            v-model="inputMessage"
            class="message-input"
            placeholder="询问任何问题" 
            rows="1"
            @keydown="handleKeyDown"
            @input="autoResize"
          ></textarea>
          <button 
            class="send-btn" 
            @click="handleSendMessage"
            :disabled="!inputMessage.trim() || isTyping"
          >
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        <div class="input-footer">
          <span class="typing-indicator" v-if="isTyping">
            <i class="fas fa-circle"></i>
            <i class="fas fa-circle"></i>
            <i class="fas fa-circle"></i>
            AI正在回答...
          </span>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="确认删除"
      width="400px"
      :show-close="false"
    >
      <p>确定要删除这个对话吗？此操作不可撤销。</p>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">删除</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { sessionAPI, chatAPI } from '@/apis/aiChat'

// 类型定义
interface ChatSession {
  id: string
  name: string
  history: ChatMessage[]
  created_at: string
  updated_at: string
}

interface ChatMessage {
  role: string
  content: string
  bubbleId?: string
  messageType?: string
  articles?: ArticleInfo[]
  name?: string
  tool_call_id?: string
}

interface ArticleInfo {
  id: number
  title: string
  url: string
  category: string
  cover: string
}

// 响应式数据
const sessions = ref<ChatSession[]>([])
const messages = ref<ChatMessage[]>([])
const currentSessionId = ref<string | null>(null)
const currentSessionName = ref('新对话')
const loading = ref(false)
const isTyping = ref(false)
const showDeleteDialog = ref(false)
const deleteSessionId = ref<string | null>(null)
const sidebarCollapsed = ref(true)
const sidebarHovered = ref(false)
let hoverTimeout: number | null = null

// DOM引用
const chatMessages = ref<HTMLElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)
const inputMessage = ref('')

// 页面加载时初始化
onMounted(() => {
  loadSessions()
})

// 监听消息变化，自动滚动到底部
watch(() => messages.value, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 加载所有会话
const loadSessions = async () => {
  try {
    loading.value = true
    const response = await sessionAPI.getSessions()
    if (response.data.success) {
      sessions.value = response.data.sessions
    } else {
      ElMessage.error('加载会话失败: ' + response.data.error)
    }
  } catch (error: any) {
    ElMessage.error('网络错误: ' + (error.message || error))
  } finally {
    loading.value = false
  }
}

// 创建新会话
const createNewSession = async () => {
  try {
    loading.value = true
    const response = await sessionAPI.createSession()
    if (response.data.success) {
      currentSessionId.value = response.data.session.id
      currentSessionName.value = response.data.session.name
      messages.value = []
      loadSessions() // 重新加载会话列表
    } else {
      ElMessage.error('创建会话失败: ' + response.data.error)
    }
  } catch (error: any) {
    ElMessage.error('网络错误: ' + (error.message || error))
  } finally {
    loading.value = false
  }
}

// 加载指定会话
const loadSession = async (sessionId: string) => {
  try {
    loading.value = true
    const response = await sessionAPI.loadSession(sessionId)
    if (response.data.success) {
      currentSessionId.value = response.data.session.id
      currentSessionName.value = response.data.session.name
      renderChatHistory(response.data.session.history)
      loadSessions() // 重新加载会话列表以更新选中状态
    } else {
      ElMessage.error('加载会话失败: ' + response.data.error)
    }
  } catch (error: any) {
    ElMessage.error('网络错误: ' + (error.message || error))
  } finally {
    loading.value = false
  }
}

// 删除会话
const deleteSession = async (sessionId: string) => {
  try {
    loading.value = true
    const response = await sessionAPI.deleteSession(sessionId)
    if (response.data.success) {
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        currentSessionName.value = '新对话'
        messages.value = []
      }
      loadSessions() // 重新加载会话列表
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除会话失败: ' + response.data.error)
    }
  } catch (error: any) {
    ElMessage.error('网络错误: ' + (error.message || error))
  } finally {
    loading.value = false
  }
}

// 渲染聊天历史
const renderChatHistory = (history: any[]) => {
  messages.value = []
  
  if (!history || !Array.isArray(history) || history.length === 0) {
    return
  }
  
  // 跳过系统消息，只显示用户和助手的消息
  for (let i = 1; i < history.length; i++) {
    const message = history[i]
    if (message && message.role && message.content) {
      // 判断是否为工具相关消息
      let messageType = ''
      
      // 检查是否为工具消息 - 支持多种可能的role值和内容特征
      if (message.role === 'tool') {
        // 检查是否为图片生成工具
        if (message.name === 'generate_image') {
          messageType = 'image_result'
        } else {
          // 其他工具消息使用绿色样式
          messageType = 'tool_result'
        }
      } else if (message.role === 'assistant' && message.content.includes('🔍 正在使用工具:')) {
        // 工具开始消息
        messageType = 'tool_start'
      } else if (message.role === 'assistant' && message.content.includes('✅ 工具执行完成')) {
        // 工具完成消息
        messageType = 'tool_complete'
      } else if (message.role === 'assistant') {
        // 普通助手消息
        messageType = 'content'
      }
      
      // 如果是工具结果消息，解析文章数据
      let articles: ArticleInfo[] = []
      if (messageType === 'tool_result' && message.content.includes('找到') && message.content.includes('篇相关文章') && message.content.includes('<a href=')) {
        articles = parseArticles(message.content)
      }
      
      messages.value.push({
        role: message.role,
        content: message.content,
        messageType: messageType,
        articles: articles
      })
    }
  }
}

// 发送消息
const sendMessage = async (message: string) => {
  if (!message.trim()) return
  
  if (!currentSessionId.value) {
    // 如果没有当前会话，先创建一个
    await createNewSession()
    if (!currentSessionId.value) return
  }
  
  // 添加用户消息到界面
  messages.value.push({
    role: 'user',
    content: message
  })
  
  // 显示打字指示器
  isTyping.value = true
  
  try {
    await sendStreamMessage(message)
  } catch (error: any) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败: ' + (error.message || error))
    messages.value.push({
      role: 'assistant',
      content: '抱歉，发生了错误，请稍后重试。'
    })
  } finally {
    isTyping.value = false
  }
}

// 发送流式消息
const sendStreamMessage = async (message: string) => {
  const response = await chatAPI.sendMessage(message, currentSessionId.value)
  
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
      
      // 保留最后一个不完整的行
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '' || data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            
            // 更新会话ID
            if (parsed.session_id) {
              currentSessionId.value = parsed.session_id
            }
            
            // 处理不同类型的消息
            if (parsed.type === 'tool_start') {
              // 工具开始，创建新的气泡
              const bubbleId = parsed.bubble_id
              bubbleContents.set(bubbleId, '')
              bubbleTools.set(bubbleId, parsed.tool_name) // 保存工具名称
              
              messages.value.push({
                role: 'assistant',
                content: `🔍 正在使用工具: ${parsed.tool_name}...`,
                bubbleId: bubbleId,
                messageType: 'tool_start'
              })
            } else if (parsed.type === 'tool_result') {
              // 工具结果，更新对应气泡
              const bubbleId = parsed.bubble_id
              if (bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
                
                // 找到对应的消息并更新
                const messageIndex = messages.value.findIndex((msg: ChatMessage) => msg.bubbleId === bubbleId)
                if (messageIndex !== -1) {
                  const content = bubbleContents.get(bubbleId)!
                  messages.value[messageIndex].content = content
                  
                  // 检查是否为图片生成工具
                  const toolName = bubbleTools.get(bubbleId)
                  if (toolName === 'generate_image') {
                    messages.value[messageIndex].messageType = 'image_result'
                    messages.value[messageIndex].name = toolName
                    messages.value[messageIndex].tool_call_id = parsed.tool_call_id
                  } else {
                    messages.value[messageIndex].messageType = 'tool_result'
                    
                    // 解析文章数据
                    if (content.includes('找到') && content.includes('篇相关文章') && content.includes('<a href=')) {
                      messages.value[messageIndex].articles = parseArticles(content)
                    }
                  }
                }
              }
            } else if (parsed.type === 'tool_end') {
              // 工具结束，保持tool_result类型以维持卡片显示
              const bubbleId = parsed.bubble_id
              const messageIndex = messages.value.findIndex((msg: ChatMessage) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                // 保持tool_result类型，不改为tool_complete，以维持文章卡片的显示
                // messages.value[messageIndex].messageType = 'tool_complete'
                
                // 流式输出完成后，强制重新渲染图片
                nextTick(() => {
                  const toolName = bubbleTools.get(bubbleId)
                  if (toolName === 'generate_image') {
                    // 对于图片生成工具，强制重新渲染图片
                    refreshGeneratedImage(messageIndex)
                  } else {
                    // 对于其他工具，刷新文章图片
                    refreshArticleImages(messageIndex)
                  }
                })
              }
            } else if (parsed.type === 'content') {
              // 普通内容，创建或更新最终回答气泡
              const bubbleId = parsed.bubble_id || 'final_answer'
              if (!bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, '')
                messages.value.push({
                  role: 'assistant',
                  content: '',
                  bubbleId: bubbleId,
                  messageType: 'content'
                })
              }
              
              bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
              
              // 找到对应的消息并更新
              const messageIndex = messages.value.findIndex((msg: ChatMessage) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                messages.value[messageIndex].content = bubbleContents.get(bubbleId)!
              }
            } else if (parsed.content && !parsed.type) {
              // 兼容旧格式，直接添加到最后一个助手消息
              const lastAssistantIndex = messages.value.length - 1
              if (lastAssistantIndex >= 0 && messages.value[lastAssistantIndex].role === 'assistant') {
                messages.value[lastAssistantIndex].content += parsed.content
              }
            }
            
            // 处理结束信号
            if (parsed.type === 'end') {
              if (parsed.session_id) {
                currentSessionId.value = parsed.session_id
              }
            }
          } catch (e) {
            console.warn('解析流式数据失败:', e, '数据:', data)
          }
        }
      }
    }
    
    // 处理缓冲区中剩余的数据
    if (buffer.trim()) {
      const lines = buffer.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '' || data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.session_id) {
              currentSessionId.value = parsed.session_id
            }
            
            // 处理剩余数据，逻辑同上
            if (parsed.type === 'content' && parsed.content) {
              const bubbleId = parsed.bubble_id || 'final_answer'
              if (!bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, '')
                messages.value.push({
                  role: 'assistant',
                  content: '',
                  bubbleId: bubbleId,
                  messageType: 'content'
                })
              }
              
              bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
              const messageIndex = messages.value.findIndex((msg: ChatMessage) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                messages.value[messageIndex].content = bubbleContents.get(bubbleId)!
              }
            }
          } catch (e) {
            console.warn('解析流式数据失败:', e, '数据:', data)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// 清空当前会话
const clearCurrentSession = () => {
  if (currentSessionId.value) {
    if (confirm('确定要清空当前对话吗？')) {
      currentSessionId.value = null
      currentSessionName.value = '新对话'
      messages.value = []
    }
  }
}

// 显示删除确认对话框
const showDeleteModal = (sessionId: string) => {
  deleteSessionId.value = sessionId
  showDeleteDialog.value = true
}

// 确认删除
const confirmDelete = () => {
  if (deleteSessionId.value) {
    deleteSession(deleteSessionId.value)
    showDeleteDialog.value = false
    deleteSessionId.value = null
  }
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 处理侧边栏鼠标悬浮
const handleSidebarMouseEnter = () => {
  if (sidebarCollapsed.value) {
    // 清除之前的延迟
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }
    sidebarHovered.value = true
  }
}

// 处理侧边栏鼠标离开
const handleSidebarMouseLeave = () => {
  if (sidebarCollapsed.value) {
    // 添加延迟，避免快速切换
    hoverTimeout = setTimeout(() => {
      sidebarHovered.value = false
    }, 100)
  }
}

// 发送消息处理
const handleSendMessage = () => {
  const message = inputMessage.value.trim()
  if (message) {
    sendMessage(message)
    inputMessage.value = ''
    nextTick(() => {
      autoResize()
    })
  }
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

// 自动调整输入框高度
const autoResize = () => {
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatMessages.value) {
    chatMessages.value.scrollTop = chatMessages.value.scrollHeight
  }
}

// 格式化消息内容
const formatMessage = (content: string) => {
  if (!content) return ''
  
  // 先处理文章链接，避免被HTML转义
  let formatted = content
  
  // 处理文章链接 - 匹配 <a href='...' target='_blank' class='article-link'>...</a> 格式
  formatted = formatted.replace(
    /<a href='([^']+)' target='_blank' class='article-link'>([^<]+)<\/a>/g,
    '<a href="$1" target="_blank" class="article-link" style="color: #007bff; text-decoration: underline; font-weight: bold; cursor: pointer;">$2</a>'
  )
  
  // 转义其他HTML特殊字符（但保留已处理的链接）
  const linkRegex = /<a href="[^"]+" target="_blank" class="article-link"[^>]*>.*?<\/a>/g
  const links: string[] = []
  let match
  while ((match = linkRegex.exec(formatted)) !== null) {
    links.push(match[0])
  }
  
  // 临时替换链接
  let tempFormatted = formatted
  links.forEach((link, index) => {
    tempFormatted = tempFormatted.replace(link, `__LINK_${index}__`)
  })
  
  // 转义HTML特殊字符
  tempFormatted = escapeHtml(tempFormatted)
  
  // 恢复链接
  links.forEach((link, index) => {
    tempFormatted = tempFormatted.replace(`__LINK_${index}__`, link)
  })
  
  formatted = tempFormatted
  
  // 简单的markdown格式化
  formatted = formatted
    .replace(/^### (.*$)/gm, '<strong>$1</strong>') // 三级标题转加粗
    .replace(/^## (.*$)/gm, '<strong>$1</strong>')  // 二级标题转加粗
    .replace(/^# (.*$)/gm, '<strong>$1</strong>')   // 一级标题转加粗
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
  
  return formatted
}

// HTML转义
const escapeHtml = (text: string) => {
  if (text === null || text === undefined) {
    return ''
  }
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 格式化时间
const formatTime = (timeString: string) => {
  if (!timeString) {
    return '未知时间'
  }
  
  const date = new Date(timeString)
  
  if (isNaN(date.getTime())) {
    return '无效时间'
  }
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) { // 1天内
    return Math.floor(diff / 3600000) + '小时前'
  } else {
    return date.toLocaleDateString()
  }
}

// 获取消息类型样式类
const getMessageTypeClass = (messageType?: string) => {
  switch (messageType) {
    case 'tool_start':
      return 'tool-start-message'
    case 'tool_result':
      return 'tool-result-message'
    case 'image_result':
      return 'image-result-message'
    case 'tool_complete':
      return 'tool-complete-message'
    case 'content':
      return 'content-message'
    default:
      return ''
  }
}

// 解析文章数据
const parseArticles = (content: string): ArticleInfo[] => {
  const articles: ArticleInfo[] = []
  
  // 匹配文章链接和信息的正则表达式
  const articleRegex = /(\d+)\.\s*<a href='([^']+)' target='_blank' class='article-link'>([^<]+)<\/a>\s*ID:\s*(\d+)\s*分类:\s*([^\n]+)\s*封面:\s*([^\n]+)/g
  
  let match
  while ((match = articleRegex.exec(content)) !== null) {
    const [, , url, title, id, category, cover] = match
    articles.push({
      id: parseInt(id),
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
      cover: cover.trim()
    })
  }
  
  return articles
}

// 获取文章标题头部
const getArticleHeader = (content: string): string => {
  const match = content.match(/找到\s*(\d+)\s*篇相关文章/)
  if (match) {
    return `找到 ${match[1]} 篇相关文章`
  }
  return '相关文章'
}

// 打开文章链接
const openArticle = (url: string) => {
  window.open(url, '_blank')
}

// 图片重试计数器
const imageRetryCount = new Map<string, number>()

// 处理图片加载错误
const handleImageError = (event: Event, article: ArticleInfo) => {
  const img = event.target as HTMLImageElement
  const imageKey = `${article.id}-${article.cover}`
  const retryCount = imageRetryCount.get(imageKey) || 0
  
  console.log(`图片加载失败: ${article.cover}, 重试次数: ${retryCount}`)
  
  if (retryCount < 3) {
    // 重试加载图片
    imageRetryCount.set(imageKey, retryCount + 1)
    
    // 延迟重试，给服务器一些时间
    setTimeout(() => {
      // 添加时间戳参数强制刷新缓存
      const separator = article.cover.includes('?') ? '&' : '?'
      const newSrc = `${article.cover}${separator}_retry=${Date.now()}`
      img.src = newSrc
    }, 1000 * (retryCount + 1)) // 递增延迟时间
  } else {
    // 超过重试次数，显示占位符
    img.style.display = 'none'
    // 可以在这里添加一个占位符图片
    const placeholder = document.createElement('div')
    placeholder.className = 'image-placeholder'
    placeholder.innerHTML = '<i class="fas fa-image"></i>'
    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      color: #ccc;
      font-size: 24px;
    `
    img.parentNode?.insertBefore(placeholder, img)
  }
}

// 处理图片加载成功
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 清除重试计数器
  const src = img.src
  const imageKey = src.split('?')[0] // 移除查询参数
  imageRetryCount.delete(imageKey)
}

// 刷新文章图片
const refreshArticleImages = (messageIndex: number) => {
  const message = messages.value[messageIndex]
  if (message && message.articles && message.articles.length > 0) {
    // 强制重新渲染文章数据，触发图片重新加载
    const articles = [...message.articles]
    message.articles = []
    nextTick(() => {
      message.articles = articles
    })
  }
}

// 刷新生成的图片
const refreshGeneratedImage = (messageIndex: number) => {
  const message = messages.value[messageIndex]
  if (message && message.messageType === 'image_result') {
    // 强制重新渲染图片内容，触发图片重新加载
    const content = message.content
    message.content = ''
    nextTick(() => {
      message.content = content
    })
  }
}

// 处理生成图片加载错误
const handleGeneratedImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.log('生成图片加载失败:', img.src)
  
  // 显示占位符
  img.style.display = 'none'
  const placeholder = document.createElement('div')
  placeholder.className = 'image-placeholder'
  placeholder.innerHTML = '<i class="fas fa-image"></i><p>图片加载失败</p>'
  placeholder.style.cssText = `
    width: 100%;
    height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    color: #ccc;
    font-size: 24px;
    border-radius: 8px;
  `
  img.parentNode?.insertBefore(placeholder, img)
}

// 处理生成图片加载成功
const handleGeneratedImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.log('生成图片加载成功:', img.src)
}

// 在新标签页中打开图片
const openImageInNewTab = (imageUrl: string) => {
  window.open(imageUrl, '_blank')
}
</script>

<style scoped lang="scss">
.ai-chat-container {
  display: flex;
  height: calc(100vh + 45px);
  background: #ffffff;
  margin-top: -45px;
  padding-top: 90px;
}

/* 侧边栏样式 */
.chat-sidebar {
  width: 260px;
  background: #f0f4fa;
  color: #333333;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  z-index: 10;
  pointer-events: auto;
  
  &.sidebar-collapsed {
    width: 60px;
    
    &.sidebar-hovered {
      width: 260px;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 50;
      position: relative;
      overflow: visible;
    }
  }
}

.sidebar-header {
  padding: 16px 20px;
  background: #f0f4fa;
  
  .sidebar-collapsed:not(.sidebar-hovered) & {
    padding: 16px 10px;
  }
  
  .sidebar-collapsed.sidebar-hovered & {
    padding: 16px 20px;
  }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  
  .sidebar-collapsed:not(.sidebar-hovered) & {
    justify-content: center;
  }
  
  .sidebar-collapsed.sidebar-hovered & {
    justify-content: space-between;
  }
}

.sidebar-header h3 {
  font-size: 1.1rem;
  font-weight: normal;
  color: #333333;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.sidebar-header h3 i {
  color: #666666;
}

.collapse-btn {
  background: none;
  border: none;
  color: #666666;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s ease;
  
  &:hover {
    background: #e8e8e8;
  }
}

.new-chat-btn {
  width: 100%;
  padding: 12px 20px;
  background: #f5f5f5;
  color: #666666;
  border: none;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: #e8e8e8;
    color: #333333;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  i {
    font-size: 1rem;
  }
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}

.session-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  
  &:hover {
    background: #f0f4fa;
  }
  
  &.active {
    background: #f0f4fa;
  }
}

.session-content {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  color: #333333;
}

.session-meta {
  font-size: 0.75rem;
  color: #666666;
}

.session-actions {
  opacity: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  margin-left: 8px;
}

.delete-session-btn {
  background: transparent;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 14px;
  position: relative;
  
  &:hover {
    background: #fef2f2;
    color: #dc2626;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  i {
    pointer-events: none;
  }
}

.empty-sessions {
  text-align: center;
  padding: 40px 20px;
  color: #666666;
  
  i {
    font-size: 2.5rem;
    margin-bottom: 15px;
    display: block;
    color: #cccccc;
  }
  
  p {
    margin: 5px 0;
    font-size: 0.9rem;
  }
}

/* 主聊天区域 */
.main-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  position: relative;
  z-index: 1;
}

.chat-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.chat-title h3 {
  font-size: 1.2rem;
  font-weight: normal;
  color: #333333;
  margin-bottom: 4px;
}

.session-info {
  font-size: 0.85rem;
  color: #666666;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666666;
  font-size: 0.85rem;
  font-weight: 500;
  
  &:hover {
    background: #f8f9fa;
    border-color: #d1d5db;
    color: #333333;
  }
}

/* 聊天消息区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #ffffff;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: #666666;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.welcome-message h3 {
  font-size: 2.0em;
  font-weight: 250;
  margin-bottom: 10px;
  color: #333333;
}

/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 24px;
  animation: fadeInUp 0.4s ease;
  padding: 0 250px;
}

.user-message {
  justify-content: flex-end;
}

.assistant-message {
  justify-content: flex-start;
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

.message-content {
  padding: 16px 20px;
  border-radius: 18px;
  line-height: 1.6;
  word-wrap: break-word;
  max-width: 70%;
  text-align: left;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.message-content:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-message .message-content {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border-bottom-right-radius: 1px;
  position: relative;
}

.user-message .message-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: -8px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-left-color: #0056b3;
  border-bottom: none;
  border-right: none;
}

.assistant-message .message-content {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e5e5e5;
  border-radius: 18px;
  position: relative;
}

/* 不同类型消息的样式 */
.tool-start-message .message-content {
  background: #f8f9fa;
  border: 1px solid #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-style: italic;
}

.tool-result-message .message-content {
  background: #f0fdf4;
  border: 1px solid #22c55e;
  color: #14532d;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1em;
  line-height: 1.6;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
}

.image-result-message .message-content {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  color: #0c4a6e;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1em;
  line-height: 1.6;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
}

.tool-complete-message .message-content {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  color: #0c4a6e;
  border-radius: 12px;
}

.content-message .message-content {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  color: #333333;
  border-radius: 18px;
}

/* 消息指示器样式 */
.message-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #666666;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-start-message .message-indicator {
  color: #1976d2;
  border-color: #e3f2fd;
}

.tool-complete-message .message-indicator {
  color: #10b981;
  border-color: #d1fae5;
}

.message-content code {
  background: #f1f3f4;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.9em;
  color: #333333;
  border: 1px solid #e1e4e8;
}

.user-message .message-content code {
  background: rgba(255,255,255,0.25);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

.message-content pre {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #e5e5e5;
  margin: 8px 0;
}

.user-message .message-content pre {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
}

.message-content ul, .message-content ol {
  margin: 8px 0;
  padding-left: 20px;
}

.message-content li {
  margin: 4px 0;
}

.message-content a {
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom 0.2s ease;
}

.message-content a:hover {
  border-bottom: 1px solid #007bff;
}

/* 文章链接特殊样式 */
.message-content .article-link {
  color: #007bff !important;
  font-weight: bold;
  text-decoration: none;
  border-bottom: 2px solid #007bff;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(0, 123, 255, 0.1);
  transition: all 0.2s ease;
  display: inline-block;
  margin: 2px 0;
}

.message-content .article-link:hover {
  background: rgba(0, 123, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

/* 工具返回内容中的文章标题样式 */
.tool-result-message .message-content a {
  color: #007bff !important;
  font-weight: bold;
  text-decoration: underline;
  transition: all 0.2s ease;
}

.tool-result-message .message-content a:hover {
  color: #0056b3 !important;
  text-decoration: none;
}

/* 工具返回内容中的代码块样式 - 隐藏或美化 */
.tool-result-message .message-content pre,
.tool-result-message .message-content code {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  font-family: inherit !important;
  font-size: inherit !important;
  color: inherit !important;
  white-space: normal !important;
  overflow: visible !important;
}

/* 图片容器样式 */
.image-container {
  width: 100%;
  max-width: 100%;
}

.image-header {
  margin-bottom: 16px;
  text-align: center;
}

.image-header h4 {
  color: #0c4a6e;
  font-size: 1.1rem;
  font-weight: normal;
  margin: 0;
  padding: 8px 16px;
  background: rgba(14, 165, 233, 0.1);
  border-radius: 8px;
  display: inline-block;
}

.generated-image {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
}

.generated-image img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  object-fit: contain;
}

.generated-image img:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* 文章卡片容器样式 */
.articles-container {
  width: 100%;
  max-width: 100%;
}

.articles-header {
  margin-bottom: 16px;
  text-align: center;
}

.articles-header h4 {
  color: #14532d;
  font-size: 1.1rem;
  font-weight: normal;
  margin: 0;
  padding: 8px 16px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  display: inline-block;
}

.articles-grid {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin-top: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

/* 文章卡片样式 */
.article-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  min-width: 200px;
  flex-shrink: 0;
  z-index: 1;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #22c55e;
}

.article-cover {
  width: 100%;
  height: 120px;
  overflow: hidden;
  position: relative;
  background: #f8f9fa;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #ccc;
  font-size: 24px;
  border-radius: 8px;
}

.article-card:hover .article-cover img {
  transform: scale(1.05);
}

.article-info {
  padding: 12px;
}

.article-title {
  font-size: 0.9rem;
  font-weight: normal;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.article-category {
  background: #0ea5e9;
  color: white;
  padding: 3px 6px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.7rem;
}

.article-id {
  color: #6b7280;
  font-size: 0.7rem;
  font-weight: 500;
}

/* 响应式设计 - 文章卡片和图片 */
@media (max-width: 768px) {
  .articles-grid {
    gap: 8px;
  }
  
  .article-card {
    min-width: 160px;
    margin: 0 4px;
  }
  
  .article-cover {
    height: 100px;
  }
  
  .article-info {
    padding: 8px;
  }
  
  .article-title {
    font-size: 0.8rem;
  }
  
  .generated-image img {
    max-height: 250px;
  }
  
  .image-header h4 {
    font-size: 1rem;
    padding: 6px 12px;
  }
}

/* 工具返回内容中的表格样式美化 */
.tool-result-message .message-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tool-result-message .message-content th,
.tool-result-message .message-content td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
}

.tool-result-message .message-content th {
  background: rgba(14, 165, 233, 0.1);
  font-weight: normal;
  color: #0c4a6e;
}

.user-message .message-content a {
  color: #ffffff;
  border-bottom: 1px solid rgba(255,255,255,0.5);
}

.user-message .message-content a:hover {
  border-bottom: 1px solid #ffffff;
}

.message-content blockquote {
  border-left: 4px solid #007bff;
  padding-left: 16px;
  margin: 12px 0;
  color: #666666;
  font-style: italic;
}

.user-message .message-content blockquote {
  border-left-color: rgba(255,255,255,0.7);
  color: rgba(255,255,255,0.9);
}

/* 输入区域 */
.chat-input-container {
  padding: 20px 20px 5px 20px;
  background: #ffffff;
  flex-shrink: 0;
}

.input-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.message-input {
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 24px;
  padding: 16px 60px 16px 20px;
  font-size: 1rem;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.5;
  min-height: 55px;
  max-height: 120px;
  background: #f8f9fa;
  box-sizing: border-box;
  overflow: hidden;
  
  &:focus {
    border-color: #007bff;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &::placeholder {
    color: #999999;
  }
}

.send-btn {
  position: absolute;
  right: 8px;
  top: 45%;
  transform: translateY(-50%);
  background: #b3d9ff;
  color: #666666;
  border: none;
  border-radius: 50%;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  
  &:hover {
    background: #99ccff;
    color: #333333;
  }
  
  &:disabled {
    background: #e0e0e0;
    color: #999999;
    cursor: not-allowed;
  }
}

.input-footer {
  margin-top: 8px;
  height: 20px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666666;
  font-size: 0.9rem;
  
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
    transform: translateY(-10px);
  }
}

/* 加载覆盖层 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  border: 1px solid #e5e5e5;
  
  i {
    font-size: 2rem;
    color: #007bff;
    margin-bottom: 15px;
  }
  
  p {
    color: #333333;
    font-size: 1.1rem;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-chat-container {
    flex-direction: column;
    height: calc(100vh + 45px);
    margin-top: -45px;
    padding-top: 90px;
  }
  
  .chat-sidebar {
    width: 100%;
    height: 200px;
    order: 2;
    
    &.sidebar-collapsed {
      width: 100%;
      height: 60px;
    }
  }
  
  .main-chat-area {
    order: 1;
    height: calc(100vh - 245px);
  }
  
  .session-list {
    display: flex;
    overflow-x: auto;
    padding: 10px;
  }
  
  .session-item {
    min-width: 200px;
    margin-right: 10px;
    margin-bottom: 0;
  }
  
  .session-actions {
    opacity: 1;
    min-width: 40px;
    height: 40px;
  }
  
  .delete-session-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .message-content {
    max-width: 90%;
    padding: 12px 16px;
  }
  
  .message {
    padding: 0 10px;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
