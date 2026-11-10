// ─────────────────────────────────────────────────────────────
// 通用格式化与业务字典单元测试（src/utils/format.ts）
//
// 覆盖：金额千分位与非法值兜底、时间格式与「—」兜底、今日日期格式、
// 方案摘要四分支、字典文案拼接，以及状态字典的结构完整性。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  addonsText,
  CONSULT_STATUS_MAP,
  CONTRACT_SIGN_MAP,
  fmtDate,
  fmtMoney,
  fmtPercent,
  fmtTime,
  orderSummary,
  patternsText,
  PAYMENT_STATUS_MAP,
  PAY_METHOD_LABELS,
  SCHEDULE_STATUS_MAP,
  STATUS_MAP,
  todayStr,
  venueSub,
} from '../format'

describe('format · fmtMoney', () => {
  it('整数按 zh-CN 千分位格式化', () => {
    expect(fmtMoney(412000)).toBe('¥412,000')
    expect(fmtMoney(38800)).toBe('¥38,800')
  })

  it('数字字符串等价于数字', () => {
    expect(fmtMoney('96000')).toBe('¥96,000')
  })

  it('null / undefined / 非数字一律按 0', () => {
    expect(fmtMoney(null)).toBe('¥0')
    expect(fmtMoney(undefined)).toBe('¥0')
    expect(fmtMoney('abc')).toBe('¥0')
  })
})

describe('format · fmtTime', () => {
  it('空值与非法时间返回「—」', () => {
    expect(fmtTime('')).toBe('—')
    expect(fmtTime(null)).toBe('—')
    expect(fmtTime('not-a-date')).toBe('—')
  })

  it('本地时间串按 YYYY-MM-DD HH:mm 输出', () => {
    // 不带时区后缀的 ISO 串按本地时区解析，断言不受运行环境时区影响
    expect(fmtTime('2026-11-04T21:05:00')).toBe('2026-11-04 21:05')
  })
})

describe('format · todayStr', () => {
  it('输出本地今日 YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('format · orderSummary', () => {
  const base = { droneCount: 300, duration: 15 }

  it('无定制项时标注预设图案', () => {
    expect(orderSummary(base)).toBe('300架·15分钟·预设图案')
  })

  it('仅定制文字 / 仅 LOGO / 两者皆有', () => {
    expect(orderSummary({ ...base, customText: '我爱你' })).toBe('300架·15分钟·定制文字')
    expect(orderSummary({ ...base, customLogo: 'x.png' })).toBe('300架·15分钟·LOGO定制')
    expect(orderSummary({ ...base, customText: 'a', customLogo: 'b' })).toBe(
      '300架·15分钟·文字+LOGO定制',
    )
  })

  it('空对象返回空串', () => {
    expect(orderSummary(null)).toBe('')
  })
})

describe('format · 字典文案', () => {
  it('addonsText 空列表返回「无」，多值顿号连接，未知 key 原样保留', () => {
    expect(addonsText([])).toBe('无')
    expect(addonsText(null)).toBe('无')
    expect(addonsText(['music', 'aerial'])).toBe('专属音乐编曲、双机位航拍记录')
    expect(addonsText(['unknown_addon'])).toBe('unknown_addon')
  })

  it('patternsText 按图案字典翻译', () => {
    expect(patternsText(['heart', 'moon'])).toBe('爱心、月亮船')
  })
})

describe('format · STATUS_MAP 结构完整性', () => {
  it('每个状态都有文案，且必须带 type 或 color 之一（StatusTag 渲染依赖）', () => {
    for (const [status, conf] of Object.entries(STATUS_MAP)) {
      expect(conf.text, status).toBeTruthy()
      expect(conf.type || conf.color, status).toBeTruthy()
    }
  })

  it('订单状态机十态齐全（v2 新增 PARTIALLY_PAID，位于待支付与待接单之间）', () => {
    expect(Object.keys(STATUS_MAP)).toEqual([
      'PENDING_PAY',
      'PARTIALLY_PAID',
      'PENDING_ACCEPT',
      'ACCEPTED',
      'IN_SERVICE',
      'COMPLETED',
      'REVIEWED',
      'CANCELLED',
      'REFUNDING',
      'REFUNDED',
    ])
  })
})

describe('format · CONSULT_STATUS_MAP 结构完整性', () => {
  it('每个咨询状态都有文案，且必须带 type（StatusTag 渲染依赖）', () => {
    for (const [status, conf] of Object.entries(CONSULT_STATUS_MAP)) {
      expect(conf.text, status).toBeTruthy()
      expect(conf.type, status).toBeTruthy()
    }
  })

  it('契约六状态齐全且顺序一致（页签渲染顺序依赖键序）', () => {
    expect(Object.keys(CONSULT_STATUS_MAP)).toEqual([
      'PENDING',
      'RECEIVED',
      'DISPATCHED',
      'CONFIRMED',
      'REJECTED',
      'ABANDONED',
    ])
  })
})

describe('format · venueSub', () => {
  it('类型 + 地址用「·」连接', () => {
    expect(venueSub({ type: 'preset', address: '杭州市滨江区江南大道 100 号' })).toBe(
      '预设场地 · 杭州市滨江区江南大道 100 号',
    )
  })

  it('未知类型只显示地址；无类型无地址返回「—」（与原型 venueSub 行为一致）', () => {
    expect(venueSub({ type: 'unknown', address: '某处' })).toBe('某处')
    expect(venueSub({ type: 'map' })).toBe('地图选点')
    expect(venueSub({})).toBe('—')
    expect(venueSub(null)).toBe('—')
    expect(venueSub(undefined)).toBe('—')
  })
})

describe('format · fmtPercent', () => {
  it('DECIMAL 比例转百分比文案', () => {
    expect(fmtPercent(0.5)).toBe('50%')
    expect(fmtPercent(0.9)).toBe('90%')
    expect(fmtPercent(1)).toBe('100%')
    expect(fmtPercent(0.125)).toBe('12.5%')
  })

  it('消除浮点尾数（0.1+0.2 不应出现 30.000000000000004%）', () => {
    expect(fmtPercent(0.1 + 0.2)).toBe('30%')
  })

  it('数字字符串等价处理；空值/非法值返回「—」', () => {
    expect(fmtPercent('0.2')).toBe('20%')
    expect(fmtPercent(null)).toBe('—')
    expect(fmtPercent(undefined)).toBe('—')
    expect(fmtPercent('abc')).toBe('—')
  })
})

describe('format · fmtDate', () => {
  it('ISO 串只取 YYYY-MM-DD', () => {
    expect(fmtDate('2026-11-08T10:20:30.000+08:00')).toBe('2026-11-08')
  })

  it('纯日期串原样返回；空值/非法值返回「—」', () => {
    expect(fmtDate('2026-11-08')).toBe('2026-11-08')
    expect(fmtDate('')).toBe('—')
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate('nonsense')).toBe('—')
  })
})

describe('format · 合同与分期域字典结构完整性', () => {
  it('合同签署 / 付款期次 / 支付流水状态字典每项都有文案且带 type 或 color', () => {
    for (const map of [CONTRACT_SIGN_MAP, SCHEDULE_STATUS_MAP, PAYMENT_STATUS_MAP]) {
      for (const [key, conf] of Object.entries(map)) {
        expect(conf.text, key).toBeTruthy()
        expect(conf.type || conf.color, key).toBeTruthy()
      }
    }
  })

  it('合同签署六态齐全（草稿/待签/已签/作废/终止/改期）', () => {
    expect(Object.keys(CONTRACT_SIGN_MAP)).toEqual([
      'DRAFT',
      'PENDING_SIGN',
      'SIGNED',
      'VOID',
      'TERMINATED',
      'RESCHEDULED',
    ])
  })

  it('付款期次四态齐全（PENDING/PARTIAL/PAID/OVERDUE）', () => {
    expect(Object.keys(SCHEDULE_STATUS_MAP)).toEqual(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'])
  })

  it('支付方式双通道文案存在（在线/对公）', () => {
    expect(PAY_METHOD_LABELS.ONLINE).toBe('在线支付')
    expect(PAY_METHOD_LABELS.OFFLINE).toBe('对公转账')
  })
})
