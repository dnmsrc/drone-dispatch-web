// ─────────────────────────────────────────────────────────────
// 通用格式化与业务字典（基线：drone-dispatch-prototype/admin/src/utils/format.js）
//
// 集中放置金额/时间格式化与各状态、标签字典，页面不得散落硬编码文案；
// 纯逻辑函数，单元测试见 src/utils/__tests__/format.test.ts。
// ─────────────────────────────────────────────────────────────

const pad = (n: number): string => String(n).padStart(2, '0')

/** 金额：¥xx,xxx（非法值按 0 处理，与原型行为一致） */
export function fmtMoney(n: number | string | null | undefined): string {
  return '¥' + (Number(n) || 0).toLocaleString('zh-CN')
}

/** 时间：YYYY-MM-DD HH:mm（本地时区；空值或非法时间返回「—」） */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 今天 YYYY-MM-DD（本地日期） */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** el-tag 的五种语义主题（原型中超出这五种颜色的状态用 color 自定义背景） */
export type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

export interface StatusConf {
  text: string
  /** 语义主题色（与 color 二选一，StatusTag 优先取 type） */
  type?: TagType
  /** 自定义背景色（若伊风格扩展色，如执行中紫 #8B5CF6） */
  color?: string
}

/** 订单状态字典（颜色规范：待支付橙/待接单红/已接单蓝/执行中紫/已完成绿/已评价青/已取消灰/退款中橙红/已退款深灰） */
export const STATUS_MAP: Record<string, StatusConf> = {
  PENDING_PAY: { text: '待支付', type: 'warning' },
  PENDING_ACCEPT: { text: '待接单', type: 'danger' },
  ACCEPTED: { text: '已接单·待执行', type: 'primary' },
  IN_SERVICE: { text: '执行中', color: '#8B5CF6' },
  COMPLETED: { text: '已完成', type: 'success' },
  REVIEWED: { text: '已评价', color: '#13C2C2' },
  CANCELLED: { text: '已取消', type: 'info' },
  REFUNDING: { text: '退款中', color: '#F2503F' },
  REFUNDED: { text: '已退款', color: '#4B5563' },
}

/** 退款审批状态字典 */
export const REFUND_STATUS_MAP: Record<string, StatusConf> = {
  PENDING: { text: '待审批', type: 'warning' },
  APPROVED: { text: '已通过', type: 'success' },
  REJECTED: { text: '已拒绝', type: 'danger' },
}

/** 附加服务字典 */
export const ADDON_LABELS: Record<string, string> = {
  music: '专属音乐编曲',
  narration: '现场旁白解说',
  aerial: '双机位航拍记录',
  urgent: '加急服务（48h 内安排）',
}

/** 预设图案字典 */
export const PATTERN_LABELS: Record<string, string> = {
  heart: '爱心',
  ring: '钻戒',
  star: '星辰',
  phoenix: '凤凰',
  rose: '玫瑰',
  moon: '月亮船',
}

/** 场地类型字典 */
export const VENUE_TYPE_LABELS: Record<string, string> = {
  preset: '预设场地',
  map: '地图选点',
  manual: '手动输入',
}

/** 支付渠道字典 */
export const PAY_CHANNEL_LABELS: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
}

/** 订单方案摘要：300架·15分钟·定制文字（订单对象取接口返回的原始结构） */
export function orderSummary(
  o:
    | {
        droneCount?: number
        duration?: number
        customText?: string
        customLogo?: string
      }
    | null
    | undefined,
): string {
  if (!o) return ''
  let content = '预设图案'
  if (o.customText && o.customLogo) content = '文字+LOGO定制'
  else if (o.customText) content = '定制文字'
  else if (o.customLogo) content = 'LOGO定制'
  return `${o.droneCount}架·${o.duration}分钟·${content}`
}

/** 附加服务文案：多个用顿号连接，空列表返回「无」 */
export function addonsText(addons: string[] | null | undefined): string {
  if (!addons || !addons.length) return '无'
  return addons.map((k) => ADDON_LABELS[k] ?? k).join('、')
}

/** 预设图案文案：多个用顿号连接，空列表返回「无」 */
export function patternsText(patterns: string[] | null | undefined): string {
  if (!patterns || !patterns.length) return '无'
  return patterns.map((k) => PATTERN_LABELS[k] ?? k).join('、')
}
