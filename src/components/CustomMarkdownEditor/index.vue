<template>
  <div class="custom-markdown-editor">
    <!-- 菜单栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" title="粗体" @click="insertBold">
          <i class="fas fa-bold"></i>
        </button>
        <button class="toolbar-btn" title="斜体" @click="insertItalic">
          <i class="fas fa-italic"></i>
        </button>
        <button class="toolbar-btn" title="下划线" @click="insertUnderline">
          <i class="fas fa-underline"></i>
        </button>
      </div>
      
      <div class="toolbar-separator"></div>
      
      <div class="toolbar-group">
        <div class="dropdown-container" @mouseenter="showHeadingMenu = true" @mouseleave="hideHeadingMenu">
          <button class="toolbar-btn" title="标题">
            <i class="fas fa-heading"></i>
          </button>
          <div v-show="showHeadingMenu" class="dropdown-menu">
            <div class="dropdown-item" @click="insertHeading(1)">H1 一级标题</div>
            <div class="dropdown-item" @click="insertHeading(2)">H2 二级标题</div>
            <div class="dropdown-item" @click="insertHeading(3)">H3 三级标题</div>
            <div class="dropdown-item" @click="insertHeading(4)">H4 四级标题</div>
            <div class="dropdown-item" @click="insertHeading(5)">H5 五级标题</div>
            <div class="dropdown-item" @click="insertHeading(6)">H6 六级标题</div>
          </div>
        </div>
        <button class="toolbar-btn" title="引用" @click="insertQuote">
          <i class="fas fa-quote-left"></i>
        </button>
        <button class="toolbar-btn" title="删除线" @click="insertStrikethrough">
          <i class="fas fa-strikethrough"></i>
        </button>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-group">
        <button class="toolbar-btn" title="代码" @click="insertInlineCode">
          <i class="fas fa-code"></i>
        </button>
        <button class="toolbar-btn" title="代码块" @click="insertCodeBlock">
          <i class="fas fa-terminal"></i>
        </button>
      </div>
      
      <div class="toolbar-separator"></div>
      
      <div class="toolbar-group">
        <div class="dropdown-container" @mouseenter="showLinkMenu = true" @mouseleave="hideLinkMenu">
          <button class="toolbar-btn" title="链接">
            <i class="fas fa-link"></i>
          </button>
          <div v-show="showLinkMenu" class="dropdown-menu link-menu">
            <div class="link-input-form">
              <div class="input-group">
                <label class="input-label">链接描述</label>
                <input 
                  v-model="linkText" 
                  type="text" 
                  placeholder="输入链接描述"
                  class="link-input"
                  @keyup.enter="insertLink"
                />
              </div>
              <div class="input-group">
                <label class="input-label">链接地址</label>
                <input 
                  v-model="linkUrl" 
                  type="url" 
                  placeholder="https://example.com"
                  class="link-input"
                  @keyup.enter="insertLink"
                />
              </div>
              <div class="link-actions">
                <button class="link-btn cancel-btn" @click="cancelLink">取消</button>
                <button class="link-btn insert-btn" @click="insertLink">插入链接</button>
              </div>
            </div>
          </div>
        </div>
        <div class="dropdown-container" @mouseenter="showImageMenu = true" @mouseleave="hideImageMenu">
          <button class="toolbar-btn" title="图片">
            <i class="fas fa-image"></i>
          </button>
          <div v-show="showImageMenu" class="dropdown-menu image-menu">
            <div class="image-input-form">
              <div class="input-group">
                <label class="input-label">图片描述</label>
                <input 
                  v-model="imageAlt" 
                  type="text" 
                  placeholder="输入图片描述"
                  class="image-input"
                  @keyup.enter="insertImageByUrl"
                />
              </div>
              <div class="input-group">
                <label class="input-label">图片地址</label>
                <input 
                  v-model="imageUrl" 
                  type="url" 
                  placeholder="https://example.com/image.jpg"
                  class="image-input"
                  @keyup.enter="insertImageByUrl"
                />
              </div>
              <div class="image-actions">
                <button class="image-btn cancel-btn" @click="cancelImage">取消</button>
                <button class="image-btn insert-btn" @click="insertImageByUrl">插入图片</button>
              </div>
              <div class="image-separator">
                <span>或</span>
              </div>
              <button class="image-btn upload-btn" @click="triggerImageUpload">
                <i class="fas fa-upload"></i>
                上传图片
              </button>
              <button class="image-btn crop-btn" @click="triggerImageCrop">
                <i class="fas fa-crop"></i>
                裁剪上传
              </button>
            </div>
          </div>
        </div>
        <div class="dropdown-container" @mouseenter="showVideoMenu = true" @mouseleave="hideVideoMenu">
          <button class="toolbar-btn" title="视频">
            <i class="fas fa-video"></i>
          </button>
          <div v-show="showVideoMenu" class="dropdown-menu video-menu">
            <div class="video-input-form">
              <div class="input-group">
                <label class="input-label">视频链接</label>
                <input 
                  v-model="videoUrl" 
                  type="url" 
                  placeholder="https://www.youtube.com/watch?v=..."
                  class="video-input"
                  @keyup.enter="insertVideo"
                />
              </div>
              <div class="video-platforms">
                <div class="platform-label">支持的平台：</div>
                <div class="platform-tags">
                  <span class="platform-tag youtube">YouTube</span>
                  <span class="platform-tag bilibili">哔哩哔哩</span>
                  <span class="platform-tag vimeo">Vimeo</span>
                  <span class="platform-tag direct">视频文件</span>
                </div>
              </div>
              <div class="video-actions">
                <button class="video-btn cancel-btn" @click="cancelVideo">取消</button>
                <button class="video-btn insert-btn" @click="insertVideo">插入视频</button>
              </div>
            </div>
          </div>
        </div>
        <input ref="imageFileInput" type="file" accept="image/*" style="display:none" @change="onImageFileChange" />
        <input ref="imageCropInput" type="file" accept="image/*" style="display:none" @change="onImageCropFileChange" />
      </div>
      
      <div class="toolbar-separator"></div>
      
      <div class="toolbar-group">
        <div class="dropdown-container" @mouseenter="showTableMenu = true" @mouseleave="hideTableMenu">
          <button class="toolbar-btn" title="表格">
            <i class="fas fa-table"></i>
          </button>
          <div v-show="showTableMenu" class="dropdown-menu table-menu">
            <div class="table-size-selector">
              <div class="size-label">选择表格大小</div>
              <div class="size-grid">
                <div 
                  v-for="row in 5" 
                  :key="'row-' + row"
                  class="size-row"
                >
                  <div 
                    v-for="col in 6" 
                    :key="'col-' + col"
                    class="size-cell"
                    :class="{ active: selectedRows === row && selectedCols === col }"
                    @click="selectTableSize(row, col)"
                    :title="`${row}行${col}列`"
                  ></div>
                </div>
              </div>
              <div class="size-info">{{ selectedRows }}行 × {{ selectedCols }}列</div>
              <button class="insert-table-btn" @click="() => insertTableWithSize()">
                插入表格
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="toolbar-separator"></div>
      
      <div class="toolbar-group">
        <button class="toolbar-btn" title="撤销" @click="undo">
          <i class="fas fa-undo"></i>
        </button>
        <button class="toolbar-btn" title="前进" @click="redo">
          <i class="fas fa-redo"></i>
        </button>
      </div>
      
      <div class="toolbar-separator"></div>
      
      <div class="toolbar-group">
        <button class="toolbar-btn" title="全屏">
          <i class="fas fa-expand"></i>
        </button>
        <button class="toolbar-btn" title="预览">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-container">
      <!-- 左侧编辑器 -->
      <div class="editor-panel">
        <div ref="editorElement" class="code-editor"></div>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-panel">
        <div class="markdown-preview" v-html="renderedMarkdown" @click="onPreviewClick"></div>
      </div>
    </div>

    <!-- 图片裁剪模态框 -->
    <div v-if="showCropModal" class="crop-modal-overlay" @click="cancelCrop">
      <div class="crop-modal" @click.stop>
        <div class="crop-modal-header">
          <h3>裁剪图片</h3>
          <button class="close-btn" @click="cancelCrop">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="crop-modal-body">
          <div class="crop-preview">
            <img :src="cropImageData" alt="裁剪预览" class="crop-image" />
            <div class="crop-overlay">
              <div class="crop-box">
                <div class="crop-handle top-left"></div>
                <div class="crop-handle top-right"></div>
                <div class="crop-handle bottom-left"></div>
                <div class="crop-handle bottom-right"></div>
              </div>
            </div>
          </div>
          <div class="crop-instructions">
            <p>拖拽调整裁剪区域，点击确认上传</p>
          </div>
        </div>
        <div class="crop-modal-footer">
          <button class="crop-btn cancel-btn" @click="cancelCrop">取消</button>
          <button class="crop-btn confirm-btn" @click="confirmCropAndUpload">确认上传</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { useColorMode } from '@vueuse/core'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import * as monaco from 'monaco-editor'
import { ElMessage } from 'element-plus'
import { uploadArticleImage } from '@/apis/article'

// Props
interface Props {
  modelValue?: string
  height?: string
  theme?: 'light' | 'dark' | 'auto'
  showDiff?: boolean
  diffContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  height: '500px',
  theme: 'auto',
  showDiff: false,
  diffContent: ''
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:diffContent': [value: string]
  'update:changeBlocks': [current: number, total: number]
}>()

// 响应式数据
const editorElement = ref<HTMLElement>()
const renderedMarkdown = ref('')
const showHeadingMenu = ref(false)
const showTableMenu = ref(false)
const selectedRows = ref(2)
const selectedCols = ref(3)
const showLinkMenu = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const showImageMenu = ref(false)
const imageFileInput = ref<HTMLInputElement>()
const imageCropInput = ref<HTMLInputElement>()
const imageAlt = ref('')
const imageUrl = ref('')
const showCropModal = ref(false)
const cropImageData = ref('')
const cropImageFile = ref<File | null>(null)

// 视频相关
const showVideoMenu = ref(false)
const videoUrl = ref('')

// Monaco编辑器相关
let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null
let monacoDiffEditor: monaco.editor.IStandaloneDiffEditor | null = null
let originalModel: monaco.editor.ITextModel | null = null
let modifiedModel: monaco.editor.ITextModel | null = null

// 跟踪总修改块数量
let totalChangeBlocks = 0

// 主题模式
const mode = useColorMode()

// Markdown渲染器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // 启用换行符转换为<br>标签
  highlight: function (str: string, lang: string):string {
    // 移除末尾的换行符，避免多出空行
    const trimmedStr = str.replace(/\n$/, '');
    const lines = trimmedStr.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1).join('\n');
    
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlightedCode = hljs.highlight(trimmedStr, { language: lang }).value;
        return '<pre class="hljs"><div class="code-header"><span class="code-lang">' + lang + '</span><button class="code-toggle" aria-expanded="true" title="收起/展开"><i class="fas fa-chevron-down"></i></button></div><div class="code-content"><div class="line-numbers">' + lineNumbers + '</div><code>' + highlightedCode + '</code></div></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><div class="code-header"><span class="code-lang">code</span><button class="code-toggle" aria-expanded="true" title="收起/展开"><i class="fas fa-chevron-down"></i></button></div><div class="code-content"><div class="line-numbers">' + lineNumbers + '</div><code>' + MarkdownIt().utils.escapeHtml(trimmedStr) + '</code></div></pre>';
  }
})

// 添加视频链接渲染规则
md.renderer.rules.link_open = function (tokens, idx, options, _env, renderer) {
  const token = tokens[idx]
  const href = token.attrGet('href')
  
  // 检查是否是视频链接
  if (href && isVideoUrl(href)) {
    const videoId = extractVideoId(href)
    const platform = getVideoPlatform(href)
    
    if (videoId && platform) {
      return `<div class="video-container" data-platform="${platform}" data-video-id="${videoId}">`
    }
  }
  
  // 默认链接渲染
  return renderer.renderToken(tokens, idx, options)
}

md.renderer.rules.link_close = function (tokens, idx, options, _env, renderer) {
  const prevToken = tokens[idx - 1]
  
  // 检查前一个token是否是视频链接
  if (prevToken && prevToken.type === 'link_open') {
    const href = prevToken.attrGet('href')
    if (href && isVideoUrl(href)) {
      const videoId = extractVideoId(href)
      const platform = getVideoPlatform(href)
      
      if (videoId && platform) {
        return generateVideoEmbed(videoId, platform) + '</div>'
      }
    }
  }
  
  // 默认链接渲染
  return renderer.renderToken(tokens, idx, options)
}

// 视频URL检测函数
function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?bilibili\.com\/video\//,
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/(www\.)?dailymotion\.com\/video\//,
    /^https?:\/\/(www\.)?twitch\.tv\/videos\//,
    /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i
  ]
  
  return videoPatterns.some(pattern => pattern.test(url))
}

// 提取视频ID
function extractVideoId(url: string): string | null {
  // YouTube
  if (url.includes('youtube.com/watch')) {
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : null
  }
  if (url.includes('youtu.be/')) {
    const match = url.match(/youtu\.be\/([^?]+)/)
    return match ? match[1] : null
  }
  
  // Bilibili
  if (url.includes('bilibili.com/video/')) {
    const match = url.match(/\/video\/([^\/\?]+)/)
    return match ? match[1] : null
  }
  
  // Vimeo
  if (url.includes('vimeo.com/')) {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : null
  }
  
  // Dailymotion
  if (url.includes('dailymotion.com/video/')) {
    const match = url.match(/\/video\/([^_]+)/)
    return match ? match[1] : null
  }
  
  // Twitch
  if (url.includes('twitch.tv/videos/')) {
    const match = url.match(/\/videos\/(\d+)/)
    return match ? match[1] : null
  }
  
  // 直接视频文件
  if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url)) {
    return url
  }
  
  return null
}

// 获取视频平台
function getVideoPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('bilibili.com')) return 'bilibili'
  if (url.includes('vimeo.com')) return 'vimeo'
  if (url.includes('dailymotion.com')) return 'dailymotion'
  if (url.includes('twitch.tv')) return 'twitch'
  if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url)) return 'direct'
  
  return null
}

// 生成视频嵌入代码
function generateVideoEmbed(videoId: string, platform: string): string {
  switch (platform) {
    case 'youtube':
      return `
        <div class="video-embed youtube-embed">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}" 
            frameborder="0" 
            allowfullscreen
            loading="lazy"
            title="YouTube视频">
          </iframe>
          <div class="video-info">
            <span class="video-platform">YouTube</span>
            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="video-link">在新窗口打开</a>
          </div>
        </div>
      `
    
    case 'bilibili':
      return `
        <div class="video-embed bilibili-embed">
          <iframe 
            src="https://player.bilibili.com/player.html?bvid=${videoId}&autoplay=0" 
            frameborder="0" 
            allowfullscreen
            loading="lazy"
            title="B站视频">
          </iframe>
          <div class="video-info">
            <span class="video-platform">哔哩哔哩</span>
            <a href="https://www.bilibili.com/video/${videoId}" target="_blank" class="video-link">在新窗口打开</a>
          </div>
        </div>
      `
    
    case 'vimeo':
      return `
        <div class="video-embed vimeo-embed">
          <iframe 
            src="https://player.vimeo.com/video/${videoId}" 
            frameborder="0" 
            allowfullscreen
            loading="lazy"
            title="Vimeo视频">
          </iframe>
          <div class="video-info">
            <span class="video-platform">Vimeo</span>
            <a href="https://vimeo.com/${videoId}" target="_blank" class="video-link">在新窗口打开</a>
          </div>
        </div>
      `
    
    case 'dailymotion':
      return `
        <div class="video-embed dailymotion-embed">
          <iframe 
            src="https://www.dailymotion.com/embed/video/${videoId}" 
            frameborder="0" 
            allowfullscreen
            loading="lazy"
            title="Dailymotion视频">
          </iframe>
          <div class="video-info">
            <span class="video-platform">Dailymotion</span>
            <a href="https://www.dailymotion.com/video/${videoId}" target="_blank" class="video-link">在新窗口打开</a>
          </div>
        </div>
      `
    
    case 'twitch':
      return `
        <div class="video-embed twitch-embed">
          <iframe 
            src="https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}" 
            frameborder="0" 
            allowfullscreen
            loading="lazy"
            title="Twitch视频">
          </iframe>
          <div class="video-info">
            <span class="video-platform">Twitch</span>
            <a href="https://www.twitch.tv/videos/${videoId}" target="_blank" class="video-link">在新窗口打开</a>
          </div>
        </div>
      `
    
    case 'direct':
      return `
        <div class="video-embed direct-embed">
          <video 
            controls 
            preload="metadata"
            style="width: 100%; max-width: 100%;"
            title="视频文件">
            <source src="${videoId}" type="video/mp4">
            您的浏览器不支持视频播放。
          </video>
          <div class="video-info">
            <span class="video-platform">视频文件</span>
            <a href="${videoId}" target="_blank" class="video-link">下载视频</a>
          </div>
        </div>
      `
    
    default:
      return `<div class="video-error">不支持的视频平台</div>`
  }
}


// 工具栏功能
const insertText = (before: string, after: string = '') => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  const selectedText = monacoEditor.getModel()?.getValueInRange(selection) || ''
  const newText = before + selectedText + after
  
  monacoEditor.executeEdits('insert-text', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selection.startColumn + before.length + selectedText.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
}

// 粗体
const insertBold = () => {
  insertText('**', '**')
}

// 斜体
const insertItalic = () => {
  insertText('*', '*')
}

// 下划线
const insertUnderline = () => {
  insertText('<u>', '</u>')
}

// 删除线
const insertStrikethrough = () => {
  insertText('~~', '~~')
}


// 选择表格大小
const selectTableSize = (rows: number, cols: number) => {
  selectedRows.value = rows
  selectedCols.value = cols
}

// 根据选择的大小插入表格
const insertTableWithSize = (rows?: number, cols?: number) => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  const tableRows = rows || selectedRows.value
  const tableCols = cols || selectedCols.value
  
  // 生成表头
  const header = '| ' + Array(tableCols).fill(0).map((_, i) => `列${i + 1}`).join(' | ') + ' |'
  const separator = '|' + Array(tableCols).fill('-----').join('|') + '|'
  
  // 生成数据行
  const dataRows = Array(tableRows).fill(0).map((_, rowIndex) => {
    return '| ' + Array(tableCols).fill(0).map(() => `行${rowIndex + 1}`).join(' | ') + ' |'
  })
  
  const tableTemplate = [header, separator, ...dataRows].join('\n')
  
  monacoEditor.executeEdits('insert-table', [{
    range: selection,
    text: tableTemplate,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置到表格内部
  const newPosition = {
    lineNumber: selection.startLineNumber + 2,
    column: 3
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
  
  // 隐藏菜单
  showTableMenu.value = false
}

// 隐藏表格菜单
const hideTableMenu = () => {
  setTimeout(() => {
    showTableMenu.value = false
  }, 200)
}

// 撤销
const undo = () => {
  if (!monacoEditor) return
  monacoEditor.trigger('keyboard', 'undo', null)
}

// 前进（重做）
const redo = () => {
  if (!monacoEditor) return
  monacoEditor.trigger('keyboard', 'redo', null)
}

// 插入链接
const insertLink = () => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  // 如果没有输入链接文本，使用选中的文本
  const text = linkText.value || monacoEditor.getModel()?.getValueInRange(selection) || '链接文本'
  const url = linkUrl.value || 'https://example.com'
  
  const linkMarkdown = `[${text}](${url})`
  
  monacoEditor.executeEdits('insert-link', [{
    range: selection,
    text: linkMarkdown,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selection.startColumn + linkMarkdown.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
  
  // 清空输入框并隐藏菜单
  linkText.value = ''
  linkUrl.value = ''
  showLinkMenu.value = false
}

// 取消链接输入
const cancelLink = () => {
  linkText.value = ''
  linkUrl.value = ''
  showLinkMenu.value = false
}

// 隐藏链接菜单
const hideLinkMenu = () => {
  setTimeout(() => {
    showLinkMenu.value = false
  }, 200)
}

// 图片菜单隐藏
const hideImageMenu = () => {
  setTimeout(() => {
    showImageMenu.value = false
  }, 200)
}

// 插入标题
const insertHeading = (level: number) => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  const selectedText = monacoEditor.getModel()?.getValueInRange(selection) || ''
  const headingPrefix = '#'.repeat(level) + ' '
  const newText = selectedText ? headingPrefix + selectedText : headingPrefix
  
  monacoEditor.executeEdits('insert-heading', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selectedText ? selection.startColumn + headingPrefix.length + selectedText.length : selection.startColumn + headingPrefix.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
  
  // 隐藏菜单
  showHeadingMenu.value = false
}

// 隐藏标题菜单
const hideHeadingMenu = () => {
  setTimeout(() => {
    showHeadingMenu.value = false
  }, 200) // 延迟隐藏，避免鼠标快速移动时菜单闪烁
}

// 插入引用
const insertQuote = () => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  const selectedText = monacoEditor.getModel()?.getValueInRange(selection) || ''
  const newText = selectedText ? `> ${selectedText}` : '> '
  
  monacoEditor.executeEdits('insert-quote', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selectedText ? selection.startColumn + 2 + selectedText.length : selection.startColumn + 2
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
}

// 插入行内代码
const insertInlineCode = () => {
  insertText('`', '`')
}

// 插入代码块
const insertCodeBlock = () => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  const selectedText = monacoEditor.getModel()?.getValueInRange(selection) || ''
  const newText = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\n\n```'
  
  monacoEditor.executeEdits('insert-codeblock', [{
    range: selection,
    text: newText,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  if (selectedText) {
    const newPosition = {
      lineNumber: selection.startLineNumber + 1,
      column: selectedText.length + 1
    }
    monacoEditor.setPosition(newPosition)
  } else {
    const newPosition = {
      lineNumber: selection.startLineNumber + 1,
      column: 1
    }
    monacoEditor.setPosition(newPosition)
  }
  monacoEditor.focus()
}

// 触发图片上传
const triggerImageUpload = () => {
  showImageMenu.value = false
  imageFileInput.value?.click()
}

// 触发图片裁剪上传
const triggerImageCrop = () => {
  showImageMenu.value = false
  imageCropInput.value?.click()
}

// 通过链接插入图片
const insertImageByUrl = () => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  // 如果没有输入图片描述，使用选中的文本
  const alt = imageAlt.value || monacoEditor.getModel()?.getValueInRange(selection) || '图片'
  const url = imageUrl.value || 'https://example.com/image.jpg'
  
  const imageMarkdown = `![${alt}](${url})`
  
  monacoEditor.executeEdits('insert-image', [{
    range: selection,
    text: imageMarkdown,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selection.startColumn + imageMarkdown.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
  
  // 清空输入框并隐藏菜单
  imageAlt.value = ''
  imageUrl.value = ''
  showImageMenu.value = false
}

// 视频菜单相关方法
const hideVideoMenu = () => {
  setTimeout(() => {
    showVideoMenu.value = false
  }, 200)
}

// 插入视频
const insertVideo = () => {
  if (!monacoEditor) return
  
  const selection = monacoEditor.getSelection()
  if (!selection) return
  
  if (!videoUrl.value.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }
  
  // 检查是否是支持的视频平台
  if (!isVideoUrl(videoUrl.value)) {
    ElMessage.warning('不支持的视频平台，请使用YouTube、哔哩哔哩、Vimeo或直接视频文件链接')
    return
  }
  
  const videoMarkdown = `[](${videoUrl.value})`
  
  monacoEditor.executeEdits('insert-video', [{
    range: selection,
    text: videoMarkdown,
    forceMoveMarkers: true
  }])
  
  // 调整光标位置
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selection.startColumn + videoMarkdown.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
  
  // 清空输入
  videoUrl.value = ''
  showVideoMenu.value = false
}

// 取消视频插入
const cancelVideo = () => {
  videoUrl.value = ''
  showVideoMenu.value = false
}

// 取消图片输入
const cancelImage = () => {
  imageAlt.value = ''
  imageUrl.value = ''
  showImageMenu.value = false
}

// 插入图片Markdown（用于上传成功后）
const insertImageMarkdown = (url: string) => {
  if (!monacoEditor) return
  const selection = monacoEditor.getSelection()
  if (!selection) return
  const alt = monacoEditor.getModel()?.getValueInRange(selection) || '图片'
  const md = `![${alt}](${url})`
  monacoEditor.executeEdits('insert-image', [{
    range: selection,
    text: md,
    forceMoveMarkers: true
  }])
  const newPosition = {
    lineNumber: selection.startLineNumber,
    column: selection.startColumn + md.length
  }
  monacoEditor.setPosition(newPosition)
  monacoEditor.focus()
}

// 选择文件后上传图片
const onImageFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return

  // 校验格式与大小
  const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  if (!isAllowed) {
    ElMessage.error('文件格式必须是 jpg/png/webp')
    input.value = ''
    return
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片必须小于 5MB')
    input.value = ''
    return
  }

  try {
    const form = new FormData()
    form.append('articleImage', file)
    const res: any = await uploadArticleImage(form)
    if (res?.code === 200 && res?.data) {
      insertImageMarkdown(res.data)
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res?.msg || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  } finally {
    // 允许选择同一文件再次触发change
    input.value = ''
  }
}

// 选择文件后打开裁剪模态框
const onImageCropFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return

  // 校验格式与大小
  const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  if (!isAllowed) {
    ElMessage.error('文件格式必须是 jpg/png/webp')
    input.value = ''
    return
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片必须小于 5MB')
    input.value = ''
    return
  }

  // 读取文件并显示裁剪界面
  const reader = new FileReader()
  reader.onload = (e) => {
    cropImageData.value = e.target?.result as string
    cropImageFile.value = file
    showCropModal.value = true
  }
  reader.readAsDataURL(file)
  
  // 清空input以允许重复选择
  input.value = ''
}

// 确认裁剪并上传
const confirmCropAndUpload = async () => {
  if (!cropImageFile.value) return
  
  try {
    // 这里简化处理，直接上传原文件
    // 实际项目中应该将裁剪后的canvas转换为blob再上传
    const form = new FormData()
    form.append('articleImage', cropImageFile.value)
    const res: any = await uploadArticleImage(form)
    if (res?.code === 200 && res?.data) {
      insertImageMarkdown(res.data)
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res?.msg || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  } finally {
    // 关闭模态框并清理数据
    showCropModal.value = false
    cropImageData.value = ''
    cropImageFile.value = null
  }
}

// 取消裁剪
const cancelCrop = () => {
  showCropModal.value = false
  cropImageData.value = ''
  cropImageFile.value = null
}

// 创建编辑器
const createEditor = () => {
  if (!editorElement.value) return
  createMonacoEditor()
}


// 创建Monaco编辑器
const createMonacoEditor = () => {
  if (!editorElement.value) return

  // 清理现有编辑器
  disposeMonacoEditors()

  const currentTheme = props.theme === 'auto' ? mode.value : props.theme

  if (props.showDiff && props.diffContent) {
    // 重置总修改块数量（每次创建新diff时）
    totalChangeBlocks = 0
    
    // 创建diff编辑器
    originalModel = monaco.editor.createModel(props.modelValue, 'markdown')
    modifiedModel = monaco.editor.createModel(props.diffContent, 'markdown')

    monacoDiffEditor = monaco.editor.createDiffEditor(editorElement.value, {
      theme: currentTheme === 'dark' ? 'vs-dark' : 'vs-light',
      renderSideBySide: false, // 内联模式
      readOnly: false,
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      renderOverviewRuler: true,
      diffWordWrap: 'on',
      ignoreTrimWhitespace: false,
      // 启用撤销图标功能
      renderMarginRevertIcon: true
    })

    monacoDiffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    })

    // 监听modifiedModel内容变化，当用户撤销更改时同步更新diffContent
    modifiedModel.onDidChangeContent(() => {
      const currentContent = modifiedModel?.getValue() || ''
      emit('update:diffContent', currentContent)
      updateChangeBlocks()
    })

    // 监听diff变化来更新修改块数量
    monacoDiffEditor.onDidUpdateDiff(() => {
      updateChangeBlocks()
    })

    // 初始时更新修改块数量
    nextTick(() => {
      updateChangeBlocks()
    })
  } else {
    // 创建单个编辑器
    originalModel = monaco.editor.createModel(props.modelValue, 'markdown')

    monacoEditor = monaco.editor.create(editorElement.value, {
      model: originalModel,
      language: 'markdown',
      theme: currentTheme === 'dark' ? 'vs-dark' : 'vs-light',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false
    })

    // 监听内容变化
    monacoEditor.onDidChangeModelContent(() => {
      const content = monacoEditor?.getValue() || ''
      emit('update:modelValue', content)
      renderMarkdown(content)
    })
  }

  // 渲染初始内容
  renderMarkdown(props.modelValue)
}

// 更新修改块数量
const updateChangeBlocks = () => {
  if (!monacoDiffEditor || !originalModel || !modifiedModel) {
    emit('update:changeBlocks', 0, totalChangeBlocks)
    return
  }

  try {
    // 获取diff变化信息
    const changes = monacoDiffEditor.getLineChanges() || []
    
    // 只有在totalChangeBlocks为0时才设置总数（初始化时）
    if (totalChangeBlocks === 0 && changes.length > 0) {
      totalChangeBlocks = changes.length
    }
    
    // Monaco Editor的getLineChanges()方法返回的每个对象都代表一个连续的修改块
    // 当前剩余的修改块数量就是这个数组的长度
    const currentChangeBlocks = changes.length
    
    emit('update:changeBlocks', currentChangeBlocks, totalChangeBlocks)
  } catch (error) {
    console.warn('获取修改块数量失败:', error)
    emit('update:changeBlocks', 0, totalChangeBlocks)
  }
}

// 清理Monaco编辑器
const disposeMonacoEditors = () => {
  if (monacoDiffEditor) {
    monacoDiffEditor.dispose()
    monacoDiffEditor = null
  }
  if (monacoEditor) {
    monacoEditor.dispose()
    monacoEditor = null
  }
  if (originalModel) {
    originalModel.dispose()
    originalModel = null
  }
  if (modifiedModel) {
    modifiedModel.dispose()
    modifiedModel = null
  }
  
  // 重置总修改块数量
  totalChangeBlocks = 0

  // 彻底清空容器 DOM，避免残留实例导致按键事件重复
  if (editorElement.value) {
    editorElement.value.innerHTML = ''
  }
}

// 渲染Markdown
const renderMarkdown = (content: string) => {
  try {
    renderedMarkdown.value = md.render(content)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    renderedMarkdown.value = '<p>渲染错误</p>'
  }
}

// 调整面板大小（暂未使用，保留以备后续功能扩展）
// const startResize = () => {
//   isResizing.value = true
//   const container = document.querySelector('.editor-container') as HTMLElement
//   const leftPanel = document.querySelector('.editor-panel') as HTMLElement
//   const rightPanel = document.querySelector('.preview-panel') as HTMLElement

//   const handleMouseMove = (e: MouseEvent) => {
//     if (!isResizing.value) return
    
//     const containerRect = container.getBoundingClientRect()
//     const newLeftWidth = e.clientX - containerRect.left
//     const newRightWidth = containerRect.width - newLeftWidth - 8 // 8px是分割线宽度
    
//     if (newLeftWidth > 200 && newRightWidth > 200) {
//       leftPanel.style.width = newLeftWidth + 'px'
//       rightPanel.style.width = newRightWidth + 'px'
//     }
//   }

//   const handleMouseUp = () => {
//     isResizing.value = false
//     document.removeEventListener('mousemove', handleMouseMove)
//     document.removeEventListener('mouseup', handleMouseUp)
//   }

//   document.addEventListener('mousemove', handleMouseMove)
//   document.addEventListener('mouseup', handleMouseUp)
// }

// 监听主题变化
watch(() => mode.value, () => {
  if (props.theme === 'auto') {
    // 重新创建编辑器以应用新主题
    nextTick(() => {
      disposeMonacoEditors()
      createEditor()
    })
  }
})

// 监听modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (monacoEditor && originalModel && originalModel.getValue() !== newValue) {
    originalModel.setValue(newValue)
  }
})

// 仅在 showDiff 变化时重建 Diff 编辑器
watch(() => props.showDiff, () => {
  nextTick(() => {
    disposeMonacoEditors()
    createMonacoEditor()
  })
})

// diffContent 变化时，直接更新 modifiedModel，避免重建导致 totalChangeBlocks 重置
watch(() => props.diffContent, (val) => {
  if (monacoDiffEditor && modifiedModel && modifiedModel.getValue() !== val) {
    modifiedModel.setValue(val || '')
    nextTick(() => {
      updateChangeBlocks()
    })
  }
})

// 生命周期
onMounted(() => {
  nextTick(() => {
    createEditor()
    renderMarkdown(props.modelValue)
  })
})

onUnmounted(() => {
  disposeMonacoEditors()
})

// 预览区事件委托：展开/收起代码块
const onPreviewClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target) return
  // 点击按钮或按钮内图标
  const toggleBtn = target.closest('.code-toggle') as HTMLElement | null
  if (!toggleBtn) return
  const pre = toggleBtn.closest('pre.hljs') as HTMLElement | null
  if (!pre) return
  const content = pre.querySelector('.code-content') as HTMLElement | null
  const icon = toggleBtn.querySelector('i') as HTMLElement | null
  if (!content || !icon) return
  const expanded = toggleBtn.getAttribute('aria-expanded') !== 'false'
  if (expanded) {
    content.style.display = 'none'
    toggleBtn.setAttribute('aria-expanded', 'false')
    icon.className = 'fas fa-chevron-right'
  } else {
    content.style.display = 'flex'
    toggleBtn.setAttribute('aria-expanded', 'true')
    icon.className = 'fas fa-chevron-down'
  }
}
</script>

<style scoped lang="scss">
.custom-markdown-editor {
  border: none;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  height: v-bind(height);
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 2px 8px;
  background: transparent;
  border-bottom: 0.5px solid #e5e5e5;
  flex-wrap: wrap;
  gap: 4px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-separator {
  width: 1px;
  height: 15px;
  background: #d1d5db;
  margin: 0 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e5e7eb;
    color: #111827;
  }
  
  &:active {
    background: #d1d5db;
  }
  
  i {
    font-size: 14px;
  }
}

.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 120px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 4px 0;
  margin-top: 0;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
  
  &:first-child {
    border-radius: 6px 6px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 6px 6px;
  }
  
  &:only-child {
    border-radius: 6px;
  }
}

.table-menu {
  min-width: 200px;
  padding: 12px;
}

.table-size-selector {
  .size-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 8px;
    text-align: center;
  }
  
  .size-grid {
    display: grid;
    grid-template-rows: repeat(5, 1fr);
    grid-template-columns: repeat(6, 1fr);
    gap: 2px;
    margin-bottom: 8px;
    
    .size-row {
      display: contents;
    }
    
    .size-cell {
      width: 20px;
      height: 20px;
      border: 1px solid #d1d5db;
      background: #f9fafb;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &:hover {
        background: #e5e7eb;
        border-color: #9ca3af;
      }
      
      &.active {
        background: #3b82f6;
        border-color: #2563eb;
      }
    }
  }
  
  .size-info {
    font-size: 11px;
    color: #6b7280;
    text-align: center;
    margin-bottom: 8px;
  }
  
  .insert-table-btn {
    width: 100%;
    padding: 6px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    
    &:hover {
      background: #2563eb;
    }
  }
}

.link-menu {
  min-width: 280px;
  padding: 16px;
}

.image-menu {
  min-width: 280px;
  padding: 16px;
}

.video-menu {
  min-width: 320px;
  padding: 16px;
}

.link-input-form {
  .input-group {
    margin-bottom: 12px;
    
    .input-label {
      display: block;
      font-size: 12px;
      color: #374151;
      margin-bottom: 4px;
      font-weight: 500;
    }
    
    .link-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.15s ease;
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      &::placeholder {
        color: #9ca3af;
      }
    }
  }
  
  .link-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    
    .link-btn {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &.cancel-btn {
        background: #f3f4f6;
        color: #374151;
        
        &:hover {
          background: #e5e7eb;
        }
      }
      
      &.insert-btn {
        background: #3b82f6;
        color: white;
        
        &:hover {
          background: #2563eb;
        }
      }
    }
  }
}

.image-input-form {
  .input-group {
    margin-bottom: 12px;
    
    .input-label {
      display: block;
      font-size: 12px;
      color: #374151;
      margin-bottom: 4px;
      font-weight: 500;
    }
    
    .image-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.15s ease;
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      &::placeholder {
        color: #9ca3af;
      }
    }
  }
  
  .image-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    
    .image-btn {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &.cancel-btn {
        background: #f3f4f6;
        color: #374151;
        
        &:hover {
          background: #e5e7eb;
        }
      }
      
      &.insert-btn {
        background: #3b82f6;
        color: white;
        
        &:hover {
          background: #2563eb;
        }
      }
    }
  }
  
  .image-separator {
    text-align: center;
    margin: 16px 0 12px 0;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e5e7eb;
    }
    
    span {
      background: white;
      padding: 0 12px;
      color: #6b7280;
      font-size: 12px;
      position: relative;
    }
  }
  
  .upload-btn {
    width: 100%;
    padding: 8px 16px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
    
    &:hover {
      background: #059669;
    }
    
    i {
      font-size: 12px;
    }
  }
  
  .crop-btn {
    width: 100%;
    padding: 8px 16px;
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    
    &:hover {
      background: #d97706;
    }
    
    i {
      font-size: 12px;
    }
  }
}

.video-input-form {
  .input-group {
    margin-bottom: 12px;
    
    .input-label {
      display: block;
      font-size: 12px;
      color: #374151;
      margin-bottom: 4px;
      font-weight: 500;
    }
    
    .video-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.15s ease;
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      &::placeholder {
        color: #9ca3af;
      }
    }
  }
  
  .video-platforms {
    margin: 12px 0;
    
    .platform-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    
    .platform-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      
      .platform-tag {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        
        &.youtube {
          background: #fee2e2;
          color: #dc2626;
        }
        
        &.bilibili {
          background: #dbeafe;
          color: #2563eb;
        }
        
        &.vimeo {
          background: #d1fae5;
          color: #059669;
        }
        
        &.direct {
          background: #f3e8ff;
          color: #7c3aed;
        }
      }
    }
  }
  
  .video-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    
    .video-btn {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &.cancel-btn {
        background: #f3f4f6;
        color: #374151;
        
        &:hover {
          background: #e5e7eb;
        }
      }
      
      &.insert-btn {
        background: #3b82f6;
        color: white;
        
        &:hover {
          background: #2563eb;
        }
      }
    }
  }
}

.editor-container {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  border-right: 1px solid #e5e5e5;
}

.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  background: transparent;
}


.code-editor {
  flex: 1;
  overflow: hidden;
}

.markdown-preview {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  
  // Markdown样式
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 16px 0 8px 0;
    font-weight: 600;
    line-height: 1.25;
  }
  
  :deep(h1) { font-size: 2em; padding-bottom: 8px; }
  :deep(h2) { font-size: 1.5em; padding-bottom: 8px; }
  :deep(h3) { font-size: 1.25em; }
  :deep(h4) { font-size: 1em; }
  :deep(h5) { font-size: 0.875em; }
  :deep(h6) { font-size: 0.85em; color: #6a737d; }
  
  :deep(p) {
    margin: 8px 0;
  }
  
  :deep(blockquote) {
    margin: 16px 0;
    padding: 12px 16px;
    background: #f5f5f5;
    color: #333;
    border-left: 4px solid #22c55e;
    border-radius: 0 4px 4px 0;
  }
  
  :deep(ul), :deep(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  :deep(li) {
    margin: 4px 0;
  }
  
  :deep(code) {
    background: #dbeafe;
    color: #4d74f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
    font-size: 0.9em;
    font-weight: 400;
    letter-spacing: 0.025em;
  }
  
  :deep(pre) {
    background: #323744;
    padding: 0;
    border-radius: 6px;
    overflow-x: auto;
    margin: 16px 0;
    border: 1px solid #2d3748;
    
    .code-header {
      background: #111827;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #374151;
      
      .code-lang {
        color: #9ca3af;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      
      .code-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #9ca3af;
        border-radius: 4px;
        cursor: pointer;
        
        &:hover { background: #374151; color: #e5e7eb; }
        i { font-size: 12px; }
      }
    }
    
    .code-content {
      display: flex;
      
      .line-numbers {
        background: #323744;
        color: #6b7280;
        padding: 16px 8px 16px 16px;
        border-right: 1px solid #374151;
        font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
        font-size: 0.9em;
        line-height: 1.6;
        user-select: none;
        text-align: right;
        min-width: 3em;
      }
      
      code {
        background: none;
        padding: 16px;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
        font-size: 1.0em;
        font-weight: 400;
        letter-spacing: 0.025em;
        line-height: 1.6;
        display: block;
        white-space: pre;
        flex: 1;
        margin: 0;
      }
    }
  }
  
  :deep(table) {
    border-collapse: collapse;
    margin: 16px 0;
    width: 100%;
    
    th, td {
      border: 1px solid #dfe2e5;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: #f6f8fa;
      font-weight: 600;
    }
  }
  
  :deep(a) {
    color: #0366d6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  
  // 视频容器样式
  :deep(.video-container) {
    margin: 16px 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: #f8f9fa;
  }
  
  :deep(.video-embed) {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%; // 16:9 宽高比
    background: #000;
    
    iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
    
    video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .video-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      color: white;
      padding: 12px 16px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      pointer-events: none; // 禁用鼠标事件，让点击穿透到视频
      z-index: 1; // 确保在视频上方但不阻挡交互
      opacity: 1; // 默认隐藏
      transition: opacity 0.3s ease;
      
      .video-platform {
        font-weight: 500;
        opacity: 0.9;
        pointer-events: none; // 平台标签也不响应点击
      }
      
      .video-link {
        color: #60a5fa;
        text-decoration: none;
        opacity: 0.8;
        transition: opacity 0.2s ease;
        pointer-events: auto; // 只有链接可以点击
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.3);
        
        &:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.5);
        }
      }
    }
    
    // 悬停时显示信息栏
    &:hover .video-info {
      opacity: 1;
    }
  }
  
  // 不同平台的视频样式
  :deep(.youtube-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(255, 0, 0, 0.8));
    }
  }
  
  :deep(.bilibili-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(0, 123, 255, 0.8));
    }
  }
  
  :deep(.vimeo-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(26, 183, 234, 0.8));
    }
  }
  
  :deep(.dailymotion-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(0, 174, 239, 0.8));
    }
  }
  
  :deep(.twitch-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(145, 70, 255, 0.8));
    }
  }
  
  :deep(.direct-embed) {
    .video-info {
      background: linear-gradient(transparent, rgba(75, 85, 99, 0.8));
    }
  }
  
  :deep(.video-error) {
    padding: 20px;
    text-align: center;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin: 16px 0;
  }
  
  :deep(hr) {
    border: none;
    border-top: 1px solid #eaecef;
    margin: 24px 0;
  }

  // 代码高亮样式
  :deep(.hljs) {
    background: #323744;
    color: #e2e8f0;
    border-radius: 6px;
    padding: 0;
    overflow-x: auto;
    margin: 16px 0;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
    font-size: 1.0em;
    font-weight: 400;
    letter-spacing: 0.025em;
    line-height: 1.6;
    border: 1px solid #2d3748;
    
    .code-header {
      background: #323744;
      padding: 0px 12px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      border-bottom: 1px solid #374151;
      gap: 8px;
      
      .code-lang { color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .code-toggle { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: transparent; color: #9ca3af; border-radius: 4px; cursor: pointer; }
      .code-toggle:hover { background: #374151; color: #e5e7eb; }
      .code-toggle i { font-size: 12px; }
    }
    
    .code-content { display: flex; }
    .code-content .line-numbers { background: #323744; color: #6b7280; padding: 16px 8px 16px 16px; border-right: 1px solid #374151; font-size: 0.9em; line-height: 1.6; user-select: none; text-align: right; min-width: 3em; }
    .code-content code { background: none; padding: 16px; color: #e2e8f0; font-size: 0.9em; font-weight: 400; letter-spacing: 0.025em; line-height: 1.6; display: block; white-space: pre; flex: 1; margin: 0; }
  }
}

.editor-divider {
  width: 8px;
  background: #e5e5e5;
  cursor: col-resize;
  position: relative;
  
  &:hover {
    background: #d1d5db;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 20px;
    background: #9ca3af;
    border-radius: 1px;
  }
}

// 裁剪模态框样式
.crop-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.crop-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.crop-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s ease;
    
    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }
}

.crop-modal-body {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.crop-preview {
  position: relative;
  width: 100%;
  max-width: 500px;
  max-height: 400px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
  
  .crop-image {
    width: 100%;
    height: auto;
    display: block;
    max-height: 400px;
    object-fit: contain;
  }
  
  .crop-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .crop-box {
    position: relative;
    width: 200px;
    height: 200px;
    border: 2px solid #3b82f6;
    background: transparent;
    cursor: move;
    
    .crop-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      
      &.top-left {
        top: -6px;
        left: -6px;
        cursor: nw-resize;
      }
      
      &.top-right {
        top: -6px;
        right: -6px;
        cursor: ne-resize;
      }
      
      &.bottom-left {
        bottom: -6px;
        left: -6px;
        cursor: sw-resize;
      }
      
      &.bottom-right {
        bottom: -6px;
        right: -6px;
        cursor: se-resize;
      }
    }
  }
}

.crop-instructions {
  margin-top: 16px;
  text-align: center;
  
  p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }
}

.crop-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
  
  .crop-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &.cancel-btn {
      background: #f3f4f6;
      color: #374151;
      
      &:hover {
        background: #e5e7eb;
      }
    }
    
    &.confirm-btn {
      background: #3b82f6;
      color: white;
      
      &:hover {
        background: #2563eb;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }
  
  .editor-panel {
    border-right: none;
    border-bottom: 1px solid #e5e5e5;
  }
  
  .editor-divider {
    width: 100%;
    height: 8px;
    cursor: row-resize;
    
    &::after {
      width: 20px;
      height: 2px;
    }
  }
  
  .toolbar-btn {
    width: 28px;
    height: 28px;
    
    i {
      font-size: 12px;
    }
  }
}

// Monaco Editor 内联diff自定义样式
:deep(.monaco-editor) {
  // 内联模式下的删除文本样式
  .char-delete {
    background-color: rgba(255, 129, 130, 0.4) !important;
    text-decoration: line-through;
    text-decoration-color: #ff6b6b;
    text-decoration-thickness: 2px;
  }
  
  // 内联模式下的新增文本样式
  .char-insert {
    background-color: rgba(46, 160, 67, 0.25) !important;
    border: 1px solid rgba(46, 160, 67, 0.4);
    border-radius: 2px;
  }
  
  // 删除行的背景
  .line-delete {
    background-color: rgba(255, 129, 130, 0.15) !important;
  }
  
  // 新增行的背景
  .line-insert {
    background-color: rgba(46, 160, 67, 0.15) !important;
  }
  
  // 修改行的背景
  .line-modified {
    background-color: rgba(255, 193, 7, 0.1) !important;
  }
  
  // 内联diff的行号样式
  .margin-view-overlays .line-numbers {
    color: #666 !important;
  }
  
  // 概览标尺中的变更标记
  .overview-ruler {
    .delete {
      background-color: #ff6b6b !important;
    }
    
    .insert {
      background-color: #2ea043 !important;
    }
  }
}
</style>
