<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 高德地图选点组件（场地管理专用）
//
// 两种形态，对父组件透明（v-model 始终是 WGS-84 的 name/address/lng/lat）：
//   1) 高德可用（配置了 VITE_AMAP_KEY 且 SDK 加载成功）：
//      关键词 POI 搜索 + 地图点击 / Marker 拖拽选点 + 逆地理回填地址，
//      组件内部完成 GCJ-02 → WGS-84 转换，输出即落库坐标。
//   2) 降级形态（未配置 Key / 加载失败 / 断网）：
//      回退为手动输入经纬度（沿用原 input-number 口径），保证页面始终可用。
//
// 坐标系：高德全程 GCJ-02，仅在向外 emit 的瞬间转 WGS-84（gcj02ToWgs84Rounded）。
// ─────────────────────────────────────────────────────────────
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { env, isAmapEnabled } from '@/config/env'
import { gcj02ToWgs84Rounded, wgs84ToGcj02 } from '../crs'
import { AmapMapController, type AmapPoi, type GcjLngLat } from '../amap'
import type { VenueLocation } from '../types'

const props = defineProps<{
  /** 当前值（WGS-84）；新增时父级给默认坐标，编辑时回填 */
  modelValue: VenueLocation
}>()

const emit = defineEmits<{
  'update:modelValue': [value: VenueLocation]
}>()

/* ═══ 地图状态 ═══ */
const mapContainer = ref<HTMLElement | null>(null)
const loadingMap = ref(false)
/** 地图是否成功进入可用形态（false 时渲染手动降级表单） */
const mapReady = ref(false)
/** 降级原因，用于提示（未配置 Key / 加载失败） */
const fallbackReason = ref('')

let controller: AmapMapController | null = null
let disposePick: (() => void) | null = null
let disposeDrag: (() => void) | null = null

/* ═══ 搜索状态 ═══ */
const keyword = ref('')
const searching = ref(false)
const poiList = ref<AmapPoi[]>([])

/* ═══ 手动降级表单（坐标也是 WGS-84，直接输出）═══ */
const manualLng = ref(props.modelValue.lng)
const manualLat = ref(props.modelValue.lat)

/** 把一个 GCJ-02 选点转成 WGS-84 并向外抛出 */
function emitGcjPoint(point: GcjLngLat, name?: string, address?: string): void {
  const wgs = gcj02ToWgs84Rounded(point)
  emit('update:modelValue', {
    name: name ?? props.modelValue.name,
    address: address ?? props.modelValue.address,
    lng: wgs.lng,
    lat: wgs.lat,
  })
}

/** 初始化高德地图；任何失败都切到手动降级，不阻断录入 */
async function initMap(): Promise<void> {
  if (!isAmapEnabled()) {
    fallbackReason.value = '未配置高德 Key（VITE_AMAP_KEY）'
    return
  }
  loadingMap.value = true
  try {
    // 回显：父级存的是 WGS-84，地图需要 GCJ-02，先正向转换
    const centerGcj = wgs84ToGcj02({
      lng: props.modelValue.lng || env.amapDefaultCenter.lng,
      lat: props.modelValue.lat || env.amapDefaultCenter.lat,
    })
    // 容器常驻 DOM（v-show 切换），onMounted 时 ref 必然存在
    if (!mapContainer.value) {
      fallbackReason.value = '地图容器未就绪'
      return
    }
    controller = await AmapMapController.create(mapContainer.value, centerGcj)
    disposePick = controller.onMapPick((point) => {
      void applyReverse(point)
    })
    disposeDrag = controller.onMarkerDrag((point) => {
      void applyReverse(point)
    })
    mapReady.value = true
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    fallbackReason.value = `高德地图加载失败：${detail}`
    console.warn('[AMapPicker] 地图初始化失败，降级手动录入：', err)
  } finally {
    loadingMap.value = false
  }
}

/** 选点后逆地理编码回填地址（逆地理失败不影响坐标已选中） */
async function applyReverse(point: GcjLngLat): Promise<void> {
  if (!controller) {
    emitGcjPoint(point)
    return
  }
  const rev = await controller.reverseGeocode(point).catch(() => null)
  emitGcjPoint(point, undefined, rev?.address || props.modelValue.address)
}

/** 关键词搜索（带最小 loading 体验，结果为空给提示） */
async function doSearch(): Promise<void> {
  const kw = keyword.value.trim()
  if (!kw || !controller) return
  searching.value = true
  try {
    poiList.value = await controller.search(kw)
    if (!poiList.value.length) {
      // 高德返回 USERKEY_PLAT_NOMATCH(10009) 等平台错误时 POI 服务静默为空，
      // 这里给可操作提示：底图点选/拖拽仍可用，不阻断录入。
      ElMessage.warning('未获取到地点结果（可能是 Key 类型不含 POI 服务），可直接在地图点选')
    }
  } catch {
    ElMessage.error('地点搜索失败，请检查网络后重试，或直接在地图点选')
  } finally {
    searching.value = false
  }
}

/** 选中某个 POI：移动地图、回填名称地址与坐标 */
function pickPoi(poi: AmapPoi): void {
  if (!controller) return
  controller.setCenter(poi.location)
  poiList.value = []
  keyword.value = poi.name
  emitGcjPoint(poi.location, poi.name, poi.address)
}

/** 手动降级：经纬度输入即时向外同步（WGS-84） */
function syncManual(): void {
  emit('update:modelValue', {
    ...props.modelValue,
    lng: Number(manualLng.value) || 0,
    lat: Number(manualLat.value) || 0,
  })
}

/** 外部值变化时同步手动表单（地图 Marker 由选点动作自身维护，避免回环） */
watch(
  () => [props.modelValue.lng, props.modelValue.lat],
  ([lng, lat]) => {
    manualLng.value = Number(lng)
    manualLat.value = Number(lat)
  },
)

onMounted(() => {
  void initMap()
})

onBeforeUnmount(() => {
  disposePick?.()
  disposeDrag?.()
  controller?.destroy()
  controller = null
})
</script>

<template>
  <div class="amap-picker">
    <!-- 降级提示（加载中不显示，避免与 loading 态重叠） -->
    <el-alert
      v-if="!mapReady && !loadingMap"
      type="warning"
      :closable="false"
      show-icon
      class="fallback-tip"
      :title="`地图选点不可用（${fallbackReason || '未知原因'}），请手动填写经纬度（WGS-84）`"
    />

    <!-- 地图形态：容器常驻 DOM（v-show 切换），保证 onMounted 时 ref 一定存在 -->
    <div v-show="mapReady" class="map-panel">
      <el-input
        v-model="keyword"
        placeholder="输入地名 / 地址关键词搜索，回车选择，或直接在地图点选"
        clearable
        class="search-input"
        @keyup.enter="doSearch"
      >
        <template #append>
          <el-button :loading="searching" @click="doSearch">搜索</el-button>
        </template>
      </el-input>

      <!-- POI 联想结果 -->
      <div v-if="poiList.length" class="poi-panel">
        <div
          v-for="poi in poiList"
          :key="poi.id || `${poi.location.lng},${poi.location.lat}`"
          class="poi-item"
          @click="pickPoi(poi)"
        >
          <div class="poi-name">{{ poi.name }}</div>
          <div class="poi-addr">{{ poi.address || '—' }}</div>
        </div>
      </div>

      <div ref="mapContainer" class="map-container" />
      <p class="map-hint">点击地图或拖拽标记选点；坐标已按 WGS-84 输出，可直接保存</p>
    </div>

    <!-- 加载中 -->
    <div v-if="loadingMap" v-loading="true" class="map-loading" />

    <!-- 手动降级表单（WGS-84，与原裸输入口径一致） -->
    <div v-if="!mapReady && !loadingMap" class="manual-grid">
      <el-input-number
        v-model="manualLng"
        :precision="6"
        :step="0.000001"
        :min="-180"
        :max="180"
        controls-position="right"
        placeholder="经度"
        @change="syncManual"
      />
      <el-input-number
        v-model="manualLat"
        :precision="6"
        :step="0.000001"
        :min="-90"
        :max="90"
        controls-position="right"
        placeholder="纬度"
        @change="syncManual"
      />
    </div>
  </div>
</template>

<style scoped>
.amap-picker {
  width: 100%;
}

.fallback-tip {
  margin-bottom: 10px;
}

.search-input {
  margin-bottom: 8px;
}

.poi-panel {
  border: 1px solid var(--app-border-color, #e4e7ed);
  border-radius: 6px;
  max-height: 180px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.poi-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--app-border-color-lighter, #f0f2f5);
}

.poi-item:last-child {
  border-bottom: none;
}

.poi-item:hover {
  background: var(--app-color-primary-light-9, #ecf5ff);
}

.poi-name {
  font-size: 13px;
  color: var(--app-text-primary, #303133);
}

.poi-addr {
  font-size: 12px;
  color: var(--app-text-secondary, #909399);
  margin-top: 2px;
}

.map-container {
  width: 100%;
  height: 320px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--app-border-color, #e4e7ed);
}

.map-loading {
  width: 100%;
  height: 320px;
  border-radius: 6px;
  background: var(--app-fill-color-light, #f5f7fa);
}

.map-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-text-secondary, #909399);
}

.manual-grid {
  display: flex;
  gap: 12px;
}

.manual-grid :deep(.el-input-number) {
  flex: 1;
  width: 100%;
}
</style>
