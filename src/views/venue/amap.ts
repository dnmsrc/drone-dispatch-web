// ─────────────────────────────────────────────────────────────
// 高德 JS API 适配层（SDK 动态类型在此集中隔离，业务组件不直接碰 AMap 全局）
//
// 设计目的：
//   高德 JS API 2.0 没有官方 TS 类型，loader 返回的也是动态命名空间。
//   本文件是唯一允许出现 any 的地方（用最小结构化接口约束 + 行内注释说明），
//   对外只暴露具名类型与 AmapMapController，Vue 组件拿到的都是干净类型，
//   从而把 no-explicit-any 限制在这一个适配文件内。
//
// 坐标系约定（重要）：
//   高德 SDK 内部、POI 搜索、地图点选、逆地理编码全程使用 GCJ-02；
//   本适配层出入参的经纬度一律是 GCJ-02（类型名带 Gcj 前缀），
//   转 WGS-84 落库由调用方用 ./crs 的 gcj02ToWgs84Rounded 完成。
// ─────────────────────────────────────────────────────────────
import AMapLoader from '@amap/amap-jsapi-loader'
import { env, isAmapEnabled } from '@/config/env'

/** GCJ-02 经纬度（高德坐标系，切勿与落库的 WGS-84 混用） */
export interface GcjLngLat {
  lng: number
  lat: number
}

/** POI 搜索结果项（坐标为 GCJ-02） */
export interface AmapPoi {
  id: string
  name: string
  /** 省市区 + 街道门牌的完整地址 */
  address: string
  location: GcjLngLat
  /** 行政区划码（可选，供后续按城市过滤） */
  adcode?: string
}

/** 逆地理编码结果 */
export interface AmapReverseResult {
  /** 格式化完整地址 */
  address: string
  /** 附近 POI 名称（可能为空） */
  name?: string
}

/** 需要加载的高德插件 */
const AMAP_PLUGINS = ['AMap.PlaceSearch', 'AMap.AutoComplete', 'AMap.Geocoder', 'AMap.Marker']

// 高德安全密钥需在 loader 之前挂到 window（2021-12 后申请的 Key 必须配合）
interface AmapSecurityWindow {
  _AMapSecurityConfig?: { securityJsCode: string }
}

/** 单例加载 Promise：整个应用只加载一次 SDK，重复调用复用同一 Promise */
let loadingPromise: Promise<unknown> | null = null

/**
 * 加载高德 JS API（单例）。未配置 Key 时直接 reject，由组件走手动降级。
 * 返回高德命名空间；其动态结构在本文件内以最小接口约束。
 */
export function loadAmap(): Promise<unknown> {
  if (!isAmapEnabled()) {
    return Promise.reject(new Error('未配置高德 JS API Key（VITE_AMAP_KEY），地图选点不可用'))
  }
  if (loadingPromise) return loadingPromise

  const win = window as unknown as AmapSecurityWindow
  if (env.amapSecurityCode) {
    win._AMapSecurityConfig = { securityJsCode: env.amapSecurityCode }
  }

  loadingPromise = AMapLoader.load({
    key: env.amapKey,
    version: '2.0',
    plugins: AMAP_PLUGINS,
  })
  // 加载失败时清空单例，允许下次重试（例如网络恢复后）
  loadingPromise.catch(() => {
    loadingPromise = null
  })
  return loadingPromise
}

/* ── 以下为 SDK 动态对象的最小结构化类型（仅描述本适配层用到的成员）── */
/* eslint-disable @typescript-eslint/no-explicit-any -- 高德无官方 TS 类型，适配层集中用 any 隔离 */
type SdkLngLat = { getLng: () => number; getLat: () => number }
type SdkMap = any
type SdkMarker = any
type SdkPlaceSearch = any
type SdkGeocoder = any
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 地图控制器：封装地图实例、Marker、POI 搜索、逆地理编码的全部 SDK 交互。
 * 组件只调它的公开方法，不接触 AMap 命名空间，便于降级与单测。
 */
export class AmapMapController {
  private map: SdkMap
  private marker: SdkMarker
  private placeSearch: SdkPlaceSearch
  private geocoder: SdkGeocoder

  private constructor(
    map: SdkMap,
    marker: SdkMarker,
    placeSearch: SdkPlaceSearch,
    geocoder: SdkGeocoder,
  ) {
    this.map = map
    this.marker = marker
    this.placeSearch = placeSearch
    this.geocoder = geocoder
  }

  /**
   * 在容器内创建地图与控制器。
   * @param container 地图挂载 DOM
   * @param center GCJ-02 初始中心
   */
  static async create(container: HTMLElement, center: GcjLngLat): Promise<AmapMapController> {
    const AMap = await loadAmap()
    /* eslint-disable @typescript-eslint/no-explicit-any -- 高德 SDK 动态实例化，无类型可用 */
    const map = new (AMap as any).Map(container, {
      zoom: 15,
      center: [center.lng, center.lat],
      viewMode: '2D',
    })
    const marker = new (AMap as any).Marker({
      position: [center.lng, center.lat],
      draggable: true,
    })
    marker.setMap(map)
    const placeSearch = new (AMap as any).PlaceSearch({ pageSize: 10, pageIndex: 1 })
    const geocoder = new (AMap as any).Geocoder({ extensions: 'base' })
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return new AmapMapController(map, marker, placeSearch, geocoder)
  }

  /** 移动地图中心与 Marker（不触发点击回调） */
  setCenter(point: GcjLngLat): void {
    this.map.setCenter([point.lng, point.lat])
    this.marker.setPosition([point.lng, point.lat])
  }

  /**
   * 注册地图点击选点：点击后移动 Marker 并把 GCJ-02 坐标回传。
   * @returns 取消监听函数
   */
  onMapPick(handler: (point: GcjLngLat) => void): () => void {
    const listener = (e: { lnglat: SdkLngLat }) => {
      const point = { lng: e.lnglat.getLng(), lat: e.lnglat.getLat() }
      this.marker.setPosition([point.lng, point.lat])
      handler(point)
    }
    this.map.on('click', listener)
    return () => this.map.off('click', listener)
  }

  /**
   * 注册 Marker 拖拽结束选点（精修位置），回传 GCJ-02 坐标。
   * @returns 取消监听函数
   */
  onMarkerDrag(handler: (point: GcjLngLat) => void): () => void {
    // 拖拽事件只绑在 marker 实例上；地图自身的 dragend 是平移，语义不同，不能混用
    const listener = (e: { lnglat: SdkLngLat }) => {
      handler({ lng: e.lnglat.getLng(), lat: e.lnglat.getLat() })
    }
    this.marker.on('dragend', listener)
    return () => this.marker.off('dragend', listener)
  }

  /** 关键词 POI 搜索，返回归一化结果（坐标 GCJ-02） */
  search(keyword: string): Promise<AmapPoi[]> {
    const kw = keyword.trim()
    if (!kw) return Promise.resolve([])
    return new Promise((resolve, reject) => {
      this.placeSearch.search(kw, (status: string, result: { poiList?: { pois: unknown[] } }) => {
        // 高德回调 status 为 'complete' 表示成功；无结果时 pois 为空数组
        if (status !== 'complete' || !result?.poiList?.pois) {
          resolve([])
          return
        }
        try {
          /* eslint-disable @typescript-eslint/no-explicit-any -- 归一化 SDK 原始 POI 结构 */
          const list = result.poiList.pois.map((raw: any) => ({
            id: String(raw.id ?? ''),
            name: String(raw.name ?? ''),
            address: String(raw.address ?? raw.pname ?? ''),
            adcode: raw.adcode != null ? String(raw.adcode) : undefined,
            location: { lng: Number(raw.location?.lng ?? 0), lat: Number(raw.location?.lat ?? 0) },
          }))
          /* eslint-enable @typescript-eslint/no-explicit-any */
          resolve(list.filter((p: AmapPoi) => Number.isFinite(p.location.lng)))
        } catch (err) {
          reject(err instanceof Error ? err : new Error('POI 数据解析失败'))
        }
      })
    })
  }

  /** 逆地理编码：GCJ-02 坐标 → 结构化地址 */
  reverseGeocode(point: GcjLngLat): Promise<AmapReverseResult | null> {
    return new Promise((resolve) => {
      this.geocoder.getAddress(
        [point.lng, point.lat],
        (status: string, result: { regeocode?: { formattedAddress?: string } }) => {
          if (status !== 'complete' || !result?.regeocode) {
            resolve(null)
            return
          }
          resolve({ address: result.regeocode.formattedAddress ?? '' })
        },
      )
    })
  }

  /** 销毁地图，释放 SDK 资源（弹窗关闭时调用） */
  destroy(): void {
    try {
      this.map?.destroy()
    } catch {
      /* 容器已卸载时 destroy 可能抛错，忽略即可 */
    }
  }
}
