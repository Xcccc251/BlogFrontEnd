import http from "@/utils/http.ts";

// 执行SQL查询
export const executeQuery = (sql: string) => {
    return http.request({
        url: '/database/query',
        method: "post",
        data: { sql }
    });
}

// 获取数据库表列表
export const getTableList = () => {
    return http.request({
        url: '/database/tables',
        method: "get"
    });
}

// 获取表结构
export const getTableStructure = (tableName: string) => {
    return http.request({
        url: '/database/table/structure',
        method: "get",
        params: { tableName }
    });
}

// 获取数据库统计信息
export const getDatabaseStats = () => {
    return http.request({
        url: '/database/stats',
        method: "get"
    });
}
