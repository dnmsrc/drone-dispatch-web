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
  </div>
</template>

<style scoped>
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
