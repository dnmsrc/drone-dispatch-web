// ─────────────────────────────────────────────────────────────
// 公司收款账户 · 静态数据源（内存 CRUD，刷新页面即回滚到种子）
//
// 用可变数组 + 一组查询/增删改函数模拟 /admin/bank-accounts 的完整 CRUD，
// 口径对齐 company_bank_accounts 表约束：
//   - 户名 / 开户行 / 账号必填，缺失抛错（页面表单已前置校验，这里做数据源兜底）
//   - 默认账户全表唯一：设新默认先清掉旧默认；删除/停用默认账户被拒绝，
//     必须先把别的账户设为默认（避免对公转账核对时无默认账户可指向）
//   - 账号在启用账户间唯一（防止录入重复账户）
// 接真接口后只把各函数体换成 request 调用，函数签名与页面不改名。
// TODO(server): 接 /admin/bank-accounts 后替换本文件实现。
// ─────────────────────────────────────────────────────────────
import type { BankAccountForm, BankAccountRow } from './types'

/** 收款账户种子（演示用公司账户，b1 默认） */
const SEED_ACCOUNTS: BankAccountRow[] = [
  {
    id: 'b1',
    accountName: '杭州承飞科技有限公司',
    bankName: '中国工商银行杭州滨江支行',
    accountNo: '1202 0201 0990 0088 666',
    isDefault: true,
    enabled: true,
    remark: '对公转账默认收款账户',
  },
  {
    id: 'b2',
    accountName: '杭州承飞科技有限公司',
    bankName: '中国建设银行杭州钱江新城支行',
    accountNo: '3305 0166 8835 0000 217',
    isDefault: false,
    enabled: true,
    remark: '',
  },
  {
    id: 'b3',
    accountName: '杭州承飞科技有限公司',
    bankName: '招商银行杭州分行营业部',
    accountNo: '5719 0888 0210 506',
    isDefault: false,
    enabled: false,
    remark: '备用账户（暂停用）',
  },
]

/** 可变副本：增删改直接作用于内存，刷新页面回滚到种子 */
const accountStore: { rows: BankAccountRow[] } = {
  rows: JSON.parse(JSON.stringify(SEED_ACCOUNTS)) as BankAccountRow[],
}

/** 深拷贝工具（返回副本防止外部直接改 store） */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/** 列表查询（等价 GET /admin/bank-accounts，默认账户排在最前） */
export function queryAccounts(): BankAccountRow[] {
  return clone(accountStore.rows).sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id.localeCompare(b.id),
  )
}

/** 按 id 查单个（详情/回显用） */
export function getAccount(id: string): BankAccountRow {
  const target = accountStore.rows.find((x) => x.id === id)
  if (!target) throw new Error('收款账户不存在')
  return clone(target)
}

/** 新增（等价 POST /admin/bank-accounts）：返回新账户 */
export function createAccount(form: BankAccountForm): BankAccountRow {
  if (!form.accountName?.trim() || !form.bankName?.trim() || !form.accountNo?.trim()) {
    throw new Error('请完整填写户名、开户行与账号')
  }
  const accountNo = form.accountNo.trim()
  if (accountStore.rows.some((x) => x.accountNo === accountNo && x.enabled)) {
    throw new Error('该银行账号已存在，请勿重复录入')
  }
  const account: BankAccountRow = {
    id: `b${Date.now()}`,
    accountName: form.accountName.trim(),
    bankName: form.bankName.trim(),
    accountNo,
    isDefault: false,
    enabled: form.enabled !== false,
    remark: form.remark?.trim() ?? '',
  }
  // 全表首个账户自动成为默认；或表单显式要求默认时先清旧默认
  if (form.isDefault || accountStore.rows.length === 0) {
    accountStore.rows.forEach((x) => (x.isDefault = false))
    account.isDefault = true
  }
  accountStore.rows.push(account)
  return clone(account)
}

/** 编辑（等价 PUT /admin/bank-accounts/:id）：按字段合并，返回更新后的账户 */
export function updateAccount(id: string, form: BankAccountForm): BankAccountRow {
  const target = accountStore.rows.find((x) => x.id === id)
  if (!target) throw new Error('收款账户不存在')
  if (!form.accountName?.trim() || !form.bankName?.trim() || !form.accountNo?.trim()) {
    throw new Error('请完整填写户名、开户行与账号')
  }
  const accountNo = form.accountNo.trim()
  const dup = accountStore.rows.some((x) => x.id !== id && x.accountNo === accountNo && x.enabled)
  if (dup) throw new Error('该银行账号已被其他账户使用')

  target.accountName = form.accountName.trim()
  target.bankName = form.bankName.trim()
  target.accountNo = accountNo
  target.remark = form.remark?.trim() ?? ''
  // 默认账户不允许在编辑里取消默认（取消默认必须去别的账户上设默认，保证全表始终有默认）
  if (form.isDefault) setDefault(id)
  target.enabled = form.enabled
  return clone(target)
}

/** 设为默认（等价 POST /admin/bank-accounts/:id/default）：全表唯一，先清旧默认 */
export function setDefault(id: string): BankAccountRow {
  const target = accountStore.rows.find((x) => x.id === id)
  if (!target) throw new Error('收款账户不存在')
  if (!target.enabled) throw new Error('停用状态的账户不能设为默认，请先启用')
  accountStore.rows.forEach((x) => (x.isDefault = x.id === id))
  return clone(target)
}

/** 切换启停：停用/删除默认账户被拒绝（全表必须始终保留一个可用的默认收款账户） */
export function toggleEnabled(id: string, enabled: boolean): BankAccountRow {
  const target = accountStore.rows.find((x) => x.id === id)
  if (!target) throw new Error('收款账户不存在')
  if (!enabled && target.isDefault) {
    throw new Error('默认收款账户不能停用，请先把其他账户设为默认')
  }
  target.enabled = enabled
  return clone(target)
}

/** 删除（等价 DELETE /admin/bank-accounts/:id） */
export function deleteAccount(id: string): void {
  const idx = accountStore.rows.findIndex((x) => x.id === id)
  if (idx < 0) throw new Error('收款账户不存在')
  if (accountStore.rows[idx].isDefault) {
    throw new Error('默认收款账户不能删除，请先把其他账户设为默认')
  }
  accountStore.rows.splice(idx, 1)
}
