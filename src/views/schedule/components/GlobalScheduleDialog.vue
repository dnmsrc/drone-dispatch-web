<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 全局档期设置弹窗（复刻原型 schedule/index.vue 的 global-dialog）
//
// 从原「业务配置」迁入档期域：维护全局默认接单时段 + 预约窗口。
// 受控组件：v-model 控显隐；打开时由主页拉取当前全局设置后经 initial 传入。
// 提交前前端先做与服务端 validateDefaultSlots 同口径的校验（整点/去重/条数/重叠/窗口范围），
// 落库动作交回主页（接 schedule mock 的 saveGlobalSchedule，后端就绪后换 /schedule/global）。
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { findOverlap, fmtSlot, MAX_SLOTS_PER_DAY } from '../slot'
import type { SlotId } from '../types'
import type { GlobalSchedule } from '../mock'
import SlotEditor from './SlotEditor.vue'

const props = defineProps<{
  modelValue: boolean
  /** 打开时的当前全局设置（默认时段 + 预约窗口） */
  initial: GlobalSchedule
  acting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', payload: { defaultSlots: SlotId[]; bookingWindowDays: number }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const globalSlots = ref<SlotId[]>([])
const globalWindow = ref(60)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      globalSlots.value = props.initial.defaultSlots.slice()
      globalWindow.value = props.initial.bookingWindowDays ?? 60
    }
  },
)

/** 保存：前端先拦非法（非空 / 上限 / 重叠 / 窗口范围），通过后交主页落库 */
function submit(): void {
  if (!globalSlots.value.length) {
    ElMessage.warning('默认可接单时段至少保留一个')
    return
  }
  if (globalSlots.value.length > MAX_SLOTS_PER_DAY) {
    ElMessage.warning(`最多 ${MAX_SLOTS_PER_DAY} 个时段`)
    return
  }
  const hit = findOverlap(globalSlots.value)
  if (hit) {
    ElMessage.warning(`时段「${fmtSlot(hit[0])}」与「${fmtSlot(hit[1])}」重叠，请先删掉或合并`)
    return
  }
  const win = Number(globalWindow.value)
  if (!Number.isFinite(win) || win < 7 || win > 365) {
    ElMessage.warning('预约窗口需在 7-365 天之间')
    return
  }
  emit('save', { defaultSlots: globalSlots.value.slice(), bookingWindowDays: win })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="global-dialog pro-dialog"
    title="全局档期设置"
    width="620px"
    destroy-on-close
  >
    <el-form label-width="130px">
      <el-form-item label="默认可接单时段">
        <div class="global-slot-box">
          <SlotEditor v-model="globalSlots" />
          <div class="op-tip">
            单日未单独配置时沿用此默认；整点区间、至少 1 段 / 最多 12
            段、不可重叠（首尾相接可以）。单日覆盖在月历里配置。
          </div>
        </div>
      </el-form-item>
      <el-form-item label="预约窗口（天）">
        <el-input-number v-model="globalWindow" :min="7" :max="365" />
        <div class="op-tip window-tip">用户最多可预约未来 N 天内的表演</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="acting" @click="submit">保存全局设置</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.global-slot-box {
  width: 100%;
}

.op-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.window-tip {
  margin-left: 12px;
}
</style>
