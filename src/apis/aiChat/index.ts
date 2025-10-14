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
  }
}

// 聊天API
export const chatAPI = {
  // 发送消息（流式响应）
  sendMessage(message: string, sessionId: string | null) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId
      })
    })
  }
}

export default api
