// ─────────────────────────────────────────────────────────────
// 用户管理 · 接口契约类型（字段名与 mock-server GET /admin/users 完全一致）
//
// 该接口对 db.users 每个用户实时聚合订单：
//   orderCount  = 该用户全部订单数
//   totalSpent  = 已支付且未取消/退款的订单金额合计
//   lastOrderAt = 最近一单的创建时间（无订单为空串）
// 列表默认按 totalSpent 降序。
// 当前页面为静态实现，mock.ts 按这些结构造数；
// TODO(server): 接真接口后本文件即响应类型来源，页面代码不改名。
// ─────────────────────────────────────────────────────────────

/** 性别（seed 约定：1 男 / 0 女；接口原样透传，列表暂不展示） */
export type Gender = 0 | 1

/** 用户列表行 = 用户基础信息 + 订单聚合字段（/admin/users 返回项） */
export interface UserRow {
  /** 用户 id（u1001…，订单行 userId 外键） */
  id: string
  /** 昵称 */
  nickname: string
  /** 脱敏手机号（138****6601 形态） */
  phone: string
  /** 性别：1 男 / 0 女 */
  gender: Gender
  /**
   * 头像种子串（mock-server 为 /api/media/avatar/:id）。
   * 静态页不依赖在线媒体服务，列表按昵称首字符渲染 el-avatar 占位，
   * 该字段保留以对齐契约，接真接口后可直接切回图片头像。
   */
  avatar: string
  /** 注册时间（ISO） */
  createdAt: string
  /** 订单总数（含已取消/已退款） */
  orderCount: number
  /** 累计有效消费（已支付且未取消/退款的金额合计，单位元） */
  totalSpent: number
  /** 最近下单时间（ISO）；从未下单为空串，展示为「—」 */
  lastOrderAt: string
}
