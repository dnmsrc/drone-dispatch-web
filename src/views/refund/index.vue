<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 退款管理（UI 完全复刻原型 admin/src/views/refund/list.vue）
//
// 写法按正式版规范重构，不再照搬原型的散装实现：
//   - 表格 → ProTable 配置式（columns + auto-fit），操作列「审批/已处理/
//     仅管理员」三种形态用 render 在列内组装（原型该列本就不是按钮组）
//   - 审批弹窗 → auditDialog（AuditDialog + wrapDialog），页面拿
//     「模式 + 金额/理由」后改 store，与真接口 POST approve/reject 同构
//   - 数据派生自 ../order/mock 的订单 store（退款挂在 o.refund 上），
//     退款列表里的订单号在订单管理页一定能查到
//   - 角色控制：审批按钮仅 ADMIN 可见（stores/auth，原型 auth.isAdmin 同款）
// TODO(server): 接 /admin/refunds 系列接口后只替换 load/openAudit 内的数据调用。
// ─────────────────────────────────────────────────────────────
import { computed, h, onMounted, ref } from 'vue'
import { ElButton, ElMessage, ElTag, ElTooltip } from 'element-plus'
import StatusTag from '@/components/StatusTag.vue'
import { ProTable, DialogAction, twoLineCell } from '@/components/pro'
import type { TableColumn } from '@/components/pro'
import { useAuthStore } from '@/stores/auth'
import { REFUND_STATUS_MAP, fmtMoney, fmtTime } from '@/utils/format'
import { REFUND_TABS, actRefundApprove, actRefundReject, queryRefunds } from './mock'
import { auditDialog } from './components/audit.dialog'
import type { RefundRow } from './types'

const auth = useAuthStore()
/** 审批权限（原型 auth.isAdmin：仅 ADMIN 可审批，OPERATOR 见灰字提示） */
const canAudit = computed(() => auth.isAdmin)

/* ═══ 查询状态（原型无搜索区、无分页，tab 即筛选）═══ */
const tab = ref('PENDING')
const loading = ref(false)
const rows = ref<RefundRow[]>([])

/* ═══ 列表加载（等价 GET /admin/refunds?status=，申请时间倒序在 mock 内做）═══ */
async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  rows.value = queryRefunds(tab.value)
  loading.value = false
}

function onTabChange(): void {
  void load()
}

onMounted(() => void load())

/* ═══ 行级提示与动作 ═══ */
/** 「已处理」hover 详情（原型 auditTip 逐字同款） */
function auditTip(row: RefundRow): string {
  const r = row.refund ?? {}
  if (r.status === 'APPROVED') {
    return `实退 ${fmtMoney(r.refundAmount)}${r.refundNo ? ` · 流水号 ${r.refundNo}` : ''} · ${fmtTime(r.auditedAt)}`
  }
  return `拒绝理由：${r.auditNote || '—'} · ${fmtTime(r.auditedAt)}`
}

async function openAudit(row: RefundRow): Promise<void> {
  const r = row.refund ?? {}
  const result = await auditDialog.open({
    orderId: row.id,
    nickname: row.user?.nickname,
    phone: row.user?.phone,
    totalAmount: row.totalAmount ?? 0,
    applyAmount: r.applyAmount ?? row.totalAmount ?? 0,
    ratio: r.ratio ?? 0,
    reason: r.reason,
  })
  if (result.action !== DialogAction.Confirm || !result.data) return
  const { mode, amount, note } = result.data
  if (mode === 'approve') {
    actRefundApprove(row, amount, note)
    ElMessage.success('退款已批准')
  } else {
    actRefundReject(row, note)
    ElMessage.success('已拒绝退款')
  }
  void load()
}

/* ═══ 表格列（配置式；多行单元格用公共 cells 构造器）═══ */
// 自适应策略同咨询页：文本变长收益大的列（用户/退款原因）用 minWidth 吃
// 宽屏剩余空间，其余列保持原型固定宽，窄屏出横向滚动（观感同原型）。
const columns: TableColumn[] = [
  { prop: 'id', label: '订单号', width: 150 },
  {
    label: '用户',
    minWidth: 120,
    render: ({ row }) => twoLineCell(row.user?.nickname || '—', row.user?.phone ?? '', true),
  },
  {
    prop: 'totalAmount',
    label: '订单金额',
    width: 120,
    formatter: (_row, value) => fmtMoney(value as number),
  },
  {
    label: '试算金额',
    width: 170,
    render: ({ row }) => {
      const r = row.refund ?? {}
      // 金额红 + 比例 plain tag（原型同款），tag 间距由 flex gap 承担
      return h('div', { style: 'display:flex;align-items:center;gap:6px' }, [
        h('span', { class: 'amount-text' }, fmtMoney(r.applyAmount)),
        h(ElTag, { size: 'small', effect: 'plain' }, () => `${Math.round((r.ratio || 0) * 100)}%`),
      ])
    },
  },
  {
    label: '退款原因',
    minWidth: 200,
    render: ({ row }) => {
      const reason = String(row.refund?.reason ?? '')
      // 两行截断 + 原生 title 悬浮全文（等价原型 el-tooltip show-after 300；
      // 行内样式规避跨组件 scoped 归属问题）
      return h(
        'span',
        {
          title: reason,
          style:
            'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden',
        },
        reason,
      )
    },
  },
  {
    label: '申请时间',
    width: 150,
    formatter: (row) => fmtTime(row.refund?.createdAt),
    props: { className: 'col-nowrap' },
  },
  {
    label: '状态',
    width: 110,
    render: ({ row }) =>
      h(StatusTag, {
        status: row.refund?.status ?? '',
        map: REFUND_STATUS_MAP,
        size: 'small',
        shape: 'rect',
      }),
  },
  {
    // 操作列非标准按钮组（审批钮 / 带 tooltip 的「已处理」/ 权限灰字），
    // 整列走自定义 render，宽度与 fixed 保持原型口径
    label: '操作',
    width: 160,
    fixed: 'right',
    render: ({ row }) => {
      const status = row.refund?.status
      if (status === 'PENDING') {
        if (!canAudit.value) return h('span', { class: 'cell-sub' }, '仅管理员可审批')
        return h(
          ElButton,
          { link: true, type: 'primary', onClick: () => void openAudit(row as RefundRow) },
          () => '审批',
        )
      }
      return h(ElTooltip, { content: auditTip(row as RefundRow), placement: 'top' }, () =>
        h('span', { class: 'cell-sub' }, '已处理'),
      )
    },
  },
]
</script>

<template>
  <div class="page">
    <!-- 退款单列表（原型同款：卡片内直接 tabs + 表格，无搜索区、无分页） -->
    <div class="card">
      <el-tabs v-model="tab" @tab-change="onTabChange">
        <el-tab-pane v-for="t in REFUND_TABS" :key="t.name" :name="t.name" :label="t.label" />
      </el-tabs>

      <!-- auto-fit：行数多时表格 body 钳到视口底内部滚动，行数少时撑开到
           不出现滚动条的最大（标准与开关语义见 ProTable / TableAutoFitOptions） -->
      <ProTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        stripe
        row-key="id"
        :auto-fit="true"
        empty-text="暂无退款记录"
      />
    </div>
  </div>
</template>

<style scoped>
/* 申请时间列禁止折行（原型 .nowrap，经列配置 className 落到单元格） */
:deep(.col-nowrap .cell) {
  white-space: nowrap;
}
</style>
