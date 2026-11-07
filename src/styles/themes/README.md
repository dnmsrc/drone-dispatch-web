# 主题包（构建期换肤）

本目录下每个**平级文件夹就是一套完整主题**，结构必须与 `default/` 完全一致。
当前生效的主题由构建期环境变量 `APP_THEME` 决定（默认 `default`），
在 [vite.config.ts](../../../vite.config.ts) 中通过 `@theme` 别名解析到对应文件夹：

```ts
const APP_THEME = process.env.APP_THEME ?? 'default'
// '@theme' → src/styles/themes/<APP_THEME>
```

## 目录结构（每套主题都一样）

```
themes/<主题名>/
  variables.scss          # SCSS 变量（唯一需要改值的源头）
  index.scss              # 输出 --app-* CSS 变量
  layout.scss             # 布局样式（侧边栏/顶栏/页签/内容区）
  element/
    index.scss            # Element Plus 源码 SCSS 变量覆盖（@forward ... with）
    components/           # Element 基础控件重写（button/input/select/card/feedback/menu）
  pro/
    index.scss            # 配置式公共组件样式汇总
    form.scss  table.scss  search.scss  dialog.scss  playground.scss
```

## 如何新增一套主题

1. 完整复制 `default/` 为平级文件夹，例如 `dark/`：
   ```bash
   cp -r src/styles/themes/default src/styles/themes/dark
   ```
2. 只改 `dark/variables.scss` 里的取值（颜色、字号、圆角、阴影、布局尺寸等）。
   - `--app-*` CSS 变量随 `index.scss` 自动更新；
   - Element Plus 控件的基色/高度/字号经 `element/index.scss` 的 `@forward ... with`
     在**编译期**注入，无需逐个改组件。
3. 构建时指定主题名即可，业务组件与组件库代码一行都不用改：
   ```bash
   # Git Bash
   APP_THEME=dark pnpm build
   # PowerShell
   $env:APP_THEME="dark"; pnpm build
   # 不指定则用 default
   pnpm build
   ```

## 能力边界（重要）

- 本架构是**构建期换肤**：Element Plus 的 SCSS 源码变量在编译时确定，
  切换主题必须重新构建，不支持不刷新页面的运行时切换。
- 仅由 `--app-*` CSS 变量驱动的成品样式，理论上可在运行时通过覆盖变量换色，
  但 Element 控件高度/字号/色板基色等仍以构建期注入为准。
- 样式中对主题包的引用一律走 `@theme/...` 别名，**不要**写死 `themes/default/...`，
  否则换肤不会生效。
