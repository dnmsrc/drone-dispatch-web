// ─────────────────────────────────────────────────────────────
// 配置式组件统一出口
//
// 业务页面推荐按需引入（利于 tree-shaking 与类型提示）：
//   import { ProTable, ProForm, ProSearch } from '@/components/pro'
// 类型与控件常量也从这里导出，业务侧不需要直接引用 ./types。
// ─────────────────────────────────────────────────────────────
export { default as ProForm } from './ProForm.vue'
export { default as ProField } from './ProField.vue'
export { default as ProTable } from './ProTable.vue'
export { default as ProSearch } from './ProSearch.vue'

// 弹窗包裹器：业务正常写弹窗组件 + 平行位置的 ts 配置文件，业务里 .open / .close / .destroy
export {
  wrapDialog,
  useDialog,
  confirmDialog,
  createFormDialog,
  setDialogAppContext,
  FormDialog,
  ConfirmDialog,
} from './dialog'
export type {
  ConfirmDialogParams,
  CreateFormDialogOptions,
  DialogAction,
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogExposed,
  DialogRuntime,
  FormDialogProps,
  WrapDialogOptions,
} from './dialog'

export { CONTROL_TYPES } from './types'
export type {
  ControlType,
  OptionItem,
  OptionSource,
  FormFieldConfig,
  ProFormExpose,
  CellContext,
  TableColumn,
  TableActionButton,
  TableActions,
  TablePagination,
  TableSortChange,
  ProSearchProps,
} from './types'
