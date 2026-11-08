// ─────────────────────────────────────────────────────────────
// 咨询受理 · 页级常量（状态页签 / 弹窗字段配置 / 文案助手）
//
// 通用字典（状态、内容模式、画面档位、运动方式、场地类型）在 @/utils/format；
// 本文件只放「只有本页用」的配置：页签顺序、合同六项必填的表单描述等。
// ─────────────────────────────────────────────────────────────
import type { FormFieldConfig } from '@/components/pro'
import { CONSULT_STATUS_MAP, fmtMoney } from '@/utils/format'
import type { ConsultDispatch, MustFillItem } from './types'

/* ═══ 状态页签（顺序与契约 docs/consult-workflow.md 一致）═══ */
export const TABS = [
  { name: 'PENDING', label: '待接待' },
  { name: 'RECEIVED', label: '已接待' },
  { name: 'DISPATCHED', label: '已派单待确认' },
  { name: 'CONFIRMED', label: '已确认' },
  { name: 'REJECTED', label: '已驳回' },
  { name: 'ABANDONED', label: '已废弃' },
  { name: 'ALL', label: '全部' },
] as const

/** 六状态枚举（counts 键序、批量遍历用；ALL 不在其中） */
export const STATUS_KEYS = [
  'PENDING',
  'RECEIVED',
  'DISPATCHED',
  'CONFIRMED',
  'REJECTED',
  'ABANDONED',
] as const

/* ═══ 附加服务内容（咨询语境的措辞与订单 ADDON_LABELS 不同，独立一份）═══ */
export const CONSULT_ADDON_LABELS: Record<string, string> = {
  music: '专属音乐编曲',
  narration: '现场旁白解说',
  aerial: '双机位航拍记录',
  module: '选配模块（烟花 / 降落伞 / 孔明灯）',
  urgent: '加急服务',
}

/* ═══ 创建派单弹窗：六项必填的合同条款 ═══ */

/** 五项文本条款（rows>1 渲染 textarea；顺序与契约一致，insuranceAmount 是数字单独配） */
export const TEXT_TERMS = [
  {
    key: 'approvalOwner',
    label: '审批义务承担主体',
    rows: 2,
    placeholder: '例如：承飞方（乙方）负责空域申请与备案',
  },
  {
    key: 'approvalFailLiability',
    label: '审批失败责任划分',
    rows: 2,
    placeholder: '例如：乙方未按时取得批复 → 乙方全责退还已付费用',
  },
  {
    key: 'subcontractApproved',
    label: '转包是否经甲方书面同意',
    rows: 1,
    placeholder: '例如：是（甲方书面同意）；未经书面同意不得转包',
  },
  {
    key: 'depositNature',
    label: '签约节点是定金还是预付款',
    rows: 1,
    placeholder: '例如：预付款（未约定定金条款，不适用定金罚则）',
  },
  {
    key: 'scaleBasis',
    label: '计价与验收按投入规模还是峰值',
    rows: 2,
    placeholder: '例如：按投入规模（实际投入的机队数）计价与验收，峰值不作为验收口径',
  },
] as const

/** 六项必填的中文名（详情抽屉 mustFill 缺 label 时兜底，也用于派单表单 prop→label 映射） */
export const FALLBACK_TERM_LABELS: Record<string, string> = {
  approvalOwner: '审批义务承担主体',
  approvalFailLiability: '审批失败责任划分',
  subcontractApproved: '转包是否经甲方书面同意',
  depositNature: '签约节点是定金还是预付款',
  insuranceAmount: '责任保险保额',
  scaleBasis: '计价与验收按投入规模还是峰值',
}

/** 条款空值校验文案（原型同款：缺项即合同约定不明） */
export function termRequired(label: string): string {
  return `请填写「${label}」（缺项即合同约定不明）`
}

/** 把六项条款转成 ProForm 字段配置（prop 前缀 terms.，供嵌套 model 校验） */
export function dispatchTermFields(): FormFieldConfig[] {
  return TEXT_TERMS.map((t) => ({
    prop: `terms.${t.key}`,
    label: t.label,
    control: t.rows > 1 ? 'textarea' : 'input',
    // 与原型一致：不带 required 属性（Element 会画红星；原型条款标签无星但照样强校验）
    props: { rows: t.rows, maxlength: 100, showWordLimit: true },
    placeholder: t.placeholder,
    rules: [
      {
        validator: (_rule, value, callback) => {
          if (String(value ?? '').trim()) callback()
          else callback(new Error(termRequired(t.label)))
        },
        trigger: 'blur',
      },
    ],
  }))
}

/* ═══ 文案助手（列表/详情共用）═══ */

/** 报价区间文案：¥34,200 ~ ¥43,700（任一端缺失显示「—」） */
export function quoteText(quote?: { lo?: number; hi?: number } | null): string {
  const fmt = (n?: number) => (n === null || n === undefined ? '—' : fmtMoney(n))
  return `${fmt(quote?.lo)} ~ ${fmt(quote?.hi)}`
}

/** 派单正式报价区间文案（dispatch.quoteRange 二元组） */
export function dispatchQuoteText(d?: ConsultDispatch | null): string {
  const r = d?.quoteRange ?? []
  return `${fmtMoney(r[0])} ~ ${fmtMoney(r[1])}`
}

/** 派单状态文案 */
export function dispatchStatusText(status?: string): string {
  return { PENDING_CONFIRM: '待用户确认', CONFIRMED: '用户已确认' }[status ?? ''] ?? status ?? '—'
}

/** 附加内容文案：顿号连接，空返回「无」 */
export function consultAddonsText(addons?: string[] | null): string {
  if (!addons || !addons.length) return '无'
  return addons.map((k) => CONSULT_ADDON_LABELS[k] ?? k).join('、')
}

/** 空值填充：null/undefined/'' → 「未填写」；数字按金额格式化 */
export function fillValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '未填写'
  return typeof v === 'number' ? fmtMoney(v) : v
}

export interface FillRow {
  key: string
  label: string
  value: string
  hasValue: boolean
  note: string
}

/**
 * 详情抽屉「六项必填」展示行：后端派生 mustFill 优先；
 * 缺省时按 terms 兜底渲染，保证六项不漏（原型同款策略）。
 */
export function dispatchTermRows(d?: ConsultDispatch | null): FillRow[] {
  if (!d) return []
  const fromServer = Array.isArray(d.mustFill) && d.mustFill.length > 0
  if (fromServer) {
    return (d.mustFill as MustFillItem[]).map((m) => ({
      key: m.key,
      label: m.label || FALLBACK_TERM_LABELS[m.key] || m.key,
      value: fillValue(m.value),
      hasValue: m.value !== null && m.value !== undefined && m.value !== '',
      note: m.note || '',
    }))
  }
  return Object.keys(FALLBACK_TERM_LABELS).map((key) => {
    const raw = d.terms ? d.terms[key] : null
    return {
      key,
      label: FALLBACK_TERM_LABELS[key],
      value: fillValue(raw),
      hasValue: raw !== null && raw !== undefined && raw !== '',
      note: '',
    }
  })
}

/** 页签文案：状态名 + 计数（原型「待接待 3」同款） */
export function tabLabel(tabName: string, count: number): string {
  const conf = CONSULT_STATUS_MAP[tabName]
  const base = tabName === 'ALL' ? '全部' : (conf?.text ?? tabName)
  return `${base} ${count}`
}
