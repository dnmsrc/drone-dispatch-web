// ─────────────────────────────────────────────────────────────
// 档期接口适配层单测（src/api/schedule.ts 的纯转换/决策函数）
//
// 重点锁定后端 VO 与前端视图（views/schedule/types.ts）的契约差异，防止口径变更静默出错：
//   - booked：后端只给 bookedSlots 逐时段计数 → 前端当日总数求和派生
//   - holiday/customHoliday：后端只有单字段 note（节日/休整说明共用）→ note 非空即手动标注，
//     holiday 优先 note、否则回退内置法定节假日表
//   - overridden：由 slotsOverridden || closed || note 非空 派生（后端无此字段）
//   - limit 异常值回退时段数；slots/bookedSlots 脏数据过滤
//   - 已订保护：已订时段强制保留（blocked 提示）；保护合并后重叠则整批记 conflicts
// 网络类函数（queryMonth / saveSlots 等）依赖 axios，不在此覆盖（由后端 curl 联调与页面冒烟验证）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  normalizeSlots,
  planSlotUpdates,
  toGlobalSchedule,
  toGlobalUpdatePayload,
  toScheduleCell,
  toScheduleMonth,
  type ScheduleCellDto,
  type ScheduleMonthDto,
} from '../schedule'
import { DEFAULT_SLOTS } from '@/views/schedule/slot'
import type { ScheduleCell } from '@/views/schedule/types'

/** 字段齐全的后端单日 DTO（默认「一段时段、无覆盖」形态） */
function baseCellDto(overrides: Partial<ScheduleCellDto> = {}): ScheduleCellDto {
  return {
    date: '2026-11-20',
    slots: ['19:00-20:00'],
    openSlots: ['19:00-20:00'],
    bookedSlots: {},
    limit: 1,
    closed: false,
    slotsOverridden: false,
    note: '',
    ...overrides,
  }
}

/** 前端视图 cell（planSlotUpdates 入参用） */
function baseCell(overrides: Partial<ScheduleCell> = {}): ScheduleCell {
  return {
    date: '2026-11-20',
    slots: ['19:00-20:00'],
    booked: 0,
    limit: 1,
    closed: false,
    holiday: '',
    customHoliday: false,
    bookedSlots: {},
    slotsOverridden: false,
    overridden: false,
    ...overrides,
  }
}

describe('toScheduleCell · 后端单日 VO 适配', () => {
  it('booked 由 bookedSlots 逐时段求和派生，limit 用后端派生值', () => {
    const row = toScheduleCell(
      baseCellDto({
        slots: ['19:00-20:00', '20:00-21:00'],
        bookedSlots: { '19:00-20:00': 1, '20:00-21:00': 2 },
        limit: 2,
      }),
    )
    expect(row.booked).toBe(3)
    expect(row.limit).toBe(2)
    expect(row.slots).toEqual(['19:00-20:00', '20:00-21:00'])
  })

  it('note 非空时 holiday 取 note 且标记 customHoliday（手动标注）', () => {
    const row = toScheduleCell(baseCellDto({ note: '店庆日' }))
    expect(row.holiday).toBe('店庆日')
    expect(row.customHoliday).toBe(true)
  })

  it('note 为空时 holiday 回退内置法定节假日表，且不算手动标注', () => {
    const row = toScheduleCell(baseCellDto({ date: '2026-10-01', note: '' }))
    expect(row.holiday).toBe('国庆节')
    expect(row.customHoliday).toBe(false)
  })

  it('note 只有空白字符时视为未标注（trim 后判定）', () => {
    const row = toScheduleCell(baseCellDto({ note: '   ' }))
    expect(row.holiday).toBe('')
    expect(row.customHoliday).toBe(false)
  })

  it('overridden 由 slotsOverridden/closed/note 三者任一为真派生', () => {
    expect(toScheduleCell(baseCellDto({ slotsOverridden: true })).overridden).toBe(true)
    expect(toScheduleCell(baseCellDto({ closed: true })).overridden).toBe(true)
    expect(toScheduleCell(baseCellDto({ note: '国庆' })).overridden).toBe(true)
    expect(toScheduleCell(baseCellDto()).overridden).toBe(false)
  })

  it('休整日：closed 保留、slots 为空数组', () => {
    const row = toScheduleCell(baseCellDto({ closed: true, slots: [], limit: 0 }))
    expect(row.closed).toBe(true)
    expect(row.slots).toEqual([])
    expect(row.limit).toBe(0)
    expect(row.overridden).toBe(true)
  })

  it('bookedSlots 为 null 时兜底空对象、booked 为 0', () => {
    const row = toScheduleCell(baseCellDto({ bookedSlots: null }))
    expect(row.bookedSlots).toEqual({})
    expect(row.booked).toBe(0)
  })

  it('bookedSlots 里的 0 项与非法计数被过滤（只有正数才算占用）', () => {
    const row = toScheduleCell(
      baseCellDto({
        bookedSlots: {
          '19:00-20:00': 0,
          '20:00-21:00': 1,
          '18:00-19:00': Number.NaN as unknown as number,
        },
      }),
    )
    expect(row.bookedSlots).toEqual({ '20:00-21:00': 1 })
    expect(row.booked).toBe(1)
  })

  it('slots 中的非法时段串被过滤，不向页面透出脏数据', () => {
    const row = toScheduleCell(baseCellDto({ slots: ['19:00-20:00', 'bad', '19-20:00'] }))
    // '19-20:00' 属历史脏数据，normSlotId 会修正为 '19:00-20:00' 后与首项去重
    expect(row.slots).toEqual(['19:00-20:00'])
  })

  it('limit 为负数/NaN（异常后端值）时回退时段数', () => {
    expect(toScheduleCell(baseCellDto({ limit: -1, slots: ['19:00-20:00'] })).limit).toBe(1)
    expect(
      toScheduleCell(baseCellDto({ limit: Number.NaN as unknown as number, slots: [] })).limit,
    ).toBe(0)
  })
})

describe('normalizeSlots · 时段规整', () => {
  it('去空、去重、规范化、排序', () => {
    expect(
      normalizeSlots(['20:00-21:00', '19:00-20:00', '', 'bad', null as unknown as string]),
    ).toEqual(['19:00-20:00', '20:00-21:00'])
  })

  it('null/undefined 入参返回空数组', () => {
    expect(normalizeSlots(null)).toEqual([])
    expect(normalizeSlots(undefined)).toEqual([])
  })
})

describe('toScheduleMonth · 后端月历 VO 适配', () => {
  it('days 逐项适配，defaultSlots 规范化', () => {
    const dto: ScheduleMonthDto = {
      days: [baseCellDto({ date: '2026-11-01' }), baseCellDto({ date: '2026-11-02' })],
      defaultSlots: ['20:00-21:00', '19:00-20:00'],
    }
    const month = toScheduleMonth(dto)
    expect(month.days).toHaveLength(2)
    expect(month.days[0].date).toBe('2026-11-01')
    expect(month.defaultSlots).toEqual(['19:00-20:00', '20:00-21:00'])
  })

  it('days/defaultSlots 缺失时兜底：空数组 + 内置默认时段', () => {
    expect(toScheduleMonth(null)).toEqual({ days: [], defaultSlots: DEFAULT_SLOTS.slice() })
    expect(toScheduleMonth({ days: null, defaultSlots: null })).toEqual({
      days: [],
      defaultSlots: DEFAULT_SLOTS.slice(),
    })
  })

  it('defaultSlots 显式空数组时如实返回空（区别于字段缺失的兜底）', () => {
    expect(toScheduleMonth({ days: [], defaultSlots: [] }).defaultSlots).toEqual([])
  })
})

describe('toGlobalSchedule · 全局设置适配', () => {
  it('正常字段透传', () => {
    expect(toGlobalSchedule({ defaultSlots: ['19:00-20:00'], bookingWindowDays: 90 })).toEqual({
      defaultSlots: ['19:00-20:00'],
      bookingWindowDays: 90,
    })
  })

  it('null 入参回退内置默认时段与 60 天窗口', () => {
    expect(toGlobalSchedule(null)).toEqual({
      defaultSlots: DEFAULT_SLOTS.slice(),
      bookingWindowDays: 60,
    })
  })

  it('时段为空/窗口非法（0、NaN）时各自回退兜底', () => {
    expect(toGlobalSchedule({ defaultSlots: [], bookingWindowDays: 0 })).toEqual({
      defaultSlots: DEFAULT_SLOTS.slice(),
      bookingWindowDays: 60,
    })
    expect(
      toGlobalSchedule({
        defaultSlots: null,
        bookingWindowDays: Number.NaN as unknown as number,
      }).bookingWindowDays,
    ).toBe(60)
  })
})

describe('toGlobalUpdatePayload · 保存请求体', () => {
  it('时段规范化排序、窗口 Number 归一', () => {
    const payload = toGlobalUpdatePayload({
      defaultSlots: ['21:00-22:00', '19:00-20:00'],
      bookingWindowDays: '30' as unknown as number,
    })
    expect(payload).toEqual({
      defaultSlots: ['19:00-20:00', '21:00-22:00'],
      bookingWindowDays: 30,
    })
  })
})

describe('planSlotUpdates · 已订保护与冲突检测', () => {
  it('slots=null（恢复默认）：逐日下发 null，不做已订保护', () => {
    const plan = planSlotUpdates(
      ['2026-11-20'],
      null,
      new Map([['2026-11-20', baseCell({ bookedSlots: { '19:00-20:00': 1 } })]]),
    )
    expect(plan.updates).toEqual([{ date: '2026-11-20', slots: null }])
    expect(plan.blocked).toEqual([])
    expect(plan.conflicts).toEqual([])
  })

  it('已订时段不在提交列表时强制保留，并计入 blocked', () => {
    const cell = baseCell({ bookedSlots: { '19:00-20:00': 1 } })
    const plan = planSlotUpdates(['2026-11-20'], ['20:00-21:00'], new Map([['2026-11-20', cell]]))
    expect(plan.updates[0].slots).toEqual(['19:00-20:00', '20:00-21:00'])
    expect(plan.blocked).toEqual(['19:00-20:00'])
  })

  it('提交列表已含已订时段时不重复加、blocked 为空', () => {
    const cell = baseCell({ bookedSlots: { '19:00-20:00': 1 } })
    const plan = planSlotUpdates(
      ['2026-11-20'],
      ['19:00-20:00', '20:00-21:00'],
      new Map([['2026-11-20', cell]]),
    )
    expect(plan.updates[0].slots).toEqual(['19:00-20:00', '20:00-21:00'])
    expect(plan.blocked).toEqual([])
  })

  it('多日 blocked 去重合并（同一已订时段只提示一次）', () => {
    const mk = (date: string) => baseCell({ date, bookedSlots: { '19:00-20:00': 1 } })
    const plan = planSlotUpdates(
      ['2026-11-20', '2026-11-21'],
      ['20:00-21:00'],
      new Map([
        ['2026-11-20', mk('2026-11-20')],
        ['2026-11-21', mk('2026-11-21')],
      ]),
    )
    expect(plan.blocked).toEqual(['19:00-20:00'])
    expect(plan.updates).toHaveLength(2)
  })

  it('未加载到 cell 的日期不做保护，原样提交', () => {
    const plan = planSlotUpdates(['2026-12-01'], ['20:00-21:00'], new Map())
    expect(plan.updates).toEqual([{ date: '2026-12-01', slots: ['20:00-21:00'] }])
    expect(plan.blocked).toEqual([])
  })

  it('保护合并后与新建时段重叠：记 conflicts 且该日不进 updates（整批可中止）', () => {
    // 已订 19-20，用户想改成 19-21（覆盖已订时段且变长）→ 无法既保留又不重叠
    const cell = baseCell({ bookedSlots: { '19:00-20:00': 1 } })
    const plan = planSlotUpdates(['2026-11-20'], ['19:00-21:00'], new Map([['2026-11-20', cell]]))
    expect(plan.conflicts).toEqual([{ date: '2026-11-20', pair: ['19:00-20:00', '19:00-21:00'] }])
    expect(plan.updates).toEqual([])
  })

  it('首尾相接的时段不算冲突（18-19 与已订 19-20 可共存）', () => {
    const cell = baseCell({ bookedSlots: { '19:00-20:00': 1 } })
    const plan = planSlotUpdates(
      ['2026-11-20'],
      ['18:00-19:00', '20:00-21:00'],
      new Map([['2026-11-20', cell]]),
    )
    expect(plan.conflicts).toEqual([])
    expect(plan.updates[0].slots).toEqual(['18:00-19:00', '19:00-20:00', '20:00-21:00'])
  })
})
