import http from "@/utils/http.ts";

// 收藏
export const userFavorite = (type: number,typeId: string) => {
    return http.request({
        url: '/favorite/auth/favorite',
        method: "post",
        params: {
            type,
            typeId
        }
    });
}

// 取消收藏
export const cancelFavorite = (type: number,typeId: string) => {
    return http.request({
        url: '/favorite/auth/favorite',
        method: "delete",
        params: {
            type,
            typeId
        }
    });
}

// 是否收藏
export const isFavorite = (type: number,typeId: string) => {
    return http.request({
        url: '/favorite/whether/favorite',
        method: "get",
        params: {
            type,
            typeId
        }
    });
}

// 后台管理 - 获取收藏列表
export const favoriteList = () => {
    return http.request({
        url: '/favorite/back/list',
        method: "get"
    });
}

// 后台管理 - 搜索收藏
export const searchFavorite = (data: any) => {
    return http.request({
        url: '/favorite/back/search',
        method: "post",
        data
    });
}

// 后台管理 - 是否有效
export const isCheckFavorite = (data: any) => {
    return http.request({
        url: '/favorite/back/isCheck',
        method: "post",
        data
    });
}

// 后台管理 - 删除收藏
export const deleteFavorite = (ids: string[]) => {
    return http.request({
        url: '/favorite/back/delete',
        method: "delete",
        data: ids
    });
}