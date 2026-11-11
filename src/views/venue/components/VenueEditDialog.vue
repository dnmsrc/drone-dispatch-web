<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 场地新增 / 编辑弹窗（自定义业务弹窗，经 wrapDialog 包成命令式句柄）
//
// 不再用裸 input-number 填经纬度：中部 AMapPicker 负责「地名搜索 + 地图点选」，
// 选中后把 WGS-84 坐标与名称/地址回填到表单，人工仍可微调名称与地址。
// 数据契约沿用 VenueForm（name/address/lng/lat/enabled），mock 与后端 CRUD 不改名。
// ─────────────────────────────────────────────────────────────
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useDialog } from '@/components/pro'
import AMapPicker from './AMapPicker.vue'
import type { VenueEditParams, VenueForm, VenueLocation } from '../types'

defineOptions({ inheritAttrs: false })

const { visible, params, confirm, cancel } = useDialog<VenueEditParams, VenueForm>()

const formRef = ref<FormInstance>()

const DEFAULT_CENTER = { lng: 120.2, lat: 30.25 }

const form = reactive<VenueForm>({
  name: '',
  address: '',
  lng: DEFAULT_CENTER.lng,
  lat: DEFAULT_CENTER.lat,
  enabled: true,
})

/** 每次打开按「新增 / 编辑」重置表单与校验态 */
watch(visible, (open) => {
  if (!open) return
  const row = params.row
  form.name = row?.name ?? ''
  form.address = row?.address ?? ''
  form.lng = row?.lng ?? DEFAULT_CENTER.lng
  form.lat = row?.lat ?? DEFAULT_CENTER.lat
  form.enabled = row?.enabled ?? true
  formRef.value?.clearValidate()
})

const rules: FormRules<VenueForm> = {
  name: [{ required: true, message: '请填写场地名称', trigger: 'blur' }],
  address: [{ required: true, message: '请填写详细地址', trigger: 'blur' }],
  lng: [
    {
      validator: (_r, value: number, cb) =>
        Number.isFinite(value) && value >= -180 && value <= 180
          ? cb()
          : cb(new Error('经度需在 -180 ~ 180 之间')),
      trigger: 'change',
    },
  ],
  lat: [
    {
      validator: (_r, value: number, cb) =>
        Number.isFinite(value) && value >= -90 && value <= 90
          ? cb()
          : cb(new Error('纬度需在 -90 ~ 90 之间')),
      trigger: 'change',
    },
  ],
}

/** 地图选点回调：回填坐标；POI/逆地理带回名称地址时一并填充（人工可再改） */
function onLocationChange(loc: VenueLocation): void {
  form.lng = loc.lng
  form.lat = loc.lat
  if (loc.name) form.name = loc.name
  if (loc.address) form.address = loc.address
  void formRef.value?.validateField(['lng', 'lat'])
}

/** AMapPicker 的 v-model 只取坐标与名称地址，enabled 由开关单独维护 */
const pickerValue = ref<VenueLocation>({ name: '', address: '', lng: form.lng, lat: form.lat })
watch(
  () => [form.lng, form.lat, form.name, form.address],
  ([lng, lat, name, address]) => {
    pickerValue.value = {
      lng: Number(lng),
      lat: Number(lat),
      name: String(name),
      address: String(address),
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  confirm({
    name: form.name.trim(),
    address: form.address.trim(),
    lng: Number(form.lng),
    lat: Number(form.lat),
    enabled: form.enabled,
  })
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="pro-dialog"
    :title="params.row ? '编辑场地' : '新增场地'"
    width="min(720px, 94vw)"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="venue-form">
      <el-form-item label="场地名称" prop="name">
        <el-input v-model="form.name" maxlength="30" placeholder="例如：滨江世纪广场" />
      </el-form-item>

      <el-form-item label="详细地址" prop="address">
        <el-input
          v-model="form.address"
          maxlength="60"
          placeholder="例如：杭州市滨江区江南大道 100 号"
        />
      </el-form-item>

      <el-form-item label="地图选点（坐标按 WGS-84 存储）" prop="lng">
        <AMapPicker v-model="pickerValue" @update:model-value="onLocationChange" />
      </el-form-item>

      <div class="coord-line">
        <el-form-item prop="lng" class="coord-item">
          <template #label>经度（WGS-84）</template>
          <el-input :model-value="String(form.lng)" readonly />
        </el-form-item>
        <el-form-item prop="lat" class="coord-item">
          <template #label>纬度（WGS-84）</template>
          <el-input :model-value="String(form.lat)" readonly />
        </el-form-item>
      </div>

      <el-form-item label="启用状态">
        <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.venue-form {
  margin-top: 8px;
}

.coord-line {
  display: flex;
  gap: 16px;
}

.coord-item {
  flex: 1;
  margin-bottom: 18px;
}
</style>
