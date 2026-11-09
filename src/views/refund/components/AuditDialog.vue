<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 退款审批弹窗（UI 复刻原型 refund/list.vue 的「退款审批」el-dialog）
//
// 写法按正式版规范重构：按钮内聚在组件里，结果经 useDialog 的
// confirm/cancel 回传「模式 + 金额/理由」，页面自己落库（改 store）。
// 校验文案与原型逐字一致（金额越界 / 拒绝理由缺失都走 ElMessage.warning）。
// ─────────────────────────────────────────────────────────────
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialog } from '@/components/pro'
import { fmtMoney } from '@/utils/format'
import type { AuditDialogParams, AuditFormData } from '../types'

defineOptions({ inheritAttrs: false })

const { visible, params, confirm, cancel } = useDialog<AuditDialogParams, AuditFormData>()

const state = reactive({
  mode: 'approve' as AuditFormData['mode'],
  amount: 0,
  approveNote: '',
  rejectNote: '',
})

/** 每次打开重置：默认批准、金额取试算额（原型 openAudit 同款） */
watch(visible, (open) => {
  if (!open) return
  state.mode = 'approve'
  state.amount = params.applyAmount || params.totalAmount
  state.approveNote = ''
  state.rejectNote = ''
})

function submit(): void {
  if (state.mode === 'approve') {
    // 与原型同款边界校验（0 ~ 订单总额），不合规用 warning 提示而非表单红字
    if (!(state.amount > 0 && state.amount <= params.totalAmount)) {
      ElMessage.warning(`退款金额需在 0 ~ ${fmtMoney(params.totalAmount)} 之间`)
      return
    }
    confirm({ mode: 'approve', amount: state.amount, note: state.approveNote.trim() })
    return
  }
  const note = state.rejectNote.trim()
  if (!note) {
    ElMessage.warning('请填写拒绝理由')
    return
  }
  confirm({ mode: 'reject', amount: 0, note })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    title="退款审批"
    width="min(520px, 94vw)"
    :close-on-click-modal="false"
  >
    <!-- 申请摘要（原型顶部 descriptions 同款两列带框） -->
    <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
      <el-descriptions-item label="订单号" :span="2">{{ params.orderId }}</el-descriptions-item>
      <el-descriptions-item label="订单金额">{{
        fmtMoney(params.totalAmount)
      }}</el-descriptions-item>
      <el-descriptions-item label="试算金额">
        <span class="amount-text">{{ fmtMoney(params.applyAmount) }}</span>
        （{{ Math.round((params.ratio || 0) * 100) }}%）
      </el-descriptions-item>
      <el-descriptions-item label="退款原因" :span="2">{{
        params.reason || '—'
      }}</el-descriptions-item>
    </el-descriptions>

    <!-- 批准/拒绝切换（原型 el-radio-button 同款） -->
    <el-radio-group v-model="state.mode" style="margin-bottom: 16px">
      <el-radio-button value="approve">批准退款</el-radio-button>
      <el-radio-button value="reject">拒绝退款</el-radio-button>
    </el-radio-group>

    <el-form v-if="state.mode === 'approve'" label-position="top">
      <el-form-item :label="`实际退款金额（0 ~ ${fmtMoney(params.totalAmount)}）`">
        <el-input-number
          v-model="state.amount"
          :min="1"
          :max="params.totalAmount"
          :step="100"
          style="width: 220px"
        />
        <span class="cell-sub" style="margin-left: 10px">默认按试算金额退款，可调整</span>
      </el-form-item>
      <el-form-item label="审批备注">
        <el-input v-model="state.approveNote" placeholder="同意退款" maxlength="50" />
      </el-form-item>
    </el-form>

    <el-form v-else label-position="top">
      <el-form-item label="拒绝理由（必填）" required>
        <el-input
          v-model="state.rejectNote"
          type="textarea"
          :rows="3"
          maxlength="100"
          show-word-limit
          placeholder="拒绝后订单将回到申请前状态，理由对用户可见"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button v-if="state.mode === 'approve'" type="primary" @click="submit">批准退款</el-button>
      <el-button v-else type="danger" @click="submit">拒绝退款</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 金额输入旁的说明文字与正文标签同宽对齐（原型行内样式等价搬入样式表） */
.el-form-item .cell-sub {
  font-size: 12px;
}
</style>
