# 自定义Markdown编辑器

这是一个基于CodeMirror 6和MarkdownIt构建的自定义Markdown编辑器组件。

## 功能特性

- ✅ 左侧文本编辑器（带行号）
- ✅ 右侧实时Markdown预览
- ✅ 可调整的分割面板
- ✅ 菜单栏框架（待实现具体功能）
- ✅ 支持明暗主题切换
- ✅ 响应式设计
- ✅ 代码语法高亮
- ✅ 换行符正确渲染
- ✅ 任务列表支持
- ✅ 表情符号支持
- ✅ 标记和插入文本
- ✅ 上标下标支持

## 使用方法

```vue
<template>
  <CustomMarkdownEditor
    v-model="content"
    height="500px"
    theme="light"
  />
</template>

<script setup>
import { ref } from 'vue'
import CustomMarkdownEditor from '@/components/CustomMarkdownEditor/index.vue'

const content = ref('# Hello World\n\n这是一个测试。')
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | string | '' | 编辑器内容 |
| height | string | '500px' | 编辑器高度 |
| theme | 'light' \| 'dark' \| 'auto' | 'auto' | 主题模式 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | (value: string) | 内容变化时触发 |

## 技术栈

- **CodeMirror 6**: 代码编辑器核心
- **MarkdownIt**: Markdown解析和渲染
- **Highlight.js**: 代码语法高亮
- **Vue 3**: 组件框架
- **TypeScript**: 类型支持

## 支持的Markdown功能

- 标题 (H1-H6)
- 粗体、斜体、下划线
- 代码块（带语法高亮）
- 内联代码
- 链接和图片
- 列表（有序、无序）
- 任务列表（复选框）
- 引用块
- 表格
- 分割线
- 表情符号
- 标记文本 (==text==)
- 插入文本 (++text++)
- 上标 (^text^) 和下标 (~text~)

## 待实现功能

- [ ] 菜单栏具体功能实现
- [ ] 图片上传支持
- [ ] 表格编辑支持
- [ ] 快捷键支持
- [ ] 撤销/重做功能
- [ ] 全屏模式
- [ ] 导出功能

## 使用示例

在发布页面中，你可以通过右上角的开关在"原编辑器"和"自定义编辑器"之间切换。新的编辑器提供了更强大的markdown渲染功能。
