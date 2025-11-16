import http from "@/utils/http.ts"

// 图谱API基础URL
const GRAPH_API_BASE = '/graph'

// 获取图谱概览
export const getGraphOverview = (params?: {
  limit?: number
  type?: string
  depth?: number
}) => {
  return http.request({
    url: `${GRAPH_API_BASE}/overview`,
    method: 'get',
    params
  })
}

// 获取图谱节点列表
export const getGraphNodes = (params?: {
  page?: number
  size?: number
  type?: string
  keyword?: string
  sort?: string
  order?: string
}) => {
  return http.request({
    url: `${GRAPH_API_BASE}/nodes`,
    method: 'get',
    params
  })
}

// 执行自定义Cypher查询
export const executeGraphQuery = (query: string) => {
  return http.request({
    url: `${GRAPH_API_BASE}/query`,
    method: 'post',
    data: {
      query
    }
  })
}
