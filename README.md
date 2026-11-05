# drone-dispatch-web（管理后台 · 正式版）

> 本目录是**独立 Git 仓库**（仓库名即目录名 `drone-dispatch-web`），`git log` 只包含前端相关提交，
> 与顶层文档仓、`drone-dispatch-h5`、`drone-dispatch-server` 互不混杂。仓库结构说明见上级 `README.md`。

星穹 SkyShow 无人机派单系统 · Web 管理后台，技术栈 **Vue 3 + TypeScript + Vite + Element Plus + Sass**。

- 原型基线：`drone-dispatch-prototype/admin`（Vue3 + Vite + Element Plus + Pinia + ECharts，若伊 RuoYi 风格）
- 负责：登录鉴权、看板、订单流转（接单/拒单/开始/完成）、退款审批、档期与配置、字典、用户与评价、场地

**当前状态：前端骨架 + 公共主题包 + 基础控件重写已就绪，可启动、可构建，业务页面待从原型迁移。**

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
├── vite.config.ts      # 固定开发端口 8091（避开原型的 8080 / 8090 / 5173 与本机 8081/8082 服务）
├── tsconfig*.json      # TS 工程引用配置（含 element-plus/global 类型）
├── public/             # 静态资源（favicon.svg）
└── src/
    ├── main.ts         # 应用入口：Element Plus（中文 locale）+ 全局样式
    ├── App.vue         # 骨架自检页（主题 / 按钮 / 输入框 / 下拉效果核对）
    ├── styles/         # 公共主题包 + 全局样式（见下）
    └── components/     # 业务组件（随迁移补充）
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

## 约定

- **依赖保持最小**：`vue` + `element-plus` + `sass`（devDependency），未提前引入 Pinia / ECharts / axios / 路由等；
  迁移原型时按实际需要再加，避免与原型基线重复。
- **端口**：固定 8091，`strictPort: true`（端口被占用时报错而不是静默换端口）。
  `drone-dispatch-web` 与原型 `admin`（8080）可同时启动。
- **接口代理**：暂未配置 `/api` 代理 —— 后端 `drone-dispatch-server` 技术栈与接口契约待定，
  就绪后再补 `server.proxy`（原型为 `http://localhost:8090`）。
- **Element Plus 引入方式**：全量组件注册 + 中文 locale；样式改为编译 `theme-chalk` SCSS 源码以支持变量定制
  （不再引入 `element-plus/dist/index.css`）。未引入图标库与按需插件，业务需要时再评估。
