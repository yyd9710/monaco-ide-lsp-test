# Vue3 + Element Plus + TypeScript 项目

这是一个基于 Vue 3、Element Plus 和 TypeScript 的前端项目模板。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - JavaScript 的超集，提供类型支持
- **Element Plus** - 基于 Vue 3 的组件库
- **Vite** - 下一代前端构建工具
- **Vue Router** - Vue.js 官方路由管理器
- **Pinia** - Vue 的状态管理库

## 项目结构

```
frontend/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # 公共组件
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia 状态管理
│   ├── views/           # 页面组件
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
└── vite.config.ts       # Vite 配置
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

项目将在 `http://localhost:3000` 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 功能特性

- ✅ Vue 3 Composition API
- ✅ TypeScript 完整支持
- ✅ Element Plus UI 组件库
- ✅ Vue Router 路由管理
- ✅ Pinia 状态管理
- ✅ 路径别名配置 (@/)
- ✅ 开发服务器自动打开浏览器

## 开发说明

- 所有组件使用 `<script setup>` 语法
- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 最佳实践
- Element Plus 已配置中文语言包


