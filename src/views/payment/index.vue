<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 支付流水 / 对公到账（对齐后端 payments 表）
//
//   - 搜索栏 → ProSearch（关键词 / 支付方式 / 流水状态），ProTable + 分页 + autoFit
//   - 在线支付（微信/支付宝）由渠道回调驱动，本页只读
//   - 对公转账 PENDING 且带银行回单：管理员核对后「确认到账」（二次确认）
//   - 回单凭证点击调 ElImageViewer 放大预览（演示用占位图，photoUrl 同源生成）
//   - 业务校验集中在 mock.ts，页面只把抛出的错误用 ElMessage 呈现
// TODO(server): 接 /admin/payments 系列接口后仅替换 mock.ts，UI 与交互不动。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElTag, ElImageViewer } from 'element-plus'
import StatusTag from '@/components/StatusTag.vue'
import { ProSearch, ProTable, twoLineCell } from '@/components/pro'
import type {
  FormFieldConfig,
  OptionItem,
  TableActions,
  TableColumn,
  TablePagination,
} from '@/components/pro'
import { useAuthStore } from '@/stores/auth'
import { photoUrl } from '@/views/order/mock'
import {
  PAY_CHANNEL_LABELS,
  PAY_METHOD_LABELS,
  PAYMENT_STATUS_MAP,
  fmtMoney,
  fmtTime,
} from '@/utils/format'
import { actConfirm, queryPayments } from './mock'
import type { PaymentRow } from './types'

const authStore = useAuthStore()

/* ═══ 查询状态 ═══ */
const loading = ref(false)
const rows = ref<PaymentRow[]>([])
const total = ref(0)
const query = reactive<Record<string, unknown>>({
  keyword: '',
  payMethod: '',
  status: '',
})
const page = ref(1)
const size = ref(10)

const methodOptions: OptionItem[] = Object.entries(PAY_METHOD_LABELS).map(([value, label]) => ({
  label,
  value,
}))
const statusOptions: OptionItem[] = Object.entries(PAYMENT_STATUS_MAP).map(([value, conf]) => ({
  label: conf.text,
  value,
}))

const searchFields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '订单号 / 流水号 / 客户',
    width: 220,
  },
  {
    prop: 'payMethod',
    label: '支付方式',
    control: 'select',
    placeholder: '全部方式',
    options: methodOptions,
    width: 150,
  },
  {
    prop: 'status',
    label: '流水状态',
    control: 'select',
    placeholder: '全部状态',
    options: statusOptions,
    width: 150,
  },
]

async function load(resetPage = false): Promise<void> {
  if (resetPage) page.value = 1
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 280))
  const filtered = queryPayments({
    keyword: String(query.keyword ?? ''),
    payMethod: String(query.payMethod ?? ''),
    status: String(query.status ?? ''),
  })
  total.value = filtered.length
  const start = (page.value - 1) * size.value
  rows.value = filtered.slice(start, start + size.value)
  loading.value = false
}

onMounted(() => void load())

/* ═══ 回单预览（ElImageViewer 全屏）═══ */
const viewerUrl = ref('')
function openVoucher(url: string): void {
  viewerUrl.value = photoUrl(url)
}
function closeViewer(): void {
  viewerUrl.value = ''
}

/* ═══ 对公到账人工确认 ═══ */
function handleConfirm(row: PaymentRow): void {
  try {
    actConfirm(row.id, authStore.admin?.username ?? 'admin')
    ElMessage.success(`已确认到账 ${fmtMoney(row.amount)}，流水置为支付成功`)
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 表格列 ═══ */
const columns: TableColumn[] = [
  {
    label: '订单 / 客户',
    minWidth: 190,
    render: ({ row }) => {
      const p = row as PaymentRow
      return twoLineCell(p.orderId, p.order.userNickname || p.order.userPhone || '', true)
    },
  },
  {
    label: '支付方式',
    width: 130,
    render: ({ row }) => {
      const p = row as PaymentRow
      const isOffline = p.payMethod === 'OFFLINE'
      return h(
        ElTag,
        {
          type: isOffline ? 'warning' : 'primary',
          effect: isOffline ? 'dark' : 'light',
          size: 'small',
        },
        () => PAY_METHOD_LABELS[p.payMethod] ?? p.payMethod,
      )
    },
  },
  {
    label: '渠道 / 期次',
    minWidth: 150,
    render: ({ row }) => {
      const p = row as PaymentRow
      return twoLineCell(PAY_CHANNEL_LABELS[p.channel] ?? p.channel, p.stageName || '—', false)
    },
  },
  {
    prop: 'tradeNo',
    label: '流水号 / 回单号',
    minWidth: 200,
    render: ({ row }) => {
      const p = row as PaymentRow
      return h('span', { class: 'ellipsis', title: p.tradeNo }, p.tradeNo || '—')
    },
  },
  {
    label: '金额',
    width: 120,
    render: ({ row }) => {
      const p = row as PaymentRow
      return h('span', { class: 'amount-text', title: fmtMoney(p.amount) }, fmtMoney(p.amount))
    },
  },
  {
    label: '状态',
    width: 110,
    align: 'center',
    render: ({ row }) =>
      h(StatusTag, {
        status: (row as PaymentRow).status,
        map: PAYMENT_STATUS_MAP,
        size: 'small',
        shape: 'rect',
      }),
  },
  {
    label: '回单凭证',
    width: 100,
    align: 'center',
    render: ({ row }) => {
      const p = row as PaymentRow
      if (!p.voucherUrl) return h('span', { class: 'cell-sub' }, '—')
      return h(
        'a',
        {
          class: 'voucher-link',
          onClick: (e: Event) => {
            e.stopPropagation()
            openVoucher(p.voucherUrl)
          },
        },
        '查看回单',
      )
    },
  },
  {
    label: '确认 / 支付时间',
    width: 160,
    render: ({ row }) => {
      const p = row as PaymentRow
      return h('span', { class: 'nowrap' }, fmtTime(p.confirmedAt ?? p.paidAt))
    },
  },
]

/* ═══ 操作列：仅对公 + 待确认 显示「确认到账」═══ */
const actions: TableActions = {
  width: 120,
  fixed: 'right',
  buttons: [
    {
      text: '确认到账',
      type: 'success',
      icon: 'CircleCheck',
      show: (row) => {
        const p = row as PaymentRow
        return p.payMethod === 'OFFLINE' && p.status === 'PENDING'
      },
      confirm: (row) => {
        const p = row as PaymentRow
        return `请核对银行回单与金额 ${fmtMoney(p.amount)}，确认该笔对公转账已到账？`
      },
      confirmButtonText: '确认到账',
      onClick: (row) => handleConfirm(row as PaymentRow),
    },
  ],
}

const pagination = computed<TablePagination>(() => ({
  page: page.value,
  size: size.value,
  total: total.value,
  pageSizes: [10, 20, 50],
}))
</script>

<template>
  <div class="page">
    <div class="card">
      <ProSearch :model="query" :fields="searchFields" :loading="loading" :collapsible="false" />
    </div>

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
        empty-text="暂无支付流水"
        @page-change="
          (payload) => {
            page = payload.page
            size = payload.size
            void load()
          }
        "
      />
    </div>

    <!-- 回单大图预览（演示占位图；正式版为真实银行回单图片） -->
    <ElImageViewer v-if="viewerUrl" :url-list="[viewerUrl]" teleported @close="closeViewer" />
  </div>
</template>

<style scoped>
.voucher-link {
  color: var(--app-color-primary);
  cursor: pointer;
  font-size: 13px;
}

.voucher-link:hover {
  text-decoration: underline;
}
</style>
