// ─────────────────────────────────────────────────────────────
// 场地接口层 —— 对接后端 drone-dispatch-server VenueController（/api/venues）
//
// 已对接接口：
//   GET  /api/venues  → Result<List<Venue>>，仅返回 enabled=1 AND deleted=0
//   POST /api/venues  → Result<Void>，新增场地（服务端强制 enabled=1，不回传新实体）
//
// 后端 Venue 实体与前端 VenueRow 的契约差异，统一在本文件适配收口：
//   1) id：后端是自增 BIGINT（number），前端 VenueRow.id 约定为 string，
//      这里 String() 转换；后续编辑/删除接口也以字符串 id 对接，页面无需改型；
//   2) enabled：后端是 TINYINT 的 1/0（number），前端按 boolean 使用（ElTag 判断）；
//   3) lng/lat：后端 DECIMAL(10,6) 序列化为 JSON number，可能为 null（表允许空），
//      这里用 0 兜底，保证页面 toFixed 不炸；
//   4) 审计字段（createdAt/updatedAt/deleted/deletedAt）列表页用不到，不透出。
//
// 写接口现状：新增已接 POST；编辑/删除后端尚未提供，仍由 views/venue/mock.ts
//   本地维护（仅内存态，刷新回滚），待后端补齐后在此扩展并替换 mock。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'
import type { VenueForm, VenueRow } from '@/views/venue/types'

/** 后端 Venue 实体的 JSON 形态（字段名与后端实体一一对应，勿随意改名） */
export interface VenueDto {
  /** 自增主键 */
  id: number
  name: string
  address: string
  /** 经度 DECIMAL(10,6)，理论可空 */
  lng: number | null
  /** 纬度 DECIMAL(10,6)，理论可空 */
  lat: number | null
  /** 启用状态：1 启用 / 0 停用（列表接口只可能返回 1） */
  enabled: number
  createdAt?: string
  updatedAt?: string
  /** 软删除：0 正常 / 1 已删（列表接口只可能返回 0） */
  deleted?: number
  deletedAt?: string | null
}

/**
 * 后端 Venue DTO → 前端列表行 VenueRow。
 * 纯函数、无副作用，单独导出便于单测覆盖各字段映射与空值兜底。
 */
export function toVenueRow(dto: VenueDto): VenueRow {
  return {
    id: String(dto.id),
    name: dto.name,
    address: dto.address,
    lng: Number(dto.lng) || 0,
    lat: Number(dto.lat) || 0,
    enabled: dto.enabled === 1,
  }
}

/**
 * 查询启用场地列表（已适配为前端 VenueRow）。
 * http 层响应拦截器会自动剥离 Result 信封，这里直接拿到 VenueDto[]。
 */
export async function getVenues(): Promise<VenueRow[]> {
  const list = await http.get<VenueDto[]>('/venues')
  return (list ?? []).map(toVenueRow)
}

/**
 * 新增场地请求体 —— 与后端 VenueCreateRequest record 逐字段对齐。
 *
 * 只提交 4 个字段：id 由数据库自增、enabled 由 Service 强制置 1、
 * 时间戳与软删除标记均为系统字段，前端一律不传（传了后端 record 也不接收）。
 */
export interface VenueCreatePayload {
  name: string
  address: string
  lng: number
  lat: number
}

/**
 * 弹窗表单 VenueForm → 后端新增请求体 VenueCreatePayload。
 *
 * 纯函数、无副作用，单独导出便于单测锁定两条关键契约：
 *   1) 只保留 name/address/lng/lat 四字段，主动剔除 enabled（后端新增固定启用）；
 *   2) 经纬度强制 Number 归一，避免字符串混入请求体。
 */
export function toCreatePayload(form: VenueForm): VenueCreatePayload {
  return {
    name: form.name,
    address: form.address,
    lng: Number(form.lng),
    lat: Number(form.lat),
  }
}

/**
 * 新增场地（POST /api/venues）。
 *
 * 后端成功返回 Result<Void>（data 为 null），拿不到新生成的自增 id，
 * 因此调用方在成功后需重新拉一次列表（页面的 load()）以呈现新场地。
 * 失败（400 校验 / 401 未登录 / 网络异常等）由 http 拦截器统一弹错并 reject，
 * 调用方用 try/catch 决定是否继续后续流程。
 */
export async function createVenue(form: VenueForm): Promise<void> {
  await http.post<void>('/venues', toCreatePayload(form))
}
