<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 合同改期弹窗（生效合同顺延表演日期，合同继续有效）
//
// 依据 H5 条款 reschedule/weather：改期 = 重新备案 + 重新审批，
// 已发生成本不变、已付节点按原节点继续有效——故改期不产生任何退款。
// 天气/审批等我方原因「延期优先于退费」，是我方无法履约时的首选处理。
// 结果回传页面调 mock.actReschedule，同步订单表演日期并留痕。
// ─────────────────────────────────────────────────────────────
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDialog } from '@/components/pro'
import { CONTRACT_RESPONSIBILITY_MAP, RESCHEDULE_REASON_MAP, fmtDate } from '@/utils/format'
import type { ContractRow, RescheduleContractForm, RescheduleReasonType } from '../types'

defineOptions({ inheritAttrs: false })

interface RescheduleParams {
  contract: ContractRow
}

const { visible, params, confirm, cancel } = useDialog<RescheduleParams, RescheduleContractForm>()

const reasonOptions = Object.entries(RESCHEDULE_REASON_MAP).map(([value, conf]) => ({
  label: conf.text,
  value,
}))

const state = reactive({
  responsibility: 'VENDOR' as RescheduleContractForm['responsibility'],
  reasonType: 'WEATHER' as RescheduleReasonType,
  reason: '',
  newPerformDate: '',
})

/** 禁用今天之前的日期（Element Plus date-picker disabled-date 回调） */
function disabledDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

watch(visible, (open) => {
  if (!open) return
  state.responsibility = 'VENDOR'
  state.reasonType = 'WEATHER'
  state.reason = ''
  state.newPerformDate = ''
})

function submit(): void {
  if (!state.newPerformDate) {
    ElMessage.warning('请选择新的表演日期')
    return
  }
  if (!state.reason.trim()) {
    ElMessage.warning('请填写改期说明')
    return
  }
  confirm({
    responsibility: state.responsibility,
    reasonType: state.reasonType,
    reason: state.reason.trim(),
    newPerformDate: state.newPerformDate,
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="`合同改期 · ${params.contract.contractNo}`"
    width="min(520px, 94vw)"
    :close-on-click-modal="false"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="tip"
      title="改期不退款：已付节点按原节点继续有效，已发生成本不变；改期需重新备案与空域审批。"
    />

    <el-descriptions :column="1" border size="small" class="orig-box">
      <el-descriptions-item label="原表演日期">
        {{ fmtDate(params.contract.order.performDate) }}
        {{ params.contract.order.timeSlot ?? '' }}
      </el-descriptions-item>
    </el-descriptions>

    <el-form label-position="top">
      <el-form-item label="改期责任方" required>
        <el-radio-group v-model="state.responsibility">
          <el-radio-button value="VENDOR">{{
            CONTRACT_RESPONSIBILITY_MAP.VENDOR.text
          }}</el-radio-button>
          <el-radio-button value="CUSTOMER">
            {{ CONTRACT_RESPONSIBILITY_MAP.CUSTOMER.text }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="改期原因类型" required>
        <el-select v-model="state.reasonType" style="width: 100%">
          <el-option v-for="o in reasonOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="新表演日期" required>
        <el-date-picker
          v-model="state.newPerformDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择改期后的表演日期"
          :disabled-date="disabledDate"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="改期说明（必填，写入合同档案与订单时间轴）" required>
        <el-input
          v-model="state.reason"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          placeholder="如：气象预报显示当日风速超限，经与客户沟通顺延至新日期"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="submit">确认改期</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.tip {
  margin-bottom: 14px;
}

.orig-box {
  margin-bottom: 16px;
}
</style>
