# drone-dispatch-web（管理后台 · 正式版）

> 本目录是**独立 Git 仓库**（仓库名即目录名 `drone-dispatch-web`），`git log` 只包含前端相关提交，
> 与顶层文档仓、`drone-dispatch-h5`、`drone-dispatch-server` 互不混杂。仓库结构说明见上级 `README.md`。

星穹 SkyShow 无人机派单系统 · Web 管理后台，技术栈 **Vue 3 + TypeScript + Vite + Element Plus + Sass**。

- 原型基线：`drone-dispatch-prototype/admin`（Vue3 + Vite + Element Plus + Pinia + ECharts，若伊 RuoYi 风格）
- 负责：登录鉴权、看板、订单流转（接单/拒单/开始/完成）、退款审批、档期与配置、字典、用户与评价、场地

**当前状态：主题包 + 基础控件重写 + 布局框架 + 配置式公共组件（表格 / 表单 / 搜索）+ 组件测试场已就绪，可启动、可构建；11 个业务页面为占位组件，待逐页从原型迁移。**

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

开发期附加入口：**组件测试场** <http://localhost:8091/dev/playground>（仅开发环境存在，见下文）。

## 目录结构

```
drone-dispatch-web/
├── index.html          # 入口页（标题、lang=zh-CN）
├── vite.config.ts      # 固定开发端口 8091 + @ → src 别名
├── tsconfig*.json      # TS 工程引用配置（含 element-plus/global 类型、@/* 路径）
├── public/             # 静态资源（favicon.svg）
└── src/
    ├── main.ts         # 应用入口：pinia + router + Element Plus + 图标注册 + 全局样式 + DEV 测试场路由
    ├── App.vue         # 只渲染 router-view（页面在 layout 内）
    ├── router/         # index.ts 业务路由（menuRoutes 与侧边栏同源）；dev.ts 测试场路由（仅开发环境）
    ├── layout/         # 布局框架：侧边栏 / 顶栏 / 多页签 / 内容区
    ├── components/
    │   ├── pro/        # 配置式公共组件（ProForm / ProTable / ProSearch / dialog 命令式弹窗）★
    │   └── PagePlaceholder.vue
    ├── stores/         # pinia（tags-view 多页签状态）
    ├── config/         # 品牌常量（静态，后续改为接口拉取）
    ├── views/          # 业务页面（当前 11 个占位）+ dev/ 组件测试场 ★
    └── styles/         # 公共主题包 + 全局样式（含 theme/pro/ 公共组件样式）★
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
    ├── layout.scss                # 布局样式（侧边栏 / 顶栏 / 页签 / 内容区）
    ├── pro/                       # 公共组件样式（Pro* 与组件测试场）
    │   ├── index.scss             # 汇总入口
    │   ├── form.scss              # 表单栅格 / 行内表单
    │   ├── table.scss             # 表格分页 / 表头 / 金额与次级文字
    │   ├── search.scss            # 搜索卡片与按钮区
    │   └── playground.scss        # 组件测试场外壳与演示区块
    └── element/
        ├── index.scss             # Element Plus 变量覆盖（@forward ... with）
        └── components/            # 基础控件重写（在 Element 默认样式之后加载）
            ├── button.scss        # 按钮
            ├── input.scss         # 输入框 / 文本域
            ├── select.scss        # 下拉
            ├── card.scss          # 卡片
            ├── feedback.scss      # 弹窗 / 抽屉 / 消息框（小屏视口）
            └── menu.scss          # 深色侧边栏菜单
```

`styles/index.scss` 的加载顺序不可调换：**主题变量 → Element 变量定制 → Element 全量样式 → 控件重写 → 布局 → 公共组件 → 全局基础**。
Element 的变量定制必须早于其样式生效，控件与组件重写必须晚于其默认样式才能覆盖。

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

## 配置式公共组件

`src/components/pro/` 里是三个配置驱动组件：**外部只传配置数据，内部负责布局与渲染**，业务页面不再手写
`el-table-column` / `el-form-item` 堆叠。控件用字符串名声明（`control: 'input'` / `'select'` …），
由 `ProField` 映射到对应 Element 控件。另外提供**弹窗包裹器**（`defineDialog`）：每个弹窗写一个
配置文件，用 `defineDialog` 把弹窗包成带 `open` / `close` / `destroy` 的对象，业务里引入配置文件直接调用，
详见「弹窗 ProDialog（包裹器）」。

```ts
import { ProForm, ProTable, ProSearch, defineDialog, confirmDialog, useDialogContext } from '@/components/pro'
import type { FormFieldConfig, TableColumn, TableActions, DialogDefinition, DialogWrapper } from '@/components/pro'
```

### 设计约定

1. **配置优先，插槽兜底**：每个能力都有配置入口；需要完全自定义时用同名具名插槽（插槽优先级高于配置）。
2. **控件名是字符串**：`control` 只写名字，不写标签；未识别的名字会渲染提示而不是报错。
3. **选项来源三种写法**：静态数组、同步函数、异步函数（返回 Promise，组件自动 loading）。
4. **联动用函数**：`hidden` / `disabled` 可以传 `(model) => boolean`，由 `ProForm` 按当前模型求值。
5. **数据模型由外部持有**：组件直接读写传入的 `reactive` 对象，父级永远拿到最新值。

### 表单 ProForm

```vue
<script setup lang="ts">
const model = reactive({ name: '', phone: '', venue: '', remark: '' })

const fields: FormFieldConfig[] = [
  { prop: 'name', label: '客户姓名', control: 'input', required: true },
  { prop: 'phone', label: '手机号', control: 'input',
    rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }] },
  { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
  { prop: 'remark', label: '备注', control: 'textarea', span: 24 },
]
</script>

<template>
  <ProForm ref="formRef" :model="model" :fields="fields">
    <template #tail>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="formRef?.resetFields()">重置</el-button>
    </template>
  </ProForm>
</template>
```

**props**

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `model` | `Record<string, any>` | 必填 | 响应式数据模型，组件直接读写 |
| `fields` | `FormFieldConfig[]` | 必填 | 字段配置 |
| `labelWidth` | `string \| number` | `88px` | 标签宽度 |
| `labelPosition` | `left / right / top` | `right` | 标签位置 |
| `defaultSpan` | `number` | `8` | 默认栅格宽度（24 栅格制，8 = 三列） |
| `gutter` | `number` | `16` | 栅格间距 |
| `size` | `large / default / small` | `default` | 控件尺寸 |
| `disabled` | `boolean` | `false` | 整体禁用 |
| `inline` | `boolean` | `false` | 行内布局（搜索栏用），配合 `#tail` 插槽同行排列 |
| `scrollToError` | `boolean` | `true` | 校验失败滚动到首个错误 |

**方法（通过 ref）**：`validate()`（返回 `Promise<boolean>`，不抛异常）、`validateField(prop)`、
`resetFields()`（恢复配置的 `defaultValue`）、`clearValidate()`、`getModel()`。

**插槽**：`#tail` 表单末尾自定义区域（按钮行）；字段插槽 —— 配置里写 `field.slot = 'xxx'`，
模板用 `#xxx="{ value, setValue, field, model }"` 接管该字段的渲染。

**FormFieldConfig 字段**

| 字段 | 类型 | 说明 |
|---|---|---|
| `prop` | `string` | 字段名（model 的 key） |
| `label` | `string` | 标签，缺省用 prop |
| `control` | `string` | 控件名，缺省 `input`（见下方对照表） |
| `placeholder` | `string` | 缺省按控件类型生成「请输入/请选择 + 标签」 |
| `span` / `offset` | `number` | 栅格占宽 / 左偏移（1~24） |
| `defaultValue` | `unknown` | 默认值（`resetFields` 用） |
| `rules` | `FormItemRule[]` | Element 原生校验规则 |
| `required` | `boolean` | 必填简写，自动生成提示 |
| `disabled` / `hidden` | `boolean \| (model) => boolean` | 支持联动禁用 / 显隐 |
| `clearable` | `boolean` | 输入与选择类默认 `true` |
| `width` | `string \| number` | 控件宽度（行内表单里常用，如 `220`） |
| `options` | 数组 / 函数 / 异步函数 | 选择类控件的选项；带 `group` 自动分组 |
| `valueFormat` | `string` | 日期类值格式，缺省按控件类型（`YYYY-MM-DD` 等） |
| `props` | `Record<string, unknown>` | 透传给 Element 控件（`filterable` / `multiple` / `rows` …） |
| `slot` | `string` | 具名插槽名（优先级高于 control） |
| `tip` | `string` | 控件下方说明文字 |
| `isRange` | `boolean` | 多值控件标记（多数情况按控件类型自动推断） |

### 搜索栏 ProSearch

在 ProForm（行内布局）基础上固定提供「查询 / 重置」：一张卡片 = 一行字段 + 按钮组，字段过多时自动折叠。

```vue
<script setup lang="ts">
const query = reactive({ keyword: '', status: '', venue: '', dateRange: [] })

const fields: FormFieldConfig[] = [
  { prop: 'keyword', label: '关键词', control: 'input', width: 220 },
  { prop: 'status', label: '状态', control: 'select', options: STATUS_OPTIONS, width: 160 },
  { prop: 'dateRange', label: '日期', control: 'daterange', width: 260 },
]
</script>

<template>
  <ProSearch :model="query" :fields="fields" :loading="loading"
    @search="load(1)" @reset="load(1)">
    <template #actions>
      <el-button type="success" plain>导出结果</el-button>
    </template>
  </ProSearch>
</template>
```

**props**：`fields`（必填）、`model`（推荐外部传，组件直接改它）、`loading`、`showReset`（默认 true）、
`collapsible`（默认 true）、`defaultVisibleCount`（默认 3）、`searchText`、`resetText`、`searchOnEnter`（默认 true，仅输入框生效）。

**事件**：`search(query)`（查询或回车，参数为条件快照）、`reset(query)`（重置后条件，是否重新查询由外部决定）。

**方法**：`search()`、`reset()`、`getQuery()`。**插槽**：`#actions`（追加按钮）。

### 表格 ProTable

```vue
<script setup lang="ts">
const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 160, sortable: true },
  { prop: 'amount', label: '金额', width: 130, align: 'right',
    formatter: (row, value) => formatMoney(value as number) },
  { prop: 'status', label: '状态', width: 100,
    render: (ctx) => h(ElTag, { type: statusType(ctx.value) }, () => statusText(ctx.value)) },
]

const actions: TableActions = {
  width: 180, max: 3,
  buttons: [
    { text: '详情', type: 'primary', onClick: (row) => openDetail(row) },
    { text: '编辑', show: (row) => row.status === 'pending', onClick: edit },
    { text: '删除', type: 'danger', confirm: '确认删除该订单？', onClick: remove },
    { text: '导出', onClick: exportRow },
  ],
}
</script>

<template>
  <ProTable :columns="columns" :data="rows" :loading="loading"
    selection index border :actions="actions" :pagination="pagination"
    @page-change="onPageChange">
    <template #user="{ row }">
      <div>{{ row?.nickname }}</div>
      <div class="cell-sub">{{ row?.phone }}</div>
    </template>
  </ProTable>
</template>
```

**props**

| 属性 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `columns` | `TableColumn[]` | 必填 | 列配置 |
| `data` | `Record<string, any>[]` | 必填 | 数据 |
| `loading` | `boolean` | `false` | 加载遮罩 |
| `rowKey` | `string \| (row) => string` | `id` | 行唯一键 |
| `border` / `stripe` | `boolean` | `false` | 边框 / 斑马纹 |
| `size` | `large / default / small` | `default` | 尺寸 |
| `showHeader` | `boolean` | `true` | 是否显示表头 |
| `index` | `boolean` | `false` | 追加序号列 |
| `selection` | `boolean` | `false` | 追加多选列 |
| `actions` | `TableActions` | `null` | 操作列（含「更多」与二次确认） |
| `pagination` | `TablePagination` | `null` | 底部分页（含 `page / size / total`） |
| `emptyText` | `string` | `暂无数据` | 空数据文案 |
| `height` / `maxHeight` | `number \| string` | — | 表格高度 |
| `highlightCurrentRow` | `boolean` | `false` | 高亮当前行 |
| `rowClassName` / `defaultSort` | — | — | 透传 el-table |

**事件**：`selection-change(rows)`、`sort-change({ prop, order })`、`row-click(row, column, event)`、
`page-change({ page, size })`、`update:page`、`update:size`、`action({ button, row, index })`
（不论按钮是否配 `onClick` 都会抛出，便于统一埋点）。

**单元格渲染优先级**：`slot`（具名插槽）> `render(ctx)`（返回 VNode，用 `ProCell` 包装）> `formatter(row, value, index)` > 默认 `row[prop]`。

**插槽作用域**：列插槽 `{ row, index, column }`；`#empty` / `#append` 透传 el-table 的空状态与表格尾部。

**TableColumn 字段**

| 字段 | 类型 | 说明 |
|---|---|---|
| `prop` / `label` | `string` | 字段名 / 表头 |
| `width` / `minWidth` | `number \| string` | 列宽 / 最小列宽 |
| `align` | `left / center / right` | 对齐 |
| `fixed` | `boolean \| left \| right` | 固定列 |
| `sortable` | `boolean \| 'custom'` | 本地排序 / 交给外部 |
| `showOverflowTooltip` | `boolean` | 超出省略 + tooltip |
| `formatter` | `(row, value, index) => string` | 文本格式化 |
| `render` | `(ctx) => VNodeChild` | 自定义单元格 |
| `slot` / `headerSlot` | `string` | 单元格 / 表头具名插槽 |
| `children` | `TableColumn[]` | 多级表头（当前支持两层） |
| `hidden` | `boolean` | 隐藏该列（保留配置） |
| `type` | `selection / index / expand` | 列类型 |
| `props` | `Record<string, unknown>` | 透传 el-table-column |

**TableActions**：`label`（默认「操作」）、`width`、`fixed`（默认 `right`）、`align`、`buttons`、`max`（超出收进「更多」下拉）、`link`（默认 `true`）。
每个按钮支持 `text / type / icon / show(row) / disabled(row) / confirm`（字符串或函数，二次确认）/ `onClick(row, index)`。

**TablePagination**：`page` / `size` / `total` 必填，另有 `pageSizes`（默认 `[10, 20, 50, 100]`）、`layout`、
`background`（默认 true）、`small`。

### 弹窗 ProDialog（包裹器）

核心：**一个弹窗 = 一个配置文件 + 一个包裹器对象**。用 `defineDialog` 把弹窗包起来（内容可以是组件、
配置式表单字段、渲染函数或纯文本），导出后就是一个带 `open` / `close` / `destroy` 的对象。
业务代码不挂组件、不维护 `visible`，只调包裹器的方法。

```ts
// ① 弹窗配置文件：src/dialogs/order-form.dialog.ts
import { defineDialog } from '@/components/pro'
import type { FormFieldConfig } from '@/components/pro'

export const orderFormDialog = defineDialog<OrderFormParams, OrderFormData>({
  name: 'order-form',
  title: (params) => (params.id ? `编辑订单 ${params.id}` : '新增订单'), // 配置项可写成函数
  width: 640,
  fields: [
    { prop: 'id', label: '订单号', control: 'input', required: true },
    { prop: 'venue', label: '表演场地', control: 'select', options: VENUE_OPTIONS },
    // …
  ],
  model: { drones: 120 }, // 表单默认值
})

// ② 业务里：引入配置文件，直接用包裹器
import { orderFormDialog } from '@/dialogs/order-form.dialog'

const data = await orderFormDialog.open() // 打开，await 结果
if (!data) return // 取消 / 关闭 → null
orderFormDialog.open({ ...row }) // 编辑：params 同时作为表单初始值

orderFormDialog.open({}, {
  // 回调写法（第二个参数也可以是单个函数）
  onOk: (data) => save(data),
  onCancel: () => ElMessage.info('已取消'),
})

orderFormDialog.close() // 程序化关闭（视为取消）
orderFormDialog.destroy() // 立即销毁（不等关闭动画）
```

**包裹器方法**

| 方法 | 说明 |
|---|---|
| `open(params?, callbacks?)` | 打开。`params` 传给内容组件（即 props）/ 作为表单初始值 / 渲染函数参数；返回 Promise |
| `close(result?)` | 程序化关闭：不传值视为取消（`null`）；传值视为「确定」并把值交回；返回 `boolean` |
| `destroy()` | 立即销毁（不播关闭动画），Promise 以 `null` 结束；返回 `boolean` |
| `isOpen` | 当前是否有打开的实例（在 `computed` 里读取可响应） |
| `name` | 包裹器名字（日志 / 调试用） |

**结果约定**

| 关闭方式 | Promise 结果 | 回调（与 Promise 并存） |
|---|---|---|
| 点确定 | 表单数据 / `okValue`（默认 `true`）/ `dialog.close(value)` 传入值 | `onOk(value)` |
| 点取消 / `close()` | `null` | `onCancel()` |
| 右上角 X / 遮罩 / ESC / `destroy()` | `null` | `onClose()`（不传时回退 `onCancel`） |

`open` 的第二个参数也可以直接是一个函数：`open(params, (result) => {})`，关闭时调用一次（确定传结果值、取消传 `null`）。

**DialogDefinition（配置文件里能写什么）**

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `name` | `string` | — | 包裹器名字 |
| `title` / `description` / `width` | 值 或 `(params) => 值` | — / — / `480` | 可随本次参数动态计算（如编辑时标题带单号） |
| `okText` / `cancelText` / `okType` | 值 或 `(params) => 值` | `确定` / `取消` / `primary` | 按钮文案与类型 |
| `fullscreen` / `draggable` / `alignCenter` | `boolean` | `false / false / true` | 全屏 / 可拖拽 / 垂直居中 |
| `closeOnClickModal` / `closeOnPressEscape` | `boolean` | `false / true` | 点遮罩关闭 / ESC 关闭 |
| `showClose` / `showFooter` | `boolean` | `true` | 右上角关闭按钮 / 底部按钮区（内容自管交互时传 `false`） |
| `component` | `Component` | — | 内容来源①：自定义组件（优先级最高） |
| `fields` | `FormFieldConfig[]` | — | 内容来源②：配置式表单，复用 ProForm，确定时先校验 |
| `render` | `(params) => VNodeChild` | — | 内容来源③：渲染函数 |
| `content` | 文本 / VNode / `(params) => …` | — | 内容来源④：纯内容 |
| `props` / `model` | `Record<string, unknown>` | — | 内容组件默认 props / 表单默认值 |
| `okValue` | `unknown` | `true` | 非表单模式下「确定」的返回值 |
| `beforeOk` | `(params) => boolean \| Promise<boolean>` | — | 确定前钩子，返回 `false` 或抛异常都不关闭；本次 `open` 传入的优先 |
| `labelWidth` / `defaultSpan` / `gutter` / `size` | — | — | 表单模式布局 |
| `zIndex` | `number` | 自动 | 不传时跟随 Element 全局递增，嵌套自动叠高 |

**内容组件契约**：组件不需要知道自己是弹窗，用同一个上下文对象关闭并回传：

```vue
<!-- OrderPicker.vue -->
<script setup lang="ts">
import { useDialogContext } from '@/components/pro'
const dialog = useDialogContext<MockOrder>()
function pick(row: MockOrder) {
  dialog?.close(row) // 关闭并把 row 交回调用方
}
</script>
```

也可以声明 `props: ['dialog']`，或 `emit('close', value)` / `emit('cancel')`；`open` 时传的 params 会作为组件的 props。

**内置确认框也是一个包裹器**（`src/components/pro/dialog/confirm.ts`）：

```ts
const ok = await confirmDialog.open({ title: '删除订单', content: '删除后不可恢复？', type: 'danger' })
if (!ok) return // true / null
```

**实现要点**：每个包裹器每次 `open` 都新建容器挂到 `body`、用 `render()` 挂载 DialogHost；关闭动画播完后卸载并移除 DOM（另有 400ms 兜底）。`close()` / `destroy()` 通过宿主 api 走同一套关闭流程，`isOpen` 用 ref 保存所以 `computed` 里可响应。同一包裹器重复 `open` 时旧实例静默销毁（它的 Promise 以 `null` 结束）。层级不传 `zIndex` 时交给 Element Plus 全局计数器。`main.ts` 通过 `setDialogAppContext(app._context)` 注入应用上下文，弹窗内容组件里可以用全局注册的图标/组件。样式在 `src/styles/theme/pro/dialog.scss`。

### 控件名对照表（`control`）

| 分类 | 控件名 |
|---|---|
| 文本 | `input`、`textarea`、`password`、`autocomplete` |
| 数字 / 布尔 | `input-number`、`switch`、`slider`、`rate`、`color` |
| 选择 | `select`（多选加 `props.multiple`）、`radio`、`checkbox`、`cascader`、`tree-select` |
| 日期时间 | `date`、`datetime`、`daterange`、`datetimerange`、`month`、`year`、`time` |
| 扩展 | `custom`（配 `slot` 由业务完全接管） |

### 样式位置

组件外观不写在组件里，统一在主题包（改一处全局生效）：

- `src/styles/theme/pro/form.scss` —— 栅格表单间距、行内表单标签
- `src/styles/theme/pro/table.scss` —— 分页右对齐、表头字重字号、`.cell-sub` 次级文字、`.amount-text` 金额色
- `src/styles/theme/pro/search.scss` —— 搜索卡片底部留白、字段默认宽度、小屏撑满
- `src/styles/theme/pro/dialog.scss` —— 弹窗内边距 / header 与 footer 分隔线 / 确认框图标 / 小屏宽度
- `src/styles/theme/pro/playground.scss` —— 组件测试场外壳与演示区块

新增公共组件样式：在该目录加文件，并在 `theme/pro/index.scss` 里 `@use`。

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

## 组件测试场（仅开发环境）

给开发人员用的**组件演示与验收页面**，用来快速确认公共组件的渲染与交互效果，不进入业务菜单。

- 入口：<http://localhost:8091/dev/playground>（默认进入「表单 · 基础用法」）
- 菜单：左侧沿用后台同款深色菜单，按组件分组 —— 表单 ProForm（基础用法 / 栅格布局 / 校验规则 / 控件总览）、
  表格 ProTable（基础表格 / 列与操作）、搜索 ProSearch（基础搜索 / 搜索 + 表格）、
  弹窗 ProDialog（基础用法 / 表单弹窗 / 自定义内容 / 进阶用法）
- 每个演示页 = 若干「演示区块」：标题 + 说明 + 效果 + 可展开的**配置代码**，方便直接对照写法

### 只在开发环境存在

实现是**双重隔离**，不是靠路由守卫：

1. `src/router/dev.ts` 单独存放测试场路由，**没有**注册进 `menuRoutes`（业务菜单天然看不到）。
2. `main.ts` 在 `if (import.meta.env.DEV)` 分支里 `await import('@/router/dev')` 再 `router.addRoute`。
   生产构建时该条件被静态替换为 `false`，整段分支（含动态 import）被剔除，**演示代码不进产物**。

已验证：`npm run build` 后对 `dist/` 全量搜索「组件测试场 / dev/playground / ProSearch」均无命中；
生产预览下访问 `/dev/playground` 会落到 `/:pathMatch(.*)*` 重定向回 `/index`（标题「首页 - 星穹派单管理后台」）。
（说明：`src/components/pro/dialog` 是生产要用的公共组件，会正常打进产物；只有测试场与演示页被剔除。）

### 新增一个演示页

1. `src/views/dev/demos/` 下建文件（用 `DemoBlock` + 对应组件）
2. `src/router/dev.ts` 加一条子路由（`path`、`component`、`meta.title`）
3. `src/views/dev/menu.ts` 对应分组里加一条菜单（`title` 与 `meta.title` 保持一致）
4. 弹窗类演示的**配置文件**（包裹器）放在 `src/views/dev/dialogs/`，演示页 import 它来 `open`，
   这样测试场里演示的就是业务里真实的使用方式

### 移动端

窄屏（`< 768px`）时侧栏隐藏，顶部出现横向滚动的组件导航（同一份 `menu.ts` 数据），内容区占满宽度。

## 约定

- **依赖保持最小**：`vue` + `element-plus` + `sass`（devDependency）+ `vue-router` + `pinia` +
  `@element-plus/icons-vue`；未提前引入 ECharts / axios 等，迁移原型时按实际需要再加。
- **公共组件只增不改契约**：`src/components/pro/types.ts` 是 Pro* 组件的类型契约，业务侧与组件侧共用；
  新增能力先加类型再实现，不在业务页面里绕过类型。
- **业务页面不再手写表格/表单结构**：新页面一律用 `ProTable` / `ProForm` / `ProSearch`；
  例外是个性化极强的页面（如看板图表），也优先复用主题变量与 Pro 组件。
- **弹窗一律走包裹器**：每个弹窗写一个 `xxx.dialog.ts` 配置文件，用 `defineDialog` 把弹窗包起来导出；
  业务里 `import` 配置文件后 `.open(params, callbacks)` / `.close()` / `.destroy()`，不写
  `<xxx-dialog v-model:visible>` + `visible` ref，把「打开 → 等结果 → 继续执行」放在同一段代码里。
- **端口**：固定 8091，`strictPort: true`（端口被占用时报错而不是静默换端口）。
  `drone-dispatch-web` 与原型 `admin`（8080）可同时启动。
- **接口代理**：暂未配置 `/api` 代理 —— 后端 `drone-dispatch-server` 技术栈与接口契约待定，
  就绪后再补 `server.proxy`（原型为 `http://localhost:8090`）。
- **Element Plus 引入方式**：全量组件注册 + 中文 locale；样式改为编译 `theme-chalk` SCSS 源码以支持变量定制
  （不再引入 `element-plus/dist/index.css`）。未引入按需插件，业务需要时再评估。
- **登录/鉴权**：当前无守卫，直接进入布局；`router.afterEach` 只设置页面标题。后端就绪后在
  `router.beforeEach` 加 token/角色拦截，并补 `views/login`。
