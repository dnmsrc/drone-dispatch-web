<script setup lang="ts">
// 表格 · 列与操作：多选、序号、多级表头、具名插槽、操作列、分页
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ProTable, type TableActions, type TableColumn } from '@/components/pro'
import { formatMoney, mockOrders, ORDER_STATUS_MAP } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

/* ── 分页 ─────────────────────────────── */
const page = ref(1)
const size = ref(5)
const total = ref(mockOrders.length)

const pagination = computed(() => ({
  page: page.value,
  size: size.value,
  total: total.value,
  pageSizes: [5, 10, 20],
}))

/** 本地分页：真实项目里换成接口请求（页码/条数即入参） */
const pageData = computed(() => {
  const start = (page.value - 1) * size.value
  return mockOrders.slice(start, start + size.value)
})

function onPageChange(payload: { page: number; size: number }) {
  page.value = payload.page
  size.value = payload.size
}

/* ── 列配置（含多级表头 + 插槽列） ─────── */
const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 150 },
  { prop: 'nickname', label: '用户', minWidth: 110, slot: 'user' },
  {
    label: '表演信息',
    align: 'center',
    children: [
      { prop: 'venue', label: '场地', minWidth: 100 },
      { prop: 'performDate', label: '日期', width: 100 },
      { prop: 'timeSlot', label: '时段', width: 80 },
    ],
  },
  { prop: 'drones', label: '架次', width: 70, align: 'right' },
  {
    prop: 'amount',
    label: '金额',
    width: 110,
    align: 'right',
    formatter: (_row, value) => formatMoney(value as number),
  },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    render: (ctx) => {
      const meta = ORDER_STATUS_MAP[ctx.value as string]
      return meta ? meta.text : '未知'
    },
  },
]

/* ── 操作列 ─────────────────────────────── */
const selection = ref<Record<string, any>[]>([])

const actions: TableActions = {
  width: 180,
  max: 3,
  buttons: [
    {
      text: '详情',
      type: 'primary',
      onClick: (row) => {
        ElMessage.info(`查看订单 ${row.id}`)
      },
    },
    {
      text: '编辑',
      type: 'primary',
      show: (row) => row.status === 'pending',
      onClick: (row) => {
        ElMessage.info(`编辑订单 ${row.id}`)
      },
    },
    {
      text: '删除',
      type: 'danger',
      confirm: (row) => `确认删除订单 ${row.id}？删除后不可恢复。`,
      onClick: (row) => {
        ElMessage.success(`已删除 ${row.id}（演示）`)
      },
    },
    {
      text: '导出',
      type: 'primary',
      onClick: (row) => {
        ElMessage.info(`导出 ${row.id}`)
      },
    },
  ],
}

async function batchRemove() {
  if (!selection.value.length) {
    ElMessage.warning('请先勾选要操作的订单')
    return
  }
  await ElMessageBox.confirm(`确认删除选中的 ${selection.value.length} 条订单？`, '提示', {
    type: 'warning',
  })
  ElMessage.success('已删除（演示）')
}

/* ── autoFit 自适应高度（列表页标准，默认关、传入才开）── */
const fitOn = ref(true)
const fitRows = ref(30)

/** 程序化造行：行数多时直观对比「关=整块撑高顶出页面滚动 / 开=body 钳到视口底内部滚」 */
const fitData = computed(() =>
  Array.from({ length: fitRows.value }, (_, i) => {
    const base = mockOrders[i % mockOrders.length]
    return { ...base, id: `FIT${String(i + 1).padStart(4, '0')}` }
  }),
)

const fitColumns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 150 },
  { prop: 'nickname', label: '用户', width: 100 },
  { prop: 'venue', label: '场地', minWidth: 120 },
  { prop: 'performDate', label: '日期', width: 110 },
  {
    prop: 'amount',
    label: '金额',
    width: 110,
    align: 'right',
    formatter: (_row, value) => formatMoney(value as number),
  },
]

const fitCode = `// 标准（ProTable autoFit，默认关闭）：
//   可用高 = 表格顶缘 → 最近滚动容器可见底缘
//            − bottomGap(默认24) − 分页区全部占用(分页条含 margin + 卡片/页面留白)
//   表格恒固定为可用高，文档高度不随行数变化，页面永不出整体滚动条：
//   行数不足 → 即「撑开到不出现滚动条的最大」，富余是表格底部同色空档、行不变形；
//   行数过多 → body 内部滚动，表头与分页留在视口内；
//   极小窗口按 min(默认200) 兜底、允许页面滚动
<ProTable :columns="fitColumns" :data="fitData" border stripe :auto-fit="true" />

// 微调留白/下限；显式 height / maxHeight 优先于 autoFit
<ProTable ... :auto-fit="{ bottomGap: 16, min: 320 }" />`

const code = `const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 160 },
  { prop: 'nickname', label: '用户', slot: 'user' },          // 具名插槽自定义
  { label: '表演信息', align: 'center', children: [          // 多级表头
    { prop: 'venue', label: '场地' }, { prop: 'performDate', label: '日期' } ] },
]

const actions: TableActions = {
  width: 200, max: 3,                                     // 超过 3 个收进「更多」
  buttons: [
    { text: '详情', type: 'primary', onClick: (row) => openDetail(row) },
    { text: '编辑', show: (row) => row.status === 'pending', onClick: edit },
    { text: '删除', type: 'danger', confirm: '确认删除？', onClick: remove },  // 二次确认
    { text: '导出', onClick: exportRow },
  ],
}

<ProTable :columns="columns" :data="rows" selection index
  :actions="actions" :pagination="pagination" @page-change="onPageChange">
  <template #user="{ row }">{{ row.nickname }}</template>
</ProTable>`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="列配置"
      desc="多选、序号、多级表头、具名插槽、操作列（show/confirm/更多）、分页"
      :code="code"
    >
      <ProTable
        :columns="columns"
        :data="pageData"
        selection
        index
        border
        stripe
        :actions="actions"
        :pagination="pagination"
        @page-change="onPageChange"
        @selection-change="(rows) => (selection = rows)"
      >
        <template #user="{ row }">
          <div>{{ row?.nickname }}</div>
          <div class="cell-sub">{{ row?.phone }}</div>
        </template>
      </ProTable>

      <div class="demo-toolbar">
        <el-button type="danger" plain size="small" @click="batchRemove">
          批量删除（已选 {{ selection.length }}）
        </el-button>
        <span class="demo-toolbar-tip">
          「编辑」只在待接单状态显示；「删除」带二次确认；超过 max 的按钮进「更多」下拉
        </span>
      </div>
    </DemoBlock>

    <DemoBlock
      title="autoFit 自适应高度"
      desc="列表页标准：表格恒为可用高——行数不足撑开到不留灰底空档、行数过多仅 body 内部滚动，页面永远不出整体滚动条（开关默认关，传入才开）"
      :code="fitCode"
    >
      <div class="demo-autofit-bar">
        <el-switch v-model="fitOn" active-text="autoFit 开" inactive-text="autoFit 关" />
        <el-radio-group v-model="fitRows" size="small">
          <el-radio-button :value="6">6 行（装得下）</el-radio-button>
          <el-radio-button :value="30">30 行（装不下）</el-radio-button>
        </el-radio-group>
        <span class="demo-toolbar-tip">
          关掉开关再看 30 行：表格按内容自然撑高、把页面顶出整体滚动条——这就是该开关要修掉的行为
        </span>
      </div>
      <ProTable :columns="fitColumns" :data="fitData" border stripe :auto-fit="fitOn" />
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-autofit-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.demo-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.demo-toolbar-tip {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
