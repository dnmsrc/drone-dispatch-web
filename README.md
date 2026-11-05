# drone-dispatch-web（管理后台 · 正式版）

> 本目录是**独立 Git 仓库**（仓库名即目录名 `drone-dispatch-web`），`git log` 只包含前端相关提交，
> 与顶层文档仓、`drone-dispatch-h5`、`drone-dispatch-server` 互不混杂。仓库结构说明见上级 `README.md`。

星穹 SkyShow 无人机派单系统 · Web 管理后台，技术栈 **Vue 3 + TypeScript + Vite + Element Plus + Sass**。

- 原型基线：`drone-dispatch-prototype/admin`（Vue3 + Vite + Element Plus + Pinia + ECharts，若伊 RuoYi 风格）
- 负责：登录鉴权、看板、订单流转（接单/拒单/开始/完成）、退款审批、档期与配置、字典、用户与评价、场地

**当前状态：前端骨架 + 主题包 + 基础控件重写 + 布局框架（侧边栏 / 顶栏 / 多页签 / 路由菜单）已就绪，可启动、可构建；11 个业务页面为占位组件，待逐页从原型迁移。**

## 快速开始

```bash
cd drone-dispatch-web
npm install
npm run dev     # 打开 http://localhost:8091
```

其他命令：

```bash
npm run build     # 类型检查（vue-tsc）+ 打包到 dist/
npm run preview   # 预览打包产物
```

## 目录结构

```
drone-dispatch-web/
├── index.html          # 入口页（标题、lang=zh-CN）
├── vite.config.ts      # 固定开发端口 8091 + @ → src 别名
├── tsconfig*.json      # TS 工程引用配置（含 element-plus/global 类型、@/* 路径）
├── public/             # 静态资源（favicon.svg）
└── src/
    ├── main.ts         # 应用入口：pinia + router + Element Plus（中文 locale）+ 图标注册 + 全局样式
    ├── App.vue         # 只渲染 router-view（页面在 layout 内）
    ├── router/         # 路由表（menuRoutes 与侧边栏菜单同源）+ 标题守卫
    ├── layout/         # 布局框架：侧边栏 / 顶栏 / 多页签 / 内容区（见下）
    ├── stores/         # pinia（tags-view 多页签状态）
    ├── config/         # 品牌常量（静态，后续改为接口拉取）
    ├── components/     # 公共组件（PagePlaceholder 占位页）
    ├── views/          # 业务页面（当前 11 个占位，逐个迁移原型）
    └── styles/         # 公共主题包 + 全局样式（见下）
```

## 主题包与 Element Plus 重写

### 样式目录

```
src/styles/
├── index.scss                     # 总入口：按固定顺序加载
├── base.scss                      # 全局基础样式（字体、背景、链接、滚动条）
└── theme/                         # 公共主题包
    ├── variables.scss             # 主题基础配置（字体/字号/颜色/圆角/间距/阴影）
    ├── index.scss                 # 输出 --app-* CSS 变量（供业务页面使用）
    └── element/
        ├── index.scss             # Element Plus 变量覆盖（@forward ... with）
        └── components/            # 基础控件重写（在 Element 默认样式之后加载）
            ├── button.scss        # 按钮
            ├── input.scss         # 输入框 / 文本域
            ├── select.scss        # 下拉
            ├── card.scss          # 卡片
            └── feedback.scss      # 弹窗 / 抽屉 / 消息框（小屏视口）
```

`styles/index.scss` 的加载顺序不可调换：**主题变量 → Element 变量定制 → Element 全量样式 → 控件重写 → 全局基础**。
Element 的变量定制必须早于其样式生效，控件重写必须晚于其默认样式才能覆盖。

### 主题取值来源

主题包数值取自原型管理端（若伊 RuoYi 风格）：

| 项目 | 取值 |
|---|---|
| 主色 | `#409eff`（hover `#66b1ff` / active `#3a8ee6` / 浅底 `#ecf5ff`） |
| 正文 | 14px，文字色 `#303133` / `#606266` / `#909399` |
| 控件 | 字号 13px、高度 32px（大 40 / 小 24）、圆角 4px |
| 页面底 | `#f0f2f5` |
| 卡片 | 内边距 16px、阴影 `0 1px 4px rgba(0, 21, 41, 0.08)` |
| 下拉面板 | 圆角 4px、阴影 `0 2px 12px rgba(0, 0, 0, 0.1)` |

### 两种使用方式

```scss
// 1) SCSS 变量（组件内）
@use '@/styles/theme' as theme;

.title { color: theme.$color-primary; font-size: theme.$font-size-base; }
```

```css
/* 2) CSS 变量（不需要 SCSS，任意组件可用） */
.title { color: var(--app-color-primary); padding: var(--app-space-md); }
```

### 已重写的控件（与 Element 默认的差异点）

| 控件 | 重写内容 |
|---|---|
| 按钮 | 字号 13px（大 14 / 小 12）、4px 圆角；主色 hover/active 固定为 `light-3` / `dark-2`；禁用文字色统一 |
| 输入框 | 字号 13px；边框 / hover / 焦点 / 占位符色映射到主题变量 |
| 下拉 | 触发器与选项字号 13px；面板 4px 圆角、阴影 `0 2px 12px rgba(0,0,0,.1)`；选项 hover `#f5f7fa`、选中主色 500 字重 |
| 卡片 | 4px 圆角、16px 内边距、与原型的浅阴影（`shadow="never"` 时仍不显示阴影） |
| 弹窗 / 抽屉 / 消息框 | 小屏最大宽度 `calc(100vw - 32px)`，抽屉 `100vw`（规则取自原型响应式覆盖） |
| 全局 | 字体族、页面底色、链接色、8px 细滚动条（`#c0c4cc`） |

要新增控件重写：在 `theme/element/components/` 下加文件，并在 `styles/index.scss` 第 4 步追加 `@use`。

## 布局框架（layout）

### 结构

```
src/layout/
├── index.vue               # 外壳：侧边栏 + 右侧主区，管理折叠/窄屏/抽屉状态
└── components/
    ├── Sidebar.vue         # logo + 深色菜单（菜单项来自 router 的 menuRoutes）
    ├── Navbar.vue          # 折叠按钮 / 面包屑 / 全屏 / 用户下拉（个人中心、退出登录）
    ├── TagsView.vue        # 多页签（可关闭、右键"关闭其他"，首页固定不可关）
    └── AppMain.vue         # router-view + fade-transform 切换动画
```

### 行为（对齐原型 admin）

| 项 | 实现 |
|---|---|
| 侧边栏 | 展开 210px / 折叠 64px，深色 `#304156`，logo 区 `#2b2f3a`，选中项 `#263445` 底 + 3px 主色左条 |
| 自动折叠 | 视口 `< 992px` 自动折叠为只剩图标；`< 768px` 侧边栏变抽屉（遮罩 + 滑入，点菜单后自动收起） |
| 手动折叠 | 顶栏折叠按钮切换（窄屏时切换抽屉开合） |
| 顶栏 | 高 50px、白底 + 原型浅阴影；`< 576px` 隐藏面包屑与昵称 |
| 页签 | 高 34px；`meta.affix` 的（首页）不可关闭；`meta.hidden` 的路由不进菜单也不进页签 |
| 图标 | `@element-plus/icons-vue` 在 `main.ts` 全量注册，菜单用 `meta.icon` 字符串名动态渲染 |

### 菜单与路由同源

`src/router/index.ts` 导出 `menuRoutes`（含 `meta.title / icon / affix / hidden / roles`），
Sidebar 直接遍历该数组生成菜单 —— **新增页面 = 在 menuRoutes 加一条 + 建对应 view**，菜单自动出现。

当前 11 条：首页、咨询受理、订单管理、退款管理、档期管理、用户管理、评价管理、场地管理、业务配置、字典管理、
个人中心（`hidden`，从顶栏头像下拉进入）。页面均为 `PagePlaceholder` 占位组件，迁移时只换 `component` 指向的文件。

### 布局相关样式

布局配色/尺寸在主题包内，改一处全局生效：

- `src/styles/theme/variables.scss` → `$sidebar-*`、`$navbar-height`、`$tags-view-*`、`$app-main-bg`
- `src/styles/theme/layout.scss` → 外壳/侧边栏/顶栏/页签/内容区/抽屉与过渡
- `src/styles/theme/element/components/menu.scss` → el-menu 深色主题（hover、选中、左条、折叠）
- `src/styles/theme/index.scss` 同步输出 `--app-sidebar-bg`、`--app-navbar-height` 等 CSS 变量

### 尚未接入（留待后端阶段）

- **登录/鉴权**：当前无守卫，直接进入布局；`router.afterEach` 只设置页面标题。后端接口就绪后在
  `router.beforeEach` 加 token/角色拦截，并补 `views/login`。
- **用户信息**：Navbar 显示占位"管理员"，退出登录提示"登录鉴权待接入服务端"。
- **接口请求**：未引入 axios，等 server 契约确定后再加 `utils/request` 与 `/api` 代理。

## 约定

- **依赖保持最小**：`vue` + `element-plus` + `sass`（devDependency）+ `vue-router` + `pinia` +
  `@element-plus/icons-vue`（布局框架必需）；未提前引入 ECharts / axios 等，迁移原型时按实际需要再加。
- **端口**：固定 8091，`strictPort: true`（端口被占用时报错而不是静默换端口）。
  `drone-dispatch-web` 与原型 `admin`（8080）可同时启动。
- **接口代理**：暂未配置 `/api` 代理 —— 后端 `drone-dispatch-server` 技术栈与接口契约待定，
  就绪后再补 `server.proxy`（原型为 `http://localhost:8090`）。
- **Element Plus 引入方式**：全量组件注册 + 中文 locale；样式改为编译 `theme-chalk` SCSS 源码以支持变量定制
  （不再引入 `element-plus/dist/index.css`）。未引入图标库与按需插件，业务需要时再评估。
