// ─────────────────────────────────────────────────────────────
// 配置式组件（Pro*）公共类型契约
//
// 设计原则：
//   1) 外部只传"配置数据"，内部负责布局与渲染 —— 业务页面不写 el-form-item / el-table-column
//   2) 控件用字符串名声明（control: 'input' / 'select' …），ProField 负责映射到 Element 控件
//   3) 每个能力都有配置式入口 + 具名插槽两种扩展方式（插槽优先级高于配置）
//   4) 类型集中在此，组件实现与业务页面共用同一份契约
// ─────────────────────────────────────────────────────────────
import type { VNodeChild } from 'vue'
import type { FormItemRule } from 'element-plus'

/* ════════════════════════════════════════════════════════════
 * 表单
 * ════════════════════════════════════════════════════════════ */

/**
 * 内置控件名 —— ProField 按此名渲染对应 Element 控件。
 * 也接受任意字符串（业务侧可注册自定义控件），因此类型上做了宽松联合。
 */
export const CONTROL_TYPES = [
  // 文本类
  'input',
  'textarea',
  'password',
  // 数字 / 布尔
  'input-number',
  'switch',
  // 选择类
  'select',
  'radio',
  'checkbox',
  'cascader',
  'tree-select',
  // 日期时间
  'date',
  'datetime',
  'daterange',
  'datetimerange',
  'month',
  'year',
  'time',
  // 其它
  'slider',
  'rate',
  'color',
  'autocomplete',
  // 扩展位：不渲染内置控件，只用插槽（slot 必填）
  'custom',
] as const

export type ControlType = (typeof CONTROL_TYPES)[number] | (string & {})

/** 选项（下拉 / 单选 / 多选 / 级联 / 树选择通用） */
export interface OptionItem {
  label: string
  value: string | number | boolean
  disabled?: boolean
  /** 分组名：同一组的选项在下拉中折叠为 el-option-group；不填为平铺 */
  group?: string
  /** 级联 / 树形子项 */
  children?: OptionItem[]
  /** 透传给 el-option 的额外字段（如中文描述） */
  [key: string]: unknown
}

/** 选项来源：静态数组、同步函数、异步函数（字典类接口用异步） */
export type OptionSource = OptionItem[] | (() => OptionItem[]) | (() => Promise<OptionItem[]>)

/** 配置式表单里的单个字段 */
export interface FormFieldConfig {
  /** 字段名（对应 model 的 key），同时作为 el-form-item 的 prop */
  prop: string
  /** 标签；不填时用 prop */
  label?: string
  /** 控件名，默认 input */
  control?: ControlType
  /** 占位文字；不填按控件类型自动生成（请输入 / 请选择） */
  placeholder?: string
  /** 栅格宽度（1-24），默认取 ProForm 的 defaultSpan（8 = 三列） */
  span?: number
  /** 栅格偏移 */
  offset?: number
  /** 默认值：ProSearch 初始化、ProForm 的 clear 可用；表单不强制填充 */
  defaultValue?: unknown
  /** 校验规则（Element 原生规则） */
  rules?: FormItemRule[]
  /** 必填简写：自动生成一条 required 规则 */
  required?: boolean
  /** 只读 / 禁用，可传函数按 model 动态判断 */
  disabled?: boolean | ((model: Record<string, unknown>) => boolean)
  /** 隐藏（保留字段值，只是不渲染），可传函数动态判断 */
  hidden?: boolean | ((model: Record<string, unknown>) => boolean)
  /** 是否可清空（input / select / 日期常用），默认 true */
  clearable?: boolean
  /** 控件宽度（如 220px / 100%）；表单栅格模式下不填则撑满列宽 */
  width?: string | number
  /** select / radio / checkbox / cascader / tree-select 的选项 */
  options?: OptionSource
  /** 日期类控件的值格式，默认 YYYY-MM-DD（日期时间类为 YYYY-MM-DD HH:mm:ss） */
  valueFormat?: string
  /** 透传给具体 Element 控件的原生属性（如 filterable、multiple、maxlength） */
  props?: Record<string, unknown>
  /** 具名插槽：配置了就用插槽渲染该字段（优先级高于 control） */
  slot?: string
  /** 字段下方说明文字 */
  tip?: string
  /**
   * 多值控件（daterange 等）绑定数组，值为空时给 [] 而不是 undefined 以免 Element 报错。
   * 不填时按控件类型自动推断。
   */
  isRange?: boolean
}

/** 配置式表单对外暴露的方法（通过 ref 调用） */
export interface ProFormExpose {
  /** 校验通过返回 true，失败返回 false（不抛异常） */
  validate: () => Promise<boolean>
  /** 校验单个字段 */
  validateField: (prop: string) => Promise<boolean>
  /** 重置到配置的默认值 */
  resetFields: () => void
  /** 清空校验提示 */
  clearValidate: () => void
  /** 当前 model（响应式对象本身） */
  getModel: () => Record<string, unknown>
}

/* ════════════════════════════════════════════════════════════
 * 表格
 * ════════════════════════════════════════════════════════════ */

/** 自定义单元格渲染的上下文 */
export interface CellContext {
  row: Record<string, any>
  column: TableColumn
  value: unknown
  index: number
}

/** 配置式表格的单列 */
export interface TableColumn {
  /** 字段名；纯展示列（render / slot）可省略 */
  prop?: string
  /** 表头文字 */
  label?: string
  /** 列宽（数字按 px） */
  width?: string | number
  /** 最小列宽 */
  minWidth?: string | number
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 固定列 */
  fixed?: boolean | 'left' | 'right'
  /** 可排序：true 交给 el-table 本地排序，'custom' 由外部处理 */
  sortable?: boolean | 'custom'
  /** 内容超出时压缩为省略号 + tooltip */
  showOverflowTooltip?: boolean
  /** 文本格式化（简单文本列用这个） */
  formatter?: (row: Record<string, any>, value: unknown, index: number) => string
  /** 自定义渲染（返回 VNode / 字符串，适合标签、按钮、多行文本） */
  render?: (ctx: CellContext) => VNodeChild
  /** 单元格具名插槽（优先于 render） */
  slot?: string
  /** 表头具名插槽 */
  headerSlot?: string
  /** 多级表头子列 */
  children?: TableColumn[]
  /** 隐藏该列（保留配置，运行时按需打开） */
  hidden?: boolean
  /** 列类型：选择框 / 序号 / 展开；普通数据列不填 */
  type?: 'selection' | 'index' | 'expand'
  /** 是否参与列宽自适应 */
  resizable?: boolean
  /** 透传给 el-table-column 的额外属性 */
  props?: Record<string, unknown>
}

/** 操作列按钮 */
export interface TableActionButton {
  /** 按钮文字 */
  text: string
  /** 按钮类型 */
  type?: '' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 图标名（@element-plus/icons-vue 注册名） */
  icon?: string
  /** 是否显示，按行判断 */
  show?: (row: Record<string, any>, index: number) => boolean
  /** 是否禁用，按行判断 */
  disabled?: (row: Record<string, any>, index: number) => boolean
  /** 二次确认文案：传了就弹确认框，确认后执行 onClick */
  confirm?: string | ((row: Record<string, any>, index: number) => string)
  /** 点击回调（confirm 存在时为确认后的回调） */
  onClick?: (row: Record<string, any>, index: number) => void | Promise<void>
}

/** 操作列配置 */
export interface TableActions {
  /** 列标题，默认"操作" */
  label?: string
  width?: string | number
  fixed?: boolean | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  /** 按钮清单 */
  buttons: TableActionButton[]
  /** 最多平铺展示几个，其余收进"更多"下拉；不填全部平铺 */
  max?: number
  /** 按钮使用 link 样式（默认 true，与原型列表一致） */
  link?: boolean
}

/**
 * 自适应高度（ProTable autoFit）——「列表页不撑出页面滚动条」的统一标准：
 *   · 可用高 = 表格顶缘到最近滚动容器可见底缘的距离 − bottomGap − 分页条占位
 *   · 内容高 ≤ 可用高 → 表格自然撑到内容高，不出任何滚动条（外部空间再大也只到内容高）
 *   · 内容高 > 可用高 → 钳制在可用高，表格 body 内部滚动（表头/分页固定在外）
 *   · 极小窗口按 min 兜底，此时允许页面滚动
 * 显式传了 maxHeight 时以 maxHeight 优先；autoFit 默认关闭。
 */
export interface TableAutoFitOptions {
  /** 与底部可见边缘的留白（px），默认 24 */
  bottomGap?: number
  /** 可用高度下限（px），默认 200；低于它说明页面该整体滚动了 */
  min?: number
}

/** 分页配置：传对象即显示分页 */
export interface TablePagination {
  /** 当前页（1 起） */
  page: number
  /** 每页条数 */
  size: number
  /** 总条数 */
  total: number
  /** 可选每页条数档位，默认 [10, 20, 50, 100] */
  pageSizes?: number[]
  /** 布局串，默认 'total, sizes, prev, pager, next, jumper' */
  layout?: string
  /** 背景色按钮，默认 true */
  background?: boolean
  /** 小尺寸 */
  small?: boolean
}

/** 表格排序变化参数 */
export interface TableSortChange {
  prop: string
  order: 'ascending' | 'descending' | null
}

/* ════════════════════════════════════════════════════════════
 * 搜索栏
 * ════════════════════════════════════════════════════════════ */

/** 搜索栏配置 */
export interface ProSearchProps {
  /** 字段配置（复用 FormFieldConfig） */
  fields: FormFieldConfig[]
  /** 外部维护的查询模型；不传则组件内部创建。推荐外部传，便于重置后保留与跨页复用 */
  model?: Record<string, unknown>
  /** 查询按钮 loading */
  loading?: boolean
  /** 是否显示重置按钮，默认 true */
  showReset?: boolean
  /** 是否可折叠（字段过多时先收起），默认 true */
  collapsible?: boolean
  /** 收起状态下一行显示的字段数，默认 3 */
  defaultVisibleCount?: number
  /** 查询按钮文字，默认"查询" */
  searchText?: string
  /** 重置按钮文字，默认"重置" */
  resetText?: string
  /** 回车即查询，默认 true（仅输入框生效） */
  searchOnEnter?: boolean
}
