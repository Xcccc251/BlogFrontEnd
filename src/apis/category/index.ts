import http from "@/utils/http.ts";

// 查询分类列表（前台）
export function categoryList() {
    return http.get("/category/list", {
        method: "get"
    });
}

// 后台分类列表
export function categoryBackList() {
    return http.get("/category/back/list", {
        method: "get"
    });
}

// 搜索分类
export function searchCategory(data: any) {
    return http.post("/category/back/search", data);
}

// 根据id搜索分类
export function searchCategoryById(id: string) {
    return http.get(`/category/back/get/${id}`);
}

// 新增分类
export function addCategory(data: any) {
    return http.post("/category/back/add", data);
}

// 修改分类
export function updateCategory(data: any) {
    return http.post("/category/back/update", data);
}

// 删除分类
export function deleteCategoryByIds(ids: number[]) {
    return http.delete("/category/back/delete", {
        data: ids
    });
}