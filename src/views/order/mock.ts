// ─────────────────────────────────────────────────────────────
// 订单管理 · 静态数据（UI 联调用）
//
// 造数逻辑整体移植 mock-server(:8099)：seed.js 的 22 条订单 spec、
// mkOrder 计价/时段/流水号规则与 server.js 四个管理端动作的写入语义，
// 保证接真接口前后列表、详情抽屉、时间轴所见完全一致。
// 所有日期相对「今天」动态生成（同咨询页思路），演示站放多久都不过期。
// TODO(server): 接 /admin/orders 系列接口后只替换 buildList/act* 内的数据调用。
// ─────────────────────────────────────────────────────────────
import type { CompleteFormData } from './types'
import type { OrderRow, OrderTimelineItem, OrderUser, OrderVenue } from './types'

/* ═══ 计价规则（biz/drone.js pricing 原值）═══ */
const TIERS: Record<number, number> = {
  100: 18800,
  200: 28800,
  300: 38800,
  500: 58800,
  1000: 98800,
}
const DURATION_EXTRA: Record<number, number> = { 10: 0, 15: 6000, 20: 12000 }
const CUSTOM_TEXT_PRICE = 2000
const CUSTOM_LOGO_PRICE = 5000
const ADDON_PRICES: Record<string, { label: string; price: number }> = {
  music: { label: '专属音乐编曲', price: 1000 },
  narration: { label: '现场旁白解说', price: 2000 },
  aerial: { label: '双机位航拍记录', price: 3000 },
  urgent: { label: '加急服务（48h 内安排）', price: 8000 },
}
const PAY_EXPIRE_MINUTES = 15

/* ═══ 用户与预设场地（USERS/VENUES 种子同款）═══ */
const USERS: OrderUser[] = [
  { id: 'u1001', nickname: '追风的李先生', phone: '138****6601' },
  { id: 'u1002', nickname: '甜甜圈小姐', phone: '137****2209' },
  { id: 'u1003', nickname: '星辰大海', phone: '139****8832' },
  { id: 'u1004', nickname: 'Ann', phone: '186****3315' },
  { id: 'u1005', nickname: '老王不老王', phone: '150****7742' },
  { id: 'u1006', nickname: '一颗奶糖', phone: '159****1180' },
]

const VENUES: OrderVenue[] = [
  {
    id: 'v1',
    name: '滨江世纪广场',
    address: '杭州市滨江区江南大道 100 号',
    lng: 120.212,
    lat: 30.208,
  },
  {
    id: 'v2',
    name: '奥体中心体育场',
    address: '杭州市萧山区博奥路 588 号',
    lng: 120.235,
    lat: 30.231,
  },
  {
    id: 'v3',
    name: '西湖文化广场',
    address: '杭州市拱墅区环城北路 47 号',
    lng: 120.165,
    lat: 30.277,
  },
  {
    id: 'v4',
    name: '钱江新城城市阳台',
    address: '杭州市上城区解放东路 58 号',
    lng: 120.214,
    lat: 30.246,
  },
  {
    id: 'v5',
    name: '未来科技城中央公园',
    address: '杭州市余杭区文一西路 998 号',
    lng: 119.998,
    lat: 30.279,
  },
]

/** 预设场地下标 → 订单 venue 结构（mock-server 里 spec 直接引用 VENUES[i]） */
function presetVenue(i: number): OrderVenue {
  return { ...VENUES[i], type: 'preset' }
}

/* ═══ 造数工具（mkOrder 同款）═══ */
const pad = (n: number): string => String(n).padStart(2, '0')

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

/** 距今 n 天的本地时刻（表演日期未来为负 n） */
function d(n: number): Date {
  return addDays(new Date(), -n)
}

function iso(n: number): string {
  return d(n).toISOString()
}

/** 时段即整点区间（timeSlots 已是 "19:00-20:00" 形态，原样透传） */

export interface SeedSpec {
  userId: string
  /** 原始规格名：REFUNDED_REJECT / CANCELLED_TIMEOUT 会映射到真实状态 */
  status: string
  droneCount: number
  duration: number
  patternPreset?: string[]
  customText?: string
  customLogo?: string
  addons?: string[]
  occasion?: string
  performInDays: number
  timeSlot: string
  venue: OrderVenue
  contact: { name: string; phone: string }
  createdDaysAgo: number
  review?: { stars: number; content: string }
  refund?: { reason: string; ratio: number }
  refundApproved?: { reason: string; ratio: number }
  rejectReason?: string
  cancelReason?: string
}

/* ═══ 22 条订单规格（seed.js specs 逐条搬运，覆盖全部可演示状态）═══ */
const SPECS: SeedSpec[] = [
  // 进行中/待接单（未来日期）
  {
    userId: 'u1001',
    status: 'PENDING_ACCEPT',
    droneCount: 300,
    duration: 15,
    customText: '嫁给我吧',
    addons: ['music', 'aerial'],
    occasion: '求婚仪式',
    performInDays: 9,
    timeSlot: '20:00-21:00',
    venue: presetVenue(0),
    contact: { name: '李先生', phone: '13866668801' },
    createdDaysAgo: 1,
  },
  {
    userId: 'u1002',
    status: 'PENDING_ACCEPT',
    droneCount: 100,
    duration: 10,
    patternPreset: ['heart', 'star'],
    addons: [],
    occasion: '生日惊喜',
    performInDays: 5,
    timeSlot: '19:00-20:00',
    venue: {
      id: 'vm1',
      type: 'manual',
      name: '幸福里小区中心广场',
      address: '杭州市西湖区文三路 200 号幸福里小区',
      lng: 120.13,
      lat: 30.28,
    },
    contact: { name: '甜甜', phone: '13722229909' },
    createdDaysAgo: 1,
  },
  {
    userId: 'u1003',
    status: 'PENDING_ACCEPT',
    droneCount: 500,
    duration: 20,
    customText: '星耀科技十周年',
    customLogo: 'company-logo.png',
    addons: ['music', 'narration', 'aerial'],
    occasion: '企业周年庆',
    performInDays: 15,
    timeSlot: '20:00-21:00',
    venue: presetVenue(1),
    contact: { name: '张总', phone: '13988880032' },
    createdDaysAgo: 2,
  },
  {
    userId: 'u1004',
    status: 'PENDING_ACCEPT',
    droneCount: 200,
    duration: 15,
    customText: 'Happy Anniversary',
    addons: ['music'],
    occasion: '结婚纪念',
    performInDays: 6,
    timeSlot: '21:00-22:00',
    venue: {
      id: 'vm2',
      type: 'map',
      name: '钱塘江大桥观景平台',
      address: '杭州市西湖区之江路 16 号',
      lng: 120.142,
      lat: 30.201,
    },
    contact: { name: 'Ann', phone: '18633331115' },
    createdDaysAgo: 0,
  },

  // 已接单（含距表演不同天数以演示阶梯退款）
  {
    userId: 'u1005',
    status: 'ACCEPTED',
    droneCount: 300,
    duration: 15,
    customText: '开业大吉',
    addons: ['narration'],
    occasion: '开业庆典',
    performInDays: 10,
    timeSlot: '19:00-20:00',
    venue: presetVenue(3),
    contact: { name: '王老板', phone: '15077774442' },
    createdDaysAgo: 3,
  },
  {
    userId: 'u1006',
    status: 'ACCEPTED',
    droneCount: 100,
    duration: 10,
    patternPreset: ['rose'],
    customText: '生日快乐',
    addons: [],
    occasion: '生日派对',
    performInDays: 5,
    timeSlot: '20:00-21:00',
    venue: {
      id: 'vm3',
      type: 'manual',
      name: '天空之城露台餐厅',
      address: '杭州市拱墅区莫干山路 972 号',
      lng: 120.13,
      lat: 30.31,
    },
    contact: { name: '糖糖', phone: '15911118880' },
    createdDaysAgo: 4,
  },
  {
    userId: 'u1001',
    status: 'ACCEPTED',
    droneCount: 200,
    duration: 10,
    addons: ['urgent', 'music'],
    occasion: '告白惊喜',
    performInDays: 2,
    timeSlot: '20:00-21:00',
    venue: presetVenue(2),
    contact: { name: '李先生', phone: '13866668801' },
    createdDaysAgo: 5,
  },
  {
    userId: 'u1003',
    status: 'ACCEPTED',
    droneCount: 1000,
    duration: 20,
    customText: '城市之光',
    customLogo: 'city-logo.png',
    addons: ['music', 'narration', 'aerial'],
    occasion: '城市灯光节',
    performInDays: 0,
    timeSlot: '19:00-20:00',
    venue: presetVenue(1),
    contact: { name: '张总', phone: '13988880032' },
    createdDaysAgo: 6,
  },

  // 执行中（今天）
  {
    userId: 'u1002',
    status: 'IN_SERVICE',
    droneCount: 300,
    duration: 15,
    customText: '新婚快乐',
    addons: ['music', 'aerial'],
    occasion: '婚礼庆典',
    performInDays: 0,
    timeSlot: '19:00-20:00',
    venue: presetVenue(4),
    contact: { name: '甜甜', phone: '13722229909' },
    createdDaysAgo: 7,
  },

  // 已完成（过去日期）
  {
    userId: 'u1004',
    status: 'COMPLETED',
    droneCount: 200,
    duration: 15,
    patternPreset: ['ring', 'heart'],
    customText: 'Marry Me',
    addons: ['music'],
    occasion: '求婚仪式',
    performInDays: -2,
    timeSlot: '20:00-21:00',
    venue: presetVenue(0),
    contact: { name: 'Ann', phone: '18633331115' },
    createdDaysAgo: 10,
  },
  {
    userId: 'u1005',
    status: 'COMPLETED',
    droneCount: 500,
    duration: 20,
    customText: '品牌之夜',
    customLogo: 'brand.png',
    addons: ['music', 'narration'],
    occasion: '品牌发布',
    performInDays: -5,
    timeSlot: '20:00-21:00',
    venue: presetVenue(1),
    contact: { name: '王老板', phone: '15077774442' },
    createdDaysAgo: 12,
  },
  {
    userId: 'u1006',
    status: 'COMPLETED',
    droneCount: 100,
    duration: 10,
    patternPreset: ['star'],
    addons: [],
    occasion: '毕业纪念',
    performInDays: -8,
    timeSlot: '19:00-20:00',
    venue: {
      id: 'vm4',
      type: 'manual',
      name: '大学城中心草坪',
      address: '杭州市西湖区留和路 288 号',
      lng: 120.03,
      lat: 30.22,
    },
    contact: { name: '糖糖', phone: '15911118880' },
    createdDaysAgo: 15,
  },

  // 已评价
  {
    userId: 'u1001',
    status: 'REVIEWED',
    droneCount: 300,
    duration: 15,
    customText: '宝宝满月啦',
    addons: ['music', 'aerial'],
    occasion: '满月宴',
    performInDays: -12,
    timeSlot: '19:00-20:00',
    venue: presetVenue(3),
    contact: { name: '李先生', phone: '13866668801' },
    createdDaysAgo: 20,
    review: {
      stars: 5,
      content: '效果太震撼了！300 架无人机组成的图案非常清晰，家人都很感动，航拍视频也很棒。',
    },
  },
  {
    userId: 'u1002',
    status: 'REVIEWED',
    droneCount: 100,
    duration: 10,
    patternPreset: ['heart', 'ring'],
    addons: [],
    occasion: '周年纪念',
    performInDays: -18,
    timeSlot: '21:00-22:00',
    venue: {
      id: 'vm5',
      type: 'map',
      name: '武林广场',
      address: '杭州市拱墅区体育场路 208 号',
      lng: 120.167,
      lat: 30.273,
    },
    contact: { name: '甜甜', phone: '13722229909' },
    createdDaysAgo: 25,
    review: { stars: 4, content: '整体很浪漫，就是当天有点风，图案稍微晃了一点，瑕不掩瑜。' },
  },

  // 退款中（用户申请，待审批）
  {
    userId: 'u1003',
    status: 'REFUNDING',
    droneCount: 200,
    duration: 15,
    customText: '新品大卖',
    addons: ['music'],
    occasion: '产品发布',
    performInDays: 8,
    timeSlot: '20:00-21:00',
    venue: presetVenue(4),
    contact: { name: '张总', phone: '13988880032' },
    createdDaysAgo: 2,
    refund: { reason: '公司活动时间调整，需要改期', ratio: 1 },
  },

  // 已退款（用户申请审批通过）
  {
    userId: 'u1004',
    status: 'REFUNDED',
    droneCount: 300,
    duration: 15,
    customText: '店庆狂欢',
    addons: ['narration'],
    occasion: '店庆活动',
    performInDays: 3,
    timeSlot: '19:00-20:00',
    venue: presetVenue(2),
    contact: { name: 'Ann', phone: '18633331115' },
    createdDaysAgo: 6,
    refundApproved: { reason: '场地审批未通过，无法举办', ratio: 0.9 },
  },

  // 已退款（商户拒单全额退）
  {
    userId: 'u1005',
    status: 'REFUNDED_REJECT',
    droneCount: 1000,
    duration: 20,
    customText: '跨年狂欢',
    addons: ['music', 'narration', 'aerial'],
    occasion: '跨年活动',
    performInDays: 4,
    timeSlot: '21:00-22:00',
    venue: {
      id: 'vm6',
      type: 'manual',
      name: '山顶观景平台',
      address: '杭州市西湖区北高峰山顶',
      lng: 120.1,
      lat: 30.25,
    },
    contact: { name: '王老板', phone: '15077774442' },
    createdDaysAgo: 3,
    rejectReason: '该场地位于航线管制区，无法执行飞行',
  },

  // 已取消（未支付）
  {
    userId: 'u1006',
    status: 'CANCELLED',
    droneCount: 100,
    duration: 10,
    addons: [],
    occasion: '表白',
    performInDays: 7,
    timeSlot: '20:00-21:00',
    venue: presetVenue(0),
    contact: { name: '糖糖', phone: '15911118880' },
    createdDaysAgo: 1,
    cancelReason: '用户主动取消',
  },
  {
    userId: 'u1002',
    status: 'CANCELLED_TIMEOUT',
    droneCount: 200,
    duration: 10,
    addons: ['music'],
    occasion: '生日',
    performInDays: 12,
    timeSlot: '19:00-20:00',
    venue: presetVenue(1),
    contact: { name: '甜甜', phone: '13722229909' },
    createdDaysAgo: 2,
  },

  // 满档演示：+3 天某时段占满 3 单（档期页联动素材）
  {
    userId: 'u1001',
    status: 'PENDING_ACCEPT',
    droneCount: 100,
    duration: 10,
    occasion: '告白',
    performInDays: 3,
    timeSlot: '19:00-20:00',
    venue: presetVenue(0),
    contact: { name: '李先生', phone: '13866668801' },
    createdDaysAgo: 1,
  },
  {
    userId: 'u1004',
    status: 'ACCEPTED',
    droneCount: 200,
    duration: 15,
    customText: '周年快乐',
    addons: ['music'],
    occasion: '店庆',
    performInDays: 3,
    timeSlot: '20:00-21:00',
    venue: presetVenue(2),
    contact: { name: 'Ann', phone: '18633331115' },
    createdDaysAgo: 2,
  },
  {
    userId: 'u1006',
    status: 'PENDING_ACCEPT',
    droneCount: 300,
    duration: 10,
    occasion: '开业',
    performInDays: 3,
    timeSlot: '21:00-22:00',
    venue: presetVenue(3),
    contact: { name: '糖糖', phone: '15911118880' },
    createdDaysAgo: 1,
  },
]

/* ═══ mkOrder：由规格生成完整订单对象（价格快照 + 状态时间轴）═══ */
function buildPrice(spec: SeedSpec): { detail: OrderRow['priceDetail']; total: number } {
  const detail: NonNullable<OrderRow['priceDetail']> = [
    { label: `${spec.droneCount} 架基础价（含 10 分钟）`, amount: TIERS[spec.droneCount] ?? 0 },
  ]
  const extra = DURATION_EXTRA[spec.duration] ?? 0
  if (extra > 0) detail.push({ label: `时长 ${spec.duration} 分钟加价`, amount: extra })
  if (spec.customText)
    detail.push({ label: `定制文字「${spec.customText}」`, amount: CUSTOM_TEXT_PRICE })
  if (spec.customLogo) detail.push({ label: 'LOGO/图片定制', amount: CUSTOM_LOGO_PRICE })
  for (const k of spec.addons ?? []) {
    const a = ADDON_PRICES[k]
    if (a) detail.push({ label: a.label, amount: a.price })
  }
  return { detail, total: detail.reduce((s, i) => s + i.amount, 0) }
}

/** 规格名 → 订单真实状态（REFUNDED_REJECT 也是已退款；超时取消并入已取消） */
function realStatusOf(status: string): string {
  if (status.startsWith('CANCELLED')) return 'CANCELLED'
  return status === 'REFUNDED_REJECT' ? 'REFUNDED' : status
}

function mkOrder(seq: number, spec: SeedSpec): OrderRow {
  const now = new Date()
  const created = d(spec.createdDaysAgo || 0)
  created.setHours(10 + (seq % 8), (seq * 17) % 60, 0, 0)
  const performDate = fmtDate(addDays(now, spec.performInDays))
  const { detail, total } = buildPrice(spec)
  const id = `D${fmtDate(created).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`
  const status = realStatusOf(spec.status)
  // 未支付分支：待支付与两种取消都没有支付信息（与 seed.js paid 判定同口径）
  const paid = !['PENDING_PAY', 'CANCELLED', 'CANCELLED_TIMEOUT'].includes(spec.status)
  const o: OrderRow = {
    id,
    userId: spec.userId,
    status,
    droneCount: spec.droneCount,
    duration: spec.duration,
    patternPreset: spec.patternPreset ?? ['heart'],
    customText: spec.customText ?? '',
    customLogo: spec.customLogo ?? '',
    addons: spec.addons ?? [],
    occasion: spec.occasion ?? '',
    performDate,
    timeSlot: spec.timeSlot,
    venue: spec.venue,
    contact: spec.contact,
    priceDetail: detail,
    totalAmount: total,
    payChannel: paid ? (seq % 2 ? 'WECHAT' : 'ALIPAY') : '',
    payTradeNo: paid
      ? `${seq % 2 ? 'WX' : 'ALI'}${fmtDate(created).replace(/-/g, '')}${String(100000 + seq)}`
      : '',
    paidAt: paid ? new Date(created.getTime() + 5 * 60_000).toISOString() : '',
    acceptedBy: '',
    acceptedAt: '',
    startedAt: '',
    completedAt: '',
    media: { photos: [], videos: [] },
    review: null,
    refund: null,
    cancelReason: '',
    timeline: [{ time: created.toISOString(), text: '提交订单' }],
    createdAt: created.toISOString(),
    expireAt: new Date(created.getTime() + PAY_EXPIRE_MINUTES * 60_000).toISOString(),
  }
  const push = (time: string | undefined, text: string): void => {
    ;(o.timeline as OrderTimelineItem[]).push({ time, text })
  }
  if (paid) {
    push(o.paidAt, `支付成功（${o.payChannel === 'WECHAT' ? '微信支付' : '支付宝'}）`)
  }
  if (['ACCEPTED', 'IN_SERVICE', 'COMPLETED', 'REVIEWED'].includes(status)) {
    o.acceptedBy = 'operator'
    o.acceptedAt = new Date(created.getTime() + 2 * 3_600_000).toISOString()
    push(o.acceptedAt, '操作员已接单，表演筹备中')
  }
  if (['IN_SERVICE', 'COMPLETED', 'REVIEWED'].includes(status)) {
    o.startedAt = `${performDate}T${o.timeSlot!.slice(0, 5)}:00+08:00`
    push(o.startedAt, '表演开始执行')
  }
  if (['COMPLETED', 'REVIEWED'].includes(status)) {
    o.completedAt = `${performDate}T${o.timeSlot!.slice(0, 2)}:40:00+08:00`
    o.media = {
      photos: [1, 2, 3, 4].map((i) => `/api/media/photo/${id}-${i}`),
      videos: [`/api/media/video/${id}-1`],
    }
    push(o.completedAt, '表演完成，现场照片已回传')
  }

  /* ── 附加状态修饰（seed.js 同款条件）── */
  if (spec.review) {
    o.review = { ...spec.review, createdAt: iso(-(spec.performInDays + 1)) }
    push(o.review.createdAt!, '用户已评价')
  }
  if (spec.refund) {
    o.refund = {
      reason: spec.refund.reason,
      ratio: spec.refund.ratio,
      applyAmount: Math.round(total * spec.refund.ratio),
      status: 'PENDING',
      prevStatus: 'PENDING_ACCEPT',
      auditBy: '',
      auditNote: '',
      refundAmount: 0,
      refundNo: '',
      createdAt: iso(0),
      auditedAt: '',
    }
    push(o.refund.createdAt!, `用户申请退款：${spec.refund.reason}`)
  }
  if (spec.refundApproved) {
    const { reason, ratio } = spec.refundApproved
    o.acceptedBy = 'operator'
    o.acceptedAt = new Date(created.getTime() + 2 * 3_600_000).toISOString()
    const amt = Math.round(total * ratio)
    o.refund = {
      reason,
      ratio,
      applyAmount: amt,
      status: 'APPROVED',
      prevStatus: 'ACCEPTED',
      auditBy: 'admin',
      auditNote: '同意退款',
      refundAmount: amt,
      refundNo: `R${id.slice(1)}`,
      createdAt: iso(2),
      auditedAt: iso(1),
    }
    push(o.refund.createdAt, `用户申请退款：${reason}`)
    push(o.refund.auditedAt, `退款审批通过，退款 ¥${amt}`)
  }
  if (spec.rejectReason) {
    o.refund = {
      reason: `商户拒单：${spec.rejectReason}`,
      ratio: 1,
      applyAmount: total,
      status: 'APPROVED',
      prevStatus: 'PENDING_ACCEPT',
      auditBy: 'operator',
      auditNote: spec.rejectReason,
      refundAmount: total,
      refundNo: `R${id.slice(1)}`,
      createdAt: iso(1),
      auditedAt: iso(1),
    }
    push(o.refund.auditedAt, `商户拒单，已全额退款：${spec.rejectReason}`)
  }
  if (spec.status === 'CANCELLED') {
    o.cancelReason = spec.cancelReason || '用户主动取消'
    push(iso(0), `订单取消（${o.cancelReason}）`)
  }
  if (spec.status === 'CANCELLED_TIMEOUT') {
    o.cancelReason = '支付超时'
    push(o.expireAt!, '支付超时，订单自动取消')
  }
  return o
}

/** 列表接口内嵌用户（server.js withUser 等价） */
function withUser(o: OrderRow): OrderRow {
  const u = USERS.find((x) => x.id === o.userId)
  return { ...o, user: u ? { ...u } : undefined }
}

/** 全量订单（createdAt 倒序，与 GET /admin/orders 排序一致），user 已内嵌 */
export const mockOrders: OrderRow[] = SPECS.map((s, i) => withUser(mkOrder(i + 1, s))).sort(
  (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
)

/** 静态动作后的可变副本（接单/拒单等直接改内存，刷新页面即回滚） */
export const orderStore: { rows: OrderRow[] } = {
  rows: JSON.parse(JSON.stringify(mockOrders)) as OrderRow[],
}

/* ═══ 查询（等价 GET /admin/orders?keyword=&status=&dateFrom=&dateTo=）═══ */
export interface OrderQuery {
  keyword?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function queryOrders(q: OrderQuery): OrderRow[] {
  let list = orderStore.rows
  if (q.status) list = list.filter((o) => o.status === q.status)
  const kw = (q.keyword ?? '').trim()
  if (kw) {
    list = list.filter(
      (o) =>
        o.id.includes(kw) ||
        (o.contact?.phone ?? '').includes(kw) ||
        (o.user?.nickname ?? '').includes(kw),
    )
  }
  if (q.dateFrom) {
    const from = q.dateFrom
    list = list.filter((o) => (o.performDate ?? '') >= from)
  }
  if (q.dateTo) {
    const to = q.dateTo
    list = list.filter((o) => (o.performDate ?? '') <= to)
  }
  return list
}

/* ═══ 详情合并（等价 GET /admin/orders/:id 的 data.order：返回独立副本）═══ */
export function buildDetail(row: OrderRow): OrderRow {
  const cur = orderStore.rows.find((o) => o.id === row.id) ?? row
  return JSON.parse(JSON.stringify(cur)) as OrderRow
}

/* ═══ 媒体占位图（mock-server /api/media/photo 同款 SVG，离线 data URI）═══ */
const photoCache = new Map<string, string>()

/** 种子串（/api/media/photo/xxx）→ 内联 SVG data URI；同 seed 颜色稳定 */
export function photoUrl(seed: string): string {
  const cached = photoCache.get(seed)
  if (cached) return cached
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360
  const dots = Array.from({ length: 60 })
    .map(
      (_, i) =>
        `<circle cx="${(i * 97) % 640}" cy="${(i * 53) % 400}" r="${1 + (i % 3)}" fill="hsla(${h},80%,80%,0.7)"/>`,
    )
    .join('')
  const safeSeed = seed.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},55%,22%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360},60%,10%)"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/>${dots}<g fill="none" stroke="hsl(${h},85%,65%)" stroke-width="2"><circle cx="320" cy="180" r="60" opacity="0.9"/><circle cx="320" cy="180" r="90" opacity="0.4"/></g><text x="320" y="188" text-anchor="middle" font-size="26" fill="#fff" font-family="sans-serif">✦ 表演现场 ✦</text><text x="320" y="360" text-anchor="middle" font-size="14" fill="rgba(255,255,255,.65)" font-family="sans-serif">${safeSeed}</text></svg>`
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  photoCache.set(seed, uri)
  return uri
}

/* ═══ 静态动作（真接口为 POST /admin/orders/:id/{accept,reject,start,complete}）═══ */

function pushTimeline(row: OrderRow, text: string): void {
  row.timeline = row.timeline ?? []
  row.timeline.push({ time: new Date().toISOString(), text })
}

/** 接单：PENDING_ACCEPT → ACCEPTED */
export function actAccept(row: OrderRow): void {
  const at = new Date().toISOString()
  row.status = 'ACCEPTED'
  row.acceptedBy = 'operator'
  row.acceptedAt = at
  pushTimeline(row, '操作员已接单，表演筹备中')
}

/** 拒单：PENDING_ACCEPT → REFUNDED，按 100% 自动全额退款（server reject 同款结构） */
export function actReject(row: OrderRow, reason: string): void {
  const at = new Date().toISOString()
  row.refund = {
    reason: `商户拒单：${reason}`,
    ratio: 1,
    applyAmount: row.totalAmount,
    status: 'APPROVED',
    prevStatus: 'PENDING_ACCEPT',
    auditBy: 'operator',
    auditNote: reason,
    refundAmount: row.totalAmount,
    refundNo: `R${row.id.slice(1)}`,
    createdAt: at,
    auditedAt: at,
  }
  row.status = 'REFUNDED'
  pushTimeline(row, `商户拒单：${reason}，已全额退款 ¥${row.totalAmount}`)
}

/** 开始执行：ACCEPTED → IN_SERVICE */
export function actStart(row: OrderRow): void {
  const at = new Date().toISOString()
  row.status = 'IN_SERVICE'
  row.startedAt = at
  pushTimeline(row, '操作员确认表演开始执行')
}

/** 完成订单：IN_SERVICE → COMPLETED，回传现场照片/视频 */
export function actComplete(row: OrderRow, payload: CompleteFormData): void {
  const at = new Date().toISOString()
  row.status = 'COMPLETED'
  row.completedAt = at
  const photos = payload.photos.length ? payload.photos : autoDemoPhotos(row.id)
  const videos = payload.videos.length ? payload.videos : [`/api/media/video/${row.id}-1`]
  row.media = { photos, videos }
  pushTimeline(row, `表演完成，回传现场照片 ${photos.length} 张`)
}

/** 「自动生成演示照片」的默认回传（server complete 兜底同款） */
export function autoDemoPhotos(orderId: string): string[] {
  return [1, 2, 3, 4].map((i) => `/api/media/photo/${orderId}-${i}`)
}
