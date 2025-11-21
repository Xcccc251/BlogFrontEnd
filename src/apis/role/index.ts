import http from "@/utils/http.ts";

// 查询所有角色信息
export function roleList() {
    return http.request({
        url: '/role/list',
        method: 'get'
    });
}

// 更新角色状态
export function roleUpdateStatus(id: string, status: number) {
    return http.request({
        url: '/role/update/status',
        method: 'post',
        data: { id, status }
    });
}

// 获取角色信息
export function roleInfoById(id: string) {
    return http.request({
        url: `/role/get/${id}`,
        method: 'get'
    });
}

// 修改角色信息
export function roleUpdate(data: any) {
    return http.request({
        url: '/role/update',
        method: 'put',
        data
    });
}

// 添加角色信息
export function roleInsert(data: any) {
    return http.request({
        url: '/role/add',
        method: 'put',
        data
    });
}

// 删除角色
export function roleDelete(ids: string[]) {
    return http.request({
        url: '/role/delete',
        method: 'delete',
        data: { ids }
    });
}

// 搜索角色
export function roleSearch(data: any) {
    return http.request({
        url: '/role/search',
        method: 'post',
        data
    });
}

// 角色授权用户相关接口
// 查询对应角色的用户
export function queryRoleUser(roleId: string, username?: string, email?: string) {
    return http.request({
        url: '/user/role/user/list',
        method: 'get',
        params: {
            roleId,
            username,
            email
        }
    });
}

// 查询没有对应角色的用户
export function queryNotRoleUser(roleId: string, username?: string, email?: string) {
    return http.request({
        url: '/user/role/not/user/list',
        method: 'get',
        params: {
            roleId,
            username,
            email
        }
    });
}

// 给用户添加角色权限
export function addUserRole(data: any) {
    return http.request({
        url: '/user/role/add',
        method: 'post',
        data
    });
}

// 取消用户授权
export function deleteUserRole(data: any) {
    return http.request({
        url: '/user/role/delete',
        method: 'delete',
        data
    });
}
