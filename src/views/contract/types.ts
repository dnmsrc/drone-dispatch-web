// ─────────────────────────────────────────────────────────────
// 电子合同 · 接口契约类型（对齐后端 contracts + contract_payment_schedule 两表）
//
// 业务背景：大额定制表演「里程碑分期、客户主动付款」，订单创建即同步生成
// 合同草稿（与订单 1:1）。一期不对接第三方电子签平台，esign_* 字段预留，
// 过渡期由管理员上传已签 PDF（数据模型.md 第六节）。
//   GET  /admin/contracts                列表（内嵌订单摘要/用户）
//   GET  /admin/contracts/:id            详情（含付款计划 schedules）
//   POST /admin/contracts/:id/submit-sign   草稿 → 待签署
//   POST /admin/contracts/:id/upload-pdf    上传已签 PDF（待签署 → 已签署）
//   POST /admin/contracts/:id/void          作废（必填原因）
// 当前页面为静态实现，mock.ts 从订单数据派生合同种子并用内存 store 维护；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面与抽屉不改名。
// ─────────────────────────────────────────────────────────────

/** 合同签署状态（contracts.sign_status） */
export type ContractSignStatus = 'DRAFT' | 'PENDING_SIGN' | 'SIGNED' | 'VOID'

/** 付款计划期次状态（contract_payment_schedule.status） */
export type ScheduleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'

/** 甲方证件类型 */
export type IdType = 'ID_CARD' | 'UNIFORM_CODE'

/** 合同付款计划（一份合同 N 期，默认两期 50%+50%） */
export interface PaymentSchedule {
  id: string
  /** 期次，从 1 开始（1=预付款 2=尾款） */
  installmentNo: number
  /** 期次名称，如「预付款」「尾款」 */
  stageName: string
  /** 触发节点，如「合同签署完成」「演出前7天」 */
  triggerEvent: string
  /** 应付日期（可空，按触发事件动态计算时为空） */
  dueDate: string | null
  /** 本期占合同总额比例（0~1） */
  ratio: number
  /** 本期应付金额 */
  planAmount: number
  /** 本期累计实付金额 */
  paidAmount: number
  /** 期次状态 */
  status: ScheduleStatus
  /** 本期结清时间 */
  paidAt: string | null
}

/** 列表行内嵌的订单/用户摘要（避免列表再发 N 次订单请求） */
export interface ContractOrderBrief {
  orderNo: string
  userId?: string
  userNickname?: string
  userPhone?: string
  droneCount?: number
  duration?: number
  performDate?: string
  timeSlot?: string
  venueName?: string
}

/** 合同列表行 / 详情（同一结构，详情额外带完整付款计划） */
export interface ContractRow {
  id: string
  /** 合同编号，如 HT20261108-0007 */
  contractNo: string
  /** 关联订单号（后端为 order_id，前端展示用业务编号） */
  orderId: string
  /** 合同模板编码 */
  templateCode: string
  /** 模板版本号（版本快照，模板改版不影响已签老合同） */
  templateVersion: string
  /** 甲方（客户）名称快照 */
  partyAName: string
  /** 甲方证件类型 */
  partyAIdType: IdType | string
  /** 甲方证件号（真实系统加密存储） */
  partyAIdNo: string
  /** 甲方联系人/电话 */
  partyAContact: string
  partyAPhone: string
  /** 乙方（本公司）名称快照 */
  partyBName: string
  /** 乙方统一社会信用代码快照 */
  partyBCreditCode: string
  /** 合同总金额（与订单总价一致的快照） */
  totalAmount: number
  /** 付款条款文字快照 */
  paymentTerms: string
  /** 签署状态 */
  signStatus: ContractSignStatus | string
  /** 电子签平台流程号（一期预留，暂不对接） */
  esignFlowId: string
  /** 电子签平台印章标识（印章托管在平台，本地不建印章表） */
  sealId: string
  /** 已签署合同 PDF 存档地址（过渡期人工上传） */
  signedPdfUrl: string
  /** 甲方签署 / 乙方盖章 / 合同整体生效三个时间 */
  partyASignedAt: string | null
  partyBSignedAt: string | null
  signedAt: string | null
  /** 作废原因 */
  voidReason: string
  createdAt: string
  updatedAt: string
  /** 内嵌订单摘要 */
  order: ContractOrderBrief
  /** 付款计划（列表可只给汇总，详情给完整数组） */
  schedules: PaymentSchedule[]
}

/** 上传已签 PDF 提交体 */
export interface UploadPdfForm {
  /** PDF 文件 URL（演示版手填，正式版走文件上传） */
  pdfUrl: string
}

/** 作废合同提交体（原因必填） */
export interface VoidContractForm {
  voidReason: string
}
