<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 场地新增 / 编辑弹窗（自定义业务弹窗，经 wrapDialog 包成命令式句柄）
//
// 地图选点交互（按需弹出，不再常驻整块大地图）：
//   - 场地名称输入框可直接手敲，右侧「地图选点」按钮打开二级 LocationPickerDialog；
//   - 选点弹窗内先做草稿选择，点「确定选点」才把名称/地址/坐标一次性回填到本表单，
//     取消则不污染已填内容；AMapPicker 内部完成 GCJ-02 → WGS-84，输出即落库坐标。
//   - 纯地图点选拿不到 POI 名称时保留原名称（不覆盖用户已输入的场地名），仅更新坐标/地址。
// 数据契约沿用 VenueForm（name/address/lng/lat/enabled），mock 与后端 CRUD 不改名。
// 必填口径：仅场地名称与经纬度（经纬度由地图选点保证、带范围校验）；详细地址为选填，可留空。
// ─────────────────────────────────────────────────────────────
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { MapLocation } from '@element-plus/icons-vue'
import { useDialog } from '@/components/pro'
import LocationPickerDialog from './LocationPickerDialog.vue'
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
  // 仅场地名称必填；详细地址选填（留空时提交空串，后端归一空串落库）
  name: [{ required: true, message: '请填写场地名称', trigger: 'blur' }],
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

/* ═══ 二级地图选点弹窗 ═══ */
const pickerVisible = ref(false)

/** 选点弹窗初始值：取表单当前名称/地址/坐标（WGS-84）做回显 */
const pickerInitial = computed<VenueLocation>(() => ({
  name: form.name,
  address: form.address,
  lng: form.lng,
  lat: form.lat,
}))

/** 选点弹窗「确定选点」：一次性回填名称/地址/坐标，并同步校验经纬度 */
function onPickConfirm(loc: VenueLocation): void {
  form.lng = loc.lng
  form.lat = loc.lat
  // 纯地图点选无 POI 名称时 loc.name 为空，保留用户已输入的名称，避免被覆盖成空
  if (loc.name) form.name = loc.name
  if (loc.address) form.address = loc.address
  void formRef.value?.validateField(['lng', 'lat'])
}

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
      <!-- 场地名称：可直接手敲，右侧按钮进入地图选点，确定后一次性回填名称/地址/坐标 -->
      <el-form-item label="场地名称" prop="name">
        <el-input v-model="form.name" maxlength="30" placeholder="可直接填写，或点右侧按钮地图选点">
          <template #append>
            <el-button :icon="MapLocation" @click="pickerVisible = true">地图选点</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="详细地址（选填）" prop="address">
        <el-input
          v-model="form.address"
          maxlength="60"
          placeholder="选填，例如：杭州市滨江区江南大道 100 号；地图选点会自动回填"
        />
      </el-form-item>

      <!-- 坐标只读展示（由地图选点回填，仍挂 prop 做范围校验）；无 Key 时可在选点弹窗内手动录入 -->
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

    <!-- 二级地图选点弹窗：草稿选择，确定才回填 -->
    <LocationPickerDialog
      v-model:visible="pickerVisible"
      :initial="pickerInitial"
      @confirm="onPickConfirm"
    />
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
