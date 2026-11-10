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
//   POST /admin/contracts/:id/void          作废（未生效/零付款，必填原因）
//   POST /admin/contracts/:id/terminate     终止（已生效/已收款，带责任方与结算）
//   POST /admin/contracts/:id/reschedule    改期（顺延表演日期，款项不退还）
// 当前页面为静态实现，mock.ts 从订单数据派生合同种子并用内存 store 维护；
// TODO(server): 接真接口后仅替换 mock.ts 内的调用，页面与抽屉不改名。
// ─────────────────────────────────────────────────────────────

/**
 * 合同签署状态（contracts.sign_status）
 *
 * 在原 4 态基础上区分「作废 / 终止」两种法律含义不同的结束态：
 *   VOID       作废：合同未生效或已生效但无任何资金往来，自始不发生结算
 *   TERMINATED 终止：合同已生效（通常已收款），提前结束并须做资金清结算
 *   RESCHEDULED 改期：非终态标记，合同继续有效，仅表演日期顺延（见 reschedule 字段）
 */
export type ContractSignStatus =
  'DRAFT' | 'PENDING_SIGN' | 'SIGNED' | 'VOID' | 'TERMINATED' | 'RESCHEDULED'

/** 终止 / 改期的责任方（决定退款比例与是否扣费，依据 H5 已告知的合同条款） */
export type ContractResponsibility =
  | 'CUSTOMER' // 客户原因：按退款阶梯比例近似抵扣成本/违约金
  | 'VENDOR' // 我方原因（审批失败/天气/不可抗力等）：全额退款，或改期顺延

/** 改期原因归类（与 H5 条款 key 对齐：weather 天气 / approvalFail 审批 / 其它） */
export type RescheduleReasonType = 'WEATHER' | 'APPROVAL' | 'VENUE' | 'OTHER'

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
  /** 关联订单当前状态（10 态机，合同操作闸门据此判断履约进度） */
  status?: string
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
  /** 作废原因（VOID 时必填） */
  voidReason: string
  /** 终止原因（TERMINATED 时必填，含责任方与结算说明） */
  terminateReason: string
  /** 终止责任方：CUSTOMER 客户原因 / VENDOR 我方原因 */
  terminateResponsibility: ContractResponsibility | ''
  /** 终止时间 */
  terminatedAt: string | null
  /** 关联生成的退款单号（终止且有退款时回填，可在退款管理检索） */
  refundNo: string
  /** 改期原因（RESCHEDULED 标记时填写，合同继续有效、款项不退还） */
  rescheduleReason: string
  /** 改期责任方 */
  rescheduleResponsibility: ContractResponsibility | ''
  /** 原表演日期（改期前留痕，YYYY-MM-DD） */
  originalPerformDate: string | null
  /** 改期后的表演日期（YYYY-MM-DD） */
  rescheduledPerformDate: string | null
  /** 最近改期时间 */
  rescheduledAt: string | null
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

/* ════════════════════════════════════════════════════════════
 * 终止 / 改期（v2 补充：区分责任方与资金后果）
 * ════════════════════════════════════════════════════════════ */

/** 对一份合同当前可执行的操作（操作列闸门据此显隐） */
export interface ContractAvailableActions {
  /** 可直接作废（未生效或已生效但零付款，无资金后果） */
  canVoid: boolean
  /** 可终止（已生效，需走结算；是否需要管理员权限见 terminateRequiresAdmin） */
  canTerminate: boolean
  /** 可改期（生效合同顺延表演日期，款项不退还） */
  canReschedule: boolean
  /** 终止是否要求 ADMIN（已收款 / 已进入服务后的兜底强制终止） */
  terminateRequiresAdmin: boolean
  /** 是否仅可查看（终态：VOID / TERMINATED） */
  readonly: boolean
  /** 不可操作时的原因说明（如「合同已履行完毕，不能终止」），供 tooltip 展示 */
  blockedReason: string
}

/** 终止结算的试算结果（弹窗展示，纯函数计算，不写库） */
export interface TerminationQuote {
  /** 责任方 */
  responsibility: ContractResponsibility
  /** 已付总额（各期 paidAmount 之和），即退款基数 */
  paidAmount: number
  /** 适用退款比例 0~1（我方原因恒为 1；客户原因按距演出天数阶梯） */
  ratio: number
  /** 试算可退金额 = paidAmount × ratio */
  refundAmount: number
  /** 扣除金额（成本/违约金综合抵扣，我方原因为 0） */
  deductAmount: number
  /** 距演出天数（负数表示已过演出日），阶梯规则的入参 */
  daysToPerform: number | null
  /** 命中的阶梯规则文案，如「演出前 7 天内，退 50%」 */
  ruleLabel: string
}

/** 终止合同提交体 */
export interface TerminateContractForm {
  /** 责任方 */
  responsibility: ContractResponsibility
  /** 终止原因（必填，写入合同档案与退款单） */
  reason: string
  /** 试算比例（弹窗回传，mock 落库时二次校验，防前端篡改） */
  ratio: number
  /** 实退金额（默认取试算额，允许在已付额度内调整） */
  refundAmount: number
}

/** 改期提交体 */
export interface RescheduleContractForm {
  /** 改期责任方 */
  responsibility: ContractResponsibility
  /** 改期原因类型 */
  reasonType: RescheduleReasonType
  /** 改期说明（必填） */
  reason: string
  /** 新表演日期（YYYY-MM-DD，必填且不得早于今天） */
  newPerformDate: string
}
