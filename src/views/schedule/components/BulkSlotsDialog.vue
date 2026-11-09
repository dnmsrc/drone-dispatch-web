<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 批量配置接单时段弹窗（复刻原型 schedule/index.vue 的 bulk-dialog）
//
// 受控组件：v-model 控显隐；count/months/preview/bookedDays 描述已选日期，
// initialSlots 为打开时的默认时段。确认时经 submit 交回主页，由主页做
// 重叠兜底校验并落库（已订时段由 mock 层自动保留）。
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { findOverlap, fmtSlot } from '../slot'
import type { SlotId } from '../types'
import SlotEditor from './SlotEditor.vue'

const props = defineProps<{
  modelValue: boolean
  /** 已选日期天数 */
  count: number
  /** 已选日期涉及的月份（YYYY-MM）列表 */
  months: string[]
  /** 日期区间预览文案 */
  preview: string
  /** 已选日期中含订单的天数 */
  bookedDays: number
  /** 打开时的初始时段（默认时段副本） */
  initialSlots: SlotId[]
  acting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit', slots: SlotId[]): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const bulkSlots = ref<SlotId[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) bulkSlots.value = props.initialSlots.slice()
  },
)

function submit(): void {
  const ov = findOverlap(bulkSlots.value)
  if (ov) {
    ElMessage.warning(
      `「${fmtSlot(ov[0])}」与「${fmtSlot(ov[1])}」重叠：同一时间只能接一单，请先删掉或合并其中一段`,
    )
    return
  }
  emit('submit', bulkSlots.value)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="bulk-dialog pro-dialog"
    top="4vh"
    title="配置接单时段"
    width="660px"
    destroy-on-close
  >
    <!-- 已选日期 + 预览合并一行 -->
    <div class="bulk-line bulk-head">
      <span class="bulk-k">已选日期</span>
      <span class="bulk-v">
        <b>{{ count }}</b> 天
        <span v-if="months.length" class="cell-sub">（{{ months.join('、') }}）</span>
        <span class="bulk-preview">{{ preview }}</span>
        <span v-if="bookedDays" class="bulk-warn"
          >含 {{ bookedDays }} 天已订 · 已订时段自动保留</span
        >
      </span>
    </div>

    <div class="bulk-line bulk-slots">
      <span class="bulk-k">接单时段</span>
      <div class="bulk-v">
        <SlotEditor v-model="bulkSlots" grid />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="acting" @click="submit">
        确认（{{ count }} 天）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.bulk-line {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

/* 已选日期 + 预览合并一行：预览太长在行内换行，不额外占整行 */
.bulk-head .bulk-v {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  line-height: 1.5;
}

.bulk-preview {
  font-size: 12px;
  color: #909399;
}

.bulk-k {
  flex: none;
  width: 72px;
  font-size: 13px;
  color: #606266;
  line-height: 32px;
}

.bulk-v {
  flex: 1;
  font-size: 13px;
  color: #303133;
  line-height: 32px;
}

.bulk-warn {
  margin-left: 8px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 3px;
  padding: 1px 6px;
  white-space: nowrap;
}

.cell-sub {
  font-size: 12px;
  color: #909399;
}
</style>
