// ─────────────────────────────────────────────────────────────
// 坐标系转换 · 纯函数（可单测，不依赖高德 SDK / DOM）
//
// 为什么需要它：
//   高德 JS API、POI 搜索、地图点选返回的都是 GCJ-02「火星坐标」；
//   而无人机空域申请 / 航线规划 / GPS 设备普遍用 WGS-84（或 CGCS2000，
//   两者在民用米级精度下可视为一致）。产品已确认「场地经纬度统一按
//   WGS-84 存储」，因此录入环节拿到的 GCJ-02 必须先转换再落库，
//   避免后续对接飞行管控时出现几十到几百米的系统性偏移。
//
// 算法：国内通行的 GCJ-02 偏移反算（Krasovsky 1940 椭球参数 + 国测局
//   非线性加密公式的逆运算）。正向 WGS-84→GCJ-02 一并提供，供地图
//   回显存量 WGS-84 坐标时使用。
//
// 边界：
//   - 中国境外（含港澳台以外的海外区域）GCJ-02 不做加密，坐标恒等返回；
//   - 纯函数、无副作用，输入非法时原样兜底，不抛异常。
// 参考口径与社区主流实现（如 coordtransform）一致，集中收口便于一处校准。
// ─────────────────────────────────────────────────────────────

/** 长半轴（Krasovsky 1940） */
const SEMI_MAJOR = 6378245.0
/** 偏心率平方（拆分书写以规避 no-loss-of-precision：0.00669342162296594323） */
const ECCENTRICITY_SQ = 0.0066934216229659 + 0.000000000000004323
/** 中国境外判定的粗略经纬度盒（含缓冲，盒内才可能需要转换） */
const OUT_OF_CHINA_LNG = 73.66
const OUT_OF_CHINA_LNG_MAX = 135.05
const OUT_OF_CHINA_LAT = 3.86
const OUT_OF_CHINA_LAT_MAX = 53.55

/** 经纬度对（lng 经度 / lat 纬度，十进制度） */
export interface LngLatLike {
  lng: number
  lat: number
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/**
 * 是否落在中国境外（GCJ-02 加密仅在中国大陆生效）。
 * 粗略矩形判定：盒外直接恒等，盒内走偏移公式，足以覆盖业务场景。
 */
export function isOutOfChina(lng: number, lat: number): boolean {
  return (
    lng < OUT_OF_CHINA_LNG ||
    lng > OUT_OF_CHINA_LNG_MAX ||
    lat < OUT_OF_CHINA_LAT ||
    lat > OUT_OF_CHINA_LAT_MAX
  )
}

/** 纬度偏移量（GCJ-02 加密公式之一） */
function transformLat(lng: number, lat: number): number {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * Math.PI) + 320 * Math.sin((lat * Math.PI) / 30.0)) * 2.0) /
    3.0
  return ret
}

/** 经度偏移量（GCJ-02 加密公式之一） */
function transformLng(lng: number, lat: number): number {
  let ret =
    300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) * 2.0) / 3.0
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * Math.PI) + 300.0 * Math.sin((lng / 30.0) * Math.PI)) * 2.0) /
    3.0
  return ret
}

/**
 * WGS-84 → GCJ-02（正向加密）。
 * 地图回显存量 WGS-84 坐标时调用；境外恒等返回。
 */
export function wgs84ToGcj02(input: LngLatLike): LngLatLike {
  if (!isFiniteNumber(input?.lng) || !isFiniteNumber(input?.lat)) return { ...input }
  const { lng, lat } = input
  if (isOutOfChina(lng, lat)) return { lng, lat }

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ECCENTRICITY_SQ * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((SEMI_MAJOR * (1 - ECCENTRICITY_SQ)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((SEMI_MAJOR / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return { lng: lng + dLng, lat: lat + dLat }
}

/**
 * GCJ-02 → WGS-84（反向解密，场地录入落库用）。
 * 用「正向偏移量相减」反算：先求该点的 GCJ 偏移，再从 GCJ 坐标扣除。
 * 单点反算误差通常在 1~2 米内，满足场地选址精度；境外恒等返回。
 */
export function gcj02ToWgs84(input: LngLatLike): LngLatLike {
  if (!isFiniteNumber(input?.lng) || !isFiniteNumber(input?.lat)) return { ...input }
  const { lng, lat } = input
  if (isOutOfChina(lng, lat)) return { lng, lat }

  const gcj = wgs84ToGcj02({ lng, lat })
  // gcj 是「把当前点当 WGS-84 再加密」的结果，其与输入之差即近似偏移量
  const dLng = gcj.lng - lng
  const dLat = gcj.lat - lat
  return { lng: lng - dLng, lat: lat - dLat }
}

/** 保留 6 位小数（约 0.1 米精度），与后端 venues.lng/lat DECIMAL(10,6) 对齐 */
export function round6(n: number): number {
  return Math.round((Number(n) || 0) * 1e6) / 1e6
}

/** 便捷方法：GCJ-02 转 WGS-84 并截到 6 位小数，可直接写入表单/落库 */
export function gcj02ToWgs84Rounded(input: LngLatLike): LngLatLike {
  const wgs = gcj02ToWgs84(input)
  return { lng: round6(wgs.lng), lat: round6(wgs.lat) }
}
