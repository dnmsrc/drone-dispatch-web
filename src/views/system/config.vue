<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 业务配置（UI 复刻原型 admin/src/views/system/config.vue）
//
// 四个卡片：
//   1) 运营参数（可编辑）：默认时段条目增删 + 四个数字项，保存走 PUT /admin/config 校验
//   2) 计价规则总览（字典驱动，只读）：架次/时长/图案/时段/附加服务
//   3) 退款阶梯（字典 refund_rule，只读）
//   4) 危险操作：重置演示数据（静态页仅恢复运营参数种子）
// 时段编辑复用档期页的 slot 纯函数（normSlotId/fmtSlot/findOverlap/上限），
// 保证「整点区间、不可重叠、最多 12 段」口径全站一致。
// TODO(server): 接 /admin/config、/config/pricing、/config/reset 后仅替换 config-mock 调用。
// ─────────────────────────────────────────────────────────────
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Plus } from '@element-plus/icons-vue'
import { fmtMoney } from '@/utils/format'
import { findOverlap, fmtSlot, MAX_SLOTS_PER_DAY } from '../schedule/slot'
import type { SlotId } from '../schedule/types'
import {
  queryConfig,
  queryPriceRules,
  queryRefundRules,
  resetDemoData,
  saveConfig,
} from './config-mock'
import type { BizConfig, PriceRules, RefundRule } from './config-types'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)

/** 可编辑运营参数 */
const form = ref<BizConfig>({
  defaultSlots: [],
  bookingWindowDays: 60,
  payExpireMinutes: 15,
  customTextPrice: 0,
  customLogoPrice: 0,
})
/** 待添加时段的起止（el-time-select 整点） */
const newStart = ref('')
const newEnd = ref('')

/** 只读计价规则 / 退款阶梯 */
const pricing = ref<PriceRules>({
  tiers: [],
  durations: [],
  customTextPrice: 0,
  customLogoPrice: 0,
  addons: [],
  patterns: [],
  timeSlots: [],
  payExpireMinutes: 0,
})
const refundRules = ref<RefundRule[]>([])

async function load(): Promise<void> {
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 300))
  form.value = queryConfig()
  pricing.value = queryPriceRules()
  refundRules.value = queryRefundRules()
  loading.value = false
}

onMounted(() => void load())

/* ═══ 默认时段增删（口径与档期 SlotEditor 一致，但无「已订锁定」语义）═══ */
function removeDefaultSlot(slot: SlotId): void {
  form.value.defaultSlots = form.value.defaultSlots.filter((x) => x !== slot)
}

function addDefaultSlot(): void {
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
  if (form.value.defaultSlots.includes(id)) {
    ElMessage.warning('该时段已在列表里')
    return
  }
  const hit = findOverlap([...form.value.defaultSlots, id])
  if (hit) {
    ElMessage.warning(
      `该时段与「${fmtSlot(hit[0] === id ? hit[1] : hit[0])}」重叠：同一时间只能接一单，请改成不重叠的区间`,
    )
    return
  }
  if (form.value.defaultSlots.length >= MAX_SLOTS_PER_DAY) {
    ElMessage.warning(`最多 ${MAX_SLOTS_PER_DAY} 个时段`)
    return
  }
  form.value.defaultSlots = [...form.value.defaultSlots, id].sort()
  newStart.value = ''
  newEnd.value = ''
}

/** 保存：前端先兜时段非空，再交给 mock 做与服务端一致的完整校验 */
async function save(): Promise<void> {
  if (!form.value.defaultSlots.length) {
    ElMessage.warning('默认可接单时段至少保留一个')
    return
  }
  saving.value = true
  try {
    // 模拟异步请求；校验失败抛错由 catch 提示，不关闭页面
    await new Promise((r) => window.setTimeout(r, 300))
    saveConfig(form.value)
    ElMessage.success('配置已保存，H5 端实时生效')
    await load()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '配置保存失败')
  } finally {
    saving.value = false
  }
}

/** 重置演示数据：二次确认 → 重置 → alert 提示刷新 */
async function resetData(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '确认重置演示数据？当前所有订单、字典与配置将被种子数据覆盖。',
      '重置确认',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  resetting.value = true
  try {
    await new Promise((r) => window.setTimeout(r, 300))
    resetDemoData()
    await ElMessageBox.alert('演示数据已重置，建议刷新页面查看最新数据。', '重置成功', {
      confirmButtonText: '刷新页面',
      type: 'success',
    })
    window.location.reload()
  } finally {
    resetting.value = false
  }
}

/** 退款比例标签颜色：≥90% 绿 / >0 橙 / 0 红（原型同款） */
function refundTagType(ratio: number): 'success' | 'warning' | 'danger' {
  return ratio >= 0.9 ? 'success' : ratio > 0 ? 'warning' : 'danger'
}

/** 退款比例展示文案 */
function refundRatioText(ratio: number): string {
  return ratio > 0 ? `${Math.round(ratio * 100)}%` : '不可退款'
}

/** 时长加价展示：0 表示含在基础价内 */
function durationExtraText(extra: number): string {
  return extra > 0 ? `+${fmtMoney(extra)}` : '含在基础价内'
}
</script>

<template>
  <div v-loading="loading" class="page">
    <!-- ① 运营参数（可编辑） -->
    <div class="card">
      <h3 class="card-title">运营参数<span class="sub">保存后 H5 端实时生效</span></h3>
      <el-form label-width="130px" class="cfg-form">
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="默认可接单时段">
              <div class="slot-list">
                <div v-for="t in form.defaultSlots" :key="t" class="slot-item">
                  <span class="slot-time">{{ fmtSlot(t) }}</span>
                  <el-button
                    link
                    type="danger"
                    :icon="Close"
                    size="small"
                    title="删除该时段"
                    @click="removeDefaultSlot(t)"
                  />
                </div>
                <div v-if="!form.defaultSlots.length" class="slot-empty">
                  至少保留一个时段，否则用户无法下单
                </div>
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
                <el-button size="small" type="primary" plain :icon="Plus" @click="addDefaultSlot">
                  添加时段
                </el-button>
              </div>
              <div class="form-tip">
                默认可接单时段 = 每天默认开放的整点区间，一段 = 一个名额；只能选整点，起止随意（如
                18:00 - 19:00）。某天要单独调整请到「档期管理」。
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="预约窗口">
              <el-input-number
                v-model="form.bookingWindowDays"
                :min="7"
                :max="365"
                style="width: 150px"
              />
              <div class="form-tip">用户最多可预约未来 N 天内的表演</div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="支付时限">
              <el-input-number
                v-model="form.payExpireMinutes"
                :min="1"
                :max="120"
                style="width: 150px"
              />
              <div class="form-tip">下单后 N 分钟内未支付自动取消（分钟）</div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="定制文字价格">
              <el-input-number
                v-model="form.customTextPrice"
                :min="0"
                :max="100000"
                :step="100"
                style="width: 150px"
              />
              <div class="form-tip">空中文字定制加价（元，最多 10 字）</div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="LOGO 定制价格">
              <el-input-number
                v-model="form.customLogoPrice"
                :min="0"
                :max="100000"
                :step="100"
                style="width: 150px"
              />
              <div class="form-tip">LOGO / 图片定制加价（元）</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ② 计价规则总览（字典驱动，只读） -->
    <div class="card">
      <div class="card-head">
        <h3 class="card-title">计价规则总览<span class="sub">由字典驱动，此处只读</span></h3>
        <el-button type="primary" plain size="small" @click="router.push('/system/dict')">
          前往字典管理维护
        </el-button>
      </div>
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <h4 class="section-title">架次档位（字典：drone_tier）</h4>
          <el-table :data="pricing.tiers" border size="small">
            <el-table-column label="档位" width="110">
              <template #default="{ row }">{{ row.drones }} 架</template>
            </el-table-column>
            <el-table-column label="基础价" width="120">
              <template #default="{ row }">
                <span class="amount-text">{{ fmtMoney(row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="desc" label="适用场景" min-width="170" />
          </el-table>

          <h4 class="section-title">表演时长（字典：duration）</h4>
          <el-table :data="pricing.durations" border size="small">
            <el-table-column prop="label" label="时长" width="170" />
            <el-table-column label="加价">
              <template #default="{ row }">{{ durationExtraText(row.extra) }}</template>
            </el-table-column>
          </el-table>
        </el-col>

        <el-col :xs="24" :md="12">
          <h4 class="section-title">图案 / 时段（字典：pattern / time_slot）</h4>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="预设图案">
              <el-tag
                v-for="p in pricing.patterns"
                :key="p.key"
                size="small"
                effect="plain"
                style="margin-right: 6px"
              >
                {{ p.label }}
              </el-tag>
              <span class="cell-sub">（任选，不加价）</span>
            </el-descriptions-item>
            <el-descriptions-item label="演出时段">
              {{ pricing.timeSlots.join(' / ') }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 class="section-title">附加服务（字典：addon）</h4>
          <el-table :data="pricing.addons" border size="small">
            <el-table-column prop="label" label="服务" min-width="170" />
            <el-table-column label="加价" width="130">
              <template #default="{ row }">+{{ fmtMoney(row.price) }}</template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </div>

    <!-- ③ 退款阶梯（字典驱动，只读） -->
    <div class="card">
      <div class="card-head">
        <h3 class="card-title">
          退款阶梯规则<span class="sub"
            >字典：refund_rule；订单未接单可申请全额退款，已接单按下表试算</span
          >
        </h3>
        <el-button type="primary" plain size="small" @click="router.push('/system/dict')">
          前往字典管理维护
        </el-button>
      </div>
      <el-table :data="refundRules" border size="small" style="max-width: 640px">
        <el-table-column label="距表演时间" min-width="200">
          <template #default="{ row }">{{ row.label.split('，')[0] }}</template>
        </el-table-column>
        <el-table-column label="退款比例" width="140">
          <template #default="{ row }">
            <el-tag :type="refundTagType(row.ratio)">{{ refundRatioText(row.ratio) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ④ 危险操作 -->
    <div class="card danger-card">
      <h3 class="card-title danger-title">演示数据</h3>
      <p class="danger-desc">
        将订单、用户、档期、字典与配置全部恢复为初始种子数据，用于重新演示完整流程。该操作不可撤销。
      </p>
      <el-button type="danger" :loading="resetting" @click="resetData">重置演示数据</el-button>
    </div>
  </div>
</template>

<style scoped>
.cell-sub {
  font-size: 12px;
  color: #909399;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}

.cfg-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.danger-card {
  border: 1px solid #fde2e2;
}

.danger-title {
  color: #f56c6c;
}

.danger-desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 14px;
}

/* 默认可接单时段：条目式（选好即渲染，可随意增删），起止用整点选择器 */
.slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 4px 0 10px;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafbfc;
}

.slot-item .slot-time {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.2px;
}

.slot-item .el-button {
  margin-left: auto;
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
  margin-bottom: 8px;
}

.slot-picker .picker-sep {
  color: #909399;
}
</style>
