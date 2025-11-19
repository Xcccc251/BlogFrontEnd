# SQL 确认界面优化

## 优化说明

将 SQL 执行确认提示从独立的卡片气泡优化为集成在 exec 工具气泡中，并采用终端风格设计（类似 Claude Code / Cursor），使界面更加专业和现代。

## 主要改动

### 1. 数据结构变更

**之前**：SQL 确认请求作为独立的消息气泡
```typescript
aiMessages.value.push({
  role: 'assistant',
  content: parsed.sql,
  messageType: 'sql_confirm_request',
  confirmId: parsed.confirm_id,
  sessionId: parsed.session_id,
  // ...
})
```

**现在**：SQL 确认请求作为工具消息的属性
```typescript
const messageIndex = aiMessages.value.findIndex((msg: any) => msg.bubbleId === bubbleId)
if (messageIndex !== -1) {
  aiMessages.value[messageIndex].sqlConfirmRequest = {
    sql: parsed.sql,
    confirmId: parsed.confirm_id,
    sessionId: parsed.session_id,
    confirmed: null,
    confirming: false
  }
}
```

### 2. 模板结构变更

**之前**：独立的 SQL 确认气泡
```vue
<div v-else-if="message.messageType === 'sql_confirm_request'" class="sql-confirm-bubble">
  <!-- 独立气泡内容 -->
</div>
```

**现在**：集成在工具气泡中
```vue
<div v-else-if="message.messageType === 'tool_start' || message.messageType === 'tool_complete'" class="welcome-message">
  <div class="feature-tip">
    <!-- 工具状态 -->
    
    <!-- SQL 确认界面（如果存在） -->
    <div v-if="message.sqlConfirmRequest" class="sql-confirm-wrapper">
      <!-- 确认界面内容 -->
    </div>
  </div>
</div>
```

### 3. 样式优化

- 删除了独立的 `.sql-confirm-bubble` 样式
- 添加了 `.exec-tool-tip` 类，增加 exec 工具气泡的最小宽度
- 添加了 `.sql-confirm-wrapper` 类，提供更紧凑的确认界面样式
- SQL 确认界面通过顶部边框与工具状态区分

### 4. 函数更新

更新了 `handleSqlConfirm` 函数以适配新的数据结构：
```typescript
const handleSqlConfirm = async (messageIndex: number, confirmed: boolean) => {
  const message = aiMessages.value[messageIndex]
  if (!message || !message.sqlConfirmRequest) return
  
  const confirmRequest = message.sqlConfirmRequest
  confirmRequest.confirming = true
  // ...
}
```

## 界面效果

### 优化前
- SQL 确认提示显示为独立的黄色警告卡片
- 占用额外的垂直空间
- 与工具执行流程分离

### 优化后（终端风格）
- **终端窗口外观**：深色背景 (#1e1e1e)，顶部带红黄绿三色圆点，模拟终端窗口
- **命令行风格**：显示 `$ mysql -e` 命令提示符，突出终端感
- **代码高亮**：SQL 语句使用等宽字体和 VS Code 风格的颜色 (#ce9178)
- **专业按钮**：终端风格的按钮设计
  - Deny 按钮：红色边框 (#f48771)，透明背景
  - Allow 按钮：蓝色实心 (#0e639c)，白色文字
- **状态提示**：在终端标题栏显示确认状态
  - 待确认：⚠ Confirm SQL Execution
  - 已允许：✓ Execution Allowed（绿色 #4ec9b0）
  - 已拒绝：✗ Execution Denied（红色 #f48771）

## 用户体验改进

1. **专业外观**：终端风格设计，符合开发者审美，类似 Claude Code / Cursor 的界面体验
2. **视觉连贯性**：确认界面与工具气泡融为一体，深色主题与代码编辑器风格一致
3. **可读性强**：等宽字体 + 代码高亮，SQL 语句更易阅读
4. **操作直观**：终端风格按钮，Deny/Allow 操作清晰明确
5. **状态反馈**：终端标题栏实时显示确认状态，一目了然
6. **细节完善**：
   - 自定义滚动条样式，与深色主题匹配
   - 按钮悬停效果，提供视觉反馈
   - 窗口阴影和边框，增强立体感

## 兼容性

- 保持了所有原有功能
- 确认/拒绝按钮功能不变
- 后端 API 调用逻辑不变
- 消息流处理逻辑不变

## 设计细节

### 终端窗口元素
- **顶部圆点**：模拟 macOS 终端窗口的红黄绿控制按钮
- **标题栏**：深色背景 (#2d2d2d)，居中显示状态文字
- **内容区**：深色背景 (#1e1e1e)，使用 VS Code 配色方案
- **底部操作栏**：稍浅背景 (#252526)，与内容区区分

### 颜色方案（VS Code Dark+）
- **提示符绿色**：#4ec9b0（cyan）
- **命令黄色**：#dcdcaa（yellow）
- **SQL 字符串**：#ce9178（橙色）
- **边框蓝色**：#007acc（VS Code 主题色）
- **成功绿色**：#4ec9b0
- **错误红色**：#f48771

### 交互设计
- 按钮 hover 效果，背景色加深/变亮
- 禁用状态透明度降至 50%
- 加载状态显示 `...`，简洁明了

## 测试验证

已通过 `npm run build` 验证，构建成功无错误。

## 文件变更

- `src/views/Admin/index.vue` - 主要修改文件
  - 流式数据处理逻辑更新
  - 模板结构调整
  - 样式优化
  - 函数更新
