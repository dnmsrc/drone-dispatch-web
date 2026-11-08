// ─────────────────────────────────────────────────────────────
// 通用格式化与业务字典单元测试（src/utils/format.ts）
//
// 覆盖：金额千分位与非法值兜底、时间格式与「—」兜底、今日日期格式、
// 方案摘要四分支、字典文案拼接，以及状态字典的结构完整性。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  addonsText,
  fmtMoney,
  fmtTime,
  orderSummary,
  patternsText,
  STATUS_MAP,
  todayStr,
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

  it('原型九种订单状态齐全', () => {
    expect(Object.keys(STATUS_MAP)).toEqual([
      'PENDING_PAY',
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
