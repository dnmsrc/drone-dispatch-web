<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 订单详情抽屉（UI 复刻原型 order/list.vue 的 el-drawer）
//
// 与咨询抽屉同为查看型浮层，但 footer 带状态推进动作（接单/拒单/开始/完成），
// 所以对外暴露 open(row) + emit('updated') 通知页面刷新列表：
//   - 接单/开始执行 → confirmDialog.open（替代原型 ElMessageBox.confirm）
//   - 拒单 → createFormDialog 必填原因（替代原型手写 el-dialog 表单）
//   - 完成订单 → completeDialog（照片/视频可编辑，替代原型散装 ref）
// 数据经 mock.buildDetail 取独立副本（等价 GET /admin/orders/:id），
// 动作直接改 store 行后重新拉副本，接真接口后只换数据调用。
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'
import StatusTag from '@/components/StatusTag.vue'
import { DialogAction, confirmDialog, createFormDialog } from '@/components/pro'
import {
  PAY_CHANNEL_LABELS,
  REFUND_STATUS_MAP,
  STATUS_MAP,
  VENUE_TYPE_LABELS,
  addonsText,
  fmtMoney,
  fmtTime,
  patternsText,
} from '@/utils/format'
import { actAccept, actComplete, actReject, actStart, buildDetail, photoUrl } from '../mock'
import { completeDialog } from './complete.dialog'
import type { OrderRow } from '../types'

const emit = defineEmits<{ updated: [] }>()

const visible = ref(false)
const loading = ref(false)
const acting = ref(false)
/** store 行引用（动作改写目标）；detail 为其展示副本 */
let rowRef: OrderRow | null = null
const detail = ref<OrderRow | null>(null)

/** 打开抽屉并模拟详情接口耗时（真接口：GET /admin/orders/:id） */
function open(row: OrderRow): void {
  rowRef = row
  visible.value = true
  loading.value = true
  detail.value = null
  window.setTimeout(() => {
    detail.value = buildDetail(row)
    loading.value = false
  }, 260)
}

/** 动作成功后刷新详情并通知页面重载列表（原型 afterAction 同款） */
async function afterAction(msg: string): Promise<void> {
  ElMessage.success(msg)
  if (rowRef) detail.value = buildDetail(rowRef)
  emit('updated')
}

/* ═══ 接单：PENDING_ACCEPT → ACCEPTED ═══ */
async function doAccept(): Promise<void> {
  if (!detail.value) return
  const result = await confirmDialog.open({
    title: '接单确认',
    content: '确认接单？接单后订单进入「已接单·待执行」状态。',
    type: 'warning',
    okText: '确认接单',
  })
  if (result.action !== DialogAction.Confirm || !rowRef) return
  acting.value = true
  try {
    actAccept(rowRef)
    await afterAction('已接单')
  } finally {
    acting.value = false
  }
}

/* ═══ 拒单：必填原因弹窗（公共 createFormDialog，替代原型手写 el-dialog）═══ */
const rejectFormDialog = createFormDialog<{ reason: string }>({
  name: 'order-reject',
  width: 'min(480px, 94vw)',
  labelWidth: '96px',
  defaultSpan: 24,
  okText: '确认拒单并退款',
  fields: [
    {
      prop: 'reason',
      label: '拒单原因',
      control: 'textarea',
      placeholder: '例如：该场地位于航线管制区，无法执行飞行',
      rules: [
        {
          validator: (_rule, value, callback) => {
            if (String(value ?? '').trim()) callback()
            else callback(new Error('请填写拒单原因'))
          },
          trigger: 'blur',
        },
      ],
      props: { rows: 3, maxlength: 100, showWordLimit: true },
    },
  ],
})

async function doReject(): Promise<void> {
  if (!detail.value) return
  const result = await rejectFormDialog.open({
    title: `拒单确认 ${detail.value.id}`,
    description: '拒单后系统将按 100% 自动全额退款，订单直接变为「已退款」。',
  })
  if (result.action !== DialogAction.Confirm || !rowRef) return
  acting.value = true
  try {
    actReject(rowRef, String(result.data?.reason ?? '').trim())
    await afterAction('已拒单并全额退款')
  } finally {
    acting.value = false
  }
}

/* ═══ 开始执行：ACCEPTED → IN_SERVICE ═══ */
async function doStart(): Promise<void> {
  if (!detail.value) return
  const result = await confirmDialog.open({
    title: '开始执行',
    content: '确认表演开始执行？订单将进入「执行中」状态。',
    type: 'warning',
    okText: '开始执行',
  })
  if (result.action !== DialogAction.Confirm || !rowRef) return
  acting.value = true
  try {
    actStart(rowRef)
    await afterAction('表演已开始执行')
  } finally {
    acting.value = false
  }
}

/* ═══ 完成订单：IN_SERVICE → COMPLETED（回传照片/视频）═══ */
async function doComplete(): Promise<void> {
  if (!detail.value) return
  const result = await completeDialog.open({
    orderId: detail.value.id,
    photos: detail.value.media?.photos,
    videos: detail.value.media?.videos,
  })
  if (result.action !== DialogAction.Confirm || !result.data || !rowRef) return
  acting.value = true
  try {
    actComplete(rowRef, result.data)
    await afterAction('订单已完成，现场照片已回传')
  } finally {
    acting.value = false
  }
}

/** 预览大图列表（种子串 → 内联 SVG，点开即看无需网络） */
function previewList(row: OrderRow): string[] {
  return (row.media?.photos ?? []).map(photoUrl)
}

defineExpose({ open })
</script>

<template>
  <el-drawer
    v-model="visible"
    size="min(660px, 100vw)"
    :title="detail ? `订单详情 ${detail.id}` : '订单详情'"
  >
    <div v-if="detail" v-loading="loading" class="drawer-body">
      <h4 class="section-title">基本信息</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="订单号" :span="2">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <StatusTag :status="detail.status" :map="STATUS_MAP" size="small" shape="rect" />
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{
          fmtTime(detail.createdAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ detail.user?.nickname || '—' }}（{{ detail.user?.phone || '—' }}）
        </el-descriptions-item>
        <el-descriptions-item label="场次场合">{{ detail.occasion || '—' }}</el-descriptions-item>
        <el-descriptions-item label="表演时间"
          >{{ detail.performDate }} {{ detail.timeSlot }}</el-descriptions-item
        >
        <el-descriptions-item label="联系人"
          >{{ detail.contact?.name }} {{ detail.contact?.phone }}</el-descriptions-item
        >
        <el-descriptions-item label="表演场地" :span="2">
          {{ detail.venue?.name }}
          <span class="cell-sub">
            （{{ VENUE_TYPE_LABELS[detail.venue?.type ?? ''] || '其他' }} ·
            {{ detail.venue?.address }}）
          </span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.cancelReason" label="取消原因" :span="2">
          {{ detail.cancelReason }}
        </el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">方案明细</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="投入规模">{{ detail.droneCount }} 架</el-descriptions-item>
        <el-descriptions-item label="表演时长">{{ detail.duration }} 分钟</el-descriptions-item>
        <el-descriptions-item label="预设图案">{{
          patternsText(detail.patternPreset)
        }}</el-descriptions-item>
        <el-descriptions-item label="定制文字">{{ detail.customText || '—' }}</el-descriptions-item>
        <el-descriptions-item label="LOGO 定制" :span="2">{{
          detail.customLogo || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="附加服务" :span="2">{{
          addonsText(detail.addons)
        }}</el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">价格明细</h4>
      <div class="price-list">
        <div v-for="(p, i) in detail.priceDetail" :key="i" class="price-row">
          <span>{{ p.label }}</span>
          <span>{{ fmtMoney(p.amount) }}</span>
        </div>
        <div class="price-row total">
          <span>订单合计</span>
          <span class="amount-text">{{ fmtMoney(detail.totalAmount) }}</span>
        </div>
      </div>

      <template v-if="detail.paidAt">
        <h4 class="section-title">支付信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="支付方式">
            {{ PAY_CHANNEL_LABELS[detail.payChannel ?? ''] || detail.payChannel }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmtTime(detail.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="交易流水号" :span="2">{{
            detail.payTradeNo
          }}</el-descriptions-item>
        </el-descriptions>
      </template>

      <template v-if="detail.refund">
        <h4 class="section-title">退款信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="退款原因" :span="2">{{
            detail.refund.reason
          }}</el-descriptions-item>
          <el-descriptions-item label="试算金额">
            {{ fmtMoney(detail.refund.applyAmount) }}（{{
              Math.round((detail.refund.ratio || 0) * 100)
            }}%）
          </el-descriptions-item>
          <el-descriptions-item label="审批状态">
            <el-tag
              :type="REFUND_STATUS_MAP[detail.refund.status ?? '']?.type || 'info'"
              size="small"
            >
              {{ REFUND_STATUS_MAP[detail.refund.status ?? '']?.text || detail.refund.status }}
            </el-tag>
          </el-descriptions-item>
          <template v-if="detail.refund.status !== 'PENDING'">
            <el-descriptions-item label="实退金额">{{
              fmtMoney(detail.refund.refundAmount)
            }}</el-descriptions-item>
            <el-descriptions-item label="退款流水号">{{
              detail.refund.refundNo || '—'
            }}</el-descriptions-item>
            <el-descriptions-item label="审批人">{{
              detail.refund.auditBy || '—'
            }}</el-descriptions-item>
            <el-descriptions-item label="审批时间">{{
              fmtTime(detail.refund.auditedAt)
            }}</el-descriptions-item>
            <el-descriptions-item label="审批备注" :span="2">{{
              detail.refund.auditNote || '—'
            }}</el-descriptions-item>
          </template>
        </el-descriptions>
      </template>

      <template v-if="detail.media?.photos?.length">
        <h4 class="section-title">现场回传</h4>
        <div class="media-grid">
          <el-image
            v-for="(p, i) in detail.media.photos"
            :key="i"
            :src="photoUrl(p)"
            :preview-src-list="previewList(detail)"
            :initial-index="i"
            fit="cover"
            class="media-img"
          />
          <div v-for="v in detail.media.videos" :key="v" class="media-video">
            <el-icon :size="22"><VideoPlay /></el-icon>
            <span>视频回传（演示）</span>
          </div>
        </div>
      </template>

      <h4 class="section-title">状态时间线</h4>
      <el-timeline class="timeline">
        <el-timeline-item
          v-for="(t, i) in detail.timeline"
          :key="i"
          :timestamp="fmtTime(t.time)"
          :type="i === (detail.timeline?.length ?? 0) - 1 ? 'primary' : ''"
        >
          {{ t.text }}
        </el-timeline-item>
      </el-timeline>
    </div>

    <template #footer v-if="detail">
      <div class="drawer-footer">
        <template v-if="detail.status === 'PENDING_ACCEPT'">
          <el-button type="primary" :loading="acting" @click="doAccept">接单</el-button>
          <el-button type="danger" plain :loading="acting" @click="doReject">拒单</el-button>
        </template>
        <el-button
          v-else-if="detail.status === 'ACCEPTED'"
          type="primary"
          :loading="acting"
          @click="doStart"
        >
          开始执行
        </el-button>
        <el-button
          v-else-if="detail.status === 'IN_SERVICE'"
          type="success"
          :loading="acting"
          @click="doComplete"
        >
          完成订单
        </el-button>
        <span v-else class="cell-sub">当前状态无可执行操作</span>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.drawer-body {
  padding-bottom: 8px;
}

.drawer-footer {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 现场回传九宫格（原型 media-grid：128×80 缩略图自动换行） */
.media-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.media-img {
  width: 128px;
  height: 80px;
  border-radius: 4px;
  border: 1px solid var(--app-border-color);
}

.media-video {
  width: 128px;
  height: 80px;
  border-radius: 4px;
  border: 1px dashed var(--app-text-placeholder);
  background: var(--app-bg-hover);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--app-text-secondary);
  font-size: 12px;
  gap: 4px;
}

.timeline {
  padding-left: 2px;
}
</style>
