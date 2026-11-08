<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 完成订单弹窗（UI 复刻原型 order/list.vue 的「完成订单」el-dialog）
//
//   - 照片 URL 可增删行编辑、视频 URL 单行，均透传 Element 原生控件
//   - 「自动生成演示照片并提交」按 mock-server complete 兜底规则造 4 图 1 视频
//   - 空列表提交 = 后端自动兜底（server.js 同款语义），无需前端强校验
// 调用方只 `await completeDialog.open({ orderId, photos, videos })`。
//
// 模板结构说明：循环源用顶层 ref 数组（login 验证码行同款先例），
// 行对象属性直接 v-model；本 vue-tsc 版本对 computed/any 源、显式泛型
// reactive 源都会让 v-for 作用域生成失效（实测 :key 都报 Cannot find name）。
// ─────────────────────────────────────────────────────────────
import { ref, watch } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { useDialog } from '@/components/pro'
import { autoDemoPhotos } from '../mock'
import type { CompleteDialogParams, CompleteFormData, PhotoRow } from '../types'

defineOptions({ inheritAttrs: false })

const { visible, params, confirm, cancel } = useDialog<CompleteDialogParams, CompleteFormData>()

/** 照片行缓冲（每次 open 重建；提交时收集非空行） */
const photoRows = ref<PhotoRow[]>([{ url: '' }, { url: '' }])
const videoUrl = ref('')

/** 每次打开回填已有回传（再次编辑），无则给两行空位（原型 openComplete 同款） */
watch(visible, (open) => {
  if (!open) return
  const photos = params.photos?.length ? params.photos : ['', '']
  photoRows.value = photos.map((url) => ({ url }))
  videoUrl.value = params.videos?.[0] ?? ''
})

function removeRow(index: number): void {
  photoRows.value.splice(index, 1)
}

/** 行内编辑回写：原生 input 事件取 target.value（$event 收进 script 解构，
 *  模板里不做类型断言表达式） */
function setRowUrl(index: number, ev: unknown): void {
  const row = photoRows.value[index]
  if (!row) return
  const value =
    ev instanceof Event ? (ev.target as HTMLInputElement | null)?.value : String(ev ?? '')
  row.url = value ?? ''
}

function addRow(): void {
  photoRows.value.push({ url: '' })
}

function collect(): CompleteFormData {
  const photos = photoRows.value.map((r) => r.url.trim()).filter(Boolean)
  const videos = [videoUrl.value.trim()].filter(Boolean)
  return { photos, videos }
}

function submit() {
  confirm(collect())
}

/** 自动生成演示照片：填入 4 图 1 视频并直接提交（原型 autoComplete 同款） */
function autoSubmit() {
  const photos = autoDemoPhotos(params.orderId)
  const videos = [`/api/media/video/${params.orderId}-1`]
  photoRows.value = photos.map((url) => ({ url }))
  videoUrl.value = videos[0]
  confirm({ photos, videos })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    title="完成订单 · 回传现场照片/视频"
    width="min(560px, 94vw)"
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="照片 URL 列表（可编辑）">
        <div class="photo-grid">
          <!-- 原生 input + v-for：本 vue-tsc 版本对「v-for 挂 el-input」会
               整体丢失循环变量作用域（实测 key/属性/事件全报 Cannot find
               name，而 el-button/el-image 等先例无恙），原生元素走 login
               验证码行的同款代码路径；外观用主题变量复刻 el-input -->
          <input
            v-for="(row, i) in photoRows"
            :key="`u-${i}`"
            class="photo-input"
            type="text"
            :value="row.url"
            placeholder="https://... 或 /api/media/photo/xxx"
            :style="{ gridRow: String(i + 1) }"
            @input="setRowUrl(i, $event)"
          />
          <div class="photo-grid__layer">
            <el-button
              v-for="(_row, i) in photoRows"
              :key="`d-${i}`"
              :icon="Delete"
              circle
              plain
              type="danger"
              aria-label="删除该行"
              :style="{ gridRow: String(i + 1) }"
              @click="removeRow(i)"
            />
          </div>
        </div>
        <el-button :icon="Plus" plain size="small" @click="addRow">添加一行</el-button>
      </el-form-item>
      <el-form-item label="视频 URL（可编辑）">
        <el-input v-model="videoUrl" placeholder="视频地址（演示版为占位）" clearable />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button type="success" plain @click="autoSubmit">自动生成演示照片并提交</el-button>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="submit">提交完成</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 两列网格按行号配对 input+delete（原型 .photo-row：输入框铺满 + 圆形删除钮）；
   显式 gridRow 是因为本仓 vue-tsc 怪癖要求两组独立 v-for（详见上方注释） */
.photo-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
}

/* 包装层扁平化：按钮组仍参与 .photo-grid 的按行配对布局 */
.photo-grid__layer {
  display: contents;
}

/* 原生输入框按主题变量复刻 el-input（default size）外观 */
.photo-input {
  width: 100%;
  height: 32px;
  padding: 0 11px;
  font-size: 14px;
  line-height: 30px;
  color: var(--el-text-color-regular);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  outline: none;
  transition: border-color 0.2s ease;
}

.photo-input:hover {
  border-color: var(--el-border-color-hover);
}

.photo-input:focus {
  border-color: var(--el-color-primary);
}

.photo-input::placeholder {
  color: var(--el-text-color-placeholder);
}
</style>
