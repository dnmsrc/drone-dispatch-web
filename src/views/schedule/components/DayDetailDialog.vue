<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 单日档期详情弹窗（复刻原型 schedule/index.vue 的 day-dialog）
//
// 受控组件：v-model 控显隐，cell 传当天数据；编辑态在打开时由 cell 派生。
// 所有落库动作经 emit 交回主页（改 scheduleStore 后统一 reload）：
//   save-slots / reset-slots / save-holiday / clear-holiday / toggle-closed
// 角色：仅 ADMIN 可编辑，OPERATOR 只读。
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { WEEK_HEADERS } from '../constants'
import { dayOfWeek, findOverlap, fmtSlot } from '../slot'
import type { ScheduleCell, SlotId } from '../types'
import SlotEditor from './SlotEditor.vue'

const props = defineProps<{
  modelValue: boolean
  cell: ScheduleCell | null
  acting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save-slots', slots: SlotId[]): void
  (e: 'reset-slots'): void
  (e: 'save-holiday', name: string): void
  (e: 'clear-holiday'): void
  (e: 'toggle-closed', closed: boolean): void
}>()

const auth = useAuthStore()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/* ── 编辑态：打开时由 cell 派生（已订时段即使历史被删也要列出）── */
const slotsInput = ref<SlotId[]>([])
const holidayInput = ref('')

watch(
  () => props.cell,
  (cell) => {
    if (!cell) return
    const bookedKeys = Object.keys(cell.bookedSlots ?? {})
    slotsInput.value = [...new Set([...cell.slots, ...bookedKeys])].sort()
    holidayInput.value = cell.customHoliday ? cell.holiday : ''
  },
  { immediate: true },
)

/** 当前弹窗某时段已订单数 */
function bookedOf(slot: SlotId): number {
  return props.cell?.bookedSlots?.[slot] ?? 0
}

/** 已订时段数（汇总行用） */
const bookedSlotCount = computed(() => Object.keys(props.cell?.bookedSlots ?? {}).length)

const weekText = computed(() => {
  if (!props.cell) return ''
  return WEEK_HEADERS[(dayOfWeek(props.cell.date) + 6) % 7]
})

function onSaveSlots(): void {
  if (!props.cell) return
  if (props.cell.closed) {
    ElMessage.warning('该日已设为休整日，请先恢复营业再配置时段')
    return
  }
  // 兜底：列表可能残留历史脏数据，保存前整表再过一遍重叠
  const ov = findOverlap(slotsInput.value)
  if (ov) {
    ElMessage.warning(
      `「${fmtSlot(ov[0])}」与「${fmtSlot(ov[1])}」重叠：同一时间只能接一单，请先删掉或合并其中一段`,
    )
    return
  }
  emit('save-slots', slotsInput.value)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="day-dialog pro-dialog"
    top="4vh"
    :title="cell ? `${cell.date} 档期详情` : ''"
    width="640px"
    destroy-on-close
  >
    <template v-if="cell">
      <!-- 基本信息：两列排布（4 项 2 行） -->
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="日期">
          {{ cell.date }}（周{{ weekText }}）
          <el-tag
            v-if="cell.holiday"
            size="small"
            type="danger"
            effect="plain"
            style="margin-left: 6px"
          >
            {{ cell.holiday }}{{ cell.customHoliday ? '（手动）' : '' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当日订单数">{{ cell.booked }} 单</el-descriptions-item>
        <el-descriptions-item label="可接单时段">
          <!-- 管理员只给一行汇总，具体条目在下方编辑区（同一份数据不展示两遍） -->
          <template v-if="auth.isAdmin()">
            <span v-if="cell.slots.length" class="sum-line">
              {{ cell.slots.length }} 段<span v-if="bookedSlotCount"
                >（{{ bookedSlotCount }} 已订）</span
              >
              <span class="cell-sub">{{ cell.overridden ? ' · 单独设置' : ' · 默认' }}</span>
            </span>
            <el-tag v-else size="small" type="info">当日不接单</el-tag>
          </template>
          <span v-else-if="cell.slots.length">
            <el-tag
              v-for="s in cell.slots"
              :key="s"
              size="small"
              :type="bookedOf(s) ? 'warning' : 'success'"
              effect="plain"
              style="margin-right: 6px"
            >
              {{ fmtSlot(s) }}<span v-if="bookedOf(s)"> · 已订</span>
            </el-tag>
          </span>
          <el-tag v-else size="small" type="info">当日不接单</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="cell.closed" type="info">休整日</el-tag>
          <el-tag v-else-if="cell.slots.length === 0" type="info">不接单</el-tag>
          <el-tag v-else-if="cell.booked >= cell.limit" type="danger">已满档</el-tag>
          <el-tag v-else type="success">可预约</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 管理员编辑区 -->
      <div v-if="auth.isAdmin()" class="day-ops">
        <div v-if="cell.closed" class="slot-closed-tip">
          <span class="sct-badge">休</span>
          该日已设为休整日：全部时段停接。要配置可接单时段，请先点右下角「恢复营业」。
        </div>

        <div v-else class="op-block">
          <span class="op-label">设置当日可接单时段</span>
          <SlotEditor v-model="slotsInput" :booked-slots="cell.bookedSlots" />
          <div class="op-btns">
            <el-button size="small" type="primary" :loading="acting" @click="onSaveSlots">
              保存时段
            </el-button>
            <el-button
              v-if="cell.slotsOverridden"
              size="small"
              plain
              :loading="acting"
              @click="emit('reset-slots')"
            >
              恢复默认
            </el-button>
          </div>
        </div>

        <div class="op-row">
          <span class="op-label">特殊日</span>
          <el-input
            v-model="holidayInput"
            size="small"
            placeholder="如 情人节 / 店庆日"
            maxlength="10"
            style="width: 150px"
          />
          <el-button
            size="small"
            type="warning"
            plain
            :loading="acting"
            @click="holidayInput.trim() && emit('save-holiday', holidayInput.trim())"
          >
            标注
          </el-button>
          <el-button
            v-if="cell.customHoliday"
            size="small"
            plain
            :loading="acting"
            @click="emit('clear-holiday')"
          >
            取消标注
          </el-button>
        </div>
      </div>

      <div v-else class="readonly-tip">操作员角色仅可查看，休整日与接单时段请联系管理员。</div>
    </template>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <template v-if="auth.isAdmin() && cell">
        <!-- 已有订单的日子不能停工：置灰并说明原因，后端同样会拒 -->
        <el-tooltip
          v-if="!cell.closed"
          :content="cell.booked > 0 ? `该日已有 ${cell.booked} 单订单，不能设为休整日` : ''"
          :disabled="cell.booked === 0"
          placement="top"
        >
          <span class="ft-btn-wrap">
            <el-button
              type="warning"
              :disabled="cell.booked > 0"
              :loading="acting"
              @click="emit('toggle-closed', true)"
            >
              设为休整日
            </el-button>
          </span>
        </el-tooltip>
        <el-button v-else type="success" :loading="acting" @click="emit('toggle-closed', false)">
          恢复营业
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
.day-ops {
  margin-top: 14px;
  border-top: 1px dashed #ebeef5;
  padding-top: 12px;
}

.op-block {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  margin-bottom: 14px;
}

.op-block .op-label {
  width: auto;
  line-height: 1.4;
  font-weight: 500;
  color: #303133;
}

.op-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.op-label {
  flex: none;
  width: 84px;
  font-size: 12px;
  color: #606266;
  line-height: 20px;
}

.op-btns {
  display: flex;
  gap: 8px;
}

.cell-sub {
  font-size: 12px;
  color: #909399;
}

.sum-line {
  font-size: 13px;
  color: #303133;
}

.readonly-tip {
  margin-top: 14px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 4px;
  padding: 8px 12px;
}

.slot-closed-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.sct-badge {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #909399;
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ft-btn-wrap {
  display: inline-block;
}
</style>
