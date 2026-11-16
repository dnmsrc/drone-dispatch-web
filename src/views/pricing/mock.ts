// ─────────────────────────────────────────────────────────────
// 计价管理 · 静态数据源与动作（UI 联调用）
//
// 数据源对齐原型 Mock v7 的 db.pricingRules（mock-server/seed.js buildPricingRules）：
// 5 个规则数组（tiers/durations/addons/patterns/refundRules，每项带 id/sort/status）
// + 1 个定制对象 custom。所有写操作只改内存，刷新页面回滚（演示站无跨页持久化要求）。
//
// 行为逐项对齐原型 mock-server/server.js 的 4 个领域路由：
//   GET  /admin/pricing                 全量（含停用项），各分组按 sort 升序
//   PUT  /admin/pricing/:group          整组保存：服务端补 sort、归一 status
//   PUT  /admin/pricing/:group/:id      单项启停/行内编辑（id/sort 不被入参覆盖）
//   PUT  /admin/pricing/custom/scalars  两个定制标量，范围 0-100000
// TODO(server): 后端实现 PricingController 后只替换本文件为 http 调用，页面不改。
// ─────────────────────────────────────────────────────────────
import { CUSTOM_PRICE_LIMITS, PRICING_GROUPS, type PricingGroup, type PricingRules } from './types'

/** 深拷贝（本域数据全是 JSON 安全的普通对象/数组/原始值） */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/** 生成稳定字符串主键（对齐 seed.js 的 tier_001 / dur_002 形态） */
function seqFactory(prefix: string): () => string {
  let n = 0
  return () => `${prefix}_${String(++n).padStart(3, '0')}`
}

/** 给一组种子补 id/sort/status（status 默认启用） */
function withMeta<T extends object>(
  rows: T[],
  prefix: string,
): Array<T & { id: string; sort: number; status: 1 }> {
  const seq = seqFactory(prefix)
  return rows.map((r, i) => ({ id: seq(), ...r, sort: i + 1, status: 1 as const }))
}

/* ═══ 种子（与 biz/drone.js pricing + refundRules 一致）═══ */
function buildSeed(): PricingRules {
  return {
    tiers: withMeta(
      [
        { drones: 100, price: 18800, desc: '适合小型告白、生日惊喜' },
        { drones: 200, price: 28800, desc: '适合婚礼、周年庆典' },
        { drones: 300, price: 38800, desc: '适合大型求婚、品牌发布' },
        { drones: 500, price: 58800, desc: '适合企业年会、城市活动' },
        { drones: 1000, price: 98800, desc: '适合大型节庆、城市级表演' },
      ],
      'tier',
    ),
    durations: withMeta(
      [
        { minutes: 10, extra: 0, label: '10 分钟（标准）' },
        { minutes: 15, extra: 6000, label: '15 分钟' },
        { minutes: 20, extra: 12000, label: '20 分钟' },
      ],
      'dur',
    ),
    addons: withMeta(
      [
        { key: 'music', label: '专属音乐编曲', price: 1000 },
        { key: 'narration', label: '现场旁白解说', price: 2000 },
        { key: 'aerial', label: '双机位航拍记录', price: 3000 },
        { key: 'urgent', label: '加急服务（48h 内安排）', price: 8000 },
      ],
      'addon',
    ),
    patterns: withMeta(
      [
        { key: 'heart', label: '爱心' },
        { key: 'ring', label: '钻戒' },
        { key: 'star', label: '星辰' },
        { key: 'phoenix', label: '凤凰' },
        { key: 'rose', label: '玫瑰' },
        { key: 'moon', label: '月亮船' },
      ],
      'pattern',
    ),
    refundRules: withMeta(
      [
        { minHours: 168, ratio: 0.9, label: '距表演 7 天以上，退 90%' },
        { minHours: 72, ratio: 0.5, label: '距表演 3-7 天，退 50%' },
        { minHours: 24, ratio: 0.2, label: '距表演 1-3 天，退 20%' },
        { minHours: 0, ratio: 0, label: '距表演不足 24 小时，不可退款' },
      ],
      'refund',
    ),
    custom: { customTextPrice: 2000, customLogoPrice: 5000 },
  }
}

/** 内存态（模块单例；刷新页面即随 JS 重载回种子） */
const store: { value: PricingRules } = { value: buildSeed() }

/** 分组按 sort 升序（管理端视图含停用项，区别于 H5 只看启用项） */
function sortGroup<T extends { sort: number }>(group: T[]): T[] {
  return group.slice().sort((a, b) => a.sort - b.sort)
}

function assertGroup(group: string): asserts group is PricingGroup {
  if (!PRICING_GROUPS.includes(group as PricingGroup)) {
    throw new Error('未知的计价规则分区')
  }
}

/** 内部可写视图：五个规则数组统一成「带 id/sort/status 的宽松记录数组」，规避联合键索引赋值问题 */
type MutableRule = Record<string, unknown> & { id: string; sort: number; status: 0 | 1 }
const rulesView = (): Record<PricingGroup, MutableRule[]> =>
  store.value as unknown as Record<PricingGroup, MutableRule[]>

/** GET /admin/pricing：全量副本（含停用项），各分组按 sort 升序 */
export function getPricing(): PricingRules {
  const P = store.value
  // 显式逐键返回，避免联合键索引产生的交叉类型问题
  return clone({
    tiers: sortGroup(P.tiers),
    durations: sortGroup(P.durations),
    addons: sortGroup(P.addons),
    patterns: sortGroup(P.patterns),
    refundRules: sortGroup(P.refundRules),
    custom: { ...P.custom },
  })
}

/**
 * PUT /admin/pricing/:group 整组保存。
 * 服务端补 sort（缺省按序号）、归一 status（非 0 即 1）；id 沿用入参。
 */
export function saveGroup(group: string, items: unknown[]): PricingRules[PricingGroup] {
  assertGroup(group)
  if (!Array.isArray(items)) throw new Error('规则项参数错误')
  rulesView()[group] = items.map((it, i) => {
    const row = (it ?? {}) as MutableRule
    return {
      ...row,
      sort: typeof row.sort === 'number' && row.sort > 0 ? row.sort : i + 1,
      status: row.status === 0 ? 0 : 1,
    }
  })
  return getPricing()[group]
}

/**
 * PUT /admin/pricing/:group/:id 单项启停 / 行内编辑。
 * 影响面最小：只改命中项；id/sort 不被入参覆盖，status 归一为 0/1。
 * 找不到项抛错（对齐服务端 40400「计价规则项不存在」）。
 */
export function saveItem(group: string, id: string, patch: Record<string, unknown>): void {
  assertGroup(group)
  const item = rulesView()[group].find((x) => x.id === id)
  if (!item) throw new Error('计价规则项不存在')
  for (const k of Object.keys(patch)) {
    if (k === 'id' || k === 'sort') continue
    item[k] = patch[k]
  }
  if (patch.status !== undefined) item.status = patch.status === 0 ? 0 : 1
}

/**
 * PUT /admin/pricing/custom/scalars 两个定制标量。
 * 仅更新传入字段；范围 0-100000，越界抛错。返回更新后的 custom 副本。
 */
export function saveCustomScalars(input: {
  customTextPrice?: number
  customLogoPrice?: number
}): PricingRules['custom'] {
  const checks: Array<{ field: keyof typeof input; message: string }> = [
    { field: 'customTextPrice', message: '定制文字价格需在 0-100000 之间' },
    { field: 'customLogoPrice', message: 'LOGO 定制价格需在 0-100000 之间' },
  ]
  for (const { field, message } of checks) {
    if (input[field] == null) continue
    const n = Number(input[field])
    if (!Number.isFinite(n) || n < CUSTOM_PRICE_LIMITS.min || n > CUSTOM_PRICE_LIMITS.max) {
      throw new Error(message)
    }
    store.value.custom[field] = n
  }
  return clone(store.value.custom)
}

/** 供测试/演示重置内存态 */
export function resetPricingStore(): void {
  store.value = buildSeed()
}
