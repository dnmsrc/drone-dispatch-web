<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// ProTable · 配置式表格
//
// 职责：
//   1) 业务页面只传 columns / data 等配置，不用手写一堆 el-table-column
//   2) 单元格渲染优先级：slot（具名插槽）> render（ProCell）> formatter > 默认 row[prop]
//   3) 统一处理：多选/序号列、多级表头、操作列（含「更多」下拉与二次确认）、底部分页
//
// 类型契约见 ./types.ts（Lead 维护，本组件不修改该文件）
// 视觉样式集中在当前主题包（@theme）的 pro/table.scss，本文件只保留必要的 scoped 样式
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ProCell from './ProCell'
import type {
  CellContext,
  TableActionButton,
  TableActions,
  TableColumn,
  TablePagination,
  TableSortChange,
} from './types'

/** 组件 props（契约见 types.ts，这里只做组合声明） */
interface ProTableProps {
  /** 列配置（必填） */
  columns: TableColumn[]
  /** 表格数据（必填） */
  data: Record<string, any>[]
  /** 加载态：内部用 v-loading 展示 */
  loading?: boolean
  /** 行唯一键，字符串或取值函数 */
  rowKey?: string | ((row: Record<string, any>) => string)
  /** 是否显示纵向边框，默认 false（与原型表格一致） */
  border?: boolean
  /** 是否斑马纹，默认 false */
  stripe?: boolean
  /** 表格尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 是否显示表头 */
  showHeader?: boolean
  /** 是否在最前面追加序号列 */
  index?: boolean
  /** 是否在最前面追加多选列 */
  selection?: boolean
  /** 操作列配置：传了就追加操作列 */
  actions?: TableActions | null
  /** 分页配置：传了就渲染底部分页 */
  pagination?: TablePagination | null
  /** 空数据文案 */
  emptyText?: string
  /** 表格高度（透传 el-table） */
  height?: string | number
  /** 表格最大高度（透传 el-table） */
  maxHeight?: string | number
  /** 是否高亮当前行 */
  highlightCurrentRow?: boolean
  /** 行样式类名回调 */
  rowClassName?: (data: { row: Record<string, any>; rowIndex: number }) => string
  /** 默认排序（透传 el-table 的 default-sort） */
  defaultSort?: { prop: string; order: 'ascending' | 'descending' }
}

const props = withDefaults(defineProps<ProTableProps>(), {
  loading: false,
  rowKey: 'id',
  border: false,
  stripe: false,
  size: 'default',
  showHeader: true,
  index: false,
  selection: false,
  actions: null,
  pagination: null,
  emptyText: '暂无数据',
  highlightCurrentRow: false,
})

const emit = defineEmits<{
  /** 多选变化 */
  'selection-change': [rows: Record<string, any>[]]
  /** 排序变化（sortable 列触发） */
  'sort-change': [payload: TableSortChange]
  /** 行点击 */
  'row-click': [row: Record<string, any>, column: unknown, event: Event]
  /** 分页变化（页码或每页条数，统一出口） */
  'page-change': [payload: { page: number; size: number }]
  /** 页码变化（配合 v-model:page） */
  'update:page': [page: number]
  /** 每页条数变化（配合 v-model:size） */
  'update:size': [size: number]
  /** 操作列按钮点击（不论是否执行 onClick 都会触发） */
  action: [payload: { button: TableActionButton; row: Record<string, any>; index: number }]
}>()

/* ════════════════════════════════════════════════════════════
 * 一、列配置解析
 * ════════════════════════════════════════════════════════════ */

/** 过滤掉 hidden 的列（保留配置，运行时按需关闭） */
const visibleColumns = computed(() => props.columns.filter((col) => col.hidden !== true))

/** 是否分组表头（有子列） */
function hasChildren(col: TableColumn): boolean {
  return (col.children?.length ?? 0) > 0
}

/** 分组表头下可见的子列 */
function visibleChildren(col: TableColumn): TableColumn[] {
  return (col.children ?? []).filter((child) => child.hidden !== true)
}

/** v-for 用的稳定 key（同一 label 可能重复，拼上序号） */
function columnKey(col: TableColumn, index: number): string {
  return `${col.prop ?? col.label ?? 'col'}-${index}`
}

/**
 * 把 formatter 适配成 el-table 的签名：
 *   el-table: (row, column, cellValue, index)
 *   契约:     (row, value, index)
 */
function adaptFormatter(
  formatter: NonNullable<TableColumn['formatter']>,
): (row: Record<string, any>, column: unknown, value: unknown, index: number) => string {
  return (row, _column, value, index) => formatter(row, value, index)
}

/**
 * 把 TableColumn 配置翻译成 el-table-column 的属性集合。
 * - undefined 的字段直接丢弃，避免覆盖 el-table-column 自身默认值（如 width 不填则自适应）
 * - col.props 作为透传底座，显式字段覆盖它（显式配置优先）
 * - 分组表头只保留 label/width/align/fixed，prop/sortable 等交给子列
 */
function columnProps(col: TableColumn): Record<string, unknown> {
  const isGroup = hasChildren(col)
  const explicit: Record<string, unknown> = isGroup
    ? {
        label: col.label,
        width: col.width,
        align: col.align,
        fixed: col.fixed,
      }
    : {
        prop: col.prop,
        label: col.label,
        type: col.type,
        width: col.width,
        minWidth: col.minWidth,
        align: col.align,
        fixed: col.fixed,
        sortable: col.sortable,
        showOverflowTooltip: col.showOverflowTooltip,
      }

  if (!isGroup && col.formatter) {
    explicit.formatter = adaptFormatter(col.formatter)
  }

  const merged: Record<string, unknown> = { ...(col.props ?? {}) }
  for (const [key, value] of Object.entries(explicit)) {
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged
}

/** 组装 CellContext：value 取 row[prop]，index 取 el-table 的 $index */
function cellContext(
  col: TableColumn,
  scope: { row: Record<string, any>; $index: number },
): CellContext {
  return {
    row: scope.row,
    column: col,
    value: col.prop ? scope.row[col.prop] : undefined,
    index: scope.$index,
  }
}

/* ════════════════════════════════════════════════════════════
 * 二、操作列
 * ════════════════════════════════════════════════════════════ */

/**
 * 操作列宽度：
 *   1) 显式配置直接用
 *   2) 否则按「平铺按钮数」估算：每个 link 按钮约 56px，出现「更多」再预留 60px
 *   3) 最少 90px（原型单按钮操作列宽 90）
 */
const actionColumnWidth = computed<string | number>(() => {
  const conf = props.actions
  if (!conf) return 90
  if (conf.width !== undefined) return conf.width
  const total = conf.buttons.length
  const flatCount = conf.max === undefined ? total : Math.min(total, Math.max(conf.max - 1, 0))
  const hasMore = conf.max !== undefined && total > conf.max
  return Math.max(90, flatCount * 56 + (hasMore ? 60 : 0) + 24)
})

/** 按行过滤 show 后可见的按钮 */
function visibleButtons(row: Record<string, any>, rowIndex: number): TableActionButton[] {
  return (props.actions?.buttons ?? []).filter((btn) => (btn.show ? btn.show(row, rowIndex) : true))
}

/** 超出 max 时，前 max-1 个平铺展示 */
function flatButtons(row: Record<string, any>, rowIndex: number): TableActionButton[] {
  const visible = visibleButtons(row, rowIndex)
  const max = props.actions?.max
  if (max === undefined || visible.length <= max) return visible
  return visible.slice(0, Math.max(max - 1, 0))
}

/** 超出 max 时，剩余的按钮收进「更多」下拉 */
function moreButtons(row: Record<string, any>, rowIndex: number): TableActionButton[] {
  const visible = visibleButtons(row, rowIndex)
  const max = props.actions?.max
  if (max === undefined || visible.length <= max) return []
  return visible.slice(Math.max(max - 1, 0))
}

/** 按钮是否置灰 */
function isDisabled(btn: TableActionButton, row: Record<string, any>, rowIndex: number): boolean {
  return btn.disabled ? btn.disabled(row, rowIndex) : false
}

/**
 * 按钮类型：显式配置优先；未配置时 link 按钮跟随原型用 primary，
 * 非 link 按钮交给 Element 默认样式（返回 undefined 即不传该 prop）
 */
function buttonType(btn: TableActionButton): TableActionButton['type'] {
  if (btn.type !== undefined) return btn.type
  return (props.actions?.link ?? true) ? 'primary' : undefined
}

/**
 * 统一处理按钮点击：
 *   1) 先 emit('action') —— 无论后续是否执行 onClick（取消确认也算一次点击，便于外部埋点）
 *   2) 有 confirm 则先弹确认框（warning，「确定 / 取消」），取消则中止
 *   3) 最后执行 onClick
 */
async function handleAction(
  button: TableActionButton,
  row: Record<string, any>,
  rowIndex: number,
): Promise<void> {
  emit('action', { button, row, index: rowIndex })

  if (button.confirm) {
    const message =
      typeof button.confirm === 'function' ? button.confirm(row, rowIndex) : button.confirm
    try {
      await ElMessageBox.confirm(message, '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
    } catch {
      // 用户取消：不执行 onClick
      return
    }
  }

  await button.onClick?.(row, rowIndex)
}

/**
 * 「更多」下拉的 command 回调：command 是 moreButtons 里的下标。
 * el-dropdown 没有行上下文，所以在模板里用闭包把 row / $index 带上。
 */
function handleMoreCommand(command: unknown, row: Record<string, any>, rowIndex: number): void {
  const button = moreButtons(row, rowIndex)[command as number]
  if (button) {
    void handleAction(button, row, rowIndex)
  }
}

/* ════════════════════════════════════════════════════════════
 * 三、分页
 *   props 只读，页码/每页条数用内部状态 + watch props 同步
 * ════════════════════════════════════════════════════════════ */

const currentPage = ref(props.pagination?.page ?? 1)
const pageSize = ref(props.pagination?.size ?? 10)

// 外部（父组件）主动改页码/条数时同步到内部（如查询后重置到第 1 页）
watch(
  () => [props.pagination?.page, props.pagination?.size],
  ([page, size]) => {
    if (typeof page === 'number' && page !== currentPage.value) currentPage.value = page
    if (typeof size === 'number' && size !== pageSize.value) pageSize.value = size
  },
)

function onCurrentChange(page: number): void {
  currentPage.value = page
  emit('update:page', page)
  emit('page-change', { page, size: pageSize.value })
}

function onPageSizeChange(size: number): void {
  pageSize.value = size
  emit('update:size', size)
  emit('page-change', { page: currentPage.value, size })
}

/* ════════════════════════════════════════════════════════════
 * 四、el-table 事件转发
 * ════════════════════════════════════════════════════════════ */

function onSelectionChange(rows: Record<string, any>[]): void {
  emit('selection-change', rows)
}

function onSortChange(payload: {
  prop: string | null
  order: 'ascending' | 'descending' | null
}): void {
  emit('sort-change', { prop: payload.prop ?? '', order: payload.order })
}

/**
 * 动态具名插槽的统一作用域：{ row, index, column }
 * 所有动态插槽（单元格 / 表头）都转发同一个形状，vue-tsc 才能稳定推断插槽 props。
 */
function slotScope(scope: Record<string, any>): {
  row: Record<string, any>
  index: number
  column: unknown
} {
  return {
    row: (scope.row ?? {}) as Record<string, any>,
    index: Number(scope.$index ?? 0),
    column: scope.column,
  }
}

function onRowClick(row: Record<string, any>, column: unknown, event: Event): void {
  emit('row-click', row, column, event)
}
</script>

<template>
  <div class="pro-table">
    <el-table
      v-loading="props.loading"
      :data="props.data"
      :row-key="props.rowKey"
      :border="props.border"
      :stripe="props.stripe"
      :size="props.size"
      :show-header="props.showHeader"
      :empty-text="props.emptyText"
      :height="props.height"
      :max-height="props.maxHeight"
      :highlight-current-row="props.highlightCurrentRow"
      :row-class-name="props.rowClassName"
      :default-sort="props.defaultSort"
      @selection-change="onSelectionChange"
      @sort-change="onSortChange"
      @row-click="onRowClick"
    >
      <!-- ① 多选列：固定在最前面，width 48 -->
      <el-table-column v-if="props.selection" type="selection" width="48" />

      <!-- ② 序号列 -->
      <el-table-column v-if="props.index" type="index" label="序号" width="60" />

      <!-- ③ 配置列：顶层遍历；带 children 的渲染为分组表头（两层） -->
      <template v-for="(col, colIndex) in visibleColumns" :key="columnKey(col, colIndex)">
        <!-- 普通数据列：slot > render > formatter > 默认 row[prop] -->
        <el-table-column v-if="!hasChildren(col)" v-bind="columnProps(col)">
          <template v-if="col.slot" #default="scope">
            <slot :name="col.slot" v-bind="slotScope(scope)" />
          </template>
          <template v-else-if="col.render" #default="scope">
            <ProCell :render="col.render" :ctx="cellContext(col, scope)" />
          </template>
          <!-- 表头插槽：与单元格插槽共用同一作用域形状，vue-tsc 才能统一推断 -->
          <template v-if="col.headerSlot" #header="scope">
            <slot :name="col.headerSlot" v-bind="slotScope(scope)" />
          </template>
        </el-table-column>

        <!-- 分组表头（两层）：父列只负责表头文字，子列复用同一套单元格规则 -->
        <el-table-column v-else v-bind="columnProps(col)">
          <el-table-column
            v-for="(child, childIndex) in visibleChildren(col)"
            :key="columnKey(child, childIndex)"
            v-bind="columnProps(child)"
          >
            <template v-if="child.slot" #default="scope">
              <slot :name="child.slot" v-bind="slotScope(scope)" />
            </template>
            <template v-else-if="child.render" #default="scope">
              <ProCell :render="child.render" :ctx="cellContext(child, scope)" />
            </template>
            <template v-if="child.headerSlot" #header="scope">
              <slot :name="child.headerSlot" v-bind="slotScope(scope)" />
            </template>
          </el-table-column>

          <!-- 表头插槽：与单元格插槽共用同一作用域形状，vue-tsc 才能统一推断 -->
          <template v-if="col.headerSlot" #header="scope">
            <slot :name="col.headerSlot" v-bind="slotScope(scope)" />
          </template>
        </el-table-column>
      </template>

      <!-- ④ 操作列：按行过滤/置灰；超出 max 的按钮收进「更多」下拉 -->
      <el-table-column
        v-if="props.actions"
        :label="props.actions.label ?? '操作'"
        :width="actionColumnWidth"
        :fixed="props.actions.fixed ?? 'right'"
        :align="props.actions.align ?? 'center'"
      >
        <template #default="{ row, $index }">
          <div class="pro-table__actions">
            <el-button
              v-for="(btn, btnIndex) in flatButtons(row, $index)"
              :key="`${$index}-${btnIndex}-${btn.text}`"
              :link="props.actions.link ?? true"
              :type="buttonType(btn)"
              :icon="btn.icon"
              :disabled="isDisabled(btn, row, $index)"
              @click="handleAction(btn, row, $index)"
            >
              {{ btn.text }}
            </el-button>

            <el-dropdown
              v-if="moreButtons(row, $index).length"
              trigger="click"
              @command="(cmd) => handleMoreCommand(cmd, row, $index)"
            >
              <el-button :link="props.actions.link ?? true" type="primary" :icon="ArrowDown">
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="(btn, btnIndex) in moreButtons(row, $index)"
                    :key="`more-${$index}-${btnIndex}-${btn.text}`"
                    :command="btnIndex"
                    :disabled="isDisabled(btn, row, $index)"
                  >
                    {{ btn.text }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>

      <!-- 透传 el-table 的自定义插槽：外部需要 row 展开 / 空状态自定义时可用 -->
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </el-table>

    <!-- ⑤ 分页：渲染在表格下方，样式见 table.scss -->
    <div v-if="props.pagination" class="pro-table__pager">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="props.pagination.total"
        :page-sizes="props.pagination.pageSizes ?? [10, 20, 50, 100]"
        :layout="props.pagination.layout ?? 'total, sizes, prev, pager, next, jumper'"
        :background="props.pagination.background ?? true"
        :small="props.pagination.small ?? false"
        @current-change="onCurrentChange"
        @size-change="onPageSizeChange"
      />
    </div>
  </div>
</template>

<style scoped>
/* 只保留布局相关的最小样式；色彩/字号/间距等主题规则在 theme/pro/table.scss */
.pro-table {
  width: 100%;
}
</style>
