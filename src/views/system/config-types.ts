// ─────────────────────────────────────────────────────────────
// 业务配置 · 接口契约类型（字段名与 mock-server 完全一致）
//
// 对应两个接口：
//   GET/PUT /admin/config     运营参数（可编辑，保存后 H5 实时生效）
//   GET      /config/pricing  计价规则总览（字典驱动，本页只读）
//   POST     /config/reset    重置演示数据（危险操作）
// 计价/退款规则在服务端由字典（drone_tier/duration/pattern/addon/time_slot/
// refund_rule）派生，静态页把同一份种子内聚到 ./mock 的只读数据里。
// TODO(server): 接真接口后本文件即响应类型来源，页面代码不改名。
// ─────────────────────────────────────────────────────────────
import type { SlotId } from '../schedule/types'

/** 运营参数（PUT /admin/config 提交体，GET 返回同结构的可编辑子集） */
export interface BizConfig {
  /** 默认可接单时段（整点区间 "19:00-20:00"，至少 1 段、最多 12 段） */
  defaultSlots: SlotId[]
  /** 预约窗口：用户最多可预约未来 N 天（7-365） */
  bookingWindowDays: number
  /** 支付时限：下单后 N 分钟未支付自动取消（1-120） */
  payExpireMinutes: number
  /** 空中文字定制加价（元，0-100000） */
  customTextPrice: number
  /** LOGO/图片定制加价（元，0-100000） */
  customLogoPrice: number
}

/** 架次档位（字典 drone_tier 派生） */
export interface PriceTier {
  /** 架次 */
  drones: number
  /** 基础价（元） */
  price: number
  /** 适用场景说明 */
  desc: string
}

/** 表演时长（字典 duration 派生） */
export interface PriceDuration {
  /** 时长（分钟） */
  minutes: number
  /** 在基础价上的加价（元），0 表示含在基础价内 */
  extra: number
  /** 展示标签 */
  label: string
}

/** 附加服务（字典 addon 派生） */
export interface PriceAddon {
  key: string
  label: string
  price: number
}

/** 预设图案（字典 pattern 派生，不加价） */
export interface PricePattern {
  key: string
  label: string
}

/** 计价规则总览（GET /config/pricing 的 priceRules） */
export interface PriceRules {
  tiers: PriceTier[]
  durations: PriceDuration[]
  customTextPrice: number
  customLogoPrice: number
  addons: PriceAddon[]
  patterns: PricePattern[]
  /** 演出时段（整点区间串） */
  timeSlots: string[]
  payExpireMinutes: number
}

/** 退款阶梯规则（字典 refund_rule 派生，按 minHours 降序） */
export interface RefundRule {
  /** 距表演小时数下限 */
  minHours: number
  /** 退款比例 0-1 */
  ratio: number
  /** 完整说明文案 */
  label: string
}
