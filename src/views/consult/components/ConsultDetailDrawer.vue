<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 咨询单详情抽屉（UI 复刻原型 consult/index.vue 的 el-drawer）
//
// 查看型浮层、无结果回传契约，所以不走 wrapDialog：
// 内部自管 visible，对外只暴露 open(row)；数据经 mock.buildDetail 合并
// （等价 GET /admin/consults/:id，接真接口后只换这一处数据源）。
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import StatusTag from '@/components/StatusTag.vue'
import {
  CONTENT_MODE_LABELS,
  CONSULT_STATUS_MAP,
  MOTION_LABELS,
  SCREEN_LABELS,
  fmtMoney,
  fmtTime,
  venueSub,
} from '@/utils/format'
import {
  consultAddonsText,
  dispatchQuoteText,
  dispatchStatusText,
  dispatchTermRows,
  quoteText,
} from '../constants'
import { buildDetail } from '../mock'
import type { ConsultDetail, ConsultRow } from '../types'

const visible = ref(false)
const loading = ref(false)
const detail = ref<ConsultDetail | null>(null)

const need = computed(() => detail.value?.need ?? {})

/** 判定异常项（FAIL / PENDING）：以标签形式挂在判定结论下方 */
const abnormalChecks = computed(() =>
  (detail.value?.judgment?.checks ?? []).filter(
    (c) => c.result === 'FAIL' || c.result === 'PENDING',
  ),
)

const sortedTimeline = computed(() =>
  [...(detail.value?.timeline ?? [])].sort(
    (a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime(),
  ),
)

const termRows = computed(() => dispatchTermRows(detail.value?.dispatch))

function droneCountText(v?: number): string {
  return v ? `${v} 架` : '—'
}

/** 打开抽屉并模拟详情接口耗时（真接口：GET /admin/consults/:id） */
function open(row: ConsultRow): void {
  visible.value = true
  loading.value = true
  detail.value = null
  window.setTimeout(() => {
    detail.value = buildDetail(row)
    loading.value = false
  }, 260)
}

defineExpose({ open })
</script>

<template>
  <el-drawer
    v-model="visible"
    size="min(660px, 100vw)"
    :title="detail ? `咨询单详情 ${detail.id}` : '咨询单详情'"
  >
    <div v-if="detail" v-loading="loading" class="drawer-body">
      <h4 class="section-title">基本信息</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="咨询单号" :span="2">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <StatusTag
            :status="detail.status"
            :map="CONSULT_STATUS_MAP"
            size="small"
            shape="rect"
            :title="detail.statusText"
          />
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{
          fmtTime(detail.submittedAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ detail.user?.nickname || '—' }}（{{ detail.user?.phone || '—' }}）
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">{{
          fmtTime(detail.updatedAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="场地" :span="2">
          {{ detail.venue?.name || '—' }}
          <span class="cell-sub">{{ venueSub(detail.venue) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请日期">{{
          detail.performDate || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="申请时段">{{ detail.timeSlot || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.note" label="用户补充说明" :span="2">
          {{ detail.note }}
        </el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">规模与内容</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="机队规模">{{
          droneCountText(need.droneCount)
        }}</el-descriptions-item>
        <el-descriptions-item label="表演时长">
          {{ need.duration ? `${need.duration} 分钟` : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="预计观众">
          {{ need.audience ? `${need.audience} 人` : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="内容复杂度">
          {{ CONTENT_MODE_LABELS[need.contentMode ?? ''] || need.contentMode || '—' }}
        </el-descriptions-item>
        <template v-if="need.contentMode && need.contentMode !== 'template'">
          <el-descriptions-item label="画面数量">
            {{ SCREEN_LABELS[need.screens ?? ''] || need.screens || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="维度">{{ need.dimension || '—' }}</el-descriptions-item>
          <el-descriptions-item label="运动方式">
            {{ MOTION_LABELS[need.motion ?? ''] || need.motion || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="矩阵数">
            {{ need.matrix ? `${need.matrix} 矩阵` : '—' }}
          </el-descriptions-item>
        </template>
        <el-descriptions-item label="附加内容" :span="2">
          {{ consultAddonsText(need.addons) }}
        </el-descriptions-item>
      </el-descriptions>

      <h4 class="section-title">判定结论</h4>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="判定结论">
          {{ detail.judgment?.conclusionText || '—' }}
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="abnormalChecks.length" class="check-tags">
        <el-tag
          v-for="(c, i) in abnormalChecks"
          :key="c.key ?? i"
          :type="c.result === 'FAIL' ? 'danger' : 'warning'"
          size="small"
          effect="plain"
          :title="c.detail"
        >
          {{ c.label }}
        </el-tag>
      </div>

      <h4 class="section-title">转人工原因</h4>
      <div v-if="detail.reasons?.length" class="reason-list">
        <div v-for="(r, i) in detail.reasons" :key="i" class="reason-item">
          <el-tag type="danger" size="small" effect="plain">{{
            r.label || r.key || '转人工'
          }}</el-tag>
          <div class="reason-why">{{ r.why }}</div>
        </div>
      </div>
      <span v-else class="cell-sub">本单未触发转人工项</span>

      <h4 class="section-title">报价区间</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="区间">
          <span class="amount-text">{{ quoteText(detail.quote) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="预估合计">{{
          fmtMoney(detail.quote?.total)
        }}</el-descriptions-item>
      </el-descriptions>

      <template v-if="detail.dispatch">
        <h4 class="section-title">派单信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="派单号" :span="2">{{
            detail.dispatch.id || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{
            detail.dispatch.createdBy || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            fmtTime(detail.dispatch.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="派单状态">
            {{ dispatchStatusText(detail.dispatch.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="正式报价区间">
            {{ dispatchQuoteText(detail.dispatch) }}
          </el-descriptions-item>
          <template v-if="detail.dispatch.status === 'CONFIRMED'">
            <el-descriptions-item label="用户确认时间">
              {{ fmtTime(detail.dispatch.confirmedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="确认人">{{
              detail.dispatch.confirmedBy || '—'
            }}</el-descriptions-item>
          </template>
        </el-descriptions>

        <!-- 六项必填合同条款：后端 mustFill 优先，缺省按 terms 兜底（未填写标红） -->
        <div class="fill-list">
          <div v-for="t in termRows" :key="t.key" class="fill-row">
            <div class="fill-label">{{ t.label }}</div>
            <div class="fill-value" :class="{ miss: !t.hasValue }">{{ t.value }}</div>
            <div v-if="t.note" class="fill-note">{{ t.note }}</div>
          </div>
        </div>

        <div class="fill-note dispatch-note">
          <strong>客服备注：</strong>{{ detail.dispatch.note || '—' }}
        </div>
      </template>

      <template v-if="detail.reject">
        <h4 class="section-title">驳回信息</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="驳回原因">{{
            detail.reject.reason || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ detail.reject.by || '—' }} · {{ fmtTime(detail.reject.at) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <h4 class="section-title">时间轴</h4>
      <el-timeline class="timeline">
        <el-timeline-item
          v-for="(t, i) in sortedTimeline"
          :key="i"
          :timestamp="fmtTime(t.at)"
          :type="i === sortedTimeline.length - 1 ? 'primary' : ''"
        >
          <div>{{ t.text }}</div>
          <div v-if="t.by" class="cell-sub">{{ t.by }}</div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!sortedTimeline.length" description="暂无流程记录" :image-size="60" />
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-body {
  padding-bottom: 8px;
}

.check-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reason-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.reason-why {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.6;
  flex: 1;
}

.fill-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.fill-row {
  border-left: 3px solid var(--app-color-primary);
  background: var(--app-bg-hover);
  border-radius: 4px;
  padding: 10px 12px;
}

.fill-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.fill-value {
  font-size: 13px;
  color: var(--app-color-success);
  margin-top: 4px;
  line-height: 1.6;
  word-break: break-all;
}

.fill-value.miss {
  color: var(--app-color-danger);
}

.fill-note {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.6;
  margin-top: 4px;
}

.dispatch-note {
  margin-top: 12px;
}

.timeline {
  padding-left: 2px;
}
</style>
