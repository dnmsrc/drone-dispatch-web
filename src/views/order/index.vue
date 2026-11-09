<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 订单管理（UI 完全复刻原型 admin/src/views/order/list.vue）
//
// 写法按正式版规范重构，不再照搬原型的散装实现：
//   - 搜索栏 → ProSearch 配置式（关键词/状态/表演日期三字段一行，回车即查）
//   - 表格/分页 → ProTable 配置式 + autoFit（列表页不撑出页面滚动条标准）
//   - 详情抽屉 → OrderDetailDrawer.open()；接单/开始 → confirmDialog；
//     拒单 → createFormDialog；完成回传 → completeDialog（wrapDialog）
//   - 数据取自 ./mock.ts（mock-server 22 单规格全量移植），静态动作直接改
//     内存 store，接真接口后只替换 queryOrders/act* 调用
// TODO(server): 接 /admin/orders 系列接口后仅替换数据调用，UI 与交互不动。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, reactive, ref } from 'vue'
import StatusTag from '@/components/StatusTag.vue'
import { ProSearch, ProTable, twoLineCell } from '@/components/pro'
import type { FormFieldConfig, TableActions, TableColumn, TablePagination } from '@/components/pro'
import { fmtMoney, fmtTime, orderSummary } from '@/utils/format'
import { ORDER_STATUS_OPTIONS } from './constants'
import { queryOrders } from './mock'
import OrderDetailDrawer from './components/OrderDetailDrawer.vue'
import type { OrderRow } from './types'

/* ═══ 查询状态 ═══ */
const loading = ref(false)
const rows = ref<OrderRow[]>([])
const total = ref(0)
const query = reactive<Record<string, unknown>>({ keyword: '', status: '', dateRange: [] })
const page = ref(1)
const size = ref(10)

const searchFields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '订单号 / 手机号 / 昵称',
    width: 220,
  },
  {
    prop: 'status',
    label: '订单状态',
    control: 'select',
    placeholder: '全部状态',
    options: ORDER_STATUS_OPTIONS,
    width: 170,
  },
  {
    prop: 'dateRange',
    label: '表演日期',
    control: 'daterange',
    valueFormat: 'YYYY-MM-DD',
    width: 260,
  },
]

/* ═══ 列表加载（等价 GET /admin/orders?keyword=&status=&dateFrom=&dateTo=）═══ */
async function load(resetPage = false): Promise<void> {
  if (resetPage) page.value = 1
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  const range = Array.isArray(query.dateRange) ? (query.dateRange as string[]) : []
  const filtered = queryOrders({
    keyword: String(query.keyword ?? ''),
    status: String(query.status ?? ''),
    dateFrom: range[0] || undefined,
    dateTo: range[1] || undefined,
  })
  total.value = filtered.length
  const start = (page.value - 1) * size.value
  rows.value = filtered.slice(start, start + size.value)
  loading.value = false
}

onMounted(() => void load())

/* ═══ 表格列（配置式）═══ */
// 自适应策略同咨询页：定宽列多、宽屏右侧会空整列 —— 把「文本变长就少截断」
// 收益最大的两列（用户/方案摘要）用 minWidth，窄屏以下限横向滚动（观感同
// 原型），宽屏剩余空间摊给这两列、表格铺满容器。
const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', width: 150 },
  {
    label: '用户',
    minWidth: 130,
    render: ({ row }) => twoLineCell(row.user?.nickname || '—', row.user?.phone ?? '', true),
  },
  {
    label: '方案摘要',
    minWidth: 170,
    render: ({ row }) => {
      const text = orderSummary(row)
      return h('span', { class: 'ellipsis', title: text }, text)
    },
  },
  {
    label: '表演日期 / 时段',
    width: 150,
    render: ({ row }) => twoLineCell(row.performDate || '—', row.timeSlot ?? ''),
  },
  {
    label: '金额',
    width: 120,
    render: ({ row }) =>
      h(
        'span',
        { class: 'amount-text ellipsis', title: fmtMoney(row.totalAmount) },
        fmtMoney(row.totalAmount),
      ),
  },
  {
    label: '状态',
    width: 120,
    // STATUS_MAP 是 StatusTag 默认字典，无需传 map；方角小标签同原型
    render: ({ row }) => h(StatusTag, { status: row.status, size: 'small', shape: 'rect' }),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 150,
    formatter: (_row, value) => fmtTime(value as string),
    props: { className: 'col-nowrap' },
  },
]

const actions: TableActions = {
  width: 90,
  fixed: 'right',
  buttons: [
    {
      text: '详情',
      type: 'primary',
      onClick: (row) => detailDrawerRef.value?.open(row as OrderRow),
    },
  ],
}

const pagination = computed<TablePagination>(() => ({
  page: page.value,
  size: size.value,
  total: total.value,
  pageSizes: [10, 20, 50],
}))

/* ═══ 详情抽屉（含状态推进动作；updated = 动作成功后刷新列表）═══ */
const detailDrawerRef = ref<InstanceType<typeof OrderDetailDrawer>>()
</script>

<template>
  <div class="page">
    <!-- 搜索栏：原型同款三字段（ProSearch 自带查询/重置，回车即查） -->
    <div class="card">
      <ProSearch :model="query" :fields="searchFields" :loading="loading" :collapsible="false" />
    </div>

    <!-- 订单表格（auto-fit：行数多时表格 body 钳到视口底内部滚动，
         行数少时撑满可用高，页面永不出现整体滚动条） -->
    <div class="card">
      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        stripe
        row-key="id"
        :actions="actions"
        :pagination="pagination"
        :auto-fit="true"
        empty-text="暂无订单 —— 用户在 H5 下单支付后出现在这里"
        @page-change="
          (payload) => {
            page = payload.page
            size = payload.size
            void load()
          }
        "
      />
    </div>

    <OrderDetailDrawer ref="detailDrawerRef" @updated="void load()" />
  </div>
</template>

<style scoped>
/* 创建时间列禁止折行（原型 .nowrap，经列配置 className 落到单元格） */
:deep(.col-nowrap .cell) {
  white-space: nowrap;
}
</style>
