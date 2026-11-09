// ─────────────────────────────────────────────────────────────
// 字典管理 · 静态数据源（内存两级 CRUD，刷新回滚到种子）
//
// 种子逐字对齐 mock-server seed.js 的 buildDicts + biz/drone.js：
//   6 个系统内置类型（drone_tier/duration/pattern/addon/time_slot/refund_rule，
//   system:true，计价引擎引用）+ 1 个非内置 order_status（system:false）。
// 动作复刻 server.js /admin/dict 全部校验：
//   - 类型标识正则 /^[a-z][a-z0-9_]{1,31}$/、唯一；名称必填
//   - 内置类型不可删；字典项键唯一、标签必填
//   - value Number() 兜底、status 归 1/0、新增 id 取 类型_时间戳36进制
// TODO(server): 接 /admin/dict 系列后只替换本文件实现，页面不改名。
// ─────────────────────────────────────────────────────────────
import type {
  DictItem,
  DictItemForm,
  DictTypeDetail,
  DictTypeForm,
  DictTypeSummary,
} from './dict-types'

interface DictTypeInternal {
  type: string
  name: string
  remark: string
  system: boolean
  items: DictItem[]
}

/** 构造一条字典项（id 规则同 seed buildDicts 的 类型_序号） */
function item(
  type: string,
  i: number,
  key: string,
  label: string,
  value: number,
  extra = '',
): DictItem {
  return { id: `${type}_${i + 1}`, key, label, value, extra, sort: i + 1, status: 1 }
}

/** 字典种子（buildDicts + biz/drone.js 逐条搬运） */
function buildSeed(): DictTypeInternal[] {
  return [
    {
      type: 'drone_tier',
      name: '架次档位',
      remark: '下单可选的规格档位；值=基础价（元），说明=适用场景',
      system: true,
      items: [
        item('drone_tier', 0, '100', '100 架', 18800, '适合小型告白、生日惊喜'),
        item('drone_tier', 1, '200', '200 架', 28800, '适合婚礼、周年庆典'),
        item('drone_tier', 2, '300', '300 架', 38800, '适合大型求婚、品牌发布'),
        item('drone_tier', 3, '500', '500 架', 58800, '适合企业年会、城市活动'),
        item('drone_tier', 4, '1000', '1000 架', 98800, '适合大型节庆、城市级表演'),
      ],
    },
    {
      type: 'duration',
      name: '表演时长',
      remark: '可选服务时长；值=在基础价上的加价（元），0 表示含在基础价内',
      system: true,
      items: [
        item('duration', 0, '10', '10 分钟（标准）', 0),
        item('duration', 1, '15', '15 分钟', 6000),
        item('duration', 2, '20', '20 分钟', 12000),
      ],
    },
    {
      type: 'pattern',
      name: '预设图案',
      remark: 'H5 下单页可选的预设图案（任选，不加价；本业务特有选项）',
      system: true,
      items: [
        item('pattern', 0, 'heart', '爱心', 0),
        item('pattern', 1, 'ring', '钻戒', 0),
        item('pattern', 2, 'star', '星辰', 0),
        item('pattern', 3, 'phoenix', '凤凰', 0),
        item('pattern', 4, 'rose', '玫瑰', 0),
        item('pattern', 5, 'moon', '月亮船', 0),
      ],
    },
    {
      type: 'addon',
      name: '附加服务',
      remark: '下单可叠加的增值服务；值=加价（元）',
      system: true,
      items: [
        item('addon', 0, 'music', '专属音乐编曲', 1000),
        item('addon', 1, 'narration', '现场旁白解说', 2000),
        item('addon', 2, 'aerial', '双机位航拍记录', 3000),
        item('addon', 3, 'urgent', '加急服务（48h 内安排）', 8000),
      ],
    },
    {
      type: 'time_slot',
      name: '演出时段',
      remark: '每日可预约的服务开始时间（HH:mm）',
      system: true,
      items: [
        item('time_slot', 0, '19:00-20:00', '19:00-20:00', 0),
        item('time_slot', 1, '20:00-21:00', '20:00-21:00', 0),
        item('time_slot', 2, '21:00-22:00', '21:00-22:00', 0),
      ],
    },
    {
      type: 'refund_rule',
      name: '退款阶梯',
      remark: '键=距服务小时数下限，值=退款比例（0-1）；按小时数从高到低匹配第一条',
      system: true,
      items: [
        item('refund_rule', 0, '168', '距表演 7 天以上，退 90%', 0.9),
        item('refund_rule', 1, '72', '距表演 3-7 天，退 50%', 0.5),
        item('refund_rule', 2, '24', '距表演 1-3 天，退 20%', 0.2),
        item('refund_rule', 3, '0', '距表演不足 24 小时，不可退款', 0),
      ],
    },
    {
      type: 'order_status',
      name: '订单状态',
      remark: '订单生命周期状态枚举（通用字典用法示例，可按业务扩展）',
      system: false,
      items: [
        item('order_status', 0, 'PENDING_PAY', '待支付', 0),
        item('order_status', 1, 'PENDING_ACCEPT', '待接单', 0),
        item('order_status', 2, 'ACCEPTED', '已接单', 0),
        item('order_status', 3, 'IN_SERVICE', '执行中', 0),
        item('order_status', 4, 'COMPLETED', '已完成', 0),
        item('order_status', 5, 'REVIEWED', '已评价', 0),
        item('order_status', 6, 'CANCELLED', '已取消', 0),
        item('order_status', 7, 'REFUNDING', '退款中', 0),
        item('order_status', 8, 'REFUNDED', '已退款', 0),
      ],
    },
  ]
}

const dictStore: { types: DictTypeInternal[] } = {
  types: buildSeed(),
}

function findDict(type: string): DictTypeInternal {
  const d = dictStore.types.find((x) => x.type === type)
  if (!d) throw new Error('字典类型不存在')
  return d
}

/** 深拷贝（防止外部直接改内存） */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/* ═══ 字典类型 ═══ */

/** 类型列表（等价 GET /admin/dict，汇总条目数） */
export function queryDictTypes(): DictTypeSummary[] {
  return dictStore.types.map((d) => ({
    type: d.type,
    name: d.name,
    remark: d.remark,
    system: d.system,
    itemCount: d.items.length,
    enabledCount: d.items.filter((i) => i.status !== 0).length,
  }))
}

/** 新增类型（等价 POST /admin/dict/types） */
export function createDictType(form: DictTypeForm): void {
  const type = (form.type || '').trim()
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(type)) {
    throw new Error('类型标识需为小写字母开头的英文/数字/下划线（2-32 位）')
  }
  if (dictStore.types.some((d) => d.type === type)) throw new Error('类型标识已存在')
  if (!(form.name || '').trim()) throw new Error('请填写类型名称')
  dictStore.types.push({
    type,
    name: form.name.trim().slice(0, 20),
    remark: (form.remark || '').trim().slice(0, 100),
    system: false,
    items: [],
  })
}

/** 编辑类型（等价 PUT /admin/dict/types/:type；类型标识不可改） */
export function updateDictType(type: string, form: DictTypeForm): void {
  const d = findDict(type)
  if (form.name != null && form.name.trim()) d.name = form.name.trim().slice(0, 20)
  if (form.remark != null) d.remark = form.remark.trim().slice(0, 100)
}

/** 删除类型（等价 DELETE；内置类型拒绝） */
export function deleteDictType(type: string): void {
  const d = findDict(type)
  if (d.system) throw new Error('系统内置字典被业务引用，不可删除（可停用或修改字典项）')
  dictStore.types = dictStore.types.filter((x) => x.type !== type)
}

/* ═══ 字典项 ═══ */

/** 某类型的字典项详情（等价 GET /admin/dict/:type/items） */
export function queryDictItems(type: string): DictTypeDetail {
  const d = findDict(type)
  return {
    type: d.type,
    name: d.name,
    remark: d.remark,
    system: d.system,
    itemCount: d.items.length,
    enabledCount: d.items.filter((i) => i.status !== 0).length,
    list: clone(d.items),
  }
}

/** 新增字典项（等价 POST /admin/dict/:type/items） */
export function createDictItem(type: string, form: DictItemForm): void {
  const d = findDict(type)
  const key = String(form.key ?? '').trim()
  if (!key) throw new Error('请填写键')
  if (d.items.some((i) => i.key === key)) throw new Error(`键「${key}」已存在`)
  if (!(form.label || '').trim()) throw new Error('请填写标签')
  d.items.push({
    id: `${d.type}_${Date.now().toString(36)}`,
    key: key.slice(0, 40),
    label: form.label.trim().slice(0, 40),
    value: Number(form.value) || 0,
    extra: (form.extra || '').trim().slice(0, 100),
    sort: Number(form.sort) || d.items.length + 1,
    status: form.status === 0 ? 0 : 1,
  })
}

/** 编辑字典项（等价 PUT；内置类型改键也允许但仍校验唯一，原型仅禁用输入框） */
export function updateDictItem(type: string, id: string, form: Partial<DictItemForm>): void {
  const d = findDict(type)
  const target = d.items.find((i) => i.id === id)
  if (!target) throw new Error('字典项不存在')
  if (form.key != null && String(form.key).trim() !== target.key) {
    const key = String(form.key).trim()
    if (d.items.some((i) => i.key === key && i.id !== id)) throw new Error(`键「${key}」已存在`)
    target.key = key.slice(0, 40)
  }
  if (form.label != null && form.label.trim()) target.label = form.label.trim().slice(0, 40)
  if (form.value != null) target.value = Number(form.value) || 0
  if (form.extra != null) target.extra = form.extra.trim().slice(0, 100)
  if (form.sort != null) target.sort = Number(form.sort) || target.sort
  if (form.status != null) target.status = form.status === 0 ? 0 : 1
}

/** 切换启用状态（等价 PUT 仅传 status） */
export function toggleDictItem(type: string, id: string, enabled: boolean): void {
  updateDictItem(type, id, { status: enabled ? 1 : 0 })
}

/** 删除字典项（等价 DELETE） */
export function deleteDictItem(type: string, id: string): void {
  const d = findDict(type)
  const idx = d.items.findIndex((x) => x.id === id)
  if (idx < 0) throw new Error('字典项不存在')
  d.items.splice(idx, 1)
}
