<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 二级「地图选点」弹窗
//
// 把 AMapPicker 收进一个按需弹出的对话框，由场地名称输入框右侧的「地图选点」
// 按钮触发，替代原先常驻表单顶部的整块大地图。
//
// 交互约定：
//   - 弹窗内的所有搜索 / 点选先落在本地草稿 draft，不直接动父表单；
//   - 点「确定选点」才把最终结果（WGS-84 名称/地址/坐标）一次性抛给父级回填；
//   - 取消 / 关闭直接丢弃草稿，父表单保持不变。
// 坐标转换（GCJ-02 → WGS-84）、POI 搜索、无 Key 手动降级全部复用 AMapPicker，
// 本组件只负责「弹窗 + 草稿」这层壳。
// ─────────────────────────────────────────────────────────────
import { computed, ref, watch } from 'vue'
import AMapPicker from './AMapPicker.vue'
import type { VenueLocation } from '../types'

const props = defineProps<{
  /** 弹窗显隐（v-model:visible） */
  visible: boolean
  /** 打开时的初始选点（WGS-84），取父表单当前名称/地址/坐标做回显 */
  initial: VenueLocation
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  /** 点击「确定选点」：回传最终选点（WGS-84），由父级一次性回填 */
  confirm: [location: VenueLocation]
}>()

/** 选点草稿：弹窗内的选择先落这里，确定才向外抛，取消即丢弃 */
const draft = ref<VenueLocation>({ ...props.initial })

// 每次打开用父级当前值重置草稿，保证二次进入回显的是已保存坐标而非上次草稿
watch(
  () => props.visible,
  (open) => {
    if (open) draft.value = { ...props.initial }
  },
)

// v-model 适配：把 visible 透传给 el-dialog，关闭动作（遮罩/X/取消）回传父级
const dialogVisible = computed<boolean>({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

function handleConfirm(): void {
  emit('confirm', { ...draft.value })
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="pro-dialog location-picker-dialog"
    title="地图选点 / 地点搜索（坐标按 WGS-84 存储）"
    width="min(680px, 94vw)"
    append-to-body
    :close-on-click-modal="false"
  >
    <AMapPicker v-model="draft" />

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定选点</el-button>
    </template>
  </el-dialog>
</template>
