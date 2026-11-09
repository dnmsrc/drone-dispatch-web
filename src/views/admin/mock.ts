// ─────────────────────────────────────────────────────────────
// 管理员账号 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 口径对齐 admin_users 表与安全约定：
//   - 登录名创建后不可改、全表唯一；密码只在新增/重置时传入，列表永不回传
//   - admin_users 无软删字段，故不提供删除，离职账号用「停用」处理
//   - 自我保护红线：不能停用/降级当前登录人（防止把自己锁在后台外），
//     页面按钮隐藏之外，数据源再兜一层
//   - 至少保留一个启用中的 ADMIN（避免全员停用/降级后无人能管理）
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/admin-users 后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import type { AdminAccountCreateForm, AdminAccountRow, AdminAccountUpdateForm } from './types'

/** 账号种子（admin 对应后端 DataInitializer 默认管理员；operator 为演示操作员） */
const SEED_ACCOUNTS: AdminAccountRow[] = [
  {
    id: 'a1',
    username: 'admin',
    realName: '系统管理员',
    role: 'ADMIN',
    enabled: true,
    lastLoginAt: null,
    createdAt: '2026-11-05T09:00:00+08:00',
  },
  {
    id: 'a2',
    username: 'operator',
    realName: '运营操作员',
    role: 'OPERATOR',
    enabled: true,
    lastLoginAt: null,
    createdAt: '2026-11-05T09:10:00+08:00',
  },
  {
    id: 'a3',
    username: 'auditor',
    realName: '兼职审核员',
    role: 'OPERATOR',
    enabled: false,
    lastLoginAt: null,
    createdAt: '2026-11-06T14:30:00+08:00',
  },
]

/** 可变副本：增删改直接作用于内存，刷新页面回滚到种子 */
const accountStore: { rows: AdminAccountRow[] } = {
  rows: JSON.parse(JSON.stringify(SEED_ACCOUNTS)) as AdminAccountRow[],
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/** 列表查询（等价 GET /admin/admin-users，创建时间正序） */
export function queryAdminAccounts(): AdminAccountRow[] {
  return clone(accountStore.rows).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** 按 id 查单个 */
function findById(id: string): AdminAccountRow | undefined {
  return accountStore.rows.find((x) => x.id === id)
}

/** 新增（等价 POST /admin/admin-users）：服务端会对密码做 BCrypt 哈希 */
export function createAdminAccount(form: AdminAccountCreateForm): AdminAccountRow {
  const username = form.username?.trim()
  if (!username) throw new Error('请填写登录名')
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    throw new Error('登录名仅支持 3-32 位字母、数字或下划线')
  }
  if (accountStore.rows.some((x) => x.username === username)) {
    throw new Error('登录名已存在，请更换')
  }
  if (!form.password || form.password.length < 6) {
    throw new Error('初始密码至少 6 位')
  }
  const account: AdminAccountRow = {
    id: `a${Date.now()}`,
    username,
    realName: form.realName?.trim() || username,
    role: form.role,
    enabled: form.enabled !== false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  }
  accountStore.rows.push(account)
  return clone(account)
}

/** 编辑（等价 PUT /admin/admin-users/:id）：登录名不可改，只改姓名/角色/启停 */
export function updateAdminAccount(
  id: string,
  form: AdminAccountUpdateForm,
  selfUsername?: string,
): AdminAccountRow {
  const target = findById(id)
  if (!target) throw new Error('账号不存在')

  // 降级当前登录人：拒绝
  if (target.username === selfUsername && form.role !== 'ADMIN' && target.role === 'ADMIN') {
    throw new Error('不能降级当前登录账号的管理员角色')
  }
  // 停用当前登录人：拒绝
  if (target.username === selfUsername && form.enabled === false) {
    throw new Error('不能停用当前正在使用的登录账号')
  }
  // 把最后一个启用中的 ADMIN 降级/停用：拒绝（必须始终有人能管理后台）
  if (
    target.role === 'ADMIN' &&
    target.enabled &&
    (form.role !== 'ADMIN' || form.enabled === false) &&
    activeAdminCount() <= 1
  ) {
    throw new Error('至少保留一个启用中的管理员账号')
  }

  target.realName = form.realName?.trim() || target.username
  target.role = form.role
  target.enabled = form.enabled !== false
  return clone(target)
}

/** 重置密码（等价 POST /admin/admin-users/:id/reset-password） */
export function resetPassword(id: string, password: string): void {
  const target = findById(id)
  if (!target) throw new Error('账号不存在')
  if (!password || password.length < 6) throw new Error('新密码至少 6 位')
  // 静态页不落哈希；真接口由服务端 BCrypt 后写 password_hash，此处仅模拟成功
}

/** 快捷启停（列表开关用），规则与编辑一致 */
export function toggleAdminEnabled(id: string, enabled: boolean, selfUsername?: string): void {
  const target = findById(id)
  if (!target) throw new Error('账号不存在')
  if (target.username === selfUsername && enabled === false) {
    throw new Error('不能停用当前正在使用的登录账号')
  }
  if (target.role === 'ADMIN' && target.enabled && !enabled && activeAdminCount() <= 1) {
    throw new Error('至少保留一个启用中的管理员账号')
  }
  target.enabled = enabled
}

/** 当前启用中的管理员数量（保护红线判定） */
function activeAdminCount(): number {
  return accountStore.rows.filter((x) => x.role === 'ADMIN' && x.enabled).length
}
