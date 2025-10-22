<script setup lang="ts">
import { nextTick } from 'vue'
import CustomMarkdownEditor from '@/components/CustomMarkdownEditor/index.vue'
import { ElMessage } from 'element-plus'
import { Loading, Check, Delete, Edit, ArrowLeft, ArrowRight, ChatLineSquare } from '@element-plus/icons-vue'
import { useColorMode } from '@vueuse/core'
import { 
  addCategory, 
  addTag, 
  articleCategory, 
  articleTag, 
  deleteCover, 
  getArticle, 
  publishArticle, 
  uploadCover 
} from '@/apis/article'
import { agentAPI } from '@/apis/aiChat'
import type { CategoryType, TagType } from './type'

const route = useRoute()
const router = useRouter()

// 日夜切换
const mode = useColorMode()

// 表单数据
interface ArticleFormData {
  categoryId?: number
  tagId?: number[]
  articleCover?: string
  articleTitle?: string
  articleContent?: string
  articleType: 1 | 2 | 3
  isTop: 0 | 1
  status: 1 | 2 | 3
}

const formData = ref<ArticleFormData>({
  categoryId: undefined,
  tagId: undefined,
  articleCover: undefined,
  articleTitle: undefined,
  articleContent: undefined,
  articleType: 1,
  isTop: 0,
  status: 1,
})

// 文件上传相关
const fileList = ref<any[]>([])
const previewBase64 = ref<string>()

// 分类和标签
const categoryList = ref<CategoryType[]>([])
const tagList = ref<TagType[]>([])
const categoryName = ref('')
const tagName = ref('')

// 加载状态
const categoryLoading = ref(false)
const tagLoading = ref(false)

// AI对话相关
const aiMessages = ref<any[]>([])
const aiInputMessage = ref('')
const isAiTyping = ref(false)
const aiChatMessages = ref<HTMLElement | null>(null)
const aiMessageInput = ref<HTMLTextAreaElement | null>(null)
const aiMode = ref('agent') // 默认使用agent模式
const showModeDropdown = ref(false) // 控制下拉框显示
const currentSessionId = ref<string | null>(null)

// 自动保存相关
const isSaving = ref(false)
const autoSaveError = ref<string | null>(null)
const lastSavedAt = ref<Date | null>(null)
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
const lastSavedSnapshot = ref<string>('')
const lastSavedText = computed(() => {
  if (!lastSavedAt.value) return ''
  try {
    return lastSavedAt.value.toLocaleTimeString()
  } catch {
    return ''
  }
})

// 侧边栏与会话列表（Agent）
const sidebarCollapsed = ref(true)
const sidebarHovered = ref(false)
let hoverTimeout: ReturnType<typeof setTimeout> | null = null
const agentSessions = ref<any[]>([])
const sessionsLoading = ref(false)

// 删除会话确认对话框
const showDeleteDialog = ref(false)
const deleteSessionId = ref<string | null>(null)
const deleteSessionName = ref<string>('')

// 分割器相关
const leftPanelWidth = ref(72) // 左侧面板宽度百分比，默认65%
const isDragging = ref(false)
const splitterRef = ref<HTMLElement | null>(null)

// Diff测试相关
const showDiff = ref(false)
const diffContent = ref('')
const prevContent = ref('')
const changeBlocks = ref(0)
const totalChangeBlocks = ref(0)

// 标题更新确认相关
const showTitleConfirm = ref(false)
const prevTitle = ref<string | undefined>(undefined)
const proposedTitle = ref<string | undefined>(undefined)

const acceptTitleChange = () => {
  if (proposedTitle.value !== undefined) {
    formData.value.articleTitle = proposedTitle.value
  }
  showTitleConfirm.value = false
  ElMessage.success('已接受标题更新')
}

const undoTitleChange = () => {
  formData.value.articleTitle = prevTitle.value
  showTitleConfirm.value = false
  proposedTitle.value = undefined
  ElMessage.info('已撤销标题更新')
}

// 分类更新确认相关
const showCategoryConfirm = ref(false)
const prevCategoryId = ref<number | undefined>(undefined)
const proposedCategory = ref<string | undefined>(undefined)

const acceptCategoryChange = () => {
  if (!proposedCategory.value) {
    ElMessage.warning('未检测到待更新的分类')
    return
  }
  const target = categoryList.value.find((c: any) => c.categoryName === proposedCategory.value)
  if (!target) {
    ElMessage.error('所选分类不存在')
    return
  }
  formData.value.categoryId = target.id
  showCategoryConfirm.value = false
  ElMessage.success('已接受分类更新')
}

const undoCategoryChange = () => {
  formData.value.categoryId = prevCategoryId.value
  showCategoryConfirm.value = false
  proposedCategory.value = undefined
  ElMessage.info('已撤销分类更新')
}

// 标签更新确认相关
const showTagsConfirm = ref(false)
const prevTagIds = ref<number[] | undefined>(undefined)
const proposedTags = ref<string[] | undefined>(undefined)

const acceptTagsChange = () => {
  const names = (proposedTags.value || []).filter((n) => typeof n === 'string' && n.trim().length > 0)
  if (names.length === 0) {
    ElMessage.warning('未检测到待更新的标签')
    return
  }
  const existingNames = new Set(tagList.value.map((t: any) => t.tagName))
  const missing = names.filter((n) => !existingNames.has(n))
  if (missing.length > 0) {
    ElMessage.error('以下标签不存在：' + missing.join(', '))
    return
  }
  const idMap = new Map(tagList.value.map((t: any) => [t.tagName, t.id]))
  const ids = names.map((n) => idMap.get(n)).filter((v) => typeof v === 'number') as number[]
  formData.value.tagId = ids
  showTagsConfirm.value = false
  ElMessage.success('已接受标签更新')
}

const undoTagsChange = () => {
  formData.value.tagId = prevTagIds.value
  showTagsConfirm.value = false
  proposedTags.value = undefined
  ElMessage.info('已撤销标签更新')
}

// 工具消息管理（在sendAiStreamMessage函数内部使用）

// 移除编辑器引用，使用自定义编辑器

// 移除编辑器类型切换，只使用自定义编辑器

onMounted(async () => {
  getFormData()
  await getCategory()
  await getTag()
  await loadAgentSessions(true) // 传入true表示自动选择第一个会话
  
  // 添加点击外部关闭下拉框的事件监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('click', handleClickOutside)
  // 清理自动保存定时器
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }
})

// 监听AI消息变化，自动滚动到底部
watch(() => aiMessages.value, () => {
  nextTick(() => {
    scrollAiChatToBottom()
  })
}, { deep: true })

// 监听表单变化，触发自动保存（防抖）
watch(formData, () => {
  scheduleAutoSave()
}, { deep: true })

// 会话切换后重置快照，避免串会话
watch(currentSessionId, () => {
  lastSavedSnapshot.value = ''
})


// 获取分类列表
async function getCategory() {
  try {
    const { data } = await articleCategory()
    categoryList.value = data
  } catch (error) {
    ElMessage.error('获取分类列表失败')
  }
}

// 获取标签列表
async function getTag() {
  try {
    const { data } = await articleTag()
    tagList.value = data
  } catch (error) {
    ElMessage.error('获取标签列表失败')
  }
}

// 添加分类
function addCategoryFunc() {
  if (!categoryName.value.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  
  categoryLoading.value = true
  const data = { 
    categoryName: categoryName.value, 
    id: categoryList.value.length > 0 ? categoryList.value[categoryList.value.length - 1].id + 1 : 1 
  }
  
  addCategory(data).then((res: any) => {
    if (res.code === 200) {
      categoryList.value.push(data)
      ElMessage.success('添加分类成功')
    } else {
      ElMessage.error('添加分类失败')
    }
  }).catch(() => {
    ElMessage.error('添加分类失败')
  }).finally(() => {
    categoryLoading.value = false
    categoryName.value = ''
  })
}

// 添加标签
function addTagFunc() {
  if (!tagName.value.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  
  tagLoading.value = true
  const data = { 
    tagName: tagName.value, 
    id: tagList.value.length > 0 ? tagList.value[tagList.value.length - 1].id + 1 : 1 
  }
  
  addTag(data).then((res: any) => {
    if (res.code === 200) {
      tagList.value.push(data)
      ElMessage.success('添加标签成功')
    } else {
      ElMessage.error('添加标签失败')
    }
  }).catch(() => {
    ElMessage.error('添加标签失败')
  }).finally(() => {
    tagLoading.value = false
    tagName.value = ''
  })
}

// 文件上传前验证
function beforeUpload(file: any) {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
  if (!isJpgOrPng) {
    ElMessage.error('文件格式必须是jpg或png或webp')
    return false
  }

  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片必须小于 5MB')
    return false
  }

  fileList.value = [file]
  getBase64(file, (base64Url: string) => {
    previewBase64.value = base64Url
  })

  return false
}

// 获取Base64
function getBase64(img: Blob, callback: (base64Url: string) => void) {
  const reader = new FileReader()
  reader.addEventListener('load', () => callback(reader.result as string))
  reader.readAsDataURL(img)
}

// 发布文章
function onFinish() {
  if (!formData.value.articleTitle || !formData.value.categoryId || !formData.value.tagId || !formData.value.articleContent) {
    ElMessage.warning('请检查是否填写完整')
    return
  }

  if (!formData.value.articleCover && !fileList.value[0]) {
    ElMessage.warning('请上传文章封面')
    return
  }

  if (!fileList.value[0] && formData.value.articleCover) {
    publishArticle(formData.value).then((res: any) => {
      if (res.code === 200) {
        ElMessage.success('发布成功')
        resetForm()
      } else {
        ElMessage.error('发布失败')
      }
    }).catch(() => {
      ElMessage.error('发布失败')
    })
  } else {
    const articleCover = new FormData()
    articleCover.append('articleCover', fileList.value[0])
    uploadCover(articleCover).then((res: any) => {
      if (res.code === 200) {
        const articleCoverUrl = res.data
        formData.value.articleCover = res.data
        publishArticle(formData.value).then((res: any) => {
          if (res.code === 200) {
            ElMessage.success('发布成功')
            resetForm()
          } else {
            ElMessage.error('发布失败')
            deleteCover(articleCoverUrl)
          }
        }).catch(() => {
          deleteCover(articleCoverUrl)
        })
      } else {
        ElMessage.error('上传文章封面失败')
      }
    }).catch(() => {
      ElMessage.error('上传文章封面失败')
    })
  }
}

// 重置表单
function resetForm() {
  formData.value = {
    categoryId: undefined,
    tagId: undefined,
    articleCover: undefined,
    articleTitle: undefined,
    articleContent: undefined as string | undefined,
    articleType: 1,
    isTop: 0,
    status: 1,
  }
  fileList.value = []
  previewBase64.value = ''
}

// ---------- 自动保存逻辑 ----------
// 生成保存快照（用于脏值判断）
const buildSaveSnapshot = () => {
  const categoryName = categoryList.value.find((c: any) => c.id === formData.value.categoryId)?.categoryName || ''
  const tagNames = tagList.value
    .filter((t: any) => Array.isArray(formData.value.tagId) && (formData.value.tagId as number[]).includes(t.id))
    .map((t: any) => t.tagName)
  const payload = {
    articleId: currentSessionId.value || (route.query.id as string) || '',
    articleContent: formData.value.articleContent || '',
    articleTitle: formData.value.articleTitle || '',
    articleCover: formData.value.articleCover || '',
    articleCategory: categoryName,
    articleTags: tagNames,
  }
  return JSON.stringify(payload)
}

// 防抖调度保存
const scheduleAutoSave = () => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }
  // 需要存在会话ID或路由ID（文章ID）
  if (!currentSessionId.value && !route.query.id) return
  autoSaveTimeout = setTimeout(() => {
    void doAutoSave()
  }, 1500)
}

// 执行保存
const doAutoSave = async () => {
  const snapshot = buildSaveSnapshot()
  // 没有变化则跳过
  if (snapshot === lastSavedSnapshot.value) return

  // 至少有标题或内容时才保存
  if (!formData.value.articleTitle && !formData.value.articleContent) return

  const articleId = currentSessionId.value || (route.query.id as string) || ''
  if (!articleId) return

  const categoryName = categoryList.value.find((c: any) => c.id === formData.value.categoryId)?.categoryName || ''
  const tagNames = tagList.value
    .filter((t: any) => Array.isArray(formData.value.tagId) && (formData.value.tagId as number[]).includes(t.id))
    .map((t: any) => t.tagName)

  try {
    isSaving.value = true
    autoSaveError.value = null
    await agentAPI.saveArticle(
      articleId,
      formData.value.articleContent || '',
      formData.value.articleTitle || '',
      formData.value.articleCover || '',
      categoryName,
      tagNames
    )
    lastSavedSnapshot.value = snapshot
    lastSavedAt.value = new Date()
  } catch (err: any) {
    autoSaveError.value = err?.message || '保存失败'
  } finally {
    isSaving.value = false
  }
}

// 移除md-editor的图片上传函数，使用自定义编辑器的上传功能

// 数据回显
function getFormData() {
  if (route.query.id) {
    getArticle(route.query.id as string).then((res: any) => {
      if (res.data) {
        formData.value = res.data
      }
    }).catch(() => {
      ElMessage.error('获取文章数据失败')
    })
  }
}

// 关闭页面
function close() {
  router.push('/')
}

// AI对话相关方法
// 创建新会话
const createNewSession = async () => {
  try {
    const res: any = await agentAPI.createAgentSession()
    const data = (res && res.data) ? res.data : res
    // 兼容多种返回结构: { success, session: { id } } 或 { session_id } 或 { id }
    const sessionId = (data && data.session && data.session.id) || data?.session_id || data?.id
    if (sessionId) {
      currentSessionId.value = sessionId
      // 清空当前消息和表单
      aiMessages.value = []
      resetForm()
      await loadAgentSessions() // 不传入autoSelectFirst参数，保持当前会话选中
      ElMessage.success('已创建新会话')
      return sessionId
    }
    ElMessage.error('创建会话失败：未返回有效的会话ID')
    return null
  } catch (error: any) {
    ElMessage.error('创建会话失败: ' + (error.message || error))
    return null
  }
}

// 加载会话列表（Agent）
const loadAgentSessions = async (autoSelectFirst = false) => {
  try {
    sessionsLoading.value = true
    const res: any = await agentAPI.getAgentSessions()
    const data = (res && res.data) ? res.data : res
    // 兼容 { sessions: [...] } 或直接数组
    agentSessions.value = Array.isArray(data) ? data : (data?.sessions || [])
    
    // 如果需要自动选择第一个会话且没有当前选中的会话
    if (autoSelectFirst && agentSessions.value.length > 0 && !currentSessionId.value) {
      const firstSession = agentSessions.value[0]
      await selectAgentSession(firstSession.id)
    }
  } catch (error: any) {
    ElMessage.error('加载会话失败: ' + (error.message || error))
  } finally {
    sessionsLoading.value = false
  }
}

// 选择会话
const selectAgentSession = async (sessionId: string) => {
  currentSessionId.value = sessionId
  
  try {
    // 加载会话的历史消息
    const res: any = await agentAPI.loadAgentSession(sessionId)
    const data = (res && res.data) ? res.data : res
    
    // 清空当前消息
    aiMessages.value = []
    
    // 如果有历史消息，加载到界面
    if (data && data.session && data.session.history && Array.isArray(data.session.history)) {
      // 处理历史消息，包含tool消息
      const processedMessages: any[] = []
      
      for (let i = 0; i < data.session.history.length; i++) {
        const msg = data.session.history[i]
        
        if (msg.role === 'user') {
          // 用户消息直接添加
          processedMessages.push({
            role: msg.role,
            content: msg.content,
            bubbleId: msg.bubbleId || undefined,
            messageType: '',
            name: msg.name || undefined,
            summary: msg.summary || undefined
          })
        } else if (msg.role === 'assistant') {
          // 检查是否有tool_calls
          if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            // 为每个tool_call创建tool_start消息
            msg.tool_calls.forEach((toolCall: any, index: number) => {
              const bubbleId = `tool_${toolCall.id || index}`
              processedMessages.push({
                role: 'assistant',
                content: `🔍 正在使用工具: ${toolCall.function.name}...`,
                bubbleId: bubbleId,
                messageType: 'tool_start',
                name: toolCall.function.name,
                summary: undefined
              })
            })
          }
          
          // 添加assistant的最终回复消息
          if (msg.content) {
            processedMessages.push({
              role: msg.role,
              content: msg.content,
              bubbleId: msg.bubbleId || undefined,
              messageType: 'content',
              name: msg.name || undefined,
              summary: msg.summary || undefined
            })
          }
        } else if (msg.role === 'tool') {
          // 处理tool结果消息，将其转换为tool_complete
          const bubbleId = `tool_${msg.tool_call_id || 'unknown'}`
          
          // 查找对应的tool_start消息并更新为tool_complete
          const toolStartIndex = processedMessages.findIndex(m => 
            m.bubbleId === bubbleId && m.messageType === 'tool_start'
          )
          
          if (toolStartIndex !== -1) {
            // 解析tool结果
            let summary = ''
            try {
              const toolData = JSON.parse(msg.content)
              summary = toolData.summary || ''
            } catch (e) {
              summary = `工具 ${msg.name} 执行完成`
            }
            
            processedMessages[toolStartIndex] = {
              role: 'assistant',
              content: `✅ 工具 ${msg.name} 执行完成`,
              bubbleId: bubbleId,
              messageType: 'tool_complete',
              name: msg.name,
              summary: summary
            }
          }
        }
      }
      
      aiMessages.value = processedMessages
    }
    
    // 处理文章内容（现在loadAgentSession直接返回文章信息）
    if (data && data.success) {
      // 填充文章信息到表单
      formData.value.articleTitle = data.article_title !== undefined ? data.article_title : formData.value.articleTitle
      formData.value.articleContent = data.article_content !== undefined ? data.article_content : formData.value.articleContent
      formData.value.articleCover = data.article_cover !== undefined ? data.article_cover : formData.value.articleCover
      
      // 处理分类
      if (data.article_category !== undefined) {
        if (data.article_category) {
          const category = categoryList.value.find((c: any) => 
            c.categoryName === data.article_category
          )
          if (category) {
            formData.value.categoryId = category.id
          }
        } else {
          // 如果分类为空字符串，清空分类选择
          formData.value.categoryId = undefined
        }
      }
      
      // 处理标签 - 解析JSON格式的标签数组
      if (data.article_tags !== undefined) {
        if (data.article_tags) {
          try {
            const tagsArray = JSON.parse(data.article_tags)
            if (Array.isArray(tagsArray)) {
              const tagIds = tagsArray.map((tagName: string) => {
                const tag = tagList.value.find((t: any) => t.tagName === tagName)
                return tag ? tag.id : null
              }).filter((id: number | null) => id !== null) as number[]
              
              formData.value.tagId = tagIds
            }
          } catch (parseError) {
            console.warn('解析标签失败:', parseError)
          }
        } else {
          // 如果标签为空字符串，清空标签选择
          formData.value.tagId = undefined
        }
      }
    }
  } catch (error: any) {
    console.error('加载会话消息失败:', error)
    ElMessage.error('加载会话消息失败: ' + (error.message || error))
    // 即使加载失败，也要设置当前会话ID
    aiMessages.value = []
  }
}

// 显示删除确认对话框
const showDeleteModal = (sessionId: string) => {
  const session = agentSessions.value.find(s => s.id === sessionId)
  deleteSessionId.value = sessionId
  deleteSessionName.value = session?.name || '新建草稿'
  showDeleteDialog.value = true
}

// 确认删除会话
const confirmDeleteSession = async () => {
  if (!deleteSessionId.value) return
  
  try {
    await agentAPI.deleteAgentSession(deleteSessionId.value)
    if (currentSessionId.value === deleteSessionId.value) {
      currentSessionId.value = null
      aiMessages.value = []
    }
    await loadAgentSessions()
    ElMessage.success('删除成功')
  } catch (error: any) {
    ElMessage.error('删除失败: ' + (error.message || error))
  } finally {
    showDeleteDialog.value = false
    deleteSessionId.value = null
    deleteSessionName.value = ''
  }
}

// 取消删除
const cancelDeleteSession = () => {
  showDeleteDialog.value = false
  deleteSessionId.value = null
  deleteSessionName.value = ''
}

// 侧边栏交互
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
const handleSidebarMouseEnter = () => {
  if (sidebarCollapsed.value) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }
    sidebarHovered.value = true
  }
}
const handleSidebarMouseLeave = () => {
  if (sidebarCollapsed.value) {
    hoverTimeout = setTimeout(() => {
      sidebarHovered.value = false
    }, 100)
  }
}

// 时间格式化（用于侧边栏展示）
const formatTime = (timeString: string) => {
  if (!timeString) return '未知时间'
  const date = new Date(timeString)
  if (isNaN(date.getTime())) return '无效时间'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return date.toLocaleDateString()
}

// 发送AI消息
const sendAiMessage = async (message: string) => {
  if (!message.trim()) return
  
  // 如果没有当前会话，先创建一个
  if (!currentSessionId.value) {
    const sessionId = await createNewSession()
    if (!sessionId) return
  }
  
  // 添加用户消息到界面
  aiMessages.value.push({
    role: 'user',
    content: message
  })
  
  // 显示打字指示器
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

// 发送AI流式消息
const sendAiStreamMessage = async (message: string) => {
  // 构建包含文章上下文的提示
  const articleInfo = buildArticleInfo()
  
  // 优先使用diffContent，如果不存在则使用原始articleContent
  const currentContent = diffContent.value || formData.value.articleContent || ''
  
  const response = await agentAPI.sendMessage(articleInfo, message, currentContent, currentSessionId.value, aiMode.value)
  
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
              
              aiMessages.value.push({
                role: 'assistant',
                content: `🔍 正在使用工具: ${parsed.tool_name}...`,
                bubbleId: bubbleId,
                messageType: 'tool_start'
              })
            } else if (parsed.type === 'tool_result') {
              // 工具结果，不显示内容，只处理工具逻辑
              const bubbleId = parsed.bubble_id
              if (bubbleContents.has(bubbleId)) {
                bubbleContents.set(bubbleId, bubbleContents.get(bubbleId)! + parsed.content)
                
                // 找到对应的消息
                const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
                if (messageIndex !== -1) {
                  const content = bubbleContents.get(bubbleId)!
                  aiMessages.value[messageIndex].name = parsed.name
                  
                  // 处理update_title工具（增加确认：Undo / Keep）
                  if (parsed.name === 'update_title') {
                    try {
                      const toolData = JSON.parse(content)
                      const newTitle = toolData.new_title
                      if (typeof newTitle === 'string' && newTitle.trim().length > 0) {
                        prevTitle.value = formData.value.articleTitle
                        proposedTitle.value = newTitle
                        showTitleConfirm.value = true
                      } else {
                        console.warn('update_title 返回的新标题无效:', toolData)
                      }
                    } catch (e) {
                      console.warn('解析 update_title 工具数据失败:', e, '原始内容:', content)
                    }
                  }
            // 处理update_category工具（存在性校验 + 确认）
            if (parsed.name === 'update_category') {
              try {
                const toolData = JSON.parse(content)
                const newCategory = toolData.new_category
                if (typeof newCategory === 'string' && newCategory.trim().length > 0) {
                  const exists = categoryList.value.some((c: any) => c.categoryName === newCategory)
                  if (!exists) {
                    ElMessage.error('分类不存在：' + newCategory)
                  } else {
                    prevCategoryId.value = formData.value.categoryId as number | undefined
                    proposedCategory.value = newCategory
                    showCategoryConfirm.value = true
                  }
                } else {
                  console.warn('update_category 返回的新分类无效:', toolData)
                }
              } catch (e) {
                console.warn('解析 update_category 工具数据失败:', e, '原始内容:', content)
              }
            }
            // 处理update_tags工具（存在性校验 + 确认）
            if (parsed.name === 'update_tags') {
              try {
                const toolData = JSON.parse(content)
                const newTags = toolData.new_tags
                if (Array.isArray(newTags)) {
                  const names = newTags.filter((n: any) => typeof n === 'string' && n.trim().length > 0)
                  const existingNames = new Set(tagList.value.map((t: any) => t.tagName))
                  const missing = names.filter((n: string) => !existingNames.has(n))
                  if (missing.length > 0) {
                    ElMessage.error('以下标签不存在：' + missing.join(', '))
                  } else {
                    prevTagIds.value = Array.isArray(formData.value.tagId) ? (formData.value.tagId as number[]) : []
                    proposedTags.value = names
                    showTagsConfirm.value = true
                  }
                } else {
                  console.warn('update_tags 返回的新标签无效:', toolData)
                }
              } catch (e) {
                console.warn('解析 update_tags 工具数据失败:', e, '原始内容:', content)
              }
            }
                  
                  if (parsed.name === 'update_content_by_line_number'){
                    try {
                      // 解析工具返回的JSON内容
                      const toolData = JSON.parse(content)
                      const { line_number, new_content } = toolData
                      
                      // 支持字符串和数字格式的行号
                      const parsedLineNumber = typeof line_number === 'string' 
                        ? parseInt(line_number, 10) 
                        : line_number
                      
                      if (typeof parsedLineNumber === 'number' && !isNaN(parsedLineNumber) && new_content !== undefined) {
                        // 将文章内容按行分割
                        let lines = []
                        if (!diffContent.value){
                          lines = (formData.value.articleContent || '').split('\n')
                        } else {
                          lines = diffContent.value.split('\n')
                        }
                        
                        // 将1-based行号转换为0-based索引
                        const arrayIndex = parsedLineNumber - 1
                        
                        // 更新指定行的内容
                        if (arrayIndex >= 0 && arrayIndex < lines.length) {
                          lines[arrayIndex] = new_content
                          
                          // 重新组合文章内容
                          // formData.value.articleContent = lines.join('\n')
                          prevContent.value = formData.value.articleContent || ''
                          diffContent.value = lines.join('\n')
                          showDiff.value = false
                          nextTick(() => {
                            showDiff.value = true
                          })
                          
                  
                          console.log(`已更新第${parsedLineNumber}行内容为: ${new_content}`)
                        } else {
                          console.warn(`行号 ${parsedLineNumber} 超出范围，文章共有 ${lines.length} 行`)
                        }
                      } else {
                        console.warn('工具返回的数据格式不正确:', toolData)
                      }
                    } catch (error) {
                      console.error('解析工具返回数据失败:', error, '原始内容:', content)
                    }
                  }

                  if (parsed.name === 'update_content_by_block'){
                    try {
                      const toolData = JSON.parse(content)
                      const { start_line, end_line, new_content } = toolData

                      const start = typeof start_line === 'string' ? parseInt(start_line, 10) : start_line
                      const end = typeof end_line === 'string' ? parseInt(end_line, 10) : end_line

                      if (
                        typeof start === 'number' && !isNaN(start) &&
                        typeof end === 'number' && !isNaN(end) &&
                        start >= 1 && end >= start
                      ) {
                        let lines = []
                        if (!diffContent.value){
                          lines = (formData.value.articleContent || '').split('\n')
                        } else {
                          lines = diffContent.value.split('\n')
                        }
                        const startIdx = start - 1
                        const endIdx = end - 1

                        const newLines = Array.isArray(new_content)
                          ? new_content
                          : (new_content ?? '').toString().split('\n')

                        const updated = [
                          ...lines.slice(0, startIdx),
                          ...newLines,
                          ...lines.slice(endIdx + 1)
                        ]

                        prevContent.value = formData.value.articleContent || ''
                        diffContent.value = updated.join('\n')
                        // 强制重新初始化差异统计
                        showDiff.value = false
                        nextTick(() => {
                          showDiff.value = true
                        })
                      } else {
                        console.warn('update_content_by_block 参数无效:', toolData)
                      }
                    } catch (error) {
                      console.error('解析工具返回数据失败:', error, '原始内容:', content)
                    }
                  }

                  if (parsed.name === 'update_content_batch'){
                    try {
                      const toolData = JSON.parse(content)
                      const { updates } = toolData

                      if (Array.isArray(updates) && updates.length > 0) {
                        let lines = []
                        if (!diffContent.value){
                          lines = (formData.value.articleContent || '').split('\n')
                        } else {
                          lines = diffContent.value.split('\n')
                        }

                        // 按起始行号从大到小排序，这样从后往前更新，避免行号变化的问题
                        const sortedUpdates = [...updates].sort((a: any, b: any) => {
                          const startA = typeof a.start_line === 'string' ? parseInt(a.start_line, 10) : a.start_line
                          const startB = typeof b.start_line === 'string' ? parseInt(b.start_line, 10) : b.start_line
                          return startB - startA // 降序排列
                        })

                        // 依次执行更新，从后往前更新
                        for (const update of sortedUpdates as any[]) {
                          const start = typeof update.start_line === 'string' ? parseInt(update.start_line, 10) : update.start_line
                          const end = typeof update.end_line === 'string' ? parseInt(update.end_line, 10) : update.end_line

                          if (
                            typeof start === 'number' && !isNaN(start) &&
                            typeof end === 'number' && !isNaN(end) &&
                            start >= 1 && end >= start
                          ) {
                            const startIdx = start - 1
                            const endIdx = end - 1

                            const newLines = Array.isArray(update.new_content)
                              ? update.new_content
                              : (update.new_content ?? '').toString().split('\n')

                            lines = [
                              ...lines.slice(0, startIdx),
                              ...newLines,
                              ...lines.slice(endIdx + 1)
                            ]
                          } else {
                            console.warn('update_content_batch 中某个更新项参数无效:', update)
                          }
                        }

                         prevContent.value = formData.value.articleContent || ''
                         diffContent.value = lines.join('\n')
                         // 强制重新初始化差异统计
                         showDiff.value = false
                         nextTick(() => {
                           showDiff.value = true
                         })
                         console.log(`批量更新完成，共处理 ${updates.length} 个更新项`)
                      } else {
                        console.warn('update_content_batch 参数无效或为空:', toolData)
                      }
                    } catch (error) {
                      console.error('解析 update_content_batch 工具返回数据失败:', error, '原始内容:', content)
                    }
                  }
                }
              }
            } else if (parsed.type === 'tool_end') {
              // 工具结束，延迟1.5秒后显示完成状态
              const bubbleId = parsed.bubble_id
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                // 延迟1.5秒后更新为完成状态
                setTimeout(() => {
                  aiMessages.value[messageIndex].messageType = 'tool_complete'
                  // 解析工具返回的汇总信息 summary（如果有）
                  const content = bubbleContents.get(bubbleId)
                  if (content) {
                    try {
                      const toolData = JSON.parse(content)
                      if (toolData && typeof toolData.summary === 'string' && toolData.summary.trim()) {
                        aiMessages.value[messageIndex].summary = toolData.summary
                      }
                    } catch (err) {
                      // 忽略无法解析的情况
                    }
                  }
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
              
              // 找到对应的消息并更新
              const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
              if (messageIndex !== -1) {
                aiMessages.value[messageIndex].content = bubbleContents.get(bubbleId)!
              }
            } else if (parsed.content && !parsed.type) {
              // 兼容旧格式，直接添加到最后一个助手消息
              const lastAssistantIndex = aiMessages.value.length - 1
              if (lastAssistantIndex >= 0 && aiMessages.value[lastAssistantIndex].role === 'assistant') {
                aiMessages.value[lastAssistantIndex].content += parsed.content
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

const buildArticleInfo = () => {

  const articleInfo = `
当前文章信息：
标题：${formData.value.articleTitle || '未设置'}
分类：${categoryList.value.find((c: any) => c.id === formData.value.categoryId)?.categoryName || '未选择'}
标签：${tagList.value.filter((t: any) => Array.isArray(formData.value.tagId) && (formData.value.tagId as number[]).includes(t.id)).map((t: any) => t.tagName).join(', ') || '未选择'}
类型：${formData.value.articleType === 1 ? '原创' : formData.value.articleType === 2 ? '转载' : '翻译'}
状态：${formData.value.status === 1 ? '公开' : formData.value.status === 2 ? '私密' : '草稿'}
`
  return articleInfo
}


// 为文本内容添加行号
const addLineNumbers = (content: string) => {
  if (!content) return '暂无内容'
  
  const lines = content.split('\n')
  return lines.map((line, index) => {
    const lineNumber = (index + 1).toString().padStart(3, ' ')
    return `${lineNumber} | ${line}`
  }).join('\n')
}

// 处理AI键盘事件
const handleAiKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleAiSendMessage()
  }
}

// 发送AI消息处理
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

// 自动调整AI输入框高度
const autoResizeAiInput = () => {
  if (aiMessageInput.value) {
    aiMessageInput.value.style.height = 'auto'
    aiMessageInput.value.style.height = Math.min(aiMessageInput.value.scrollHeight, 120) + 'px'
  }
}

// 滚动AI聊天到底部
const scrollAiChatToBottom = () => {
  if (aiChatMessages.value) {
    aiChatMessages.value.scrollTop = aiChatMessages.value.scrollHeight
  }
}

// 格式化AI消息内容
const formatAiMessage = (content: string) => {
  if (!content) return ''
  
  // 简单的markdown格式化
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
  
  return formatted
}

// 获取消息类型样式类
const getMessageTypeClass = (messageType?: string) => {
  switch (messageType) {
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

// 清空AI对话
const clearChat = () => {
  aiMessages.value = []
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

// 点击外部关闭下拉框
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.mode-selector')) {
    showModeDropdown.value = false
  }
}

// Diff测试相关方法
// 模拟的新文本内容
const testTexts = [
  `# 我的博客文章 - Vue.js 深度解析

## 简介
这是一篇关于Vue.js开发的深度文章，包含最新的Vue 3特性。

## 主要内容
Vue.js是一个渐进式的JavaScript框架，用于构建现代化的用户界面。

### 核心特性
- 响应式数据绑定系统
- 组件化开发模式
- 虚拟DOM优化
- Composition API（新增）
- TypeScript支持

## 代码示例
\`\`\`javascript
import { createApp, ref } from 'vue'

const app = createApp({
  setup() {
    const message = ref('Hello Vue 3!')
    const count = ref(0)
    
    return {
      message,
      count
    }
  }
})
\`\`\`

## 最佳实践
1. 使用Composition API提高代码复用性
2. 合理使用响应式系统
3. 组件设计要遵循单一职责原则

## 总结
Vue.js 3.0让前端开发变得更加简单、高效和现代化。`,

  `# 我的技术博客 - Vue.js 实战指南

## 前言
本文将深入探讨Vue.js在实际项目中的应用。

## Vue.js 核心概念
Vue.js是目前最流行的JavaScript框架之一，以其简洁的API和强大的功能著称。

### 主要优势
- 学习曲线平缓
- 响应式数据绑定
- 组件化架构
- 丰富的生态系统
- 优秀的性能表现

## 实战代码
\`\`\`javascript
// 使用Composition API
import { createApp, ref, computed } from 'vue'

const app = createApp({
  setup() {
    const message = ref('Hello World!')
    const count = ref(0)
    
    const doubleCount = computed(() => count.value * 2)
    
    const increment = () => {
      count.value++
    }
    
    return {
      message,
      count,
      doubleCount,
      increment
    }
  }
})

app.mount('#app')
\`\`\`

## 项目结构建议
- components/ - 组件目录
- views/ - 页面目录
- stores/ - 状态管理
- utils/ - 工具函数

## 结语
掌握Vue.js将大大提升你的前端开发效率和代码质量。`
]

let currentTestTextIndex = 0

// 生成测试diff内容
const generateTestDiff = () => {
  const newText = testTexts[currentTestTextIndex % testTexts.length]
  // 保存当前内容以便撤销
  prevContent.value = formData.value.articleContent || ''
  diffContent.value = newText
  showDiff.value = true
  currentTestTextIndex++
  
  ElMessage.success('已生成测试diff内容')
}

// 测试批量更新功能
const testBatchUpdate = () => {
  const currentContent = formData.value.articleContent || ''
  if (!currentContent.trim()) {
    ElMessage.warning('请先输入一些文章内容')
    return
  }
  
  const lines = currentContent.split('\n')
  if (lines.length < 3) {
    ElMessage.warning('文章内容太少，无法进行批量更新测试')
    return
  }
  
  // 模拟批量更新：修改第2行和第4行
  const updates = [
    {
      start_line: "2",
      end_line: "2", 
      new_content: "这是修改后的第二行内容（批量更新测试）"
    },
    {
      start_line: "4",
      end_line: "4",
      new_content: "这是修改后的第四行内容（批量更新测试）"
    }
  ]
  
  // 模拟工具返回的数据
  const toolData = {
    updates: updates,
    summary: "批量更新测试"
  }
  
  // 执行批量更新逻辑
  try {
    let updatedLines = [...lines]
    
    // 按起始行号从大到小排序
    const sortedUpdates = [...updates].sort((a: any, b: any) => {
      const startA = parseInt(a.start_line, 10)
      const startB = parseInt(b.start_line, 10)
      return startB - startA
    })
    
    // 从后往前更新
    for (const update of sortedUpdates as any[]) {
      const start = parseInt(update.start_line, 10)
      const end = parseInt(update.end_line, 10)
      
      if (start >= 1 && end >= start && start <= updatedLines.length) {
        const startIdx = start - 1
        const endIdx = end - 1
        
        const newLines = update.new_content.split('\n')
        
        updatedLines = [
          ...updatedLines.slice(0, startIdx),
          ...newLines,
          ...updatedLines.slice(endIdx + 1)
        ]
      }
    }
    
    prevContent.value = currentContent
    diffContent.value = updatedLines.join('\n')
    showDiff.value = true
    
    ElMessage.success(`批量更新测试完成，共处理 ${updates.length} 个更新项`)
  } catch (error) {
    console.error('批量更新测试失败:', error)
    ElMessage.error('批量更新测试失败')
  }
}

// 接受diff更改
const acceptDiffChanges = () => {
  if (diffContent.value) {
    formData.value.articleContent = diffContent.value
  }
  showDiff.value = false
  diffContent.value = ''
  ElMessage.success('已接受内容更改')
}

// 撤销diff更改
const undoDiffChanges = () => {
  if (prevContent.value !== undefined) {
    formData.value.articleContent = prevContent.value
  }
  showDiff.value = false
  diffContent.value = ''
  ElMessage.info('已撤销内容更改')
}

// 分割器拖拽逻辑
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
  
  const container = document.querySelector('.publish-container') as HTMLElement
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  const mouseX = e.clientX - containerRect.left
  const containerWidth = containerRect.width
  
  // 计算新的左侧面板宽度百分比
  let newLeftWidth = (mouseX / containerWidth) * 100
  
  // 限制最小和最大宽度
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

// 移除md-editor的编辑器实例获取函数
</script>

<template>
  <div class="publish-container">
    <!-- 侧边栏（Agent 会话列表） -->
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
        <br></br>
        <div class="header-content">
          <h3 v-if="!sidebarCollapsed || sidebarHovered"></h3>
          <button class="collapse-btn" @click="toggleSidebar">
            <el-icon>
              <ArrowRight v-if="sidebarCollapsed" />
              <ArrowLeft v-else />
            </el-icon>
          </button>
        </div>
        <button class="new-chat-btn" @click="createNewSession" v-if="!sidebarCollapsed || sidebarHovered">
          <el-icon><Edit /></el-icon> 新建草稿
        </button>
      </div>

      <div class="session-list" v-if="!sidebarCollapsed || sidebarHovered">
        <div v-if="sessionsLoading" class="empty-sessions"><el-icon class="is-loading"><Loading /></el-icon>加载中...</div>
        <div v-else-if="!agentSessions || agentSessions.length === 0" class="empty-sessions">
          <el-icon style="font-size: 2.5rem; margin-bottom: 15px; display: block; color: #cccccc;">
            <ChatLineSquare />
          </el-icon>
          <p>暂无对话记录</p>
          <p>点击"新对话"开始聊天</p>
        </div>
        <div 
          v-for="session in agentSessions" 
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === currentSessionId }"
          @click="selectAgentSession(session.id)"
        >
          <div class="session-content">
            <div class="session-name">{{ session.name || '新建草稿' }}</div>
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
              <el-icon><Delete /></el-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="main-panels">
      <!-- 左侧文章编辑区域 -->
      <div class="article-editor-section" :style="{ width: leftPanelWidth + '%' }">
      <div class="publish-header">
        <h2>发布文章</h2>
        <div class="header-actions">
          <div class="save-status">
            <template v-if="isSaving">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在保存...</span>
            </template>
            <template v-else-if="autoSaveError">
              <span class="error">保存失败</span>
            </template>
            <template v-else-if="lastSavedAt">
              <span>已保存 {{ lastSavedText }}</span>
            </template>
          </div>
          <el-button @click="generateTestDiff" type="success">测试Diff</el-button>
          <el-button @click="testBatchUpdate" type="warning">测试批量更新</el-button>
          <el-button @click="() => {
            // 便捷测试：模拟 update_title 提案
            prevTitle = formData.articleTitle
            proposedTitle = (formData.articleTitle || '示例标题') + '（AI建议）'
            showTitleConfirm = true
          }">测试标题</el-button>
          <el-button @click="close">关闭</el-button>
          <el-button type="primary" @click="onFinish">发布</el-button>
        </div>
      </div>
      
      <div class="publish-form">
        <el-form :model="formData" label-width="80px">
          <!-- 第一行：标题、分类、标签 -->
          <div class="form-row">
            <el-form-item label="标题">
              <el-input 
                v-model="formData.articleTitle" 
                placeholder="输入文章标题" 
                style="width: 250px"
              />
              <template v-if="showTitleConfirm">
                <div style="display: inline-flex; gap: 8px; align-items: center; margin-left: 10px;">
                  <el-tag type="info" effect="light">{{ proposedTitle }}</el-tag>
                  <div style="display: inline-flex; gap: 0px; align-items: center;">
                    <el-button size="small" @click="undoTitleChange">Undo</el-button>
                    <el-button size="small" type="success" @click="acceptTitleChange">Keep</el-button>
                  </div>
                </div>
              </template>
            </el-form-item>
            
            <el-form-item label="分类">
              <el-select 
                v-model="formData.categoryId" 
                placeholder="选择分类" 
                style="width: 150px"
                :loading="categoryLoading"
              >
                <el-option
                  v-for="item in categoryList"
                  :key="item.id"
                  :label="item.categoryName"
                  :value="item.id"
                />
              </el-select>
              <template v-if="showCategoryConfirm">
                <div style="display: inline-flex; gap: 8px; align-items: center; margin-left: 10px;">
                  <el-tag type="info" effect="light">{{ proposedCategory }}</el-tag>
                  <div style="display: inline-flex; gap: 0px; align-items: center;">
                    <el-button size="small" @click="undoCategoryChange">Undo</el-button>
                    <el-button size="small" type="success" @click="acceptCategoryChange">Keep</el-button>
                  </div>
                </div>
              </template>
              <el-input 
                v-model="categoryName" 
                placeholder="添加新分类" 
                style="width: 120px; margin-left: 8px"
              />
              <el-button @click="addCategoryFunc" style="margin-left: 8px" size="small">添加</el-button>
            </el-form-item>
            
            <el-form-item label="标签">
              <el-select 
                v-model="formData.tagId" 
                placeholder="选择标签" 
                style="width: 150px"
                multiple
                :loading="tagLoading"
              >
                <el-option
                  v-for="item in tagList"
                  :key="item.id"
                  :label="item.tagName"
                  :value="item.id"
                />
              </el-select>
              <template v-if="showTagsConfirm">
                <div style="display: inline-flex; gap: 8px; align-items: center; margin-left: 10px;">
                  <el-tag v-for="n in (proposedTags || [])" :key="n" type="info" effect="light">{{ n }}</el-tag>
                  <div style="display: inline-flex; gap: 0px; align-items: center;">
                    <el-button size="small" @click="undoTagsChange">Undo</el-button>
                    <el-button size="small" type="success" @click="acceptTagsChange">Keep</el-button>
                  </div>
                </div>
              </template>
              <el-input 
                v-model="tagName" 
                placeholder="添加新标签" 
                style="width: 120px; margin-left: 8px"
              />
              <el-button @click="addTagFunc" style="margin-left: 8px" size="small">添加</el-button>
            </el-form-item>
          </div>
          
          <!-- 第二行：类型、状态、置顶、封面 -->
          <div class="form-row">
            <el-form-item label="类型">
              <el-select v-model="formData.articleType" style="width: 100px">
                <el-option label="原创" :value="1" />
                <el-option label="转载" :value="2" />
                <el-option label="翻译" :value="3" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select v-model="formData.status" style="width: 100px">
                <el-option label="公开" :value="1" />
                <el-option label="私密" :value="2" />
                <el-option label="草稿" :value="3" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="置顶">
              <el-select v-model="formData.isTop" style="width: 100px">
                <el-option label="是" :value="1" />
                <el-option label="否" :value="0" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="封面">
              <el-upload
                :file-list="fileList"
                :before-upload="beforeUpload"
                :show-file-list="false"
                accept="image/*"
              >
                <el-button type="primary">
                  上传封面
                </el-button>
              </el-upload>
              <div v-if="previewBase64 || formData.articleCover" class="cover-preview">
                <el-image
                  :src="previewBase64 || formData.articleCover"
                  style="width: 80px; height: 48px; border-radius: 4px"
                  fit="cover"
                />
              </div>
            </el-form-item>
          </div>
        </el-form>
      </div>
      
      <div class="editor-container">
        <!-- 自定义编辑器 -->
        <CustomMarkdownEditor
          v-model="formData.articleContent"
          :height="'60vh'"
          :theme="mode === 'auto' ? 'light' : mode"
          :showDiff="showDiff"
          :diffContent="diffContent"
          :key="showDiff ? 'diff' : 'edit'"
          @update:diffContent="diffContent = $event"
          @update:changeBlocks="(current, total) => { changeBlocks = current; totalChangeBlocks = total }"
        />
      
        <div v-if="showDiff" class="custom-editor-overlay">
          <div class="change-info" v-if="changeBlocks > 0">
            <span class="change-count">{{ changeBlocks }}/{{ totalChangeBlocks }}</span>
            <span class="change-text">个修改</span>
          </div>
          <el-button size="small" type="default" class="undo-btn" @click="undoDiffChanges" title="Undo all (Ctrl+Shift+Z)">
            Undo all
          </el-button>
          <el-button size="small" type="success" class="keep-btn" @click="acceptDiffChanges" title="Keep all (Ctrl+Enter)">
            Keep all
            <span class="kbd">Ctrl+Enter</span>
          </el-button>
        </div>
      </div>
      </div>

      <!-- 分割器 -->
      <div 
        ref="splitterRef"
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
            <div class="mode-selector">
              <div class="mode-dropdown" @click="toggleModeDropdown" :class="{ active: showModeDropdown }">
                <span class="mode-icon">{{ aiMode === 'agent' ? '∞' : '💬' }}</span>
                <span class="mode-text">{{ aiMode === 'agent' ? 'Agent' : 'Ask' }}</span>
                <i class="fas fa-chevron-down mode-arrow"></i>
              </div>
              <div class="mode-options" v-show="showModeDropdown">
                <div class="mode-option" @click="selectMode('agent')" :class="{ active: aiMode === 'agent' }">
                  <span class="option-icon">∞</span>
                  <span class="option-text">Agent</span>
                </div>
                <div class="mode-option" @click="selectMode('ask')" :class="{ active: aiMode === 'ask' }">
                  <span class="option-icon">💬</span>
                  <span class="option-text">Ask</span>
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
            <p v-if="aiMode === 'agent'"><strong>Agent: </strong>Plan,write and publish articles with AI</p>
            <p v-else><strong>Ask: </strong>Ask AI about anything</p>
          </div>
        </div>
        
        <div 
          v-for="(message, index) in aiMessages" 
          :key="index"
          class="ai-message"
          :class="[`${message.role}-message`, getMessageTypeClass(message.messageType)]"
        >
          <!-- 工具消息使用欢迎消息样式 -->
          <div v-if="message.messageType === 'tool_start' || message.messageType === 'tool_complete'" class="welcome-message">
            <div class="feature-tip">
              <div v-if="message.messageType === 'tool_start'" class="tool-status">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>正在处理...</span>
              </div>
              <div v-else-if="message.messageType === 'tool_complete'" class="tool-status">
                <el-icon class="check-icon"><Check /></el-icon>
                <span>处理完成：</span>
                <span v-if="message.summary">{{ message.summary }}</span>
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
          <textarea 
            ref="aiMessageInput"
            v-model="aiInputMessage"
            class="ai-message-input"
            placeholder="询问任何问题..." 
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
            AI正在回答...
          </span>
        </div>
      </div>
      </div>
    </div>

    <!-- 删除会话确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="确认删除"
      width="400px"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="delete-session-dialog"
    >
      <div class="delete-dialog-content">
        <div class="warning-text">
          <p class="session-name">{{ deleteSessionName }}</p>
          <p class="warning-message">此操作不可撤销，会话中的所有消息都将被永久删除。</p>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelDeleteSession" size="large">
            取消
          </el-button>
          <el-button type="danger" @click="confirmDeleteSession" size="large">
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.publish-container {
  display: flex;
  height: calc(100vh);
  margin-top: 45px; /* 为固定头部菜单栏留出空间 */
  background: #F0F8FF;
  padding: 0; /* 移除padding，让侧边栏贴着左侧 */
  max-width: 100%;
  overflow: hidden;
  gap: 0; /* 移除gap，使用分割器 */
}

.main-panels {
  display: flex;
  flex: 1;
  min-width: 0;
  padding: 10px 10px 10px 10px; /* 给主面板区域添加内边距 */
}

/* 侧边栏样式（复用 AiChat 风格，颜色统一） */
.chat-sidebar {
  width: 260px;
  background: #f0f4fa;
  color: #333333;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  z-index: 100; /* 提高z-index确保在最上层 */
  pointer-events: auto;
  height: 100%;
  margin-right: 10px;
  border-radius: 0 8px 8px 0; /* 只保留右侧圆角 */
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1); /* 添加阴影增强层次感 */

  &.sidebar-collapsed {
    width: 60px;

    &.sidebar-hovered {
      width: 260px;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.15);
      z-index: 200; /* 悬停时进一步提高z-index */
      position: relative;
      overflow: visible;
    }
  }
}

.sidebar-header {
  padding: 16px 20px;
  background: #f0f4fa;
  border-top-right-radius: 8px;

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

.collapse-btn {
  background: none;
  border: none;
  color: #666666;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s ease;
  &:hover { background: #e8e8e8; }
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
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
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
  user-select: none; /* 防止文本选择 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  pointer-events: auto; /* 确保可以接收点击事件 */
  z-index: 1; /* 确保在正确的层级 */
  
  &:hover { 
    background: #e8f0fe; 
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &.active { 
    background: #e3f2fd; 
    border-left: 3px solid #2196f3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
  }
  
  /* 确保点击区域足够大 */
  &:active {
    transform: translateX(1px) scale(0.98);
  }
}

.session-content { flex: 1; min-width: 0; }
.session-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  color: #333333;
}
.session-meta { font-size: 0.75rem; color: #666666; }
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
  &:hover { background: #fef2f2; color: #dc2626; transform: scale(1.1); }
  &:active { transform: scale(0.95); }
}
.empty-sessions { text-align: center; padding: 40px 20px; color: #666666; }

// 左侧文章编辑区域
.article-editor-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.1s ease; /* 平滑的宽度变化 */
}

.publish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px 20px 15px 20px;
  
  h2 {
    margin: 0;
    color: #303133;
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;

    .save-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #606266;
      font-size: 12px;
      margin-right: 8px;

      .error {
        color: #e74c3c;
      }
    }
  }
}

.publish-form {
  margin-bottom: 20px;
  padding: 0 20px;
  
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    
    .el-form-item {
      margin-bottom: 15px;
    }
  }
}

.cover-preview {
  margin-left: 10px;
  display: inline-block;
}

.editor-container {
  flex: 1;
  margin: 0 20px 20px 20px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

// 悬浮确认按钮样式
.custom-editor-overlay {
  position: absolute;
  left: 25%;
  bottom: 50px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 1000;
  align-items: center;
  /* 灰色半透明背景区域，包裹两个按钮 */
  background: rgba(0, 0, 0, 0.164);
  padding: 8px;
  border-radius: 8px;
}

.custom-editor-overlay .undo-btn {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
}
.custom-editor-overlay .undo-btn .kbd {
  background: rgba(0,0,0,0.06);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  margin-left: 6px;
}

.custom-editor-overlay .keep-btn {
  background: #2ea043;
  border-color: #2ea043;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}
.custom-editor-overlay .keep-btn .kbd {
  background: rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  margin-left: 6px;
}

.change-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  padding: 4px 8px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  font-size: 12px;
  
  .change-count {
    background: #10b981;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
  }
  
  .change-text {
    color: #10b981;
    font-weight: 500;
  }
}

// 分割器样式
.splitter {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  margin: 0 0px;
  
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
  position: relative;
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
  transition: width 0.1s ease; /* 平滑的宽度变化 */
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  
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

// 自定义模式选择器样式
.mode-selector {
  position: relative;
  margin-left: 0px;
}

.mode-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.active {
    background: #f0f8ff;
  }
}

.mode-icon {
  font-size: 1.1rem;
  font-weight: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
}

.mode-text {
  font-size: 1.2rem;
  font-weight: 500;
  color: #303133;
}

.mode-arrow {
  font-size: 0.8rem;
  color: #666;
  transition: transform 0.2s ease;
}

.mode-dropdown.active .mode-arrow {
  transform: rotate(180deg);
}

.mode-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 2px;
  overflow: hidden;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  color: #303133;
  
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
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
}

.option-text {
  font-weight: 500;
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
  
  ul {
    text-align: left;
    margin: 15px 0;
    padding-left: 20px;
    
    li {
      margin: 8px 0;
      font-size: 0.9rem;
    }
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
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-message .ai-message-content {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e5e5e5;
  border-radius: 18px;
}

/* 工具消息样式 */
.tool-start-message,
.tool-complete-message {
  justify-content: center;
  width: 100%;
}

.tool-start-message .welcome-message,
.tool-complete-message .welcome-message {
  width: 100%;
  border-radius: 10px;
  margin: 0;
}

/* 工具状态样式 */
.tool-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: #666666;
}

.tool-status .el-icon {
  font-size: 18px;
}

.tool-start-message .tool-status {
  color: #1976d2;
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
}

.ai-message-input {
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
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
  top: 45%;
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

// 删除会话对话框样式
:deep(.delete-session-dialog) {
  .el-dialog__header {
    padding: 20px 20px 10px 20px;
    border-bottom: 1px solid #f0f0f0;
    
    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .el-dialog__body {
    padding: 30px 20px 20px 20px;
  }
  
  .el-dialog__footer {
    padding: 15px 20px 20px 20px;
    border-top: 1px solid #f0f0f0;
  }
}

.delete-dialog-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  
  .warning-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    background: #fef2f2;
    border-radius: 50%;
  }
  
  .warning-text {
    flex: 1;
    
    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      line-height: 1.4;
    }
    
    .session-name {
      margin: 0 0 16px 0;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #606266;
      border-left: 3px solid #409eff;
    }
    
    .warning-message {
      margin: 0;
      font-size: 14px;
      color: #909399;
      line-height: 1.5;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  .el-button {
    min-width: 80px;
    font-weight: 500;
  }
}

@media (max-width: 768px) {
  .publish-container {
    flex-direction: column;
    padding: 15px;
    margin-top: 45px; /* 移动端与桌面端保持一致 */
    height: calc(100vh - 45px);
    gap: 15px; /* 移动端恢复gap */
  }
  
  .article-editor-section {
    width: 100% !important; /* 移动端强制全宽 */
    flex: 1;
    min-height: 0;
  }
  
  .ai-assistant-section {
    width: 100% !important; /* 移动端强制全宽 */
    flex: 1;
    min-width: auto;
    min-height: 300px;
  }
  
  .splitter {
    display: none; /* 移动端隐藏分割器 */
  }
  
  .publish-form .form-row {
    flex-direction: column;
    gap: 10px;
  }
  
  // 移动端对话框样式调整
  :deep(.delete-session-dialog) {
    width: 90% !important;
    
    .el-dialog__body {
      padding: 20px 15px 15px 15px;
    }
  }
  
  .delete-dialog-content {
    flex-direction: column;
    text-align: center;
    gap: 15px;
    
    .warning-icon {
      align-self: center;
    }
  }
}
</style>
