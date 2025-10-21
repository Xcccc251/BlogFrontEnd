<template>
    <div class="test-container">
      <div class="test-header">
        <h2>Monaco Editor 内联变更测试</h2>
        <div class="test-actions">
          <el-button @click="generateNewText" type="primary">获取新文本</el-button>
          <el-button @click="resetEditor">重置</el-button>
          <el-button @click="acceptAllChanges" :disabled="!showDiff">接受所有更改</el-button>
          
        </div>
      </div>
      <!-- CustomMarkdownEditor 集成测试 -->
      <div class="custom-editor-section">
        <div class="section-header">
          <h3>CustomMarkdownEditor 集成测试</h3>
          <div class="section-actions">
            <el-button @click="generateCustomDiff" type="primary">获取新文本</el-button>
            <el-button @click="acceptCustomChanges">接受更改</el-button>
            <el-switch
              v-model="useMonacoInCustom"
              active-text="Monaco"
              inactive-text="CodeMirror"
              style="margin-left: 10px"
            />
          </div>
        </div>
        
        <CustomMarkdownEditor
          v-model="customContent"
          :height="'1200px'"
          :useMonaco="useMonacoInCustom"
          :showDiff="showCustomDiff"
          :diffContent="customDiffContent"
          @update:diffContent="customDiffContent = $event"
          @update:changeBlocks="(current, total) => { changeBlocks = current; totalChangeBlocks = total }"
        />
        <div v-if="customDiffContent" class="custom-editor-overlay">
          <div class="change-info" v-if="changeBlocks > 0">
            <span class="change-count">{{ changeBlocks }}/{{totalChangeBlocks}}</span>
            <span class="change-text">个修改</span>
          </div>
          <el-button size="small" type="default" class="undo-btn" @click="undoAll" title="Undo all (Ctrl+Shift+Z)">
            Undo all
          </el-button>
          <el-button size="small" type="success" class="keep-btn" @click="keepAll" title="Keep all (Ctrl+Enter)">
            Keep all
            <span class="kbd">Ctrl+Enter</span>
          </el-button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
import * as monaco from 'monaco-editor'
import { ElMessage } from 'element-plus'
import CustomMarkdownEditor from '@/components/CustomMarkdownEditor/index.vue'
  
  // 编辑器相关
  const editorContainer = ref<HTMLElement>()
  let diffEditor: monaco.editor.IStandaloneDiffEditor | null = null
  let singleEditor: monaco.editor.IStandaloneCodeEditor | null = null
  let originalModel: monaco.editor.ITextModel | null = null
  let modifiedModel: monaco.editor.ITextModel | null = null
  
const totalChanges = ref(0)

// 初始文本内容
const originalText = `# 我的博客文章
  
  ## 简介
  这是一篇关于Vue.js开发的文章。
  
  ## 主要内容
  Vue.js是一个渐进式的JavaScript框架，用于构建用户界面。
  
  ### 特性
  - 响应式数据绑定
  - 组件化开发
  - 虚拟DOM
  
  ## 代码示例
  \`\`\`javascript
  const app = createApp({
    data() {
      return {
        message: 'Hello Vue!'
      }
    }
  })
  \`\`\`
  
## 总结
Vue.js让前端开发变得更加简单和高效。`

// 状态
const showDiff = ref(false)

// CustomMarkdownEditor 相关状态
const customContent = ref(originalText)
const useMonacoInCustom = ref(true)
const showCustomDiff = ref(false)
const customDiffContent = ref('')
const customPrevContent = ref('')
const changeBlocks = ref(0)
const totalChangeBlocks = ref(0)
  
  // 模拟的新文本内容
  const newTexts = [
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
  
  let currentTextIndex = 0
  
  onMounted(() => {
    initMonacoEditor()
  })
  
  onUnmounted(() => {
    disposeEditors()
  })
  
  // 清理编辑器资源
  function disposeEditors() {
    if (diffEditor) {
      diffEditor.dispose()
      diffEditor = null
    }
    if (singleEditor) {
      singleEditor.dispose()
      singleEditor = null
    }
    if (originalModel) {
      originalModel.dispose()
      originalModel = null
    }
    if (modifiedModel) {
      modifiedModel.dispose()
      modifiedModel = null
    }
  }
  
// 初始化Monaco编辑器（默认单编辑器，不自动显示 diff）
function initMonacoEditor() {
  if (!editorContainer.value) return

  // 创建原始模型
  originalModel = monaco.editor.createModel(originalText, 'markdown')

  // 使用单个编辑器显示原始内容（用户输入不会触发 diff）
  singleEditor = monaco.editor.create(editorContainer.value, {
    model: originalModel,
    language: 'markdown',
    theme: 'vs-light',
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: false },
    wordWrap: 'on',
    scrollBeyondLastLine: false
  })
}
  
// 创建内联diff编辑器（在点击按钮时调用）
function createInlineDiffEditor() {
  if (!editorContainer.value || !originalModel || !modifiedModel) return

  // 清理现有编辑器
  if (diffEditor) diffEditor.dispose()
  if (singleEditor) {
    singleEditor.dispose()
    singleEditor = null
  }

  // 创建diff编辑器（内联模式，设置为只读以避免键盘输入产生额外diff）
  diffEditor = monaco.editor.createDiffEditor(editorContainer.value, {
    theme: 'vs-light',
    renderSideBySide: false, // 内联模式
    readOnly: true,
    automaticLayout: true,
    fontSize: 14,
    minimap: {
      enabled: false
    },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    // 内联diff特定配置
    renderOverviewRuler: true,
    diffWordWrap: 'on',
    ignoreTrimWhitespace: false,
      // 启用撤销图标功能
    renderMarginRevertIcon: true,
  })

  // 设置模型
  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel
  })
}
  
  // （仅保留内联diff视图，移除并排视图相关逻辑）
  
// 生成新文本（模拟AI返回），仅在点击时创建并显示 diff
function generateNewText() {
  // 循环使用不同的新文本
  const newText = newTexts[currentTextIndex % newTexts.length]
  currentTextIndex++

  // 创建修改模型
  if (modifiedModel) {
    modifiedModel.dispose()
    modifiedModel = null
  }
  modifiedModel = monaco.editor.createModel(newText, 'markdown')

  // 创建并显示内联 diff 编辑器（会替换单编辑器）
  createInlineDiffEditor()

  showDiff.value = true

  ElMessage.success(`已生成新文本 ${currentTextIndex}，查看内联diff效果`)
}
  
// 接受所有更改：将修改应用到原始模型，销毁 diff 编辑器并恢复单编辑器
function acceptAllChanges() {
  if (!modifiedModel || !originalModel) return

  // 将修改的内容应用到原始模型
  const newContent = modifiedModel.getValue()
  originalModel.setValue(newContent)

  // 清理 modifiedModel 和 diffEditor
  if (diffEditor) {
    diffEditor.dispose()
    diffEditor = null
  }
  if (modifiedModel) {
    modifiedModel.dispose()
    modifiedModel = null
  }

  // 恢复单编辑器显示原始模型（已被更新为新内容）
  if (editorContainer.value && originalModel) {
    singleEditor = monaco.editor.create(editorContainer.value, {
      model: originalModel,
      language: 'markdown',
      theme: 'vs-light',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false
    })
  }

  showDiff.value = false

  ElMessage.success('已接受所有更改')
}
  
// 重置编辑器
function resetEditor() {
  if (!originalModel) return

  // 重置为初始内容
  originalModel.setValue(originalText)

  // 清理 modifiedModel 和 diffEditor（如果存在）
  if (diffEditor) {
    diffEditor.dispose()
    diffEditor = null
  }
  if (modifiedModel) {
    modifiedModel.dispose()
    modifiedModel = null
  }

  // 销毁现有单编辑器并重新创建
  if (singleEditor) {
    singleEditor.dispose()
    singleEditor = null
  }
  if (editorContainer.value && originalModel) {
    singleEditor = monaco.editor.create(editorContainer.value, {
      model: originalModel,
      language: 'markdown',
      theme: 'vs-light',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false
    })
  }

  showDiff.value = false
  currentTextIndex = 0

  ElMessage.info('编辑器已重置')
}

let monacoDiffEditor: monaco.editor.IStandaloneDiffEditor | null = null
let originalModel1: monaco.editor.ITextModel | null = null
let modifiedModel1: monaco.editor.ITextModel | null = null
const editorElement = ref<HTMLElement>()

// CustomMarkdownEditor 相关方法
function generateCustomDiff() {
  const newText = newTexts[currentTextIndex % newTexts.length]
  // 保存当前内容以便撤销
  customPrevContent.value = customContent.value
  customDiffContent.value = newText
  showCustomDiff.value = true
  currentTextIndex++
  ElMessage.success('已获取新文本并在 CustomMarkdownEditor 中显示 diff')
}

function acceptCustomChanges() {
  // 将 CustomMarkdownEditor 的 diff 作为接受操作
  if (customDiffContent.value) {
    customContent.value = customDiffContent.value
  }
  showCustomDiff.value = false
  customDiffContent.value = ''
  ElMessage.success('已接受 CustomMarkdownEditor 的更改')
}

function undoAll() {
  // 恢复到生成 diff 前的内容
  if (customPrevContent.value !== undefined) {
    customContent.value = customPrevContent.value
  }
  showCustomDiff.value = false
  customDiffContent.value = ''
  ElMessage.info('已撤销所有更改')
}

function keepAll() {
  // 等同于接受更改
  acceptCustomChanges()
}
  </script>
  
  <style scoped lang="scss">
  .test-container {
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
  }
  
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    h2 {
      margin: 0;
      color: #303133;
      font-size: 1.5rem;
    }
    
    .test-actions {
      display: flex;
      gap: 10px;
    }
  }
  
  .editor-container {
    flex: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-bottom: 20px;
    
    .monaco-editor {
      height: 100%;
      width: 100%;
    }
  }
  
  .info-panel {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    h3 {
      margin: 0 0 15px 0;
      color: #303133;
      font-size: 1.2rem;
    }
    
    p {
      margin: 8px 0;
      color: #606266;
      line-height: 1.6;
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
    
    // 并排模式的分割线
    .diffEditor .split-view-view {
      border-right: 1px solid #e1e4e8;
    }
  }

.custom-editor-section {
  margin-top: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e4e8;
  background: #f8f9fa;
  
  h3 {
    margin: 0;
    color: #303133;
    font-size: 1.2rem;
  }
  
  .section-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
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
  background: rgba(0, 0, 0, 0.06);
  padding: 8px;
  border-radius: 8px;
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
  </style>