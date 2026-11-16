// ─────────────────────────────────────────────────────────────
// 全局档期设置 mock 单测（src/views/schedule/mock.ts 的 global 部分）
//
// 覆盖：读取默认值、保存预约窗口范围（7-365）、默认时段非空/上限 12 段/
// 去重/重叠拦截（首尾相接合法），与原型 validateDefaultSlots 同口径。
// 注意：schedule/mock 顶部 import 了 order/mock，模块状态在同文件内共享，
// 故每个用例后用 resetScheduleStore 复位，避免相互串扰。
// ─────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest'
import { getGlobalSchedule, resetScheduleStore, saveGlobalSchedule } from '../mock'

beforeEach(() => {
  resetScheduleStore()
})

describe('schedule/mock · 全局档期设置', () => {
  it('初始默认时段为三段、预约窗口 60 天', () => {
    const g = getGlobalSchedule()
    expect(g.defaultSlots).toEqual(['19:00-20:00', '20:00-21:00', '21:00-22:00'])
    expect(g.bookingWindowDays).toBe(60)
  })

  it('合法预约窗口（7-365）可保存，越界抛错', () => {
    expect(saveGlobalSchedule({ bookingWindowDays: 30 }).bookingWindowDays).toBe(30)
    expect(() => saveGlobalSchedule({ bookingWindowDays: 6 })).toThrow('预约窗口需在 7-365 天之间')
    expect(() => saveGlobalSchedule({ bookingWindowDays: 366 })).toThrow(
      '预约窗口需在 7-365 天之间',
    )
  })

  it('默认时段：首尾相接合法、部分重叠被拦截', () => {
    // 首尾相接（19-20 与 20-21）不算重叠
    expect(
      saveGlobalSchedule({ defaultSlots: ['19:00-20:00', '20:00-21:00'] }).defaultSlots,
    ).toEqual(['19:00-20:00', '20:00-21:00'])
    // 部分相交算重叠
    expect(() => saveGlobalSchedule({ defaultSlots: ['19:00-21:00', '20:00-22:00'] })).toThrow(
      '重叠',
    )
  })

  it('默认时段：空数组拒绝、超过 12 段拒绝', () => {
    expect(() => saveGlobalSchedule({ defaultSlots: [] })).toThrow('不能为空')
    const many = Array.from({ length: 13 }, (_, i) => {
      const h = String(i).padStart(2, '0')
      const h2 = String(i + 1).padStart(2, '0')
      return `${h}:00-${h2}:00`
    })
    expect(() => saveGlobalSchedule({ defaultSlots: many })).toThrow('最多 12 段')
  })

  it('默认时段去重后写入', () => {
    const g = saveGlobalSchedule({
      defaultSlots: ['19:00-20:00', '19:00-20:00', '20:00-21:00'],
    })
    expect(g.defaultSlots).toEqual(['19:00-20:00', '20:00-21:00'])
  })
})
