// ─────────────────────────────────────────────────────────────
// 计价接口层 —— 对接后端 drone-dispatch-server PricingController（/api/pricing）
//
// 已对接接口（管理端，读接口登录即可、写接口仅 ADMIN，角色由 Service 层闸门控制）：
//   GET  /pricing/groups                 全部分组视图（含停用项，每组带分组总闸 enabled）
//   GET  /pricing/groups/:group          单个分组视图（本页聚合用不到，预留按需拉取）
//   PUT  /pricing/rules/:id              单项编辑 / 启停（字段为 null 保留原值；开关仅传 status 即可）
//   PUT  /pricing/groups/:group/enabled  分组总闸开/关（只改 sys_config 布尔，不改组内各行 status）
//   GET  /pricing/custom                 读两个定制标量（定制文字价 / LOGO 价）
//   PUT  /pricing/custom                 保存定制标量（传哪个改哪个，范围 0-100000）
// 另：PUT /pricing/groups/:group 整组重建，本页只有单项编辑/启停，暂不消费，故不封装。
// H5 只读的 /pricing/group-status、/pricing/public、/pricing/refund-rules 属 H5 工程，不在本管理后台封装。
//
// 后端 VO 是「分组 + 通用行」结构（PricingRuleVO 的 itemKey/itemLabel/itemValue/extra），
// 与前端视图类型（PriceTier.drones/price/desc 等领域字段）不同，差异统一在本文件适配收口，
// 页面继续消费 src/views/pricing/types.ts 的类型，不改名。
//
// 关键映射：
//   1) 分组名：后端单数 tier/duration/addon/pattern/refund ↔ 前端复数 tiers/durations/.../refundRules；
//   2) 通用行按分组映射到领域字段（见 toTierRow 等 5 个适配函数）：
//      tier    itemKey→drones、itemValue→price、extra→desc（itemLabel 仅展示，不进编辑模型）
//      duration itemKey→minutes、itemValue→extra、itemLabel→label
//      addon   itemKey→key、itemLabel→label、itemValue→price
//      pattern itemKey→key、itemLabel→label（不带价，无 itemValue 字段）
//      refund  itemKey→minHours、itemValue→ratio、itemLabel→label
//   3) id：后端自增 BIGINT(number)，前端按 string 使用（同 venue/dict 适配）；
//   4) itemValue DECIMAL 序列化为 number（理论可空），Number()||0 兜底，保证 toFixed/百分比不炸；
//      itemKey 里的整数（架次/分钟/小时）Number 归一；
//   5) 行 status 仅 0 为停用，其余（含异常值）按启用 1 兜底；
//      分组总闸 enabled 仅明确 false 为关，字段缺失（老版本后端）fail-open 按全开兜底；
//   6) 反向（编辑/启停）只下发当前分组实际编辑的字段，未编辑字段不带键 → 后端按 null 保留原值。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'
import {
  DEFAULT_GROUP_ENABLED,
  type CustomPricing,
  type PriceAddon,
  type PriceDuration,
  type PricePattern,
  type PriceTier,
  type PricingGroup,
  type PricingGroupEnabled,
  type PricingRules,
  type RefundRule,
  type RuleStatus,
} from '@/views/pricing/types'

/* ═══ 后端 VO 的 JSON 形态（字段名与后端 record 一一对应，勿改名）═══ */

/** 后端计价规则出参（PricingRuleVO，管理端视图含停用项） */
export interface PricingRuleDto {
  /** 自增主键 */
  id: number
  /** 分组码：tier/duration/addon/pattern/refund */
  groupCode: string
  /** 规则键：整数分组里是架次/分钟/小时的数字字符串，addon/pattern 里是英文键 */
  itemKey: string
  /** 展示文案 */
  itemLabel: string
  /** DECIMAL(14,4) 序列化值，理论可空，适配层兜底为 0 */
  itemValue: number | null
  /** 附加说明：tier 组承载「适用场景」，其余组多为空串 */
  extra: string
  /** 排序号（升序） */
  sort: number
  /** 1 启用 / 0 停用 */
  status: number
}

/**
 * 后端整组视图（PricingGroupVO：groupCode / enabled / items）。
 * enabled 是分组总闸（sys_config 布尔，fail-open 缺省 true）；老版本后端可能不下发该字段，
 * 适配层按 true 兜底，保证前端在后端未升级时行为不变。
 */
export interface PricingGroupDto {
  groupCode: string
  /** 分组总闸：false 时该组在 H5 整组不下发，但管理端 items 仍全量返回 */
  enabled?: boolean
  items: PricingRuleDto[]
}

/** 后端定制收费出参（CustomFeeVO，存于 sys_config） */
export interface CustomFeeDto {
  customTextPrice: number | null
  customLogoPrice: number | null
}

/** 单项编辑 / 启停请求体（PricingRuleUpdateRequest，所有字段可选，未传即 null → 后端保留原值） */
export interface PricingRuleUpdatePayload {
  itemKey?: string
  itemLabel?: string
  itemValue?: number
  extra?: string
  sort?: number
  status?: RuleStatus
}

/* ═══ 分组名映射（后端单数 ↔ 前端复数）═══ */

/** 前端视图分组 → 后端 groupCode */
const VIEW_TO_BACKEND_GROUP: Record<PricingGroup, string> = {
  tiers: 'tier',
  durations: 'duration',
  addons: 'addon',
  patterns: 'pattern',
  refundRules: 'refund',
}

/** 后端 groupCode → 前端视图分组（非法/未知分组返回 null，由聚合层忽略） */
const BACKEND_TO_VIEW_GROUP: Record<string, PricingGroup | null> = {
  tier: 'tiers',
  duration: 'durations',
  addon: 'addons',
  pattern: 'patterns',
  refund: 'refundRules',
}

/* ═══ DTO → 视图类型（纯函数，单测覆盖各分组映射与空值兜底）═══ */

/** status 归一：仅明确 0 为停用，其余（1/undefined/异常值）一律按启用兜底 */
function toRuleStatus(status: number | undefined): RuleStatus {
  return status === 0 ? 0 : 1
}

/** 架次档位：itemKey=架次数、itemValue=基础价、extra=适用场景 */
export function toTierRow(dto: PricingRuleDto): PriceTier {
  return {
    id: String(dto.id),
    drones: Number(dto.itemKey) || 0,
    price: Number(dto.itemValue) || 0,
    desc: dto.extra ?? '',
    sort: dto.sort,
    status: toRuleStatus(dto.status),
  }
}

/** 表演时长：itemKey=分钟数、itemValue=加价、itemLabel=展示文案 */
export function toDurationRow(dto: PricingRuleDto): PriceDuration {
  return {
    id: String(dto.id),
    minutes: Number(dto.itemKey) || 0,
    extra: Number(dto.itemValue) || 0,
    label: dto.itemLabel ?? '',
    sort: dto.sort,
    status: toRuleStatus(dto.status),
  }
}

/** 附加服务：itemKey=英文键、itemLabel=名称、itemValue=加价 */
export function toAddonRow(dto: PricingRuleDto): PriceAddon {
  return {
    id: String(dto.id),
    key: dto.itemKey,
    label: dto.itemLabel ?? '',
    price: Number(dto.itemValue) || 0,
    sort: dto.sort,
    status: toRuleStatus(dto.status),
  }
}

/** 预设图案（不加价）：itemKey=英文键、itemLabel=名称 */
export function toPatternRow(dto: PricingRuleDto): PricePattern {
  return {
    id: String(dto.id),
    key: dto.itemKey,
    label: dto.itemLabel ?? '',
    sort: dto.sort,
    status: toRuleStatus(dto.status),
  }
}

/** 退款阶梯：itemKey=距服务小时下限、itemValue=退款比例(0-1)、itemLabel=说明文案 */
export function toRefundRow(dto: PricingRuleDto): RefundRule {
  return {
    id: String(dto.id),
    minHours: Number(dto.itemKey) || 0,
    ratio: Number(dto.itemValue) || 0,
    label: dto.itemLabel ?? '',
    sort: dto.sort,
    status: toRuleStatus(dto.status),
  }
}

/** 后端分组数组 → 前端单组视图行（按 groupCode 选对应领域适配函数；未知分组返回空数组） */
export function toGroupRows(
  groupCode: string,
  items: PricingRuleDto[],
): PricingRules[PricingGroup] {
  const list = items ?? []
  switch (groupCode) {
    case 'tier':
      return list.map(toTierRow)
    case 'duration':
      return list.map(toDurationRow)
    case 'addon':
      return list.map(toAddonRow)
    case 'pattern':
      return list.map(toPatternRow)
    case 'refund':
      return list.map(toRefundRow)
    default:
      return []
  }
}

/** 后端定制收费 VO → 前端 CustomPricing（DECIMAL 可空时兜底 0） */
export function toCustomPricing(dto: CustomFeeDto | null | undefined): CustomPricing {
  return {
    customTextPrice: Number(dto?.customTextPrice) || 0,
    customLogoPrice: Number(dto?.customLogoPrice) || 0,
  }
}

/* ═══ 视图编辑模型 → 后端请求体 ═══ */

/**
 * 单项编辑 / 启停 → PUT /pricing/rules/:id 请求体。
 *
 * 按分组把页面的领域字段翻译回通用行字段，只带当前分组会编辑的键：
 *   - 启停场景入参只有 status，请求体即 { status }，符合后端「开关仅传 status」约定；
 *   - 编辑场景未改动的字段不带键（序列化为缺省而非 null），后端按 null 保留原值，
 *     例如改 tier 价格不会误清 itemLabel，改 duration 文案不会误改 itemKey。
 * edit 为 Record 形式，承接页面弹窗里动态字段（el-input-number 的值统一在页面侧 Number 归一）。
 */
export function toRuleUpdatePayload(
  group: PricingGroup,
  edit: Record<string, unknown>,
): PricingRuleUpdatePayload {
  const payload: PricingRuleUpdatePayload = {}
  if (edit.status !== undefined) payload.status = edit.status ? 1 : 0

  switch (group) {
    case 'tiers':
      // 架次/基础价/适用场景；itemLabel 由后端按 key 自行维护，不在编辑模型内
      if (edit.drones !== undefined) payload.itemKey = String(Number(edit.drones))
      if (edit.price !== undefined) payload.itemValue = Number(edit.price)
      if (edit.desc !== undefined) payload.extra = String(edit.desc)
      break
    case 'durations':
      if (edit.minutes !== undefined) payload.itemKey = String(Number(edit.minutes))
      if (edit.label !== undefined) payload.itemLabel = String(edit.label)
      if (edit.extra !== undefined) payload.itemValue = Number(edit.extra)
      break
    case 'addons':
      if (edit.key !== undefined) payload.itemKey = String(edit.key)
      if (edit.label !== undefined) payload.itemLabel = String(edit.label)
      if (edit.price !== undefined) payload.itemValue = Number(edit.price)
      break
    case 'patterns':
      if (edit.key !== undefined) payload.itemKey = String(edit.key)
      if (edit.label !== undefined) payload.itemLabel = String(edit.label)
      break
    case 'refundRules':
      if (edit.minHours !== undefined) payload.itemKey = String(Number(edit.minHours))
      if (edit.ratio !== undefined) payload.itemValue = Number(edit.ratio)
      if (edit.label !== undefined) payload.itemLabel = String(edit.label)
      break
  }
  return payload
}

/* ═══ 分组总闸（组级开关）适配 ═══ */

/**
 * 后端分组数组 → 前端组总闸映射。
 * 仅当后端明确下发 enabled=false 时记为关闭；字段缺失（老版本后端）按 fail-open 全开，
 * 与后端 isGroupEnabled 的缺省语义保持一致。未知分组忽略。
 */
export function toGroupEnabled(groups: PricingGroupDto[] | null | undefined): PricingGroupEnabled {
  const result: PricingGroupEnabled = { ...DEFAULT_GROUP_ENABLED }
  for (const g of groups ?? []) {
    const viewGroup = BACKEND_TO_VIEW_GROUP[g.groupCode]
    if (viewGroup) result[viewGroup] = g.enabled !== false
  }
  return result
}

/* ═══ 计价 API ═══ */

/** 空骨架（聚合前先归位，后端缺某个分组时该组保持空数组而非 undefined） */
function emptyPricingRules(custom: CustomPricing): PricingRules {
  return {
    tiers: [],
    durations: [],
    addons: [],
    patterns: [],
    refundRules: [],
    custom,
    // 组总闸先 fail-open 全开，聚合到对应分组时再以后端值覆盖
    groupEnabled: { ...DEFAULT_GROUP_ENABLED },
  }
}

/**
 * 拉取计价管理全量视图（GET /pricing/groups + GET /pricing/custom 聚合）。
 *
 * 后端把五个分组拆成分组数组返回、定制标量是独立端点，这里聚合成页面消费的单个 PricingRules，
 * 页面无需关心分组名单复数差异。http 拦截器已剥离 Result 信封，直接拿到 DTO。
 * 两个请求并行发出；任一失败由拦截器统一弹错并 reject，调用方 catch 后保持空表。
 */
export async function getPricingRules(): Promise<PricingRules> {
  const [groups, customDto] = await Promise.all([
    http.get<PricingGroupDto[]>('/pricing/groups'),
    http.get<CustomFeeDto>('/pricing/custom'),
  ])

  const result = emptyPricingRules(toCustomPricing(customDto))
  // 先整体回填组总闸（含后端未返回某组时的 fail-open 兜底）
  result.groupEnabled = toGroupEnabled(groups)
  for (const group of groups ?? []) {
    const viewGroup = BACKEND_TO_VIEW_GROUP[group.groupCode]
    if (!viewGroup) continue
    // 各分组适配函数返回各自确定的元素类型，分别赋值避免联合数组交叉类型问题
    const rows = toGroupRows(group.groupCode, group.items)
    switch (viewGroup) {
      case 'tiers':
        result.tiers = rows as PriceTier[]
        break
      case 'durations':
        result.durations = rows as PriceDuration[]
        break
      case 'addons':
        result.addons = rows as PriceAddon[]
        break
      case 'patterns':
        result.patterns = rows as PricePattern[]
        break
      case 'refundRules':
        result.refundRules = rows as RefundRule[]
        break
    }
  }
  return result
}

/**
 * 单项编辑 / 启停（PUT /pricing/rules/:id，仅 ADMIN）。
 * id 走路径（前端字符串 id 直接拼接，后端 @PathVariable 解析为 Long）。
 * 成功返回 Void，调用方需重新拉取刷新；400（校验/键重复）、403（非管理员）、404（不存在）
 * 由 http 拦截器统一弹错并 reject。
 */
export async function updatePricingRule(
  id: string,
  payload: PricingRuleUpdatePayload,
): Promise<void> {
  await http.put<void>(`/pricing/rules/${id}`, payload)
}

/**
 * 分组总闸开 / 关（PUT /pricing/groups/{group}/enabled，仅 ADMIN）。
 * 只改 sys_config 布尔，不触碰组内各行 status；成功返回 Void，调用方重新拉取刷新。
 * 非法分组后端 400、非管理员 403、enabled 缺省 400，均由 http 拦截器统一弹错并 reject。
 */
export async function updateGroupSwitch(group: PricingGroup, enabled: boolean): Promise<void> {
  await http.put<void>(`/pricing/groups/${toBackendGroup(group)}/enabled`, { enabled })
}

/** 读两个定制标量（GET /pricing/custom，缺失时后端给默认值 2000/5000） */
export async function getCustomFees(): Promise<CustomPricing> {
  const dto = await http.get<CustomFeeDto>('/pricing/custom')
  return toCustomPricing(dto)
}

/**
 * 保存定制标量（PUT /pricing/custom，仅 ADMIN）。
 * 两个字段都下发（页面表单始终持有两个值）；后端范围校验 0-100000，越界返回 400。
 * 成功返回 Void，调用方重新拉取 / 用返回值刷新；失败由拦截器弹错。
 */
export async function saveCustomFees(input: CustomPricing): Promise<void> {
  await http.put<void>('/pricing/custom', {
    customTextPrice: Number(input.customTextPrice),
    customLogoPrice: Number(input.customLogoPrice),
  })
}

/** 供 H5/其它模块按后端 groupCode 取视图分组名（预留工具，当前页面未直接使用） */
export function toViewGroup(groupCode: string): PricingGroup | null {
  return BACKEND_TO_VIEW_GROUP[groupCode] ?? null
}

/** 供需要整组保存的场景取后端 groupCode（预留；当前页面走单项更新） */
export function toBackendGroup(group: PricingGroup): string {
  return VIEW_TO_BACKEND_GROUP[group]
}
