<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 时段条目编辑器（单日详情 / 批量配置两个弹窗共用）
//
// 时段是「起-止」整点区间：选好即渲染成条目，可随意增删。
// 起止用 el-time-select（step 1 小时）→ 只可能选出整点。
// 已订时段整条换暖色、给锁图标，不给删除按钮（客户已买断名额）。
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Lock, Plus } from '@element-plus/icons-vue'
import { findOverlap, fmtSlot, MAX_SLOTS_PER_DAY } from '../slot'
import type { SlotId } from '../types'

const props = defineProps<{
  /** 当前时段列表（v-model） */
  modelValue: SlotId[]
  /** 各时段已订单数：{ "19:00-20:00": 1 }，>0 的时段锁删 */
  bookedSlots?: Record<string, number>
  /** 强制双列网格（批量弹窗始终双列；单日弹窗默认按 >4 段自动切换） */
  grid?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SlotId[]): void
}>()

const newStart = ref('')
const newEnd = ref('')

function bookedOf(slot: SlotId): number {
  return props.bookedSlots?.[slot] ?? 0
}

function remove(slot: SlotId): void {
  if (bookedOf(slot) > 0) {
    ElMessage.warning('该时段已有订单，不能删除；如需调整请走改期或退款流程')
    return
  }
  emit(
    'update:modelValue',
    props.modelValue.filter((x) => x !== slot),
  )
}

/** 添加时段：起止必填、结束晚于开始、不可重复/重叠、单日上限 12 */
function add(): void {
  const a = newStart.value
  const b = newEnd.value
  if (!a || !b) {
    ElMessage.warning('请选择开始与结束时间')
    return
  }
  if (a >= b) {
    ElMessage.warning('结束时间要晚于开始时间')
    return
  }
  const id: SlotId = `${a}-${b}`
  if (props.modelValue.includes(id)) {
    ElMessage.warning('该时段已在列表里')
    return
  }
  const hit = findOverlap([...props.modelValue, id])
  if (hit) {
    const other = hit[0] === id ? hit[1] : hit[0]
    const booked = bookedOf(other) > 0
    ElMessage.warning(
      booked
        ? `该时段与「${fmtSlot(other)}」重叠，而这个时段已有订单：同一时间接不了两单，请避开它`
        : `该时段与「${fmtSlot(other)}」重叠：同一时间只能接一单，请合并或改成不重叠的区间`,
    )
    return
  }
  if (props.modelValue.length >= MAX_SLOTS_PER_DAY) {
    ElMessage.warning(`单日最多 ${MAX_SLOTS_PER_DAY} 个时段`)
    return
  }
  emit('update:modelValue', [...props.modelValue, id].sort())
  newStart.value = ''
  newEnd.value = ''
}
</script>

<template>
  <div class="slot-editor">
    <div class="slot-list" :class="{ 'slot-grid': props.grid || modelValue.length > 4 }">
      <div v-for="t in modelValue" :key="t" class="slot-item" :class="{ booked: bookedOf(t) > 0 }">
        <span class="slot-bar" :class="{ booked: bookedOf(t) > 0 }"></span>
        <span class="slot-time">{{ fmtSlot(t) }}</span>
        <span class="slot-note" :class="{ booked: bookedOf(t) > 0 }">
          {{ bookedOf(t) > 0 ? `已订 ${bookedOf(t)} 单 · 不可删` : '可预约' }}
        </span>
        <!-- 已订时段不给删除按钮；用锁图标 + tooltip 说明 -->
        <el-button
          v-if="bookedOf(t) === 0"
          class="slot-act"
          link
          type="danger"
          :icon="Close"
          size="small"
          title="删除该时段"
          @click="remove(t)"
        />
        <el-tooltip v-else content="该时段已有订单，不能删除" placement="top">
          <el-icon class="slot-act slot-lock"><Lock /></el-icon>
        </el-tooltip>
      </div>
      <div v-if="!modelValue.length" class="slot-empty">当日不接单，在下方添加时段即可恢复</div>
    </div>

    <div class="slot-picker">
      <el-time-select
        v-model="newStart"
        start="00:00"
        end="23:00"
        step="01:00"
        placeholder="开始"
        size="small"
        style="width: 104px"
      />
      <span class="picker-sep">–</span>
      <el-time-select
        v-model="newEnd"
        start="00:00"
        end="23:00"
        step="01:00"
        placeholder="结束"
        size="small"
        style="width: 104px"
      />
      <el-button class="add-slot" size="small" type="primary" plain :icon="Plus" @click="add">
        添加时段
      </el-button>
    </div>
    <div class="op-tip">一段 = 一个名额 · 只能选整点 · 时段不可重叠（首尾相接可以）</div>
  </div>
</template>

<style scoped>
.op-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 6px;
}

/* 双列网格：段数一多（6~12 段）也只占一半行数。
   特异性写 .slot-list.slot-grid，避免被 .slot-list 的 flex 覆盖 */
.slot-list.slot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.slot-grid .slot-empty {
  grid-column: 1 / -1;
}

/* 时段条目：左色条 + 时间 + 状态 + 右侧操作贴右，条目撑满可用宽度 */
.slot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin: 4px 0 10px;
  box-sizing: border-box;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  min-height: 46px;
  padding: 10px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.slot-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 1px 6px rgba(64, 158, 255, 0.08);
}

.slot-item.booked {
  background: #fffaf2;
  border-color: #f5dab1;
}

.slot-bar {
  flex: none;
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: #67c23a;
}

.slot-bar.booked {
  background: #e6a23c;
}

.slot-time {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.2px;
  font-variant-numeric: tabular-nums;
}

.slot-note {
  font-size: 12px;
  color: #67c23a;
}

.slot-note.booked {
  color: #e6a23c;
  font-weight: 600;
}

.slot-act {
  margin-left: auto;
}

.slot-lock {
  color: #e6a23c;
  font-size: 15px;
}

.slot-empty {
  font-size: 13px;
  color: #909399;
  padding: 8px 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

.slot-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
}

.slot-picker .picker-sep {
  color: #909399;
}

.slot-picker .add-slot {
  margin-left: auto;
}
</style>
