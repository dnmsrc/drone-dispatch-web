// ─────────────────────────────────────────────────────────────
// 场地编辑弹窗配置：wrapDialog 把 VenueEditDialog.vue 包成只带 open() 的句柄
//
//   const result = await venueEditDialog.open({ row })   // 编辑
//   const result = await venueEditDialog.open({})       // 新增
//   if (result.action !== DialogAction.Confirm || !result.data) return
//   用 result.data（VenueForm）落库
// ─────────────────────────────────────────────────────────────
import { wrapDialog } from '@/components/pro'
import VenueEditDialog from './VenueEditDialog.vue'
import type { VenueEditParams, VenueForm } from '../types'

export const venueEditDialog = wrapDialog<VenueEditParams, VenueForm>(VenueEditDialog, {
  name: 'venue-edit',
})
