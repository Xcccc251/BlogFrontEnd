import http from "@/utils/http.ts";

// 评论列表
export function commentList() {
    return http.get("/comment/back/list", {
        method: "get"
    });
}

// 搜索评论
export function searchComment(data: any) {
    return http.post("/comment/back/search", data);
}

// 是否通过评论
export function isCheckComment(data: any) {
    return http.post("/comment/back/isCheck", data);
}

// 删除评论
export function deleteComment(id: string) {
    return http.delete(`/comment/back/delete/${id}`);
}
