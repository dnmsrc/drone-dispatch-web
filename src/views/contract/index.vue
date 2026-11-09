<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 电子合同（对齐后端 contracts + contract_payment_schedule 两表）
//
//   - 搜索栏 → ProSearch（关键词 / 签署状态），表格 → ProTable + 分页 + autoFit
//   - 详情 → ContractDetailDrawer（含分期付款计划表与签署存档）
//   - 状态机动作按签署状态显隐：
//       DRAFT 草稿      → 提交签署（confirm）
//       PENDING_SIGN    → 上传签署件 PDF（弹窗）→ 已签署
//       SIGNED 已签署   → 作废（弹窗，原因必填）
//       VOID 已作废     → 仅可查看
//   - 业务校验集中在 mock.ts，页面只把抛出的错误用 ElMessage 呈现
// TODO(server): 接 /admin/contracts 系列接口后仅替换 mock.ts，UI 与交互不动。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import StatusTag from '@/components/StatusTag.vue'
import { createFormDialog, DialogAction, ProSearch, ProTable, twoLineCell } from '@/components/pro'
import type {
  FormFieldConfig,
  OptionItem,
  TableActions,
  TableColumn,
  TablePagination,
} from '@/components/pro'
import { CONTRACT_SIGN_MAP, fmtDate, fmtMoney, fmtTime } from '@/utils/format'
import ContractDetailDrawer from './components/ContractDetailDrawer.vue'
import { actSubmitSign, actUploadPdf, actVoid, paymentSummary, queryContracts } from './mock'
import type { ContractRow, UploadPdfForm, VoidContractForm } from './types'

/* ═══ 查询状态 ═══ */
const loading = ref(false)
const rows = ref<ContractRow[]>([])
const total = ref(0)
const query = reactive<Record<string, unknown>>({ keyword: '', signStatus: '' })
const page = ref(1)
const size = ref(10)

const signStatusOptions: OptionItem[] = Object.entries(CONTRACT_SIGN_MAP).map(([value, conf]) => ({
  label: conf.text,
  value,
}))

const searchFields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '合同号 / 订单号 / 甲方 / 电话',
    width: 240,
  },
  {
    prop: 'signStatus',
    label: '签署状态',
    control: 'select',
    placeholder: '全部状态',
    options: signStatusOptions,
    width: 160,
  },
]

async function load(resetPage = false): Promise<void> {
  if (resetPage) page.value = 1
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 280))
  const filtered = queryContracts({
    keyword: String(query.keyword ?? ''),
    signStatus: String(query.signStatus ?? ''),
  })
  total.value = filtered.length
  const start = (page.value - 1) * size.value
  rows.value = filtered.slice(start, start + size.value)
  loading.value = false
}

onMounted(() => void load())

/* ═══ 详情抽屉 ═══ */
const drawerRef = ref<InstanceType<typeof ContractDetailDrawer>>()

/* ═══ 上传签署件 PDF 弹窗 ═══ */
const uploadDialog = createFormDialog<UploadPdfForm>({
  name: 'contract-upload-pdf',
  width: 480,
  labelWidth: '92px',
  defaultSpan: 24,
  okText: '确认上传并签署',
  fields: [
    {
      prop: 'pdfUrl',
      label: 'PDF 地址',
      placeholder: '已签署合同 PDF 的存档 URL（正式版走文件上传）',
      required: true,
      rules: [{ required: true, message: '请填写已签署合同 PDF 的地址', trigger: 'blur' }],
      props: { maxlength: 255 },
      tip: '一期不对接电子签平台：上传已签 PDF 即把合同置为「已签署」',
    },
  ],
})

const actingRow = ref<ContractRow | null>(null)

async function openUpload(row: ContractRow): Promise<void> {
  actingRow.value = row
  const result = await uploadDialog.open({
    title: `上传签署件 · ${row.contractNo}`,
    pdfUrl: row.signedPdfUrl || '',
  })
  if (result.action !== DialogAction.Confirm || !result.data) return
  try {
    actUploadPdf(row.id, (result.data as UploadPdfForm).pdfUrl)
    ElMessage.success('签署件已上传，合同置为已签署')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 作废弹窗（原因必填）═══ */
const voidDialog = createFormDialog<VoidContractForm>({
  name: 'contract-void',
  width: 480,
  labelWidth: '92px',
  defaultSpan: 24,
  okText: '确认作废',
  fields: [
    {
      prop: 'voidReason',
      label: '作废原因',
      control: 'textarea',
      placeholder: '请填写作废原因（必填，将记录在合同档案中）',
      required: true,
      rules: [{ required: true, message: '请填写作废原因', trigger: 'blur' }],
      props: { maxlength: 255, rows: 3, showWordLimit: true },
    },
  ],
})

async function openVoid(row: ContractRow): Promise<void> {
  actingRow.value = row
  const result = await voidDialog.open({ title: `作废合同 · ${row.contractNo}`, voidReason: '' })
  if (result.action !== DialogAction.Confirm || !result.data) return
  try {
    actVoid(row.id, (result.data as VoidContractForm).voidReason)
    ElMessage.success('合同已作废')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 提交签署（草稿 → 待签署，二次确认即可）═══ */
function handleSubmitSign(row: ContractRow): void {
  try {
    actSubmitSign(row.id)
    ElMessage.success('已提交，等待客户回签/盖章')
    void load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/* ═══ 表格列 ═══ */
const columns: TableColumn[] = [
  {
    label: '合同 / 订单',
    minWidth: 190,
    render: ({ row }) => {
      const c = row as ContractRow
      return twoLineCell(c.contractNo, c.orderId, true)
    },
  },
  {
    label: '甲方',
    minWidth: 150,
    render: ({ row }) => {
      const c = row as ContractRow
      return twoLineCell(c.partyAName, c.partyAPhone || '', true)
    },
  },
  {
    label: '合同金额',
    width: 120,
    render: ({ row }) => {
      const c = row as ContractRow
      return h(
        'span',
        { class: 'amount-text ellipsis', title: fmtMoney(c.totalAmount) },
        fmtMoney(c.totalAmount),
      )
    },
  },
  {
    label: '付款进度',
    width: 150,
    render: ({ row }) => {
      const c = row as ContractRow
      const s = paymentSummary(c)
      const sub = s.settled
        ? `${s.totalStages}/${s.totalStages} 期已结清`
        : `${s.paidStages}/${s.totalStages} 期 · 待付`
      return twoLineCell(fmtMoney(s.paidAmount), sub, false)
    },
  },
  {
    label: '签署状态',
    width: 110,
    align: 'center',
    render: ({ row }) =>
      h(StatusTag, {
        status: (row as ContractRow).signStatus,
        map: CONTRACT_SIGN_MAP,
        size: 'small',
        shape: 'rect',
      }),
  },
  {
    label: '表演日期',
    width: 120,
    render: ({ row }) =>
      h('span', { class: 'nowrap' }, fmtDate((row as ContractRow).order.performDate)),
  },
  {
    label: '创建时间',
    width: 150,
    render: ({ row }) => h('span', { class: 'nowrap' }, fmtTime((row as ContractRow).createdAt)),
  },
]

/* ═══ 操作列：按签署状态显隐 ═══ */
const actions: TableActions = {
  width: 200,
  fixed: 'right',
  max: 3,
  buttons: [
    {
      text: '详情',
      type: 'primary',
      icon: 'View',
      onClick: (row) => drawerRef.value?.open((row as ContractRow).id),
    },
    {
      text: '提交签署',
      type: 'warning',
      icon: 'Promotion',
      show: (row) => (row as ContractRow).signStatus === 'DRAFT',
      confirm: (row) =>
        `确认把合同「${(row as ContractRow).contractNo}」提交签署？提交后等待客户回签。`,
      onClick: (row) => handleSubmitSign(row as ContractRow),
    },
    {
      text: '上传签署件',
      type: 'success',
      icon: 'UploadFilled',
      show: (row) => (row as ContractRow).signStatus === 'PENDING_SIGN',
      onClick: (row) => void openUpload(row as ContractRow),
    },
    {
      text: '作废',
      type: 'danger',
      icon: 'CircleClose',
      show: (row) => (row as ContractRow).signStatus === 'SIGNED',
      onClick: (row) => void openVoid(row as ContractRow),
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
        empty-text="暂无合同 —— 有效订单创建时会同步生成合同草稿"
        @page-change="
          (payload) => {
            page = payload.page
            size = payload.size
            void load()
          }
        "
      />
    </div>

    <ContractDetailDrawer ref="drawerRef" />
  </div>
</template>
