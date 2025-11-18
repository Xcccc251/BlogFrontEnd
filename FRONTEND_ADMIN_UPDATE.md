# 前端Admin页面更新说明

## 概述

已将Admin页面的AI助手从普通的Agent聊天改为专门的**数据库查询助手**（Backend Agent），提供SQL查询相关的工具支持。

## 修改文件

### 1. API文件修改
**文件**: `blog/src/apis/aiChat/index.ts`

**新增内容**: 添加 `backendAgentAPI` 对象

```typescript
// 后台Agent API（用于Admin页面，提供SQL查询工具）
export const backendAgentAPI = {
  // 发送消息（流式响应）- 用于admin页面的SQL查询助手
  sendMessage(userMessage: string, sessionId: string | null, model: string) {
    return fetch('/api/backend/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_message: userMessage,
        session_id: sessionId,
        model: model
      })
    })
  },
  
  // 创建新会话
  createSession() {
    return api.post('/backend/agent/sessions')
  },

  // 获取所有会话
  getSessions() {
    return api.get('/backend/agent/sessions')
  },
    
  // 加载指定会话
  loadSession(sessionId: string) {
    return api.get(`/backend/agent/sessions/${sessionId}`)
  },
    
  // 删除会话
  deleteSession(sessionId: string) {
    return api.delete(`/backend/agent/sessions/${sessionId}`)
  },

  // 获取可用模型列表（共享agent模型列表）
  getModels() {
    return api.get('/agent/models')
  },
}
```

### 2. Admin页面修改
**文件**: `blog/src/views/Admin/index.vue`

#### 修改1: 更改导入
```typescript
// 从 agentAPI 改为 backendAgentAPI
import { backendAgentAPI } from '@/apis/aiChat'
```

#### 修改2: 简化API调用
```typescript
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
  // ... 流式处理逻辑
}
```

#### 修改3: 更新工具消息处理
添加对Backend Agent工具的支持：
- `get_table_list` - 获取表列表
- `get_table_structure` - 查看表结构
- `generate_sql` - 生成SQL
- `execute_sql` - 执行SQL
- `analyze_query_result` - 分析结果
- `get_database_stats` - 数据库统计

```typescript
// Backend Agent 工具处理
if (toolName === 'get_table_list') {
  summary = 'QUERY: 获取表列表'
} else if (toolName === 'get_table_structure') {
  summary = 'QUERY: 查看表结构'
} else if (toolName === 'generate_sql') {
  const toolData = JSON.parse(content)
  summary = 'SQL: ' + (toolData.explanation || '生成查询')
} else if (toolName === 'execute_sql') {
  summary = 'EXEC: 执行SQL查询'
} else if (toolName === 'analyze_query_result') {
  summary = 'ANALYZE: 分析结果'
} else if (toolName === 'get_database_stats') {
  summary = 'STATS: 数据库统计'
}
```

#### 修改4: 更新formatToolSummary函数
```typescript
// 支持Backend Agent和Article Agent的所有工具前缀
const formatted = summary.replace(
  /^(UPDATE:|GET:|ERROR:|EDIT:|READ:|QUERY:|SQL:|EXEC:|ANALYZE:|STATS:|TOOL:)(.*)$/, 
  '<strong>$1</strong>$2'
)
```

#### 修改5: 更新欢迎消息
```html
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
```

#### 修改6: 移除模式选择器
Admin页面不需要Agent/Ask模式切换，直接使用SQL查询助手模式。

#### 修改7: 更新输入提示
```html
<textarea 
  placeholder="询问数据库相关问题，例如：查询用户表有多少条记录..." 
/>
```

#### 修改8: 移除buildContext函数
后端已经定义了系统提示，前端不需要再构建上下文。

## API对比

### Article Agent API (Publish页面)
```typescript
agentAPI.sendMessage(
  articleInfo,
  userMessage,
  articleContent,
  sessionId,
  type,
  model
)
```

### Backend Agent API (Admin页面)
```typescript
backendAgentAPI.sendMessage(
  userMessage,
  sessionId,
  model
)
```

## 工具对比

### Article Agent 工具
- read_article - 读取文章
- edit_article - 编辑文章
- edit_article_batch - 批量编辑
- update_title - 更新标题
- update_category - 更新分类
- update_tags - 更新标签
- get_categories - 获取分类
- get_tags - 获取标签

### Backend Agent 工具
- get_table_list - 获取表列表
- get_table_structure - 查看表结构
- generate_sql - 生成SQL
- execute_sql - 执行SQL（仅SELECT）
- analyze_query_result - 分析结果
- get_database_stats - 数据库统计

## UI变化

### 修改前
- 显示模式选择器（Agent/Ask）
- 欢迎消息：通用的AI助手介绍
- 输入提示：询问任何问题

### 修改后
- **移除**模式选择器
- 欢迎消息：专门的数据库查询助手介绍，列出功能清单
- 输入提示：询问数据库相关问题，带示例

## 工具消息前缀

### Backend Agent 前缀
- `QUERY:` - 查询操作（获取表列表、表结构）
- `SQL:` - SQL生成操作
- `EXEC:` - SQL执行操作
- `ANALYZE:` - 分析操作
- `STATS:` - 统计信息操作

### Article Agent 前缀（保留兼容）
- `READ:` - 读取操作
- `EDIT:` - 编辑操作
- `UPDATE:` - 更新操作
- `GET:` - 获取操作

### 通用前缀
- `ERROR:` - 错误信息
- `TOOL:` - 默认工具调用

## 测试建议

### 基础功能测试
1. **表查询测试**
   - 输入："显示所有数据库表"
   - 预期：调用 `get_table_list` 工具

2. **表结构测试**
   - 输入："查看users表的结构"
   - 预期：调用 `get_table_structure` 工具

3. **SQL生成测试**
   - 输入："查询用户表有多少条记录"
   - 预期：调用 `generate_sql` 和 `execute_sql` 工具

4. **统计信息测试**
   - 输入："查看数据库统计信息"
   - 预期：调用 `get_database_stats` 工具

### UI测试
1. 验证欢迎消息显示正确
2. 验证模式选择器已隐藏
3. 验证输入提示文字正确
4. 验证工具消息显示正确的前缀和图标

### 流式响应测试
1. 验证思考过程（thinking）显示
2. 验证工具调用状态显示
3. 验证最终回复显示
4. 验证错误处理

## 兼容性说明

- 保留了Article Agent的工具处理逻辑（用于未来可能的功能扩展）
- 所有工具前缀都已在`formatToolSummary`函数中注册
- API结构保持向后兼容

## 注意事项

1. ⚠️ 确保后端`backend_agent_sessions`表已创建
2. ⚠️ 确保后端路由已配置
3. ⚠️ 确保API endpoint `/api/backend/agent/chat` 可访问
4. ⚠️ 验证代理配置（如果使用开发服务器）

## 后续优化建议

1. **会话管理**: 实现会话保存和加载功能
2. **查询历史**: 添加查询历史记录功能
3. **快捷查询**: 添加常用SQL查询模板
4. **结果导出**: 支持查询结果导出为CSV/Excel
5. **语法高亮**: SQL代码块添加语法高亮
6. **查询收藏**: 允许用户收藏常用查询

## 开发者信息

- 前端API文件: `blog/src/apis/aiChat/index.ts`
- Admin页面: `blog/src/views/Admin/index.vue`
- 后端服务: `my-blogv2/service/BackAgentService.go`
