<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 咨询受理（UI 完全复刻原型 admin/src/views/consult/index.vue）
//
// 写法按正式版规范重构，不再照搬原型的散装实现：
//   - 搜索栏 → ProSearch 配置式；表格/分页 → ProTable 配置式（columns + actions）
//   - 接待确认 → confirmDialog.open，驳回 → createFormDialog，
//     创建派单 → dispatchDialog（DispatchDialog + wrapDialog），详情 → 抽屉组件 open()
//   - 数据取自 ./mock.ts（mock-server 快照扩展至六状态全覆盖），
//     静态动作直接改内存 store，counts 由数据推导，页签数字与表格恒等
// TODO(server): 接 /admin/consults 系列接口后只替换 load/handler 内的数据调用。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import StatusTag from '@/components/StatusTag.vue'
import {
  ProSearch,
  ProTable,
  DialogAction,
  confirmDialog,
  createFormDialog,
} from '@/components/pro'
import type { FormFieldConfig, TableActions, TableColumn, TablePagination } from '@/components/pro'
import { CONSULT_STATUS_MAP, fmtMoney, fmtTime, venueSub } from '@/utils/format'
import { STATUS_KEYS, TABS, quoteText } from './constants'
import { actDispatch, actReceive, actReject, consultStore, deriveCounts } from './mock'
import { dispatchDialog } from './dialogs/dispatch.dialog'
import ConsultDetailDrawer from './dialogs/ConsultDetailDrawer.vue'
import type { ConsultRow } from './types'

/* ═══ 查询状态 ═══ */
const tab = ref('PENDING')
const loading = ref(false)
const rows = ref<ConsultRow[]>([])
const total = ref(0)
const counts = ref<Record<string, number>>(deriveCounts([]))
const query = reactive<Record<string, unknown>>({ keyword: '' })
const page = ref(1)
const size = ref(10)

const searchFields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '咨询单号 / 昵称 / 手机号',
    width: 240,
  },
]

const pendingCount = computed(() => counts.value.PENDING ?? 0)
const allCount = computed(() => STATUS_KEYS.reduce((sum, k) => sum + (counts.value[k] ?? 0), 0))

/** 页签文案：状态名 + 计数（原型「待接待 3」同款） */
function labelOf(tabName: string, label: string): string {
  const count = tabName === 'ALL' ? allCount.value : (counts.value[tabName] ?? 0)
  return `${label} ${count}`
}

/* ═══ 列表加载（等价 GET /admin/consults?status=&keyword=&page=&size=）═══ */
async function load(resetPage = false): Promise<void> {
  if (resetPage) page.value = 1
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  const all = consultStore.rows
  counts.value = deriveCounts(all)
  const kw = String(query.keyword ?? '').trim()
  const filtered = all.filter((row) => {
    if (tab.value !== 'ALL' && row.status !== tab.value) return false
    if (kw) {
      const hay = `${row.id}${row.user?.nickname ?? ''}${row.user?.phone ?? ''}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
  total.value = filtered.length
  const start = (page.value - 1) * size.value
  rows.value = filtered.slice(start, start + size.value)
  loading.value = false
}

function onTabChange(): void {
  void load(true)
}

onMounted(() => void load())

/* ═══ 表格列（配置式；多行单元格用 render 组装全局公共类）═══ */
// 自适应策略（与原型写法的关键差异）：原型九列全部固定 width，宽屏下
// el-table 不拉伸 → 右侧出现整列空白。这里给「文本变长就少截断」收益最大的
// 三列（用户/场地/判定结论）改用 minWidth：窄屏以原型值为下限横向滚动（观感
// 同原型），宽屏剩余空间按比例摊给这三列、表格始终铺满容器（演示页同款机制）。
/** 双行单元格：主行 + 灰色副行（原型 .cell-sub 结构） */
function twoLine(main: string, sub: string, ellipsis = false) {
  return h('div', {}, [
    h(
      'div',
      { class: ellipsis ? 'ellipsis' : undefined, title: ellipsis ? main : undefined },
      main,
    ),
    h('div', { class: 'cell-sub ellipsis', title: sub }, sub || '—'),
  ])
}

const columns: TableColumn[] = [
  { prop: 'id', label: '咨询单号', width: 160 },
  {
    label: '用户',
    minWidth: 85,
    render: ({ row }) => twoLine(row.user?.nickname || '—', row.user?.phone ?? '', true),
  },
  {
    label: '场地',
    minWidth: 90,
    render: ({ row }) => twoLine(row.venue?.name || '—', venueSub(row.venue), true),
  },
  {
    label: '申请日期/时段',
    width: 118,
    render: ({ row }) => twoLine(row.performDate || '—', row.timeSlot ?? ''),
  },
  {
    label: '架次',
    width: 75,
    render: ({ row }) =>
      twoLine(
        `${row.need?.droneCount ?? '—'} 架`,
        row.need?.duration ? `${row.need.duration} 分钟` : '—',
      ),
  },
  {
    label: '判定结论',
    minWidth: 100,
    render: ({ row }) => {
      const text = row.judgment?.conclusionText || '—'
      return h('span', { class: 'ellipsis', title: text }, text)
    },
  },
  {
    label: '报价区间',
    width: 150,
    render: ({ row }) =>
      h(
        'span',
        { class: 'amount-text ellipsis', title: `预估合计 ${fmtMoney(row.quote?.total)}` },
        quoteText(row.quote),
      ),
  },
  {
    label: '状态',
    width: 115,
    render: ({ row }) =>
      h(StatusTag, {
        status: row.status,
        map: CONSULT_STATUS_MAP,
        size: 'small',
        shape: 'rect',
        title: row.statusText,
      }),
  },
  {
    prop: 'submittedAt',
    label: '提交时间',
    width: 140,
    formatter: (_row, value) => fmtTime(value as string),
    props: { className: 'col-nowrap' },
  },
]

const actions: TableActions = {
  width: 125,
  fixed: 'right',
  // 按钮回调 row 是 ProTable 的宽松类型，统一断言回 ConsultRow 再交给动作函数
  buttons: [
    {
      text: '接待',
      type: 'primary',
      show: (row) => row.status === 'PENDING',
      onClick: (row) => void doReceive(row as ConsultRow),
    },
    {
      text: '创建派单',
      type: 'primary',
      show: (row) => row.status === 'RECEIVED',
      onClick: (row) => void doDispatch(row as ConsultRow),
    },
    {
      text: '驳回',
      type: 'danger',
      show: (row) => row.status === 'RECEIVED',
      onClick: (row) => void doReject(row as ConsultRow),
    },
    {
      text: '详情',
      type: 'primary',
      show: (row) => row.status !== 'PENDING' && row.status !== 'RECEIVED',
      onClick: (row) => detailDrawerRef.value?.open(row as ConsultRow),
    },
  ],
}

const pagination = computed<TablePagination>(() => ({
  page: page.value,
  size: size.value,
  total: total.value,
  pageSizes: [10, 20, 50],
}))

/* ═══ 行级动作（静态实现直接改 mock store；真接口为 POST 成功后 load）═══ */
async function doReceive(row: ConsultRow): Promise<void> {
  const result = await confirmDialog.open({
    title: '接待确认',
    content: `确认接待咨询单 ${row.id}？接待后可创建派单，用户侧状态变为「客服已接待·拟方案」。`,
    type: 'warning',
    okText: '确认接待',
  })
  if (result.action !== DialogAction.Confirm) return
  actReceive(row)
  ElMessage.success('已接待，可以创建派单')
  void load()
}

/** 驳回原因弹窗：单个必填 textarea，复用公共 createFormDialog（替代原型 ElMessageBox.prompt） */
const rejectDialog = createFormDialog<{ reason: string }>({
  name: 'consult-reject',
  width: 'min(520px, 94vw)',
  labelWidth: '96px',
  defaultSpan: 24,
  okText: '确认驳回',
  fields: [
    {
      prop: 'reason',
      label: '驳回原因',
      control: 'textarea',
      placeholder: '例如：该场地处于禁飞区，无法执行飞行',
      rules: [
        {
          validator: (_rule, value, callback) => {
            if (String(value ?? '').trim()) callback()
            else callback(new Error('请填写驳回原因'))
          },
          trigger: 'blur',
        },
      ],
      props: { rows: 3, maxlength: 200, showWordLimit: true },
    },
  ],
})

async function doReject(row: ConsultRow): Promise<void> {
  const result = await rejectDialog.open({
    title: `驳回咨询单 ${row.id}`,
    description: '请填写驳回原因（用户可见）。',
  })
  if (result.action !== DialogAction.Confirm) return
  actReject(row, String(result.data?.reason ?? '').trim())
  ElMessage.success('已驳回咨询单')
  void load()
}

async function doDispatch(row: ConsultRow): Promise<void> {
  const result = await dispatchDialog.open({
    consultId: row.id,
    nickname: row.user?.nickname,
    phone: row.user?.phone,
    venueName: row.venue?.name,
    performDate: row.performDate,
    timeSlot: row.timeSlot,
    quoteHint: quoteText(row.quote),
    quoteLo: row.quote?.lo ?? 0,
    quoteHi: row.quote?.hi ?? 0,
  })
  if (result.action !== DialogAction.Confirm || !result.data) return
  actDispatch(row, result.data)
  ElMessage.success('派单已创建，等待用户在 H5 确认')
  void load()
}

/* ═══ 详情抽屉（查看型浮层，自管开关）═══ */
const detailDrawerRef = ref<InstanceType<typeof ConsultDetailDrawer>>()
</script>

<template>
  <div class="page">
    <!-- 搜索栏：原型同款单字段（ProSearch 自带查询/重置，回车即查） -->
    <div class="card">
      <ProSearch :model="query" :fields="searchFields" :loading="loading" :collapsible="false" />
    </div>

    <!-- 咨询单列表 -->
    <div class="card">
      <h3 class="card-title">
        咨询受理
        <span class="pending-tip">待接待 {{ pendingCount }} 单</span>
      </h3>

      <el-tabs v-model="tab" @tab-change="onTabChange">
        <el-tab-pane
          v-for="t in TABS"
          :key="t.name"
          :name="t.name"
          :label="labelOf(t.name, t.label)"
        />
      </el-tabs>

      <!-- auto-fit：行数多时表格 body 钳到视口底内部滚动，不再把页面顶出滚动条
           （标准与开关语义见 ProTable / TableAutoFitOptions） -->
      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        stripe
        row-key="id"
        :actions="actions"
        :pagination="pagination"
        :auto-fit="true"
        empty-text="暂无咨询单 —— 用户在 H5 提交咨询后出现在这里"
        @page-change="
          (payload) => {
            page = payload.page
            size = payload.size
            void load()
          }
        "
      />
    </div>

    <ConsultDetailDrawer ref="detailDrawerRef" />
  </div>
</template>

<style scoped>
/* 卡片标题右侧的待接待提醒（原型 .pending-tip：12px 红） */
.pending-tip {
  font-size: 12px;
  font-weight: 400;
  color: var(--app-color-danger);
}

/* 提交时间列禁止折行（原型 .nowrap，经列配置 className 落到单元格） */
:deep(.col-nowrap .cell) {
  white-space: nowrap;
}
</style>
