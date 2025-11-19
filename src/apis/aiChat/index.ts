import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 会话管理API
export const sessionAPI = {
  // 获取所有会话
  getSessions() {
    return api.get('/sessions')
  },
  
  // 创建新会话
  createSession() {
    return api.post('/sessions')
  },
  
  // 加载指定会话
  loadSession(sessionId: string) {
    return api.get(`/sessions/${sessionId}`)
  },
  
  // 删除会话
  deleteSession(sessionId: string) {
    return api.delete(`/sessions/${sessionId}`)
  },

  getModels() {
    return api.get('/models')
  },
}

// 聊天API
export const chatAPI = {
  // 发送消息（流式响应）
  sendMessage(message: string, sessionId: string | null, model: string) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        model: model
      })
    })
  },
}

export const agentAPI = {
  // 发送消息（流式响应）
  sendMessage(articleInfo:string, userMessage: string, articleContent: string, sessionId: string | null, type: string, model: string) {
    return fetch('/api/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        article_info:articleInfo,
        article_content: articleContent,
        user_message: userMessage,
        type: type,
        session_id: sessionId,
        model: model
      })
    })
  },  
  
  createAgentSession() {
    return api.post('/agent/sessions')
  },

  // 获取所有会话
  getAgentSessions() {
    return api.get('/agent/sessions')
  },
    
    // 加载指定会话
  loadAgentSession(sessionId: string) {
    return api.get(`/agent/sessions/${sessionId}`)
  },
    
    // 删除会话
  deleteAgentSession(sessionId: string) {
    return api.delete(`/agent/sessions/${sessionId}`)
  },

  getArticle(articleId: string) {
    return api.get(`/agent/article/${articleId}`)
  },

  saveArticle(sessionId: string, articleContent: string, articleTitle: string, articleCover: string, articleCategory: string, articleTagArray: string[]) {
    return api.post(`/agent/save/article`, {
      session_id: sessionId,
      article_content: articleContent,
      article_title: articleTitle,
      article_cover: articleCover,
      article_category: articleCategory,
      article_tags: JSON.stringify(articleTagArray)
    })
  },

  // 获取可用模型列表
  getModels() {
    return api.get('/agent/models')
  },
}

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

  // SQL 确认
  confirmSql(data: { session_id: string; confirm_id: string; confirmed: boolean }) {
    return api.post('/backend/agent/confirm-sql', data)
  },
}


export default api
