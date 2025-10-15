# 文章发布模块

这是一个完整的文章发布功能模块，包含了富文本编辑、图片上传、分类标签管理等功能。

## 📁 文件结构

```
article-publish-module/
├── src/
│   ├── pages/blog/essay/publish/     # 核心页面文件
│   │   ├── index.vue                 # 主页面组件
│   │   └── type.ts                   # 类型定义
│   ├── api/blog/article/             # API接口
│   │   └── index.ts                  # 文章相关API
│   ├── components/                   # 组件文件
│   │   ├── layout/
│   │   │   └── index.vue             # 布局组件
│   │   └── page-container/
│   │       └── index.vue             # 页面容器组件
│   ├── stores/                       # 状态管理
│   │   ├── multi-tab.ts              # 多标签页状态
│   │   ├── app.ts                    # 应用状态
│   │   └── layout-menu.ts            # 布局菜单状态
│   ├── utils/                        # 工具类
│   │   └── request.ts                # HTTP请求工具
│   ├── composables/                  # 组合式函数
│   │   ├── api.ts                    # API组合式函数
│   │   ├── authorization.ts          # 授权相关
│   │   └── i18n-locale.ts            # 国际化
│   ├── enums/                        # 枚举定义
│   │   └── http-enum.ts              # HTTP枚举
│   └── layouts/basic-layout/         # 布局相关
│       ├── context.ts                # 布局上下文
│       └── typing.ts                 # 布局类型
└── README.md                         # 说明文档
```

## 🚀 功能特性

- ✅ **富文本编辑**: 基于 md-editor-v3 的 Markdown 编辑器
- ✅ **图片上传**: 支持文章封面和内容图片上传
- ✅ **分类管理**: 文章分类的增删改查
- ✅ **标签管理**: 文章标签的增删改查
- ✅ **文章状态**: 支持公开、私密、草稿状态
- ✅ **文章类型**: 支持原创、转载、翻译类型
- ✅ **置顶功能**: 支持文章置顶
- ✅ **多标签页**: 集成多标签页管理
- ✅ **响应式设计**: 适配不同屏幕尺寸

## 📦 依赖包

在目标项目中需要安装以下依赖：

```bash
# 核心依赖
npm install md-editor-v3
npm install ant-design-vue
npm install @vueuse/core
npm install axios
npm install dayjs

# 开发依赖
npm install @types/node
npm install typescript
npm install vue
```

## 🔧 集成步骤

### 1. 复制文件
将所有文件复制到目标项目的相应目录中。

### 2. 安装依赖
安装上述依赖包。

### 3. 配置路由
在目标项目的路由配置中添加：

```typescript
{
  path: '/blog/essay/publish',
  name: 'ArticlePublish',
  component: () => import('@/pages/blog/essay/publish/index.vue'),
  meta: {
    title: '发布文章',
    keepAlive: true
  }
}
```

### 4. 调整导入路径
根据目标项目的目录结构调整所有文件中的 import 路径。

### 5. 配置API基础地址
在 `src/utils/request.ts` 中配置正确的 API 基础地址：

```typescript
const instance: AxiosInstance = axios.create({
  baseURL: 'YOUR_API_BASE_URL', // 修改为实际的API地址
  timeout: 60000,
  headers: { 'Content-Type': ContentTypeEnum.JSON },
})
```

### 6. 配置环境变量
在目标项目的 `.env` 文件中添加：

```env
VITE_APP_BASE_API=your_api_base_url
```

## 🎯 使用方式

```vue
<template>
  <ArticlePublish />
</template>

<script setup>
import ArticlePublish from '@/pages/blog/essay/publish/index.vue'
</script>
```

## 📝 API接口说明

### 文章相关接口
- `GET /category/list` - 获取分类列表
- `GET /tag/list` - 获取标签列表
- `PUT /category` - 添加分类
- `PUT /tag` - 添加标签
- `POST /article/upload/articleCover` - 上传文章封面
- `POST /article/upload/articleImage` - 上传文章图片
- `POST /article/publish` - 发布文章
- `GET /article/back/echo/{id}` - 获取文章详情

## 🎨 样式定制

模块使用了 Ant Design Vue 的组件，可以通过以下方式定制样式：

1. 修改主题色：在 `src/stores/app.ts` 中调整 `colorPrimary`
2. 自定义样式：在组件中添加 scoped 样式
3. 全局样式：在项目的全局样式文件中添加

## 🔍 注意事项

1. **权限控制**: 确保用户有相应的权限才能访问发布页面
2. **文件上传**: 需要配置正确的文件上传接口和存储
3. **图片处理**: 建议对上传的图片进行压缩和格式转换
4. **数据验证**: 在发布前进行必要的数据验证
5. **错误处理**: 完善错误处理和用户提示

## 📞 技术支持

如有问题，请检查：
1. 依赖包是否正确安装
2. API接口是否可正常访问
3. 路由配置是否正确
4. 导入路径是否匹配

## 📄 许可证

此模块遵循原项目的许可证协议。
