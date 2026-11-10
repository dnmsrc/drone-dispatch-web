<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 合同终止结算弹窗（已生效/已收款合同提前结束）
//
// 与退款审批弹窗同构（useDialog + wrapDialog，结果回传页面落库）：
//   - 先选责任方：客户原因按距演出天数阶梯试算；我方原因恒为全额退款、零扣除
//   - 实时展示结算确认单（已付/比例/可退/扣除/命中规则），实退额可在已付额度内调整
//   - 确认后由页面调 mock.actTerminate 联动生成 PENDING 退款单（再去退款管理审批）
// 业务依据见 termination.ts 头部（与 H5 用户已确认条款同源）。
// ─────────────────────────────────────────────────────────────
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialog } from '@/components/pro'
import { CONTRACT_RESPONSIBILITY_MAP, fmtMoney } from '@/utils/format'
import { quoteTermination } from '../termination'
import type { ContractRow, TerminateContractForm } from '../types'

defineOptions({ inheritAttrs: false })

interface TerminateParams {
  contract: ContractRow
}

const { visible, params, confirm, cancel } = useDialog<TerminateParams, TerminateContractForm>()

const state = reactive({
  responsibility: 'CUSTOMER' as TerminateContractForm['responsibility'],
  reason: '',
  refundAmount: 0,
})

/** 随责任方实时试算（纯函数，不落库） */
const quote = computed(() => quoteTermination(params.contract, state.responsibility))

/** 责任方切换时，把实退额重置为该责任方的试算可退额 */
watch(visible, (open) => {
  if (!open) return
  state.responsibility = 'CUSTOMER'
  state.reason = ''
  state.refundAmount = quoteTermination(params.contract, 'CUSTOMER').refundAmount
})

watch(
  () => state.responsibility,
  (r) => {
    state.refundAmount = quoteTermination(params.contract, r).refundAmount
  },
)

const isVendor = computed(() => state.responsibility === 'VENDOR')

function submit(): void {
  if (!state.reason.trim()) {
    ElMessage.warning('请填写终止原因')
    return
  }
  if (!(state.refundAmount > 0 && state.refundAmount <= quote.value.paidAmount)) {
    ElMessage.warning(`退款金额需在 0 ~ ${fmtMoney(quote.value.paidAmount)} 之间`)
    return
  }
  confirm({
    responsibility: state.responsibility,
    reason: state.reason.trim(),
    ratio: quote.value.ratio,
    refundAmount: state.refundAmount,
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="`终止合同 · ${params.contract.contractNo}`"
    width="min(560px, 94vw)"
    :close-on-click-modal="false"
  >
    <!-- 结算确认单 -->
    <el-descriptions :column="2" border size="small" class="quote-box">
      <el-descriptions-item label="合同总额" :span="1">
        {{ fmtMoney(params.contract.totalAmount) }}
      </el-descriptions-item>
      <el-descriptions-item label="已付金额（退款基数）" :span="1">
        <span class="amount-text">{{ fmtMoney(quote.paidAmount) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="适用规则" :span="2">
        <span :class="isVendor ? 'rule-vendor' : 'rule-customer'">{{ quote.ruleLabel }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="试算可退">
        <span class="amount-text">{{ fmtMoney(quote.refundAmount) }}</span>
        （{{ Math.round(quote.ratio * 100) }}%）
      </el-descriptions-item>
      <el-descriptions-item label="成本/违约金扣除">
        <span :class="quote.deductAmount > 0 ? 'amount-danger' : ''">
          {{ fmtMoney(quote.deductAmount) }}
        </span>
      </el-descriptions-item>
    </el-descriptions>

    <el-alert
      v-if="isVendor"
      type="error"
      :closable="false"
      show-icon
      title="我方原因无法履行：按合同条款全额退还已付费用，不扣除任何成本"
      class="tip"
    />
    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      title="客户原因终止：按距演出天数的阶梯比例近似抵扣已发生成本（一期不建成本台账）"
      class="tip"
    />

    <el-form label-position="top">
      <el-form-item label="终止责任方" required>
        <el-radio-group v-model="state.responsibility">
          <el-radio-button value="CUSTOMER">
            {{ CONTRACT_RESPONSIBILITY_MAP.CUSTOMER.text }}
          </el-radio-button>
          <el-radio-button value="VENDOR">{{
            CONTRACT_RESPONSIBILITY_MAP.VENDOR.text
          }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="实际退款金额" required>
        <el-input-number
          v-model="state.refundAmount"
          :min="0"
          :max="quote.paidAmount"
          :step="100"
          :disabled="isVendor"
          style="width: 220px"
        />
        <span class="cell-sub" style="margin-left: 10px">
          {{ isVendor ? '我方原因固定全额退，不可调整' : '默认按试算额，可在已付额度内调整' }}
        </span>
      </el-form-item>

      <el-form-item label="终止原因（必填，写入合同档案与退款单，对客户可见）" required>
        <el-input
          v-model="state.reason"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          placeholder="如：空域审批未通过 / 天气不满足飞行条件 / 客户计划变更等"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="danger" @click="submit">确认终止并生成退款单</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.quote-box {
  margin-bottom: 14px;
}

.tip {
  margin-bottom: 14px;
}

.cell-sub {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.amount-danger {
  color: var(--app-color-danger);
  font-weight: 600;
}

.rule-vendor {
  color: var(--app-color-danger);
  font-weight: 600;
}

.rule-customer {
  color: var(--app-color-warning);
}
</style>
