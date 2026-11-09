// ─────────────────────────────────────────────────────────────
// 公司收款账户 · 接口契约类型（对齐后端 company_bank_accounts 表）
//
// 对公转账（payments.pay_method=OFFLINE）到账核对的前置基础数据：
//   GET    /admin/bank-accounts        列表
//   POST   /admin/bank-accounts        新增
//   PUT    /admin/bank-accounts/:id    编辑
//   DELETE /admin/bank-accounts/:id    删除（基础数据物理删除，与 DDL 约定一致）
//   POST   /admin/bank-accounts/:id/default  设为默认（全表唯一）
// 规则：户名/开户行/账号必填；默认账户全表唯一，设新默认自动取消旧默认。
// 当前页面为静态实现，mock.ts 用内存 store 模拟同一套 CRUD；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面与弹窗不改名。
// ─────────────────────────────────────────────────────────────

/** 收款账户列表行 / 详情（同一结构） */
export interface BankAccountRow {
  /** 账户 id（种子 b1…；新增为 b+时间戳） */
  id: string
  /** 开户户名（公司全称，必填，最长 100 字） */
  accountName: string
  /** 开户行（如「中国工商银行杭州滨江支行」，必填） */
  bankName: string
  /** 银行账号（必填，最长 40 位） */
  accountNo: string
  /** 是否默认收款账户：全表唯一，对公转账核对默认指向它 */
  isDefault: boolean
  /** 启用状态：true 启用 / false 停用 */
  enabled: boolean
  /** 备注（可空） */
  remark?: string
}

/** 新增 / 编辑提交体（无 id；id 走 URL 路径参数） */
export interface BankAccountForm {
  accountName: string
  bankName: string
  accountNo: string
  isDefault: boolean
  enabled: boolean
  remark?: string
}
