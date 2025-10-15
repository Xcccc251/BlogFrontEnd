<script setup lang="ts">
import 'md-editor-v3/lib/style.css'
import { MdEditor } from 'md-editor-v3'
import { ElMessage } from 'element-plus'
import { useColorMode } from '@vueuse/core'
import { 
  addCategory, 
  addTag, 
  articleCategory, 
  articleTag, 
  deleteCover, 
  getArticle, 
  publishArticle, 
  uploadArticleImage, 
  uploadCover 
} from '@/apis/article'
import { chatAPI } from '@/apis/aiChat'
import type { CategoryType, TagType } from './type'

const route = useRoute()
const router = useRouter()

// 日夜切换
const mode = useColorMode()

// 表单数据
const formData = ref({
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

// 编辑器工具栏配置
const toolbars = [
  'bold',
  'underline',
  'italic',
  '-',
  'title',
  'strikeThrough',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  '-',
  'revoke',
  'next',
  'save',
  '=',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'htmlPreview',
  'catalog',
] as any

onMounted(async () => {
  getFormData()
  await getCategory()
  await getTag()
})

// 监听AI消息变化，自动滚动到底部
watch(() => aiMessages.value, () => {
  nextTick(() => {
    scrollAiChatToBottom()
  })
}, { deep: true })

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
    articleContent: undefined,
    articleType: 1,
    isTop: 0,
    status: 1,
  }
  fileList.value = []
  previewBase64.value = ''
}

// 上传文章图片
async function onUploadArticleImg(files: any, callback: any) {
  try {
    const res = await Promise.all(
      files.map((file: any) => {
        return new Promise((resolve, reject) => {
          const form = new FormData()
          form.append('articleImage', file)
          uploadArticleImage(form).then((res: any) => {
            if (res.code === 200) {
              resolve(res.data)
            } else {
              reject(new Error('上传失败'))
            }
          }).catch((error: any) => reject(error))
        })
      }),
    )
    callback(res)
  } catch (error) {
    ElMessage.error('图片上传失败')
    callback([])
  }
}

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
// 发送AI消息
const sendAiMessage = async (message: string) => {
  if (!message.trim()) return
  
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
  const contextMessage = buildContextMessage(message)
  
  const response = await chatAPI.sendMessage(contextMessage, null)
  
  if (!response.ok) {
    throw new Error('HTTP ' + response.status)
  }
  
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  // 创建AI回复消息
  aiMessages.value.push({
    role: 'assistant',
    content: ''
  })
  
  const aiMessageIndex = aiMessages.value.length - 1
  
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
            
            // 处理内容消息
            if (parsed.type === 'content' && parsed.content) {
              aiMessages.value[aiMessageIndex].content += parsed.content
            } else if (parsed.content && !parsed.type) {
              // 兼容旧格式
              aiMessages.value[aiMessageIndex].content += parsed.content
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

// 构建包含文章上下文的提示消息
const buildContextMessage = (userMessage: string) => {
  const articleContext = `
当前文章信息：
标题：${formData.value.articleTitle || '未设置'}
分类：${categoryList.value.find((c: any) => c.id === formData.value.categoryId)?.categoryName || '未选择'}
标签：${tagList.value.filter((t: any) => Array.isArray(formData.value.tagId) && formData.value.tagId.includes(t.id)).map((t: any) => t.tagName).join(', ') || '未选择'}
类型：${formData.value.articleType === 1 ? '原创' : formData.value.articleType === 2 ? '转载' : '翻译'}
状态：${formData.value.status === 1 ? '公开' : formData.value.status === 2 ? '私密' : '草稿'}

文章内容：
${formData.value.articleContent || '暂无内容'}

用户问题：${userMessage}

请根据以上文章信息回答用户的问题，并提供有用的写作建议。
`
  return articleContext
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

// 清空AI对话
const clearChat = () => {
  aiMessages.value = []
}
</script>

<template>
  <div class="publish-container">
    <!-- 左侧文章编辑区域 -->
    <div class="article-editor-section">
      <div class="publish-header">
        <h2>发布文章</h2>
        <div class="header-actions">
          <el-button @click="close">关闭</el-button>
          <el-button type="primary" @click="onFinish">发布</el-button>
        </div>
      </div>
      
      <div class="publish-form">
        <el-form :model="formData" label-width="80px" class="form-row">
          <el-form-item label="标题">
            <el-input 
              v-model="formData.articleTitle" 
              placeholder="输入文章标题" 
              style="width: 300px"
            />
          </el-form-item>
          
          <el-form-item label="分类">
            <el-select 
              v-model="formData.categoryId" 
              placeholder="选择分类" 
              style="width: 200px"
              :loading="categoryLoading"
            >
              <el-option
                v-for="item in categoryList"
                :key="item.id"
                :label="item.categoryName"
                :value="item.id"
              />
            </el-select>
            <el-input 
              v-model="categoryName" 
              placeholder="添加新分类" 
              style="width: 150px; margin-left: 10px"
            />
            <el-button @click="addCategoryFunc" style="margin-left: 10px">添加</el-button>
          </el-form-item>
          
          <el-form-item label="标签">
            <el-select 
              v-model="formData.tagId" 
              placeholder="选择标签" 
              style="width: 200px"
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
            <el-input 
              v-model="tagName" 
              placeholder="添加新标签" 
              style="width: 150px; margin-left: 10px"
            />
            <el-button @click="addTagFunc" style="margin-left: 10px">添加</el-button>
          </el-form-item>
          
          <el-form-item label="类型">
            <el-select v-model="formData.articleType" style="width: 120px">
              <el-option label="原创" :value="1" />
              <el-option label="转载" :value="2" />
              <el-option label="翻译" :value="3" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="状态">
            <el-select v-model="formData.status" style="width: 120px">
              <el-option label="公开" :value="1" />
              <el-option label="私密" :value="2" />
              <el-option label="草稿" :value="3" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="置顶">
            <el-select v-model="formData.isTop" style="width: 120px">
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
                <el-icon><Picture /></el-icon>
                上传封面
              </el-button>
            </el-upload>
            <div v-if="previewBase64 || formData.articleCover" class="cover-preview">
              <el-image
                :src="previewBase64 || formData.articleCover"
                style="width: 100px; height: 60px; border-radius: 4px"
                fit="cover"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="editor-container">
          <MdEditor 
            v-model="formData.articleContent" 
            :theme="mode === 'auto' ? 'light' : mode" 
            style="height: 60vh" 
            :toolbars="toolbars" 
            @onUploadImg="onUploadArticleImg" 
          />
      </div>
    </div>

    <!-- 右侧AI助手区域 -->
    <div class="ai-assistant-section">
      <div class="ai-header">
        <h3>AI写作助手</h3>
        <div class="ai-actions">
          <el-button size="small" @click="clearChat">清空对话</el-button>
        </div>
      </div>

      <div class="ai-chat-messages" ref="aiChatMessages">
        <div v-if="aiMessages.length === 0" class="welcome-message">
          <h4>AI写作助手</h4>
          <p>我可以帮你：</p>
          <ul>
            <li>优化文章标题</li>
            <li>改进文章内容</li>
            <li>检查语法错误</li>
            <li>提供写作建议</li>
          </ul>
        </div>
        
        <div 
          v-for="(message, index) in aiMessages" 
          :key="index"
          class="ai-message"
          :class="`${message.role}-message`"
        >
          <div class="ai-message-content">
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
            placeholder="询问AI助手..." 
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
</template>

<style scoped lang="scss">
.publish-container {
  display: flex;
  height: calc(100vh - 60px);
  margin-top: 60px; /* 为固定头部菜单栏留出空间 */
  background: #F0F8FF;
  gap: 20px;
  padding: 20px;
  max-width: 100%;
  overflow: hidden;
}

// 左侧文章编辑区域
.article-editor-section {
  flex: 2;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

// 右侧AI助手区域
.ai-assistant-section {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 400px;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  
  h3 {
    margin: 0;
    color: #303133;
    font-size: 1.2rem;
  }
  
  .ai-actions {
    display: flex;
    gap: 10px;
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
  padding: 40px 20px;
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

@media (max-width: 768px) {
  .publish-container {
    flex-direction: column;
    padding: 15px;
    margin-top: 50px; /* 移动端稍微减少顶部间距 */
    height: calc(100vh - 50px);
  }
  
  .article-editor-section {
    flex: 1;
    min-height: 0;
  }
  
  .ai-assistant-section {
    flex: 1;
    min-width: auto;
    min-height: 300px;
  }
  
  .publish-form .form-row {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
