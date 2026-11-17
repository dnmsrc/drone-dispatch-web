// ─────────────────────────────────────────────────────────────
// 计价管理 · 视图类型（页面与表格/弹窗消费的领域结构，字段名沿用原型 pricingRules 语义）
//
// 对应后端真实接口（drone-dispatch-server PricingController，/api/pricing）：
//   GET /pricing/groups          全部分组视图（含停用项），适配层聚合为下方五个数组
//   GET /pricing/custom          两个定制标量（customTextPrice/customLogoPrice）
//   PUT /pricing/rules/:id       单项编辑 / 启停（字段未传即保留原值；开关仅传 status）
//   PUT /pricing/custom          保存两个定制标量（范围 0-100000）
//
// 后端通用行（itemKey/itemLabel/itemValue/extra + 单数分组名 tier/duration/...）
// 与本文件领域字段（drones/price/desc 等 + 复数分组 tiers/durations/...）的双向映射，
// 统一收口在 src/api/pricing.ts，本文件只表达页面视角，不耦合后端列名。
//
// 边界：本域只管「带价格 / 影响下单金额」的规则；不带价的系统枚举归字典管理，
// 「钱怎么付」（支付时限/渠道）归支付管理。
// ─────────────────────────────────────────────────────────────

/** 启停状态：1 启用 / 0 停用（停用后 H5 立即拉取不到该项） */
export type RuleStatus = 0 | 1

/** 架次档位（tiers）：规格档位决定基础价（含标准 10 分钟） */
export interface PriceTier {
  /** 字符串稳定主键（如 tier_001），启停/单项编辑按 id 定位 */
  id: string
  /** 架次数 */
  drones: number
  /** 基础价（元） */
  price: number
  /** 适用场景说明 */
  desc: string
  sort: number
  status: RuleStatus
}

/** 表演时长（durations）：在基础价上的时长加价；extra=0 表示含在基础价内 */
export interface PriceDuration {
  id: string
  /** 时长（分钟） */
  minutes: number
  /** 加价（元），0 表示含在基础价内 */
  extra: number
  /** 展示标签 */
  label: string
  sort: number
  status: RuleStatus
}

/** 附加服务（addons）：下单可多选叠加的增值服务 */
export interface PriceAddon {
  id: string
  /** 程序键（如 music） */
  key: string
  label: string
  /** 加价（元） */
  price: number
  sort: number
  status: RuleStatus
}

/** 预设图案（patterns）：本身不带价，归计价域统一维护 */
export interface PricePattern {
  id: string
  key: string
  label: string
  sort: number
  status: RuleStatus
}

/** 退款阶梯（refundRules）：按距表演小时数从高到低匹配第一条 */
export interface RefundRule {
  id: string
  /** 距表演小时数下限 */
  minHours: number
  /** 退款比例 0-1 */
  ratio: number
  /** 完整说明文案 */
  label: string
  sort: number
  status: RuleStatus
}

/** 定制收费（custom：对象而非数组） */
export interface CustomPricing {
  /** 空中文字定制价（默认 2000） */
  customTextPrice: number
  /** LOGO/图片定制价（默认 5000） */
  customLogoPrice: number
}

/** 五个规则数组分组的 key（顺序固定，即后端 PRICING_GROUPS） */
export type PricingGroup = 'tiers' | 'durations' | 'addons' | 'patterns' | 'refundRules'

/**
 * 五个规则组的「分组总闸」状态（管理端视图）。
 *
 * 与行级 status 是两层：组总闸管「H5 整组是否可选」，行 status 管组内单项；
 * 关组不改任何行 status，后端在 H5 装配处对关闭组直接短路为空数组。
 * 后端 fail-open：sys_config 缺键/非法值一律按 true，前端兜底默认也全开，保证旧后端无此字段时行为不变。
 */
export type PricingGroupEnabled = Record<PricingGroup, boolean>

/** 计价管理全量视图（管理端，含停用项；由 /pricing/groups + /pricing/custom 聚合而来） */
export interface PricingRules {
  tiers: PriceTier[]
  durations: PriceDuration[]
  addons: PriceAddon[]
  patterns: PricePattern[]
  refundRules: RefundRule[]
  custom: CustomPricing
  /** 五个规则组各自的总闸状态（定制收费是标量，无总闸） */
  groupEnabled: PricingGroupEnabled
}

/** 分组总闸 fail-open 默认值：全开（后端缺字段或老版本时使用） */
export const DEFAULT_GROUP_ENABLED: PricingGroupEnabled = {
  tiers: true,
  durations: true,
  addons: true,
  patterns: true,
  refundRules: true,
}

/** 五个分组的固定顺序与中文名（Tab 顺序、弹窗标题共用） */
export const PRICING_GROUPS: readonly PricingGroup[] = [
  'tiers',
  'durations',
  'addons',
  'patterns',
  'refundRules',
] as const

/** 分组元信息：中文名 + 一句话说明（Tab 下方灰字） */
export const PRICING_GROUP_META: Record<PricingGroup, { name: string; desc: string }> = {
  tiers: { name: '架次档位', desc: '规格档位，决定基础价（含标准 10 分钟）' },
  durations: { name: '表演时长', desc: '在基础价上的时长加价；加价 0 表示含在基础价内' },
  addons: { name: '附加服务', desc: '下单可多选叠加的增值服务' },
  patterns: { name: '预设图案', desc: '用户端下单可选的预设图案，不加价；停用后该项不可选' },
  refundRules: {
    name: '退款阶梯',
    desc: '已接单订单按「距表演小时数」从高到低匹配第一条；未接单可全额退款',
  },
}

/** 定制标量字段的范围约束（与服务端 PUT /pricing/custom 校验一致：0-100000） */
export const CUSTOM_PRICE_LIMITS = { min: 0, max: 100000 } as const
