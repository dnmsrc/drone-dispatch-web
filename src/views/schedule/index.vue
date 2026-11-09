<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 档期管理（UI 完全复刻原型 admin/src/views/schedule/index.vue）
//
// 月历式档期：月份切换 / 单选看详情并配置 / 多选批量配时段。
// 写法按正式版规范分层：
//   - 纯逻辑（时段重叠/日期/区间预览）→ ./slot.ts（带单测）
//   - 静态数据与动作（按月查询、保存时段/特殊日/休整）→ ./mock.ts
//   - 单日详情、批量配置两个弹窗 → ./components（受控 v-model + emit）
//   - 已订情况由 order 订单派生，档期页与订单页的「已订/满档」严格一致
// TODO(server): 接 /admin/schedule 系列接口后只替换 mock.ts 的调用，UI 不动。
// ─────────────────────────────────────────────────────────────
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Check } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { LEGENDS, WEEK_HEADERS } from './constants'
import { fmtDate, monthLeadOffset, previewRanges, shortSlot } from './slot'
import { queryMonth, saveHoliday, saveSlots, setClosed, today } from './mock'
import type { ScheduleCell, SlotId } from './types'
import DayDetailDialog from './components/DayDetailDialog.vue'
import BulkSlotsDialog from './components/BulkSlotsDialog.vue'

const auth = useAuthStore()
const todayStr = today()

/* ═══ 月份与月历数据 ═══ */
const month = ref(todayStr.slice(0, 7))
const days = ref<ScheduleCell[]>([])
const defaultSlots = ref<SlotId[]>([])
const loading = ref(false)
const acting = ref(false)

/** 月历格：前置空白（null）+ 当月各天，周一为起点 */
const cells = computed<(ScheduleCell | null)[]>(() => {
  if (!days.value.length) return []
  const [y, m] = month.value.split('-').map(Number)
  const offset = monthLeadOffset(y, m)
  return [...Array<ScheduleCell | null>(offset).fill(null), ...days.value]
})

async function load(): Promise<void> {
  loading.value = true
  // 模拟异步，观感同其它列表页（接真接口后删掉这行）
  await new Promise((r) => window.setTimeout(r, 200))
  const data = queryMonth(month.value)
  days.value = data.days
  defaultSlots.value = data.defaultSlots
  loading.value = false
}

function shiftMonth(n: number): void {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  void load()
}

function goToday(): void {
  month.value = todayStr.slice(0, 7)
  void load()
}

/* ═══ 多选 ═══ */
const multi = ref(false)
const selectedDates = ref<Set<string>>(new Set())
const bulkDialog = ref(false)
const bulkInitialSlots = ref<SlotId[]>([])

const selectedMonths = computed(() => {
  const set = new Set([...selectedDates.value].map((d) => d.slice(0, 7)))
  return [...set].sort()
})

const selectedPreview = computed(() => previewRanges(selectedDates.value))

/** 批量配置里选中的日期有几天已含订单（让管理员提前看到保留提示） */
const bulkBookedDays = computed(() => {
  let n = 0
  for (const d of selectedDates.value) {
    const c = days.value.find((x) => x.date === d)
    if (c && c.booked > 0) n++
  }
  return n
})

/** 某日期能否加入多选；'' 表示可以，否则为拒绝原因 */
function bulkBlockedReason(cell: ScheduleCell | null | undefined): string {
  if (!cell) return ''
  if (cell.date <= todayStr) return '过去的日期'
  if (cell.closed) return '该日为休整日，先恢复营业'
  if (cell.slotsOverridden) return '该日已单独配置过时段，不能重复选择'
  return ''
}

function toggleMulti(): void {
  multi.value = !multi.value
  if (!multi.value) selectedDates.value = new Set()
}

function clearSelection(): void {
  selectedDates.value = new Set()
}

function toggleDate(date: string): void {
  const next = new Set(selectedDates.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  selectedDates.value = next
}

/** 全选本月 / 本季 / 本年：只取今天之后，跳过已单独配置/休整日（跨月按月拉取） */
async function selectRange(kind: 'month' | 'quarter' | 'year'): Promise<void> {
  const [y, m] = month.value.split('-').map(Number)
  let from: Date
  let to: Date
  let label: string
  if (kind === 'month') {
    from = new Date(y, m - 1, 1)
    to = new Date(y, m, 0)
    label = '本月'
  } else if (kind === 'quarter') {
    const q = Math.floor((m - 1) / 3)
    from = new Date(y, q * 3, 1)
    to = new Date(y, q * 3 + 3, 0)
    label = '本季'
  } else {
    from = new Date(y, 0, 1)
    to = new Date(y, 11, 31)
    label = '本年'
  }
  const start = new Date(
    Math.max(from.getTime(), new Date(`${todayStr}T00:00:00`).getTime() + 86_400_000),
  )
  // 跨月按月拉取，建立 date → cell 索引（否则不知道未加载月份里哪天已配置）
  const monthKeys = new Set<string>()
  for (let d = new Date(start); d <= to; d = new Date(d.getTime() + 86_400_000)) {
    monthKeys.add(fmtDate(d).slice(0, 7))
  }
  const map = new Map<string, ScheduleCell>()
  loading.value = true
  try {
    for (const mk of monthKeys) {
      for (const c of queryMonth(mk).days) map.set(c.date, c)
    }
  } finally {
    loading.value = false
  }
  const next = new Set(selectedDates.value)
  let skipped = 0
  for (let d = new Date(start); d <= to; d = new Date(d.getTime() + 86_400_000)) {
    const key = fmtDate(d)
    if (bulkBlockedReason(map.get(key))) skipped++
    else next.add(key)
  }
  selectedDates.value = next
  const note = skipped ? `；跳过 ${skipped} 天（已单独配置过时段或休整日）` : ''
  ElMessage.success(`已选 ${next.size} 天（${label}剩余日期）${note}`)
}

function openBulk(): void {
  if (!selectedDates.value.size) {
    ElMessage.warning('请先选择日期')
    return
  }
  // 已加载月份里被锁住的日期先剔掉；跨月未加载的交给 mock/后端兜底
  const locked = [...selectedDates.value].filter((d) => {
    const cell = days.value.find((c) => c.date === d)
    return Boolean(cell && bulkBlockedReason(cell))
  })
  if (locked.length) {
    const keep = new Set([...selectedDates.value].filter((d) => !locked.includes(d)))
    selectedDates.value = keep
    ElMessage.warning(`已剔除 ${locked.length} 个不能批量配置的日期（已单独配置过时段或休整日）`)
    if (!keep.size) return
  }
  bulkInitialSlots.value = defaultSlots.value.slice()
  bulkDialog.value = true
}

async function submitBulk(slots: SlotId[]): Promise<void> {
  acting.value = true
  try {
    const dates = [...selectedDates.value].sort()
    const { blocked } = saveSlots({ dates, slots, mode: 'bulk' })
    if (blocked.length) {
      ElMessage.warning(`已更新 ${dates.length} 天；${blocked.length} 个时段因已有订单保持不变`)
    } else {
      ElMessage.success(`已更新 ${dates.length} 天的接单时段`)
    }
    bulkDialog.value = false
    multi.value = false
    selectedDates.value = new Set()
    await load()
  } finally {
    acting.value = false
  }
}

/* ═══ 单选 ═══ */
const dayDialog = ref(false)
const selected = ref<ScheduleCell | null>(null)

function onCellClick(cell: ScheduleCell | null): void {
  if (!cell) return
  if (multi.value) {
    if (cell.date <= todayStr) {
      ElMessage.warning('过去的日期不能配置')
      return
    }
    // 取消选择永远允许；加入前先判能否批量配置
    if (selectedDates.value.has(cell.date)) {
      toggleDate(cell.date)
      return
    }
    const why = bulkBlockedReason(cell)
    if (why) {
      ElMessage.warning(`${cell.date}：${why}`)
      return
    }
    toggleDate(cell.date)
    return
  }
  selected.value = cell
  dayDialog.value = true
}

/** 弹窗动作落库后统一 reload 并关闭弹窗 */
async function reloadAndClose(): Promise<void> {
  const date = selected.value?.date
  dayDialog.value = false
  await load()
  if (date) selected.value = days.value.find((c) => c.date === date) ?? null
}

function onSaveSlots(slots: SlotId[]): void {
  if (!selected.value) return
  acting.value = true
  try {
    const { blocked } = saveSlots({ dates: [selected.value.date], slots, mode: 'single' })
    if (blocked.length) ElMessage.warning(`${blocked.length} 个时段因已有订单保持不变`)
    else ElMessage.success(slots.length ? '已保存当日接单时段' : '已设为当日不接单')
  } finally {
    acting.value = false
  }
  void reloadAndClose()
}

function onResetSlots(): void {
  if (!selected.value) return
  acting.value = true
  try {
    saveSlots({ dates: [selected.value.date], slots: null, mode: 'single' })
    ElMessage.success('已恢复默认时段')
  } finally {
    acting.value = false
  }
  void reloadAndClose()
}

function onSaveHoliday(name: string): void {
  if (!selected.value) return
  if (!name.trim()) {
    ElMessage.warning('请输入特殊日名称')
    return
  }
  acting.value = true
  try {
    saveHoliday(selected.value.date, name.trim())
    ElMessage.success('已标注特殊日')
  } finally {
    acting.value = false
  }
  void reloadAndClose()
}

function onClearHoliday(): void {
  if (!selected.value) return
  acting.value = true
  try {
    saveHoliday(selected.value.date, '')
    ElMessage.success('已取消标注')
  } finally {
    acting.value = false
  }
  void reloadAndClose()
}

function onToggleClosed(closed: boolean): void {
  if (!selected.value) return
  const res = setClosed(selected.value.date, closed)
  if (!res.ok) {
    ElMessage.warning(res.reason ?? '操作失败')
    return
  }
  ElMessage.success(closed ? '已设为休整日' : '已恢复营业')
  void reloadAndClose()
}

/** 月历格状态 class（复刻原型 cellClass） */
function cellClass(cell: ScheduleCell | null): Record<string, boolean> | string {
  if (!cell) return 'empty'
  const lockReason = multi.value ? bulkBlockedReason(cell) : ''
  return {
    past: cell.date <= todayStr,
    closed: cell.closed,
    full: !cell.closed && cell.slots.length > 0 && cell.booked >= cell.limit,
    noslots: !cell.closed && cell.slots.length === 0,
    picking: multi.value && cell.date > todayStr && !lockReason,
    locked: Boolean(lockReason) && !selectedDates.value.has(cell.date),
    picked: multi.value && selectedDates.value.has(cell.date),
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="page">
    <!-- 工具栏 -->
    <div class="card toolbar">
      <div class="month-ctrl">
        <el-button :icon="ArrowLeft" circle plain @click="shiftMonth(-1)" />
        <el-date-picker
          v-model="month"
          type="month"
          value-format="YYYY-MM"
          :clearable="false"
          style="width: 140px; margin: 0 10px"
          @change="load"
        />
        <el-button :icon="ArrowRight" circle plain @click="shiftMonth(1)" />
        <el-button plain style="margin-left: 10px" @click="goToday">本月</el-button>
        <el-button
          v-if="auth.isAdmin"
          class="multi-btn"
          :type="multi ? 'primary' : 'default'"
          plain
          @click="toggleMulti"
        >
          {{ multi ? '退出多选' : '多选' }}
        </el-button>
      </div>
      <div class="legend">
        <span v-for="item in LEGENDS" :key="item.key" class="legend-item">
          <i class="dot" :class="`dot-${item.key}`"></i>{{ item.label }}
        </span>
      </div>
    </div>

    <!-- 多选操作条 -->
    <div v-if="multi" class="card multi-bar">
      <div class="mb-left">
        <span class="mb-count"
          >已选 <b>{{ selectedDates.size }}</b> 天</span
        >
        <span v-if="selectedMonths.length" class="mb-months">
          （{{ selectedMonths.join('、') }}）
        </span>
      </div>
      <div class="mb-actions">
        <el-button size="small" @click="selectRange('month')">全选本月</el-button>
        <el-button size="small" @click="selectRange('quarter')">全选本季</el-button>
        <el-button size="small" @click="selectRange('year')">全选本年</el-button>
        <el-button size="small" text @click="clearSelection">清空</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="selectedDates.size === 0"
          @click="openBulk"
        >
          配置接单时段
        </el-button>
      </div>
      <div class="mb-tip">
        点格子加入 /
        取消；跨月选择会累加保留，切换月份不会清空。已单独配置过时段的日期、休整日不可重复选择。
      </div>
    </div>

    <!-- 月历 -->
    <div v-loading="loading" class="card">
      <div class="week-row">
        <div v-for="w in WEEK_HEADERS" :key="w" class="week-cell">{{ w }}</div>
      </div>
      <div class="grid">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          class="day-cell"
          :class="cellClass(cell)"
          @click="onCellClick(cell)"
        >
          <template v-if="cell">
            <!-- 选中态：内层淡蓝填充 + 日期变蓝 + 右上角对勾，不用整圈描边 -->
            <div class="day-inner">
              <div class="day-head">
                <span class="day-num" :class="{ today: cell.date === todayStr }">
                  {{ Number(cell.date.slice(8)) }}
                </span>
                <span v-if="multi && selectedDates.has(cell.date)" class="chk" title="已选">
                  <el-icon><Check /></el-icon>
                </span>
                <span v-else-if="multi && cell.closed" class="badge badge-set">休</span>
                <span v-else-if="multi && cell.slotsOverridden" class="badge badge-set">已配</span>
                <span v-else-if="cell.closed" class="badge badge-closed">休</span>
                <span v-else-if="cell.slots.length === 0" class="badge badge-noslots">停</span>
                <span v-else-if="cell.booked >= cell.limit" class="badge badge-full">满</span>
              </div>
              <div v-if="cell.holiday" class="day-holiday" :class="{ custom: cell.customHoliday }">
                {{ cell.holiday }}
              </div>
              <div class="day-booked">
                <span v-if="multi">
                  {{ cell.slots.length }} 时段<span
                    v-if="cell.slotsOverridden"
                    class="override-mark"
                    title="单独设置过时段"
                    >*</span
                  >
                </span>
                <span v-else>
                  已订 {{ cell.booked }}/{{ cell.limit
                  }}<span v-if="cell.overridden" class="override-mark" title="该日单独设置">*</span>
                </span>
              </div>
              <div v-if="!multi && !cell.closed && cell.limit > 0" class="day-slots">
                {{ cell.slots.map(shortSlot).join(' · ') }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 单日详情弹窗 -->
    <DayDetailDialog
      v-model="dayDialog"
      :cell="selected"
      :acting="acting"
      @save-slots="onSaveSlots"
      @reset-slots="onResetSlots"
      @save-holiday="onSaveHoliday"
      @clear-holiday="onClearHoliday"
      @toggle-closed="onToggleClosed"
    />

    <!-- 批量配置弹窗 -->
    <BulkSlotsDialog
      v-model="bulkDialog"
      :count="selectedDates.size"
      :months="selectedMonths"
      :preview="selectedPreview"
      :booked-days="bulkBookedDays"
      :initial-slots="bulkInitialSlots"
      :acting="acting"
      @submit="submitBulk"
    />
  </div>
</template>

<style scoped>
/* ── 工具栏 ── */
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.month-ctrl {
  display: flex;
  align-items: center;
}

.multi-btn {
  margin-left: 10px;
}

.legend {
  margin-left: auto;
  display: flex;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 5px;
}

.dot-full {
  background: #f56c6c;
}
.dot-closed {
  background: #c0c4cc;
}
.dot-holiday {
  background: #e6a23c;
}
.dot-free {
  background: #67c23a;
}
.dot-noslots {
  background: #b1b3b8;
}

/* ── 多选操作条 ── */
.multi-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  background: #f2f8ff;
  border: 1px solid #d9ecff;
}

.mb-left {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.mb-count {
  font-size: 14px;
  color: #303133;
}

.mb-count b {
  color: #409eff;
  font-size: 16px;
  margin: 0 2px;
}

.mb-months {
  font-size: 12px;
  color: #909399;
}

.mb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mb-tip {
  flex-basis: 100%;
  font-size: 12px;
  color: #909399;
}

/* ── 月历网格 ── */
.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid #ebeef5;
  border-bottom: none;
  background: #fafafa;
}

.week-cell {
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-left: 1px solid #ebeef5;
  border-top: 1px solid #ebeef5;
}

.day-cell {
  min-height: 100px;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  background: #fff;
  position: relative;
  box-sizing: border-box;
  display: flex;
}

/* 内层块四周各留 4px 白边，相邻两格间始终有 8px 呼吸缝；状态用填充色表达，不用整圈描边 */
.day-inner {
  flex: 1;
  min-width: 0;
  margin: 4px;
  padding: 8px;
  border-radius: 8px;
  box-sizing: border-box;
  transition: background 0.15s;
}

.day-cell:not(.empty):hover .day-inner {
  background: #f5f9ff;
}

.day-cell.empty {
  background: #fafafa;
  cursor: default;
}

.day-cell.past {
  opacity: 0.45;
}

.day-cell.closed {
  background: #f4f4f5;
}

.day-cell.full {
  background: #fef0f0;
}

.day-cell.noslots {
  background: #fafafa;
}

/* 多选：未来日期悬停提示可加入 */
.day-cell.picking:hover .day-inner {
  background: #ecf5ff;
}

/* 多选：已选 —— 淡蓝填充 + 日期变蓝 + 右上角对勾 */
.day-cell.picked .day-inner {
  background: #e8f2ff;
}

.day-cell.picked:hover .day-inner {
  background: #dceafc;
}

.day-cell.picked .day-num {
  color: #2b7cff;
}

.day-cell.picked .day-booked {
  color: #5d7fa8;
}

.day-cell.picked .day-slots {
  color: #7d9bbb;
}

/* 多选：锁住的日期（已单独配置 / 休整日）用斜纹表示不可选 */
.day-cell.locked {
  cursor: not-allowed;
}

.day-cell.locked .day-inner {
  background: repeating-linear-gradient(135deg, #fafafa, #fafafa 5px, #f2f3f5 5px, #f2f3f5 10px);
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-num {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.day-num.today {
  color: #fff;
  background: #409eff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.badge {
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 8px;
  color: #fff;
}

.badge-full {
  background: #f56c6c;
}
.badge-closed {
  background: #909399;
}
.badge-noslots {
  background: #b1b3b8;
}
.badge-set {
  background: #a8abb2;
}

/* 多选对勾：18px 蓝底白勾圆，比「已选」徽章轻，不挤占日期行 */
.chk {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(64, 158, 255, 0.35);
}

.chk .el-icon {
  font-size: 12px;
}

.day-booked {
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
}

.day-slots {
  margin-top: 3px;
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-holiday {
  margin-top: 4px;
  font-size: 11px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 3px;
  padding: 0 4px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-holiday.custom {
  color: #b88230;
  border: 1px dashed #e6a23c;
}

.override-mark {
  color: #e6a23c;
  font-weight: 700;
  margin-left: 4px;
}
</style>

<!-- 弹窗 teleport 到 body，scoped 选不到；用本页弹窗类名前缀限定，避免污染其它页面 -->
<style>
.day-dialog .el-dialog__body,
.bulk-dialog .el-dialog__body {
  max-height: calc(100vh - 210px);
  overflow-y: auto;
}
</style>
