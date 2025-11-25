import http from '@/utils/http'
import { GET_TOKEN } from '@/utils/auth'
import { Jwt_Prefix } from '@/const/Jwt'

// 会话管理API
export const sessionAPI = {
  // 获取所有会话
  getSessions() {
    return http.request({
      url: '/sessions',
      method: 'get'
    })
  },
  
  // 创建新会话
  createSession() {
    return http.request({
      url: '/sessions',
      method: 'post'
    })
  },
  
  // 加载指定会话
  loadSession(sessionId: string) {
    return http.request({
      url: `/sessions/${sessionId}`,
      method: 'get'
    })
  },
  
  // 删除会话
  deleteSession(sessionId: string) {
    return http.request({
      url: `/sessions/${sessionId}`,
      method: 'delete'
    })
  },

  getModels() {
    return http.request({
      url: '/models',
      method: 'get'
    })
  },
}

// 聊天API
export const chatAPI = {
  // 发送消息（流式响应）
  sendMessage(message: string, sessionId: string | null, model: string) {
    const token = GET_TOKEN()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'Frontend'
    }
    if (token) {
      headers['Authorization'] = Jwt_Prefix + token
    }
    
    return fetch('/api/chat', {
      method: 'POST',
      headers,
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
    const token = GET_TOKEN()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'Frontend'
    }
    if (token) {
      headers['Authorization'] = Jwt_Prefix + token
    }
    
    return fetch('/api/agent/chat', {
      method: 'POST',
      headers,
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
    return http.request({
      url: '/agent/sessions',
      method: 'post'
    })
  },

  // 获取所有会话
  getAgentSessions() {
    return http.request({
      url: '/agent/sessions',
      method: 'get'
    })
  },
    
    // 加载指定会话
  loadAgentSession(sessionId: string) {
    return http.request({
      url: `/agent/sessions/${sessionId}`,
      method: 'get'
    })
  },
    
    // 删除会话
  deleteAgentSession(sessionId: string) {
    return http.request({
      url: `/agent/sessions/${sessionId}`,
      method: 'delete'
    })
  },

  getArticle(articleId: string) {
    return http.request({
      url: `/agent/article/${articleId}`,
      method: 'get'
    })
  },

  saveArticle(sessionId: string, articleContent: string, articleTitle: string, articleCover: string, articleCategory: string, articleTagArray: string[]) {
    return http.request({
      url: '/agent/save/article',
      method: 'post',
      data: {
        session_id: sessionId,
        article_content: articleContent,
        article_title: articleTitle,
        article_cover: articleCover,
        article_category: articleCategory,
        article_tags: JSON.stringify(articleTagArray)
      }
    })
  },

  // 获取可用模型列表
  getModels() {
    return http.request({
      url: '/agent/models',
      method: 'get'
    })
  },
}

// 后台Agent API（用于Admin页面，提供SQL查询工具）
export const backendAgentAPI = {
  // 发送消息（流式响应）- 用于admin页面的SQL查询助手
  sendMessage(userMessage: string, sessionId: string | null, model: string, level: number, currentPage: string) {
    const token = GET_TOKEN()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'Frontend'
    }
    if (token) {
      headers['Authorization'] = Jwt_Prefix + token
    }
    
    return fetch('/api/backend/agent/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_message: userMessage,
        session_id: sessionId,
        model: model,
        level: level,
        current_page: currentPage
      })
    })
  },
  
  // 创建新会话
  createSession() {
    return http.request({
      url: '/backend/agent/sessions',
      method: 'post'
    })
  },

  // 获取所有会话
  getSessions() {
    return http.request({
      url: '/backend/agent/sessions',
      method: 'get'
    })
  },
    
  // 加载指定会话
  loadSession(sessionId: string) {
    return http.request({
      url: `/backend/agent/sessions/${sessionId}`,
      method: 'get'
    })
  },
    
  // 删除会话
  deleteSession(sessionId: string) {
    return http.request({
      url: `/backend/agent/sessions/${sessionId}`,
      method: 'delete'
    })
  },

  // 获取可用模型列表（共享agent模型列表）
  getModels() {
    return http.request({
      url: '/agent/models',
      method: 'get'
    })
  },

  // SQL 确认
  confirmSql(data: { session_id: string; confirm_id: string; confirmed: boolean }) {
    return http.request({
      url: '/backend/agent/confirm-sql',
      method: 'post',
      data
    })
  },
}


export default http
