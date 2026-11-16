// ─────────────────────────────────────────────────────────────
// 字典接口层 —— 对接后端 drone-dispatch-server DictController（/api/dict）
//
// 已对接接口（8 个端点，两级结构：字典类型 + 字典项）：
//   GET    /dict/types                 类型列表（汇总 itemCount/enabledCount）
//   POST   /dict/types                 新增自定义类型（仅 ADMIN）
//   PUT    /dict/types/:dictCode       改类型名/备注（dictCode 不可改）
//   DELETE /dict/types/:dictCode       物理删整组（内置类型后端 400 拦截）
//   GET    /dict/:dictCode/items       类型详情 + 全部字典项
//   POST   /dict/:dictCode/items       新增字典项（仅 ADMIN）
//   PUT    /dict/:dictCode/items/:id   改字典项（含启停，仅 ADMIN）
//   DELETE /dict/:dictCode/items/:id   物理删字典项（仅 ADMIN）
//
// 后端 VO 字段名沿用数据库语义（dictCode/itemKey/itemValue/systemFlag），
// 与前端视图类型（type/key/value/system）不同，差异统一在本文件适配收口，
// 页面继续消费 src/views/system/dict-types.ts 的 DictType/DictItem 类型，不改名。
//
// 关键映射：
//   1) dictCode ↔ type、dictName ↔ name、itemKey ↔ key、itemLabel ↔ label；
//   2) systemFlag(1/0) → system(boolean)；
//   3) 字典项 id 后端是 BIGINT(number)，前端按 string 使用（同 venue 适配）；
//   4) itemValue 后端 DECIMAL 序列化为 number（理论可空），这里 Number()||0 兜底；
//   5) 审计字段（createdAt/updatedAt）后端 VO 不返回，前端也不需要。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'
import type {
  DictItem,
  DictItemForm,
  DictTypeDetail,
  DictTypeForm,
  DictTypeSummary,
} from '@/views/system/dict-types'

/* ═══ 后端 VO 的 JSON 形态（字段名与后端 record 一一对应，勿改名）═══ */

/** 后端字典项 VO（DictItemVO） */
export interface DictItemDto {
  id: number
  itemKey: string
  itemLabel: string
  /** DECIMAL(14,4) 序列化值，理论可空，适配层兜底为 0 */
  itemValue: number | null
  extra: string
  sort: number
  /** 1 启用 / 0 停用 */
  status: number
}

/** 后端字典类型汇总 VO（DictTypeSummaryVO） */
export interface DictTypeSummaryDto {
  dictCode: string
  dictName: string
  remark: string
  /** 1 内置 / 0 自定义 */
  systemFlag: number
  /** 排序号（升序），后端列表已按 sort,id 排序 */
  sort: number
  itemCount: number
  enabledCount: number
}

/** 后端字典类型详情 VO（DictTypeDetailVO，含字典项数组） */
export interface DictTypeDetailDto extends DictTypeSummaryDto {
  items: DictItemDto[]
}

/* ═══ DTO → 视图类型（纯函数，单测覆盖各字段映射与空值兜底）═══ */

/** 后端字典项 VO → 前端 DictItem */
export function toDictItem(dto: DictItemDto): DictItem {
  return {
    id: String(dto.id),
    key: dto.itemKey,
    label: dto.itemLabel,
    value: Number(dto.itemValue) || 0,
    extra: dto.extra ?? '',
    sort: dto.sort,
    status: dto.status === 0 ? 0 : 1,
  }
}

/** 后端类型汇总 VO → 前端 DictTypeSummary */
export function toDictType(dto: DictTypeSummaryDto): DictTypeSummary {
  return {
    type: dto.dictCode,
    name: dto.dictName,
    remark: dto.remark ?? '',
    system: dto.systemFlag === 1,
    sort: dto.sort ?? 0,
    itemCount: dto.itemCount,
    enabledCount: dto.enabledCount,
  }
}

/** 后端类型详情 VO → 前端 DictTypeDetail（含字典项列表） */
export function toDictDetail(dto: DictTypeDetailDto): DictTypeDetail {
  return {
    ...toDictType(dto),
    list: (dto.items ?? []).map(toDictItem),
  }
}

/* ═══ 视图表单 → 后端请求体 ═══ */

/** 类型新增表单 → POST 请求体（带 dictCode）；sort 传当前列表 max+1，后端另有兜底 */
export function toTypeCreatePayload(form: DictTypeForm) {
  return {
    dictCode: form.type,
    dictName: form.name,
    remark: form.remark,
    sort: Number(form.sort),
  }
}

/** 类型编辑表单 → PUT 请求体（不含 dictCode，定位走 URL 且 code 不可改） */
export function toTypeUpdatePayload(form: Pick<DictTypeForm, 'name' | 'remark' | 'sort'>) {
  return {
    dictName: form.name,
    remark: form.remark,
    sort: Number(form.sort),
  }
}

/** 字典项新增/编辑表单 → POST/PUT 请求体（id 与所属类型均走 URL） */
export function toItemPayload(form: DictItemForm) {
  return {
    itemKey: form.key,
    itemLabel: form.label,
    itemValue: Number(form.value),
    extra: form.extra,
    sort: Number(form.sort),
    status: form.status,
  }
}

/* ═══ 字典类型 API ═══ */

/** 类型列表（汇总）；http 拦截器已剥离 Result 信封，直接拿到 DTO 数组 */
export async function getDictTypes(): Promise<DictTypeSummary[]> {
  const list = await http.get<DictTypeSummaryDto[]>('/dict/types')
  return (list ?? []).map(toDictType)
}

/** 新增自定义类型 */
export async function createDictType(form: DictTypeForm): Promise<void> {
  await http.post<void>('/dict/types', toTypeCreatePayload(form))
}

/** 修改类型名/备注（dictCode 不可改） */
export async function updateDictType(dictCode: string, form: DictTypeForm): Promise<void> {
  await http.put<void>(`/dict/types/${dictCode}`, toTypeUpdatePayload(form))
}

/** 物理删除整组（内置类型由后端 400 拒绝，http 拦截器弹错） */
export async function deleteDictType(dictCode: string): Promise<void> {
  await http.delete<void>(`/dict/types/${dictCode}`)
}

/* ═══ 字典项 API ═══ */

/** 某类型详情 + 全部字典项 */
export async function getDictItems(dictCode: string): Promise<DictTypeDetail> {
  const detail = await http.get<DictTypeDetailDto>(`/dict/${dictCode}/items`)
  return toDictDetail(detail)
}

/** 新增字典项 */
export async function createDictItem(dictCode: string, form: DictItemForm): Promise<void> {
  await http.post<void>(`/dict/${dictCode}/items`, toItemPayload(form))
}

/** 修改字典项（全字段；id 走路径） */
export async function updateDictItem(
  dictCode: string,
  id: string,
  form: DictItemForm,
): Promise<void> {
  await http.put<void>(`/dict/${dictCode}/items/${id}`, toItemPayload(form))
}

/**
 * 启停字典项：后端 PUT 要求全字段，故以当前行 row 为底、仅覆盖 status 后整体提交，
 * 避免只传 status 触发后端「键/标签必填」400。
 */
export async function toggleDictItem(
  dictCode: string,
  row: DictItem,
  enabled: boolean,
): Promise<void> {
  await updateDictItem(dictCode, row.id, {
    key: row.key,
    label: row.label,
    value: row.value,
    extra: row.extra,
    sort: row.sort,
    status: enabled ? 1 : 0,
  })
}

/** 物理删除单个字典项 */
export async function deleteDictItem(dictCode: string, id: string): Promise<void> {
  await http.delete<void>(`/dict/${dictCode}/items/${id}`)
}
