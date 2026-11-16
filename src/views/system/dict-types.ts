// ─────────────────────────────────────────────────────────────
// 字典管理 · 视图层契约类型（与后端 /api/dict 的 DTO 差异统一在 @/api/dict 适配收口）
//
// 若依风格「字典类型 + 键值项」两级结构，后端 DictController 提供 8 个端点：
//   GET/POST/PUT/DELETE /api/dict/types        字典类型 CRUD
//   GET/POST/PUT/DELETE /api/dict/:type/items  某类型下字典项 CRUD
// 本文件是页面与适配层共用的视图类型（type/key/value/system 命名），
// 后端 VO 的 dictCode/itemKey/itemValue/systemFlag 改名由 @/api/dict 负责。
// 系统内置字典（system:true，计价引擎引用）不可删类型、不可改键，
// 仅可停用/改字典项；自定义类型可整组删除。
// ─────────────────────────────────────────────────────────────

/** 字典项（键值结构；value 语义随类型约定：价格/比例/普通值） */
export interface DictItem {
  /** 字典项 id（类型_序号 或 类型_时间戳36进制） */
  id: string
  /** 程序使用的键（架次/分钟数/枚举 key 等） */
  key: string
  /** 展示标签 */
  label: string
  /** 值：价格类=元，退款阶梯=比例 0-1，其余为普通值 */
  value: number
  /** 补充说明（如适用场景），可为空串 */
  extra: string
  /** 排序号（升序） */
  sort: number
  /** 状态：1 启用 / 0 停用（停用后 H5 不展示、计价不读取） */
  status: 0 | 1
}

/** 字典类型（列表行，GET /admin/dict 返回的汇总形态） */
export interface DictTypeSummary {
  /** 类型标识（小写英文/数字/下划线） */
  type: string
  /** 类型名称 */
  name: string
  /** 用途说明 */
  remark: string
  /** 是否系统内置（内置不可删类型） */
  system: boolean
  /** 字典项总数 */
  itemCount: number
  /** 启用中的字典项数 */
  enabledCount: number
}

/** 字典类型详情（GET /admin/dict/:type/items，含完整字典项） */
export interface DictTypeDetail extends DictTypeSummary {
  /** 该类型下的全部字典项 */
  list: DictItem[]
}

/** 字典类型编辑/新增提交体 */
export interface DictTypeForm {
  /** 类型标识（新增可填、编辑禁用） */
  type: string
  name: string
  remark: string
}

/** 字典项编辑/新增提交体 */
export interface DictItemForm {
  key: string
  label: string
  value: number
  extra: string
  sort: number
  /** 提交时转 1/0 */
  status: 0 | 1
}

/** 按金额渲染的字典类型（值=元） */
export const PRICE_TYPES = ['drone_tier', 'duration', 'addon'] as const
