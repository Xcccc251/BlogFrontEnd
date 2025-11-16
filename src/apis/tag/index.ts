import http from "@/utils/http.ts";

// 所有标签
export function tagList() {
    return http.get("/tag/list", {
        method: "get"
    });
}

// 后台标签列表
export async function tagBackList() {
    return http.request({
        url: '/tag/back/list',
        method: 'get'
    });
}

// 搜索标签
export async function searchTag(data: any) {
    return http.request({
        url: '/tag/back/search',
        method: 'post',
        data
    });
}

// 根据id搜索标签
export async function searchTagById(id: string) {
    return http.request({
        url: `/tag/back/get/${id}`,
        method: 'get'
    });
}

// 新增标签
export async function addTag(data: any) {
    return http.request({
        url: '/tag/back/add',
        method: 'put',
        data
    });
}

// 修改标签
export async function updateTag(data: any) {
    return http.request({
        url: '/tag/back/update',
        method: 'post',
        data
    });
}

// 删除标签
export async function deleteTagByIds(ids: string[]) {
    return http.request({
        url: '/tag/back/delete',
        method: 'delete',
        data: JSON.stringify(ids)
    });
}