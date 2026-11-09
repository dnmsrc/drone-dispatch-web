// ─────────────────────────────────────────────────────────────
// 管理员账号 · 接口契约类型（对齐后端 admin_users 表 / AdminUserInfo DTO）
//
// 后台登录账号维护（与 C 端 users 区分）：
//   GET    /admin/admin-users           列表（不返回 password_hash）
//   POST   /admin/admin-users           新增（服务端 BCrypt 哈希入库）
//   PUT    /admin/admin-users/:id       编辑真实姓名/角色/启用状态
//   POST   /admin/admin-users/:id/reset-password  管理员重置密码
// 安全口径：列表与表单都不回传/不展示密码哈希；新建填初始密码、重置走单独动作。
// 当前页面为静态实现，mock.ts 用内存 store 模拟；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面与弹窗不改名。
// ─────────────────────────────────────────────────────────────

/** 后台角色（admin_users.role 字符串枚举） */
export type AdminRole = 'ADMIN' | 'OPERATOR'

/** 账号列表行（不含任何密码字段） */
export interface AdminAccountRow {
  /** 账号 id（种子 a1…；新增为 a+时间戳） */
  id: string
  /** 登录名（唯一，创建后不可改） */
  username: string
  /** 显示名（真实姓名，可空） */
  realName: string
  /** 角色：ADMIN 管理员 / OPERATOR 操作员 */
  role: AdminRole | string
  /** 启用状态：true 启用 / false 停用 */
  enabled: boolean
  /** 最近登录时间（可空，从未登录为 null） */
  lastLoginAt: string | null
  /** 创建时间 */
  createdAt: string
}

/** 新增账号提交体（含初始密码；服务端哈希后入库） */
export interface AdminAccountCreateForm {
  username: string
  realName: string
  role: AdminRole
  /** 初始密码（前端只在提交时传，不落列表） */
  password: string
  enabled: boolean
}

/** 编辑账号提交体（登录名不可改，不含密码） */
export interface AdminAccountUpdateForm {
  realName: string
  role: AdminRole
  enabled: boolean
}

/** 重置密码提交体 */
export interface ResetPasswordForm {
  password: string
}
