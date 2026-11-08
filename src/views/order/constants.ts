// ─────────────────────────────────────────────────────────────
// 订单管理 · 页级常量
//
// 通用字典（订单状态、退款状态、场地类型、支付渠道、方案摘要等）都在
// @/utils/format，页面直接用；本文件只放「只有本页用」的配置。
// ─────────────────────────────────────────────────────────────
import { STATUS_MAP } from '@/utils/format'
import type { OptionItem } from '@/components/pro'

/**
 * 搜索栏「订单状态」下拉选项。
 * 顺序即 STATUS_MAP 的键序（待支付→…→已退款），与原型
 * `v-for="(v, k) in STATUS_MAP"` 完全一致；字典加状态这里自动跟随。
 */
export const ORDER_STATUS_OPTIONS: OptionItem[] = Object.entries(STATUS_MAP).map(([key, conf]) => ({
  label: conf.text,
  value: key,
}))
