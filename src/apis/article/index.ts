import http from "@/utils/http.ts";

// 获取文章详细
export const getArticleDetail = (id: string | string[]) => {
    return http.request({
        url: `/article/detail/${id}`,
        method: "get"
    });
}

// 获取评论
export const getComment = (type: number, typeId: number, pageNum: string, pageSize: string) => {
    return http.request({
        url: '/comment/getComment',
        method: "get",
        params: {
            type,
            typeId,
            pageNum,
            pageSize
        }
    });
}

// 用户添加评论
export const addComment = (data: object) => {
    return http.request({
        url: '/comment/auth/add/comment',
        method: "post",
        data
    });
}

// 时间轴
export const getTimeLine = () => {
    return http.request({
        url: '/article/timeLine',
        method: "get"
    });
}

// 查询不同类型下的文章列表
export function whereArticleList(type: Number, typeId: String) {
    return http.get(`/article/where/list/${typeId}`, {
        method: "get",
        params: {
            type
        }
    });
}

// 文章访问量+1
export function addArticleVisit(id: String) {
    return http.get(`/article/visit/${id}`, {
        method: "get"
    });
}

// 获取初始化时标题搜索数据
export function getSearchTitleList() {
    return http.get(`/article/search/init/title`, {
        method: "get"
    });
}

// 对内容进行文章搜索
export function searchArticleContent(content: String) {
    return http.get('/article/search/by/content', {
        params: {
            content
        },
        method: "get"
    });
}

// 搜索热门推荐
export function getHotRecommend() {
    return http.get(`/article/hot`, {
        method: "get"
    });
}

// 发布文章相关接口
// 查询文章分类
export async function articleCategory() {
    return http.request({
        url: '/category/list',
        method: 'get'
    });
}

// 查询文章标签
export async function articleTag() {
    return http.request({
        url: '/tag/list',
        method: 'get'
    });
}

// 新增标签
export async function addTag(data: any) {
    return http.request({
        url: '/tag',
        method: 'put',
        data
    });
}

// 新增分类
export async function addCategory(data: any) {
    return http.request({
        url: '/category',
        method: 'put',
        data
    });
}

// 上传文章封面
export async function uploadCover(data: any) {
    return http.request({
        url: '/article/upload/articleCover',
        method: 'post',
        data,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

// 发布文章
export async function publishArticle(data: any) {
    return http.request({
        url: '/article/publish',
        method: 'post',
        data
    });
}

// 发布错误，删除封面
export async function deleteCover(articleCoverUrl: string) {
    return http.request({
        url: '/article/delete/articleCover',
        method: 'get',
        params: { articleCoverUrl }
    });
}

// 上传文章图片
export async function uploadArticleImage(data: any) {
    return http.request({
        url: '/article/upload/articleImage',
        method: 'post',
        data,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}

// 文章列表
export async function articleList(pageNum: number, pageSize: number) {
    return http.request({
        url: '/article/back/list',
        method: 'get',
        params: {
            pageNum,
            pageSize
        }
    });
}

// 文章搜索
export async function articleSearch(data: any, pageNum: number, pageSize: number) {
    return http.request({
        url: '/article/back/search',
        method: 'post',
        data,
        params: {
            pageNum,
            pageSize
        }
    });
}

// 修改文章状态
export async function updateArticleStatus(data: any) {
    return http.request({
        url: '/article/back/update/status',
        method: 'post',
        params: data
    });
}

// 修改文章是否顶置
export async function updateArticleTop(data: any) {
    return http.request({
        url: '/article/back/update/isTop',
        method: 'post',
        params: data
    });
}

// 回显文章数据
export async function getArticle(articleId: string) {
    return http.request({
        url: `/article/back/echo/${articleId}`,
        method: 'get'
    });
}

// 删除文章
export async function deleteArticle(ids: string[]) {
    return http.request({
        url: '/article/back/delete',
        method: 'delete',
        data: JSON.stringify(ids)
    });
}
