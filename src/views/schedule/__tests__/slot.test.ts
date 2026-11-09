// ─────────────────────────────────────────────────────────────
// 档期时段/日期纯逻辑单测（src/views/schedule/slot.ts）
//
// 覆盖：时段 id 规整与容错、fmt/short 格式化、整点区间重叠判定
// （相同/部分相交算重叠、首尾相接合法）、日期工具与连续区间预览。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  dayOfWeek,
  daysInMonth,
  findOverlap,
  fmtDate,
  fmtSlot,
  monthLeadOffset,
  nextDayStr,
  normSlotId,
  previewRanges,
  shortSlot,
  slotRange,
} from '../slot'

describe('schedule/slot · normSlotId', () => {
  it('合法整点区间原样返回', () => {
    expect(normSlotId('19:00-20:00')).toBe('19:00-20:00')
  })

  it('结束不晚于开始视为非法', () => {
    expect(normSlotId('20:00-20:00')).toBe('')
    expect(normSlotId('21:00-20:00')).toBe('')
  })

  it('非字符串 / 空串 / 半点非法', () => {
    expect(normSlotId(undefined)).toBe('')
    expect(normSlotId('  ')).toBe('')
    expect(normSlotId('19:30-20:30')).toBe('')
  })

  it('容错修正漏写 :00 的脏数据', () => {
    expect(normSlotId('19-20:00')).toBe('19:00-20:00')
  })
})

describe('schedule/slot · 格式化', () => {
  it('fmtSlot 带 en dash', () => {
    expect(fmtSlot('19:00-20:00')).toBe('19:00 – 20:00')
  })

  it('shortSlot 窄位置两位小时', () => {
    expect(shortSlot('19:00-20:00')).toBe('19-20')
  })

  it('slotRange 转分钟', () => {
    expect(slotRange('19:00-21:00')).toEqual([1140, 1260])
  })
})

describe('schedule/slot · findOverlap', () => {
  it('无重叠返回 null（首尾相接合法）', () => {
    expect(findOverlap(['19:00-20:00', '20:00-21:00', '21:00-22:00'])).toBeNull()
  })

  it('完全相同先经 Set 去重，不判重叠（与原型实现一致）', () => {
    expect(findOverlap(['19:00-20:00', '19:00-20:00'])).toBeNull()
  })

  it('部分相交判重叠', () => {
    expect(findOverlap(['19:00-21:00', '20:00-22:00'])).toEqual(['19:00-21:00', '20:00-22:00'])
  })

  it('自动去重后再判定，空列表安全', () => {
    expect(findOverlap([])).toBeNull()
    expect(findOverlap(['19:00-20:00'])).toBeNull()
  })
})

describe('schedule/slot · 日期工具', () => {
  it('fmtDate 输出补零的 YYYY-MM-DD', () => {
    expect(fmtDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('nextDayStr 处理跨月跨年', () => {
    expect(nextDayStr('2026-01-31')).toBe('2026-02-01')
    expect(nextDayStr('2026-12-31')).toBe('2027-01-01')
  })

  it('dayOfWeek 周日为 0', () => {
    // 2026-11-08 是周日
    expect(dayOfWeek('2026-11-08')).toBe(0)
  })

  it('daysInMonth 大小月与闰年 2 月', () => {
    expect(daysInMonth(2026, 11)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(daysInMonth(2028, 2)).toBe(29) // 2028 闰年
    expect(daysInMonth(2026, 2)).toBe(28)
  })

  it('monthLeadOffset 周一为起点（2026-11-01 周日 → 偏移 6）', () => {
    expect(monthLeadOffset(2026, 11)).toBe(6)
  })
})

describe('schedule/slot · previewRanges', () => {
  it('空集合返回 —', () => {
    expect(previewRanges([])).toBe('—')
  })

  it('连续日期合并成区间，单日原样', () => {
    const dates = new Set(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-10'])
    expect(previewRanges(dates)).toBe('2026-11-04 ~ 2026-11-06、2026-11-10')
  })

  it('超过 3 段追加「等 N 天」', () => {
    const dates = new Set(['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-09'])
    expect(previewRanges(dates)).toBe('2026-11-01、2026-11-03、2026-11-05 等 5 天')
  })

  it('乱序输入先排序', () => {
    const dates = new Set(['2026-11-10', '2026-11-04'])
    expect(previewRanges(dates)).toBe('2026-11-04、2026-11-10')
  })
})
