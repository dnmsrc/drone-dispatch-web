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

/** 订单状态字典（颜色规范：待支付橙/部分已付金橙/待接单红/已接单蓝/执行中紫/已完成绿/已评价青/已取消灰/退款中橙红/已退款深灰） */
export const STATUS_MAP: Record<string, StatusConf> = {
  PENDING_PAY: { text: '待支付', type: 'warning' },
  // v2 状态机新增：分期预付款已到、尾款未付（一次性全额支付跳过此态）
  PARTIALLY_PAID: { text: '部分已付', color: '#D97706' },
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

/** 支付渠道字典（在线：微信/支付宝；对公转账时渠道固定 OFFLINE） */
export const PAY_CHANNEL_LABELS: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
  OFFLINE: '对公转账',
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

/** 咨询单状态字典（与契约 docs/consult-workflow.md 一一对应：待接待红/已接待橙/已派单蓝/已确认绿/驳回废弃灰） */
export const CONSULT_STATUS_MAP: Record<string, StatusConf> = {
  PENDING: { text: '待接待', type: 'danger' },
  RECEIVED: { text: '已接待', type: 'warning' },
  DISPATCHED: { text: '已派单待确认', type: 'primary' },
  CONFIRMED: { text: '已确认', type: 'success' },
  REJECTED: { text: '已驳回', type: 'info' },
  ABANDONED: { text: '已废弃', type: 'info' },
}

/** 表演内容复杂度字典 */
export const CONTENT_MODE_LABELS: Record<string, string> = {
  template: '预设模板',
  deep: '深度定制',
  matrix: '多矩阵编排',
}

/** 画面数量档位字典（H5 问卷以 low/mid/high 提交） */
export const SCREEN_LABELS: Record<string, string> = {
  low: '≤3 个画面',
  mid: '4-8 个画面',
  high: '9 个以上画面',
}

/** 编队运动方式字典 */
export const MOTION_LABELS: Record<string, string> = {
  static: '静态编队',
  dynamic: '动态编队',
}

/** 场地副行文案：类型 · 地址（咨询/订单/退款列表的场地列通用），无有效信息返回「—」 */
export function venueSub(v: { type?: string; address?: string } | null | undefined): string {
  if (!v) return '—'
  const parts: string[] = []
  const typeText = VENUE_TYPE_LABELS[v.type ?? '']
  if (typeText) parts.push(typeText)
  if (v.address) parts.push(v.address)
  return parts.join(' · ') || '—'
}

/* ════════════════════════════════════════════════════════════
 * 合同与分期域（v2 数据模型新增：contracts / payment_schedule /
 * payments / company_bank_accounts / order_media / admin_users）
 * ════════════════════════════════════════════════════════════ */

/** 合同签署状态字典（contracts.sign_status：草稿灰/待签橙/已签绿/作废深灰/终止红/改期蓝） */
export const CONTRACT_SIGN_MAP: Record<string, StatusConf> = {
  DRAFT: { text: '草稿', type: 'info' },
  PENDING_SIGN: { text: '待签署', type: 'warning' },
  SIGNED: { text: '已签署', type: 'success' },
  VOID: { text: '已作废', color: '#4B5563' },
  TERMINATED: { text: '已终止', type: 'danger' },
  RESCHEDULED: { text: '已改期', type: 'primary' },
}

/** 合同终止/改期责任方字典（决定退款比例与是否扣费） */
export const CONTRACT_RESPONSIBILITY_MAP: Record<string, StatusConf> = {
  CUSTOMER: { text: '客户原因', type: 'warning' },
  VENDOR: { text: '我方原因', type: 'danger' },
}

/** 改期原因类型字典（与 H5 合同条款 key 对齐） */
export const RESCHEDULE_REASON_MAP: Record<string, StatusConf> = {
  WEATHER: { text: '天气/不可抗力', type: 'warning' },
  APPROVAL: { text: '空域审批', type: 'danger' },
  VENUE: { text: '场地原因', type: 'primary' },
  OTHER: { text: '其它', type: 'info' },
}

/** 合同付款计划期次状态字典（contract_payment_schedule.status） */
export const SCHEDULE_STATUS_MAP: Record<string, StatusConf> = {
  PENDING: { text: '待付', type: 'info' },
  PARTIAL: { text: '部分已付', type: 'warning' },
  PAID: { text: '已付', type: 'success' },
  OVERDUE: { text: '逾期', type: 'danger' },
}

/** 支付方式字典（payments.pay_method：在线支付 / 对公转账） */
export const PAY_METHOD_LABELS: Record<string, string> = {
  ONLINE: '在线支付',
  OFFLINE: '对公转账',
}

/** 支付流水状态字典（payments.status） */
export const PAYMENT_STATUS_MAP: Record<string, StatusConf> = {
  PENDING: { text: '待支付', type: 'warning' },
  SUCCESS: { text: '支付成功', type: 'success' },
  FAILED: { text: '支付失败', type: 'danger' },
  CLOSED: { text: '已关闭', type: 'info' },
}

/** 回传媒体类型字典（order_media.media_type） */
export const MEDIA_TYPE_LABELS: Record<string, string> = {
  PHOTO: '照片',
  VIDEO: '视频',
}

/** 后台账号角色字典（admin_users.role） */
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  OPERATOR: '操作员',
}

/** 甲方证件类型字典（contracts.party_a_id_type） */
export const ID_TYPE_LABELS: Record<string, string> = {
  ID_CARD: '身份证',
  UNIFORM_CODE: '统一社会信用代码',
}

/**
 * 比例 → 百分比文案（0.5 → 「50%」；非法值兜底「—」）。
 * 合同付款计划的 ratio、退款比例等 DECIMAL(5,4) 比例字段通用。
 */
export function fmtPercent(ratio: number | string | null | undefined): string {
  const n = Number(ratio)
  if (ratio === null || ratio === undefined || Number.isNaN(n)) return '—'
  // 去掉浮点尾数（0.30000000000000004 → 30），四舍五入到整数百分比
  return `${Math.round(n * 10000) / 100}%`
}

/** 仅取日期部分（ISO 串 → YYYY-MM-DD）；空值或非法值返回「—」 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
