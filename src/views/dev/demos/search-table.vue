<script setup lang="ts">
// 搜索 + 表格 · 完整列表页范式（ProSearch + ProTable 联动，模拟后端分页）
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ProSearch, ProTable, type FormFieldConfig, type TableActions, type TableColumn } from '@/components/pro'
import { formatMoney, mockOrders, ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS, VENUE_OPTIONS } from '../mock'
import DemoBlock from '../components/DemoBlock.vue'

/** 查询条件（ProSearch 直接改这个对象） */
const query = reactive<Record<string, any>>({
  keyword: '',
  status: '',
  venue: '',
  dateRange: [] as string[],
})

const searchFields: FormFieldConfig[] = [
  { prop: 'keyword', label: '关键词', control: 'input', placeholder: '订单号 / 昵称', width: 220 },
  { prop: 'status', label: '状态', control: 'select', options: ORDER_STATUS_OPTIONS, width: 160 },
  { prop: 'venue', label: '场地', control: 'select', options: VENUE_OPTIONS, width: 160 },
  { prop: 'dateRange', label: '日期', control: 'daterange', width: 260 },
]

const loading = ref(false)
const page = ref(1)
const size = ref(5)
const total = ref(0)
const rows = ref<typeof mockOrders>([])

const pagination = computed(() => ({
  page: page.value,
  size: size.value,
  total: total.value,
  pageSizes: [5, 10, 20],
}))

/** 模拟后端筛选 + 分页 */
function filterRows(): typeof mockOrders {
  const { keyword, status, venue, dateRange } = query
  return mockOrders.filter((row) => {
    if (keyword && !`${row.id}${row.nickname}`.includes(keyword)) return false
    if (status && row.status !== status) return false
    if (venue && row.venue !== venue) return false
    if (Array.isArray(dateRange) && dateRange.length === 2) {
      if (row.performDate < dateRange[0] || row.performDate > dateRange[1]) return false
    }
    return true
  })
}

async function load(resetPage = false) {
  if (resetPage) page.value = 1
  loading.value = true
  // 模拟接口耗时，便于观察 loading 与分页交互
  await new Promise((resolve) => setTimeout(resolve, 500))
  const filtered = filterRows()
  total.value = filtered.length
  const start = (page.value - 1) * size.value
  rows.value = filtered.slice(start, start + size.value)
  loading.value = false
}

onMounted(() => void load())

const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', minWidth: 160 },
  { prop: 'nickname', label: '用户', minWidth: 110 },
  { prop: 'venue', label: '场地', minWidth: 110 },
  { prop: 'performDate', label: '表演日期', width: 120 },
  { prop: 'timeSlot', label: '时段', width: 90 },
  {
    prop: 'amount',
    label: '金额',
    width: 130,
    align: 'right',
    formatter: (_row, value) => formatMoney(value as number),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (ctx) => ORDER_STATUS_MAP[ctx.value as string]?.text ?? '未知',
  },
]

const actions: TableActions = {
  buttons: [
    { text: '详情', type: 'primary', onClick: (row) => { ElMessage.info(`查看订单 ${row.id}`) } },
    {
      text: '接单',
      type: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => { ElMessage.success(`已接单 ${row.id}（演示）`) },
    },
  ],
}

const code = `const query = reactive({ keyword: '', status: '', venue: '', dateRange: [] })

<ProSearch :model="query" :fields="searchFields" :loading="loading"
  @search="() => load(true)" @reset="() => load(true)" />

<ProTable :columns="columns" :data="rows" :loading="loading"
  :actions="actions" :pagination="pagination"
  @page-change="(p) => { page = p.page; size = p.size; load() }" />`
</script>

<template>
  <div class="demo-page">
    <DemoBlock
      title="搜索 + 表格（列表页范式）"
      desc="搜索条件变化后回第 1 页重新查询；分页由 ProTable 渲染并回传页码/条数；loading 贯穿两者"
      :code="code"
    >
      <div class="demo-list-page">
        <ProSearch
          :model="query"
          :fields="searchFields"
          :loading="loading"
          @search="() => load(true)"
          @reset="() => load(true)"
        />

        <el-card shadow="never" class="demo-table-card">
          <template #header>
            <div class="demo-table-head">
              <span class="demo-table-title">订单列表</span>
              <span class="demo-table-count">共 {{ total }} 条</span>
            </div>
          </template>

          <ProTable
            :columns="columns"
            :data="rows"
            :loading="loading"
            border
            :actions="actions"
            :pagination="pagination"
            @page-change="(payload) => { page = payload.page; size = payload.size; load() }"
          />
        </el-card>
      </div>
    </DemoBlock>
  </div>
</template>

<style scoped>
.demo-table-card {
  border-radius: 4px;
}

.demo-table-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.demo-table-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.demo-table-count {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
