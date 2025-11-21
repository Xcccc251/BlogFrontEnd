import http from "@/utils/http.ts";

// 查询所有权限字符
export function permissionList() {
    return http.request({
        url: '/permission/list',
        method: 'get'
    });
}

// 搜索权限
export function searchPermissionList(permissionDesc?: string, permissionKey?: string, permissionMenuId?: string) {
    return http.request({
        url: '/permission/search',
        method: 'get',
        params: {
            permissionDesc,
            permissionKey,
            permissionMenuId,
        }
    });
}

// 查询所有权限所在菜单
export function permissionMenuList() {
    return http.request({
        url: '/permission/menu',
        method: 'get'
    });
}

// 添加权限
export function addPermission(data: object) {
    return http.request({
        url: '/permission/add',
        method: 'post',
        data
    });
}

// 修改权限
export function updatePermission(data: object) {
    return http.request({
        url: '/permission/update',
        method: 'post',
        data
    });
}

// 获取对应权限信息
export function getPermission(permissionId: string) {
    return http.request({
        url: `/permission/get/${permissionId}`,
        method: 'get'
    });
}

// 删除对应权限
export function deletePermission(permissionId: string) {
    return http.request({
        url: `/permission/delete/${permissionId}`,
        method: 'delete'
    });
}

// 批量授权权限给角色
export function batchAuthPermission(data: any) {
    return http.request({
        url: '/permission/batch/auth',
        method: 'post',
        data
    });
}

// 权限授权角色相关接口
// 查询对应权限的角色
export function queryPermissionRole(permissionId: string, roleName?: string, roleKey?: string) {
    return http.request({
        url: '/role/permission/role/list',
        method: 'get',
        params: {
            permissionId,
            roleName,
            roleKey
        }
    });
}

// 查询未分配该权限的角色列表
export function queryPermissionNotRole(permissionId: string, roleName?: string, roleKey?: string) {
    return http.request({
        url: '/role/permission/not/role/list',
        method: 'get',
        params: {
            permissionId,
            roleName,
            roleKey
        }
    });
}

// 添加角色权限关系
export function addRolePermission(data: any) {
    return http.request({
        url: '/role/permission/add',
        method: 'post',
        data
    });
}

// 删除角色权限关系（取消授权）
export function deleteRolePermission(data: any) {
    return http.request({
        url: '/role/permission/delete',
        method: 'delete',
        data
    });
}
