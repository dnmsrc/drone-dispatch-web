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

// 弹窗包裹器：业务正常写弹窗组件 + 平行位置的 ts 配置文件，
// 业务里只 `await xxx.open()` 拿「动作 + 数据」，弹窗自己控制打开/关闭。
// 结果判断用 DialogAction 枚举（确认 / 取消 / 关闭 / 超时 / 顶掉 / 销毁），
// 不要用 data 是否为 null 猜。getDialogHandle 仅供调试/测试取内部句柄（业务代码不要用）。
export {
  wrapDialog,
  getDialogHandle,
  useDialog,
  confirmDialog,
  createFormDialog,
  setDialogAppContext,
  FormDialog,
  ConfirmDialog,
  DialogAction,
  isDialogConfirmed,
  isDialogDismissed,
} from './dialog'
export type {
  ConfirmDialogParams,
  CreateFormDialogOptions,
  DialogCallbackArg,
  DialogCallbacks,
  DialogController,
  DialogDismissAction,
  DialogExposed,
  DialogHandle,
  DialogResult,
  DialogResultConfirmed,
  DialogResultCustom,
  DialogResultDismissed,
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
  TableAutoFitOptions,
  TablePagination,
  TableSortChange,
  ProSearchProps,
} from './types'
