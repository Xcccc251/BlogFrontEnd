export const constantRouter = [
    {
        path: '/',
        name: 'layout',
        component: () => import('@/views/Layout/index.vue'),
        children: [
            // 首页
            {
                path: '',
                component: () => import('@/views/Home/index.vue'),
                name: 'home',
                meta: {
                    title: 'Welcome',
                }
            },
            // 时间轴
            {
                path: '/timeline',
                component: () => import('@/views/Pigeonhole/TimeLine/index.vue'),
                name: 'timeline',
                meta: {
                    title: '时间轴',
                }
            },
            // 分类
            {
                path: '/category/:id?',
                component: () => import('@/views/Pigeonhole/Category/index.vue'),
                name: 'category',
                meta: {
                    title: '文章分类',
                }
            },
            // 标签
            {
                path: '/tags/:id?',
                component: () => import('@/views/Pigeonhole/Tags/index.vue'),
                name: 'tags',
                meta: {
                    title: '文章标签',
                }
            },
            // 树洞
            {
                path: '/tree-hole',
                component: () => import('@/views/Amusement/TreeHole/index.vue'),
                name: 'treeHole',
                meta: {
                    title: '心灵树洞',
                }
            },
            // 留言版
            {
                path: '/message',
                component: () => import('@/views/Amusement/Message/index.vue'),
                name: 'message',
                children: [
                    {
                        path: '',
                        component: () => import('@/views/Amusement/Message/MessageList/index.vue'),
                        name: 'messageList',
                        meta: {
                            title: '留言板',
                        }
                    },
                    {
                        path: '/message/detail/:id?',
                        component: () => import('@/views/Amusement/Message/MessageDetail/index.vue'),
                        name: 'messageDetail',
                        meta: {
                            title: '留言详情',
                        }
                    }
                ]
            },
            // 友链
            {
                path: '/link',
                component: () => import('@/views/Link/index.vue'),
                name: 'link',
                meta: {
                    title: '博客友链',
                }
            },
            // 音乐
            {
                path: '/music',
                component: () => import('@/views/Music/index.vue'),
                name: 'music',
                meta: {
                    title: '音乐',
                }
            },
            // AI对话
            {
                path: '/ai-chat',
                component: () => import('@/views/AiChat/index.vue'),
                name: 'aiChat',
                meta: {
                    title: 'AI智能对话',
                }
            },
            // 关于
            {
                path: '/about',
                component: () => import('@/views/About/index.vue'),
                name: 'about',
                meta: {
                    title: '关于网站',
                }
            },
            // 发布文章
            {
                path: '/publish',
                component: () => import('@/views/Publish/index.vue'),
                name: 'publish',
                meta: {
                    title: '发布文章',
                    requireAuth: true
                }
            },
            // 后台管理
            {
                path: '/admin',
                component: () => import('@/views/Admin/index.vue'),
                name: 'admin',
                redirect: '/admin/article',
                meta: {
                    title: '后台管理',
                    requireAuth: true
                },
                children: [
                    {
                        path: 'article',
                        component: () => import('@/views/Admin/Article/index.vue'),
                        name: 'adminArticle',
                        meta: {
                            title: '文章管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'category',
                        component: () => import('@/views/Admin/Category/index.vue'),
                        name: 'adminCategory',
                        meta: {
                            title: '分类管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'tag',
                        component: () => import('@/views/Admin/Tag/index.vue'),
                        name: 'adminTag',
                        meta: {
                            title: '标签管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'comment',
                        component: () => import('@/views/Admin/Comment/index.vue'),
                        name: 'adminComment',
                        meta: {
                            title: '评论管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'favorite',
                        component: () => import('@/views/Admin/Favorite/index.vue'),
                        name: 'adminFavorite',
                        meta: {
                            title: '收藏管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'database',
                        component: () => import('@/views/Admin/Database/index.vue'),
                        name: 'adminDatabase',
                        meta: {
                            title: '数据库管理',
                            requireAuth: true
                        }
                    },
                    {
                        path: 'graph',
                        component: () => import('@/views/Admin/Graph/index.vue'),
                        name: 'adminGraph',
                        meta: {
                            title: '知识图谱',
                            requireAuth: true
                        }
                    }
                ]
            }
        ]
    },
    // 文章
    {
        path: '/article/:id',
        component:
            () => import('@/views/Article/index.vue'), 
        name: 'article',
        meta: {
            title: '文章详情',
        }
    },
    // 登录
    {
        path: '/welcome',
        component: () => import('@/views/Welcome/index.vue'),
        name: 'welcome',
        redirect: '/login',
        children: [
            {
                path: '/login',
                component: () => import('@/views/Welcome/Login/index.vue'),
                name: 'welcome-login',
                meta: {
                    title: '用户登录',
                }
            },
            {
                path: '/register',
                component: () => import('@/views/Welcome/Register/index.vue'),
                name: 'welcome-register',
                meta: {
                    title: '用户注册',
                }
            },
            {
                path: '/reset',
                component: () => import('@/views/Welcome/Reset/index.vue'),
                name: 'welcome-reset',
                meta: {
                    title: '重置密码',
                }
            }
        ]
    },
    // 设置
    {
        path: '/setting',
        component: () => import('@/views/Setting/index.vue'),
        name: 'setting',
        meta: {
            title: '用户设置',
        }
    },
    // Monaco Editor Diff 测试页面
    {
        path: '/test',
        component: () => import('@/views/Test/index.vue'),
        name: 'test',
        meta: {
            title: 'Monaco Editor 测试',
        }
    },
    // 访问其他任何不存在的路由，重定向到首页
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
        name: 'any',
    }
]