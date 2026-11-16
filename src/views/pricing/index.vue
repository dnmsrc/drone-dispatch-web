<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 计价管理（UI 复刻原型 admin/src/views/pricing/index.vue）
//
// 集中维护所有「带价格 / 影响下单金额」的规则，6 个 Tab：
//   架次档位 / 表演时长 / 附加服务 / 预设图案 / 定制收费 / 退款阶梯。
// 规则数组项带 status（1 启用 / 0 停用）：停用后 H5 立即拉取不到该项。
// 数据走本地 mock（./mock，同构原型 GET/PUT /admin/pricing 系列）；
// 后端 PricingController 就绪后只替换 mock 调用，本页与 types 不改名。
// 权限：非 ADMIN 只读（开关、保存按钮 disabled），路由 meta.roles 同步限定 ADMIN。
// ─────────────────────────────────────────────────────────────
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fmtMoney } from '@/utils/format'
import { getPricing, saveCustomScalars, saveItem } from './mock'
import {
  CUSTOM_PRICE_LIMITS,
  PRICING_GROUP_META,
  PRICING_GROUPS,
  type CustomPricing,
  type PriceAddon,
  type PriceDuration,
  type PricePattern,
  type PriceTier,
  type PricingGroup,
  type PricingRules,
  type RefundRule,
  type RuleStatus,
} from './types'

const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const activeTab = ref<PricingGroup | 'custom'>('tiers')

/** 空骨架（Object.assign 前先归位，避免残留上一次分组的数据） */
function emptyRules(): PricingRules {
  return {
    tiers: [],
    durations: [],
    addons: [],
    patterns: [],
    refundRules: [],
    custom: { customTextPrice: 0, customLogoPrice: 0 },
  }
}

const data = reactive<PricingRules>(emptyRules())
const customForm = reactive<CustomPricing>({ customTextPrice: 0, customLogoPrice: 0 })

async function load(): Promise<void> {
  loading.value = true
  // 模拟异步，观感同其它列表页（接真接口后删掉这行）
  await new Promise((r) => window.setTimeout(r, 200))
  const d = getPricing()
  Object.assign(data, emptyRules(), d)
  customForm.customTextPrice = data.custom.customTextPrice ?? 0
  customForm.customLogoPrice = data.custom.customLogoPrice ?? 0
  loading.value = false
}

onMounted(() => void load())

/* ═══ 启停：单项接口（只传 status），失败回滚开关 ═══ */
function toggle(group: PricingGroup, row: { id: string; status: RuleStatus }, val: boolean): void {
  const prev = row.status
  row.status = val ? 1 : 0
  try {
    saveItem(group, row.id, { status: row.status })
    ElMessage.success(val ? '已启用，用户端可选' : '已停用，用户端将不再展示该项')
  } catch (err) {
    row.status = prev
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  }
}

/** el-switch change 事件归一为布尔（其 $event 类型为 string|number|boolean） */
function onToggle(group: PricingGroup, row: AnyRule, val: string | number | boolean): void {
  toggle(group, row, Boolean(val))
}

/* ═══ 行内编辑弹窗（字段随分区动态变化）═══ */
type AnyRule = PriceTier | PriceDuration | PriceAddon | PricePattern | RefundRule

const editDialog = ref(false)
const editForm = ref<Record<string, string | number | boolean>>({})
let editingGroup: PricingGroup | '' = ''
let editingId = ''

function openEdit(group: PricingGroup, row: AnyRule): void {
  editingGroup = group
  editingId = row.id
  activeTab.value = group
  // status 在弹窗里用布尔 switch 编辑，提交时归一为 1/0
  editForm.value = { ...row, status: row.status === 1 }
  editDialog.value = true
}

/** 数字字段在提交前归一（与原型 saveEdit 同一组键） */
const NUMERIC_FIELDS = ['drones', 'price', 'minutes', 'extra', 'minHours', 'ratio'] as const

function saveEdit(): void {
  if (!editingGroup) return
  const payload: Record<string, unknown> = {
    ...editForm.value,
    status: editForm.value.status ? 1 : 0,
  }
  for (const k of NUMERIC_FIELDS) {
    if (payload[k] !== undefined) payload[k] = Number(payload[k])
  }
  saving.value = true
  try {
    saveItem(editingGroup, editingId, payload)
    ElMessage.success('已保存')
    editDialog.value = false
    void load()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

/* ═══ 定制收费（两个标量，0-100000）═══ */
function saveCustom(): void {
  saving.value = true
  try {
    const custom = saveCustomScalars({
      customTextPrice: Number(customForm.customTextPrice),
      customLogoPrice: Number(customForm.customLogoPrice),
    })
    data.custom = { ...custom }
    ElMessage.success('定制收费已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
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
    <!-- 顶部说明 -->
    <div class="card intro-card">
      <h3 class="card-title">
        计价管理<span class="sub"
          >集中维护所有带价格的下单规则；停用后用户端 H5 立即拉取不到该项，无法选择</span
        >
      </h3>
      <p class="intro-tip">
        与「字典管理」的区别：本页面向业务，字段是架次数 / 价格 /
        说明这类业务语言；字典只放不带价的系统级枚举（如订单状态）。
      </p>
    </div>

    <!-- 分区 Tab -->
    <div class="card">
      <el-tabs v-model="activeTab">
        <!-- 1. 架次档位 -->
        <el-tab-pane v-for="g in PRICING_GROUPS" :key="g" :name="g">
          <template #label>{{ PRICING_GROUP_META[g].name }}</template>
          <div class="pane-head">
            <span class="pane-desc">{{ PRICING_GROUP_META[g].desc }}</span>
          </div>

          <!-- 架次档位 -->
          <el-table v-if="g === 'tiers'" :data="data.tiers" border size="small">
            <el-table-column label="架次" width="120">
              <template #default="{ row }">{{ row.drones }} 架</template>
            </el-table-column>
            <el-table-column label="基础价" width="150">
              <template #default="{ row }">
                <span class="amount-text">{{ fmtMoney(row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="desc" label="适用场景" min-width="220" show-overflow-tooltip />
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 1"
                  :disabled="!auth.isAdmin"
                  @change="onToggle('tiers', row as PriceTier, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEdit('tiers', row as PriceTier)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 表演时长 -->
          <el-table v-else-if="g === 'durations'" :data="data.durations" border size="small">
            <el-table-column label="时长" min-width="180">
              <template #default="{ row }"> {{ row.label }}（{{ row.minutes }} 分钟） </template>
            </el-table-column>
            <el-table-column label="加价" width="150">
              <template #default="{ row }">
                <span v-if="row.extra > 0" class="amount-text">{{
                  durationExtraText(row.extra)
                }}</span>
                <el-tag v-else size="small" type="info">含在基础价内</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 1"
                  :disabled="!auth.isAdmin"
                  @change="onToggle('durations', row as PriceDuration, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEdit('durations', row as PriceDuration)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 附加服务 -->
          <el-table v-else-if="g === 'addons'" :data="data.addons" border size="small">
            <el-table-column prop="label" label="服务名称" min-width="200" />
            <el-table-column label="加价" width="150">
              <template #default="{ row }">
                <span class="amount-text">+{{ fmtMoney(row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 1"
                  :disabled="!auth.isAdmin"
                  @change="onToggle('addons', row as PriceAddon, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEdit('addons', row as PriceAddon)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 预设图案 -->
          <el-table v-else-if="g === 'patterns'" :data="data.patterns" border size="small">
            <el-table-column prop="label" label="图案名称" min-width="200" />
            <el-table-column label="价格" width="150">
              <template #default>
                <el-tag size="small" type="success">免费任选</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 1"
                  :disabled="!auth.isAdmin"
                  @change="onToggle('patterns', row as PricePattern, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEdit('patterns', row as PricePattern)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 退款阶梯 -->
          <el-table v-else :data="data.refundRules" border size="small">
            <el-table-column label="距表演时间下限（小时）" width="200">
              <template #default="{ row }">≥ {{ row.minHours }} 小时</template>
            </el-table-column>
            <el-table-column prop="label" label="说明" min-width="240" show-overflow-tooltip />
            <el-table-column label="退款比例" width="130">
              <template #default="{ row }">
                <el-tag :type="refundTagType(row.ratio)">{{ refundRatioText(row.ratio) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 1"
                  :disabled="!auth.isAdmin"
                  @change="onToggle('refundRules', row as RefundRule, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEdit('refundRules', row as RefundRule)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 定制收费 -->
        <el-tab-pane name="custom">
          <template #label>定制收费</template>
          <el-form v-loading="saving" label-width="180px" class="custom-form">
            <el-form-item label="定制文字价格（元）">
              <el-input-number
                v-model="customForm.customTextPrice"
                :min="CUSTOM_PRICE_LIMITS.min"
                :max="CUSTOM_PRICE_LIMITS.max"
                :step="100"
                :disabled="!auth.isAdmin"
              />
              <div class="form-tip">空中文字定制加价，用户端最多输入 10 字</div>
            </el-form-item>
            <el-form-item label="LOGO / 图片定制价格（元）">
              <el-input-number
                v-model="customForm.customLogoPrice"
                :min="CUSTOM_PRICE_LIMITS.min"
                :max="CUSTOM_PRICE_LIMITS.max"
                :step="100"
                :disabled="!auth.isAdmin"
              />
              <div class="form-tip">上传企业 LOGO 或定制图案参考图的加价</div>
            </el-form-item>
            <el-form-item v-if="auth.isAdmin">
              <el-button type="primary" :loading="saving" @click="saveCustom">
                保存定制收费
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 行内编辑弹窗：字段随分区动态变化 -->
    <el-dialog
      v-model="editDialog"
      :title="`编辑${editingGroup ? PRICING_GROUP_META[editingGroup].name : ''}规则`"
      width="480px"
      destroy-on-close
    >
      <el-form label-width="120px">
        <template v-if="editingGroup === 'tiers'">
          <el-form-item label="架次数">
            <el-input-number
              v-model="editForm.drones as number"
              :min="1"
              :max="100000"
              :step="100"
            />
          </el-form-item>
          <el-form-item label="基础价（元）">
            <el-input-number
              v-model="editForm.price as number"
              :min="0"
              :max="1000000"
              :step="100"
            />
          </el-form-item>
          <el-form-item label="适用场景">
            <el-input
              v-model="editForm.desc as string"
              maxlength="60"
              placeholder="如 适合婚礼、周年庆典"
            />
          </el-form-item>
        </template>

        <template v-else-if="editingGroup === 'durations'">
          <el-form-item label="时长（分钟）">
            <el-input-number v-model="editForm.minutes as number" :min="1" :max="240" :step="5" />
          </el-form-item>
          <el-form-item label="展示名称">
            <el-input v-model="editForm.label as string" maxlength="20" placeholder="如 15 分钟" />
          </el-form-item>
          <el-form-item label="加价（元）">
            <el-input-number
              v-model="editForm.extra as number"
              :min="0"
              :max="1000000"
              :step="100"
            />
            <div class="form-tip">填 0 表示含在基础价内</div>
          </el-form-item>
        </template>

        <template v-else-if="editingGroup === 'addons'">
          <el-form-item label="服务名称">
            <el-input v-model="editForm.label as string" maxlength="20" />
          </el-form-item>
          <el-form-item label="加价（元）">
            <el-input-number
              v-model="editForm.price as number"
              :min="0"
              :max="1000000"
              :step="100"
            />
          </el-form-item>
        </template>

        <template v-else-if="editingGroup === 'patterns'">
          <el-form-item label="图案名称">
            <el-input v-model="editForm.label as string" maxlength="20" />
          </el-form-item>
        </template>

        <template v-else-if="editingGroup === 'refundRules'">
          <el-form-item label="小时数下限">
            <el-input-number v-model="editForm.minHours as number" :min="0" :max="8760" />
            <div class="form-tip">距表演不少于该小时数时命中本档</div>
          </el-form-item>
          <el-form-item label="退款比例">
            <el-input-number
              v-model="editForm.ratio as number"
              :min="0"
              :max="1"
              :step="0.05"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="editForm.label as string" maxlength="50" />
          </el-form-item>
        </template>

        <el-form-item label="状态">
          <el-switch v-model="editForm.status as boolean" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.intro-card {
  margin-bottom: 14px;
}

.intro-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.pane-head {
  margin-bottom: 10px;
}

.pane-desc {
  font-size: 12px;
  color: #909399;
}

.custom-form {
  max-width: 560px;
  padding-top: 8px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}
</style>
