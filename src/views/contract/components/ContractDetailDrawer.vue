<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 合同详情抽屉（查看型浮层，无结果回传契约，故不走 wrapDialog）
//
// 内部自管 visible，对外只暴露 open(id)；数据经 mock.getContract 合并
// （等价 GET /admin/contracts/:id，接真接口后只换这一处数据源）。
// 展示：订单摘要 / 甲乙方快照 / 金额与付款条款 / 付款计划表 / 签署信息。
// 状态推进动作（提交签署/上传 PDF/作废）放在列表操作列，抽屉只做只读回看。
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import StatusTag from '@/components/StatusTag.vue'
import {
  CONTRACT_SIGN_MAP,
  ID_TYPE_LABELS,
  fmtDate,
  fmtMoney,
  fmtPercent,
  fmtTime,
  SCHEDULE_STATUS_MAP,
} from '@/utils/format'
import { getContract, paymentSummary } from '../mock'
import type { ContractRow, PaymentSchedule } from '../types'

const visible = ref(false)
const loading = ref(false)
const detail = ref<ContractRow | null>(null)

const summary = computed(() => (detail.value ? paymentSummary(detail.value) : null))

function open(id: string): void {
  visible.value = true
  loading.value = true
  detail.value = null
  window.setTimeout(() => {
    detail.value = getContract(id)
    loading.value = false
  }, 240)
}

defineExpose({ open })

function scheduleTagType(s: PaymentSchedule['status']) {
  return SCHEDULE_STATUS_MAP[s]?.type ?? 'info'
}
</script>

<template>
  <el-drawer
    v-model="visible"
    size="min(720px, 100vw)"
    :title="detail ? `合同详情 ${detail.contractNo}` : '合同详情'"
  >
    <div v-if="detail" v-loading="loading" class="drawer-body">
      <!-- 订单摘要 -->
      <h4 class="section-title">关联订单</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="订单号" :span="2">{{ detail.orderId }}</el-descriptions-item>
        <el-descriptions-item label="客户">
          {{ detail.order.userNickname || detail.partyAName || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ detail.order.userPhone || detail.partyAPhone || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="表演日期">
          {{ detail.order.performDate || '—' }} {{ detail.order.timeSlot ?? '' }}
        </el-descriptions-item>
        <el-descriptions-item label="场地">
          {{ detail.order.venueName || '—' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 合同主体 -->
      <h4 class="section-title">合同主体（信息快照）</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="甲方名称" :span="2">{{
          detail.partyAName
        }}</el-descriptions-item>
        <el-descriptions-item label="证件类型">
          {{ ID_TYPE_LABELS[detail.partyAIdType] || detail.partyAIdType }}
        </el-descriptions-item>
        <el-descriptions-item label="证件号码">{{ detail.partyAIdNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="甲方联系人">{{
          detail.partyAContact || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="甲方电话">{{
          detail.partyAPhone || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="乙方名称" :span="2">{{
          detail.partyBName
        }}</el-descriptions-item>
        <el-descriptions-item label="统一社会信用代码" :span="2">
          {{ detail.partyBCreditCode }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 金额与条款 -->
      <h4 class="section-title">金额与付款条款</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="合同总额">
          <span class="amount-text">{{ fmtMoney(detail.totalAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="已付金额">
          <span :class="summary?.settled ? 'amount-text' : 'amount-pending'">
            {{ fmtMoney(summary?.paidAmount) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="模板版本">
          {{ detail.templateCode }} · {{ detail.templateVersion }}
        </el-descriptions-item>
        <el-descriptions-item label="签署状态">
          <StatusTag
            :status="detail.signStatus"
            :map="CONTRACT_SIGN_MAP"
            size="small"
            shape="rect"
          />
        </el-descriptions-item>
        <el-descriptions-item label="付款条款" :span="2">{{
          detail.paymentTerms
        }}</el-descriptions-item>
      </el-descriptions>

      <!-- 分期付款计划 -->
      <h4 class="section-title">
        付款计划
        <span class="title-sub">{{ summary?.paidStages }}/{{ summary?.totalStages }} 期已结清</span>
      </h4>
      <el-table :data="detail.schedules" size="small" border stripe>
        <el-table-column prop="installmentNo" label="期次" width="64" align="center" />
        <el-table-column prop="stageName" label="名称" width="90" />
        <el-table-column
          prop="triggerEvent"
          label="触发节点"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column label="应付日期" width="110">
          <template #default="{ row }">{{ fmtDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="比例" width="72" align="center">
          <template #default="{ row }">{{ fmtPercent(row.ratio) }}</template>
        </el-table-column>
        <el-table-column label="应付" width="104" align="right">
          <template #default="{ row }">{{ fmtMoney(row.planAmount) }}</template>
        </el-table-column>
        <el-table-column label="实付" width="104" align="right">
          <template #default="{ row }">{{ fmtMoney(row.paidAmount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <el-tag :type="scheduleTagType(row.status)" size="small" effect="light">
              {{ SCHEDULE_STATUS_MAP[row.status]?.text ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结清时间" width="140">
          <template #default="{ row }">{{ fmtTime(row.paidAt) }}</template>
        </el-table-column>
      </el-table>

      <!-- 签署信息 -->
      <h4 class="section-title">签署与存档</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="甲方签署时间">
          {{ fmtTime(detail.partyASignedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="乙方盖章时间">
          {{ fmtTime(detail.partyBSignedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="合同生效时间" :span="2">
          {{ fmtTime(detail.signedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="已签 PDF" :span="2">
          <el-link
            v-if="detail.signedPdfUrl"
            type="primary"
            :href="detail.signedPdfUrl"
            target="_blank"
            :underline="false"
          >
            查看/下载签署件
          </el-link>
          <span v-else class="cell-sub">尚未上传（一期电子签过渡：由管理员上传已签 PDF）</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.signStatus === 'VOID'" label="作废原因" :span="2">
          <span class="void-reason">{{ detail.voidReason }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-body {
  padding-bottom: 8px;
}

.title-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
  font-weight: 400;
  margin-left: 8px;
}

.amount-pending {
  color: var(--app-color-warning);
  font-weight: 600;
}

.void-reason {
  color: var(--app-color-danger);
}
</style>
