// ─────────────────────────────────────────────────────────────
// 业务配置 · 静态数据源
//
// 分两部分：
//   1) 可编辑运营参数：内存 configStore，初值对齐 mock-server seed 的 PRICE_RULES，
//      保存复刻 PUT /admin/config 的范围校验与时段规整（整点/去重/排序/重叠/上限）；
//   2) 只读计价与退款规则：搬运业务档案 biz/drone.js 的种子，模拟
//      GET /config/pricing 由字典派生出的 priceRules / refundRules，本页只读。
// 所有写操作只改内存，刷新页面回滚；reset 把 config 恢复种子（演示站无跨页持久化要求）。
// TODO(server): 接 /admin/config、/config/pricing、/config/reset 后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import { DEFAULT_SLOTS, findOverlap, MAX_SLOTS_PER_DAY, normSlotId } from '../schedule/slot'
import type { SlotId } from '../schedule/types'
import type { BizConfig, PriceRules, RefundRule } from './config-types'

/* ═══ 可编辑运营参数（初值对齐 seed.js config / biz/drone.js pricing）═══ */
const SEED_CONFIG: BizConfig = {
  defaultSlots: DEFAULT_SLOTS.slice(),
  bookingWindowDays: 60,
  payExpireMinutes: 15,
  customTextPrice: 2000,
  customLogoPrice: 5000,
}

const configStore: { value: BizConfig } = {
  value: JSON.parse(JSON.stringify(SEED_CONFIG)) as BizConfig,
}

/** 读取运营参数（等价 GET /admin/config 的可编辑子集，返回副本） */
export function queryConfig(): BizConfig {
  return JSON.parse(JSON.stringify(configStore.value)) as BizConfig
}

/** 标量字段的范围约束（与 server.js PUT /admin/config 的 checks 逐项一致） */
const RANGE_CHECKS: Array<{
  field: keyof BizConfig
  min: number
  max: number
  message: string
}> = [
  { field: 'bookingWindowDays', min: 7, max: 365, message: '预约窗口需在 7-365 天之间' },
  { field: 'payExpireMinutes', min: 1, max: 120, message: '支付时限需在 1-120 分钟之间' },
  { field: 'customTextPrice', min: 0, max: 100000, message: '定制文字价格需在 0-100000 之间' },
  { field: 'customLogoPrice', min: 0, max: 100000, message: 'LOGO 定制价格需在 0-100000 之间' },
]

/**
 * 保存运营参数（等价 PUT /admin/config）。
 * 校验失败抛 Error（页面 catch 后 ElMessage 提示），通过后写入内存副本。
 */
export function saveConfig(input: BizConfig): void {
  // 标量范围校验
  for (const { field, min, max, message } of RANGE_CHECKS) {
    const n = Number(input[field])
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(message)
  }

  // 时段：规整为合法整点区间 → 去重 → 排序，复刻 normSlots + Set + sort
  const slots = [...new Set((input.defaultSlots ?? []).map(normSlotId).filter(Boolean))].sort()
  if (!slots.length) throw new Error('默认接单时段不能为空')
  if (slots.length > MAX_SLOTS_PER_DAY) {
    throw new Error(`默认接单时段最多 ${MAX_SLOTS_PER_DAY} 段`)
  }
  const overlap = findOverlap(slots as SlotId[])
  if (overlap) {
    throw new Error(
      `默认时段「${overlap[0]}」与「${overlap[1]}」重叠：同一时间只能接一单，请改成不重叠的区间`,
    )
  }

  configStore.value = {
    defaultSlots: slots as SlotId[],
    bookingWindowDays: Number(input.bookingWindowDays),
    payExpireMinutes: Number(input.payExpireMinutes),
    customTextPrice: Number(input.customTextPrice),
    customLogoPrice: Number(input.customLogoPrice),
  }
}

/** 重置演示数据（等价 POST /config/reset）：静态页仅恢复运营参数种子 */
export function resetDemoData(): void {
  configStore.value = JSON.parse(JSON.stringify(SEED_CONFIG)) as BizConfig
}

/* ═══ 只读计价规则（biz/drone.js pricing 种子；等价 priceRulesView 派生结果）═══ */
const PRICE_RULES: PriceRules = {
  tiers: [
    { drones: 100, price: 18800, desc: '适合小型告白、生日惊喜' },
    { drones: 200, price: 28800, desc: '适合婚礼、周年庆典' },
    { drones: 300, price: 38800, desc: '适合大型求婚、品牌发布' },
    { drones: 500, price: 58800, desc: '适合企业年会、城市活动' },
    { drones: 1000, price: 98800, desc: '适合大型节庆、城市级表演' },
  ],
  durations: [
    { minutes: 10, extra: 0, label: '10 分钟（标准）' },
    { minutes: 15, extra: 6000, label: '15 分钟' },
    { minutes: 20, extra: 12000, label: '20 分钟' },
  ],
  customTextPrice: SEED_CONFIG.customTextPrice,
  customLogoPrice: SEED_CONFIG.customLogoPrice,
  addons: [
    { key: 'music', label: '专属音乐编曲', price: 1000 },
    { key: 'narration', label: '现场旁白解说', price: 2000 },
    { key: 'aerial', label: '双机位航拍记录', price: 3000 },
    { key: 'urgent', label: '加急服务（48h 内安排）', price: 8000 },
  ],
  patterns: [
    { key: 'heart', label: '爱心' },
    { key: 'ring', label: '钻戒' },
    { key: 'star', label: '星辰' },
    { key: 'phoenix', label: '凤凰' },
    { key: 'rose', label: '玫瑰' },
    { key: 'moon', label: '月亮船' },
  ],
  timeSlots: DEFAULT_SLOTS.slice(),
  payExpireMinutes: SEED_CONFIG.payExpireMinutes,
}

/** 退款阶梯（biz/drone.js refundRules，已按 minHours 降序，同 refundRulesView） */
const REFUND_RULES: RefundRule[] = [
  { minHours: 168, ratio: 0.9, label: '距表演 7 天以上，退 90%' },
  { minHours: 72, ratio: 0.5, label: '距表演 3-7 天，退 50%' },
  { minHours: 24, ratio: 0.2, label: '距表演 1-3 天，退 20%' },
  { minHours: 0, ratio: 0, label: '距表演不足 24 小时，不可退款' },
]

/** 查询计价规则总览（等价 GET /config/pricing 的 priceRules，只读副本） */
export function queryPriceRules(): PriceRules {
  return JSON.parse(JSON.stringify(PRICE_RULES)) as PriceRules
}

/** 查询退款阶梯（等价 refundRules，只读副本） */
export function queryRefundRules(): RefundRule[] {
  return JSON.parse(JSON.stringify(REFUND_RULES)) as RefundRule[]
}
