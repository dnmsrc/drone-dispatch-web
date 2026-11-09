// ─────────────────────────────────────────────────────────────
// 鉴权接口层 —— 对接后端 drone-dispatch-server AuthController（/api/auth）
//
// 类型与后端 DTO 一一对应：
//   LoginRequest  → LoginPayload
//   LoginResponse → LoginResult（token + tokenType + expiresInMinutes + user）
//   AdminUserInfo → AdminUserInfo（id/username/realName/role，不含敏感字段）
//
// 请求层 baseURL 已含 /api 前缀（见 config/env），这里路径只写 /auth/*。
// 响应拦截器会自动剥离后端 Result{ code, message, data } 信封，故函数直接
// resolve 业务 data。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'

/** 当前登录人信息（后端 AdminUserInfo record） */
export interface AdminUserInfo {
  id: number
  username: string
  /** 真实姓名（展示名优先取它） */
  realName: string
  /** 角色：ADMIN 管理员 / OPERATOR 操作员 */
  role: string
}

/** 登录请求体（后端 LoginRequest record） */
export interface LoginPayload {
  username: string
  password: string
}

/** 登录成功响应（后端 LoginResponse record） */
export interface LoginResult {
  /** JWT 字符串 */
  token: string
  /** 令牌类型，后端固定 Bearer */
  tokenType: string
  /** 有效期（分钟），与后端 app.jwt.expire-minutes 一致 */
  expiresInMinutes: number
  /** 当前登录人信息 */
  user: AdminUserInfo
}

/**
 * 账号密码登录，成功返回 JWT 与当前用户。
 *
 * 两个请求开关的原因：
 *   - withToken:false：登录在后端拦截器白名单内本就匿名可访问，无需携带旧 token；
 *   - skipAuthHandler:true：账号或密码错误时后端返回【业务码 401（HTTP 200）】，
 *     此时本就停在登录页，应把错误抛回页面做字段/消息提示，不能触发全局「清登录态并跳登录页」。
 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', payload, {
    withToken: false,
    skipAuthHandler: true,
  })
}

/**
 * 查询当前登录人信息。
 * 用于刷新页面后凭持久化的 token 恢复登录态；token 缺失/失效时后端返回真实 HTTP 401，
 * 由请求层全局未授权处理器统一清态并跳登录页。
 */
export function fetchCurrentUser(): Promise<AdminUserInfo> {
  return http.get<AdminUserInfo>('/auth/me')
}
