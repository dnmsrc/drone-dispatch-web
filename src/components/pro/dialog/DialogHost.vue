<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 命令式弹窗的宿主组件（内部组件，业务不直接在 template 中使用）
//
// 由 openDialog 通过 render() 挂载，负责：
//   - el-dialog 的显示/关闭与过渡
//   - 四种内容来源的渲染（自定义组件 / 配置式表单 / render 函数 / 文本）
//   - 默认底部按钮、"确定"前的 beforeOk 钩子与校验
//   - 把关闭动作与结果值通过 finish 事件交回 openDialog
// ─────────────────────────────────────────────────────────────
import { computed, defineComponent, h, onMounted, provide, reactive, ref } from 'vue'
import type { Component, VNodeChild } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import ProForm from '../ProForm.vue'
import type { ProFormExpose } from '../types'
import { cloneValue, defaultValueOf, snapshotModel } from '../helpers'
import { DIALOG_CONTEXT_KEY } from './context'
import type { DialogAction, DialogContext, DialogOptions } from './types'

const props = defineProps<{ options: DialogOptions }>()
const emit = defineEmits<{
  /** 弹窗已关闭并确定结果（openDialog 据此 resolve Promise） */
  finish: [payload: { action: DialogAction; value: unknown }]
  /** 关闭动画结束（openDialog 据此卸载组件） */
  closed: []
}>()

const visible = ref(false)
const okLoading = ref(false)
const formRef = ref<ProFormExpose>()

/** 表单模式的模型：先铺初始值，再按字段补默认值，之后由 ProForm 直接读写 */
const formModel = reactive<Record<string, unknown>>({})
function initFormModel() {
  const { fields = [], model } = props.options
  if (model) {
    for (const key of Object.keys(model)) formModel[key] = cloneValue(model[key])
  }
  for (const field of fields) {
    if (formModel[field.prop] === undefined) formModel[field.prop] = defaultValueOf(field)
  }
}
initFormModel()

type DialogMode = 'component' | 'form' | 'render' | 'content' | 'empty'

/** 内容来源优先级：component > fields > render > content */
const mode = computed<DialogMode>(() => {
  const opts = props.options
  if (opts.component) return 'component'
  if (opts.fields && opts.fields.length > 0) return 'form'
  if (opts.render) return 'render'
  if (opts.content !== undefined) return 'content'
  return 'empty'
})

/** 只允许关闭一次 */
let settled = false
function settle(action: DialogAction, value: unknown = null) {
  if (settled) return
  settled = true
  visible.value = false
  emit('finish', { action, value })
}

/** 注入给内容组件的上下文（props.dialog 与 useDialogContext() 都是它） */
const context: DialogContext = {
  // 不传值视为"确定"（结果 true）；传 null 则原样交回（语义上等同取消，业务自行判断）
  close: (value?: unknown) => settle('ok', value === undefined ? true : value),
  cancel: () => settle('cancel', null),
  setLoading: (loading: boolean) => {
    okLoading.value = loading
  },
  getVisible: () => visible.value,
}
provide(DIALOG_CONTEXT_KEY, context)

/** 内容区 VNode：自定义组件 / render 函数 / 文本 */
function contentVNode(): VNodeChild {
  const opts = props.options
  if (opts.component) {
    const comp = opts.component as Component
    return h(comp, {
      ...(opts.props ?? {}),
      dialog: context,
      onClose: (value: unknown) => settle('ok', value === undefined ? true : value),
      onCancel: () => settle('cancel', null),
    })
  }
  if (opts.render) return opts.render()
  const content = opts.content
  if (typeof content === 'function') return content()
  if (typeof content === 'string') return h('div', { class: 'pro-dialog-text' }, content)
  if (Array.isArray(content)) return h('div', { class: 'pro-dialog-text' }, content)
  return (content ?? null) as VNodeChild
}

/**
 * 内容适配器：把 contentVNode() 的结果渲染成一棵子树。
 * 直接写在模板里无法渲染任意 VNodeChild，故用一个内联渲染组件包一层。
 */
const ContentAdapter = defineComponent({
  name: 'ProDialogContent',
  setup() {
    return () => contentVNode()
  },
})

/** 点"取消"：交给 openDialog 触发 onCancel 回调 */
function handleCancel() {
  settle('cancel', null)
}

/** 点"确定"：beforeOk 钩子 → 表单校验 → 关闭并回传结果 */
async function handleOk() {
  if (okLoading.value) return

  const beforeOk = props.options.beforeOk
  if (beforeOk) {
    okLoading.value = true
    try {
      const allowed = await beforeOk()
      if (allowed === false) return
    } catch {
      // 业务钩子抛错视为不通过，保持弹窗打开（错误提示由业务自己给出）
      return
    } finally {
      okLoading.value = false
    }
  }

  if (mode.value === 'form') {
    const valid = (await formRef.value?.validate()) ?? false
    if (!valid) return
    settle('ok', snapshotModel(formModel))
    return
  }

  settle('ok', props.options.okValue ?? true)
}

/** Element 的 update:modelValue：只有用户主动关闭（X / 遮罩 / ESC）才会走到这里 */
function onVisibleChange(next: boolean) {
  visible.value = next
  if (!next) settle('close', null)
}

function onDialogClosed() {
  emit('closed')
}

onMounted(() => {
  visible.value = true
})
</script>

<template>
  <el-dialog
    class="pro-dialog"
    :class="options.class"
    :model-value="visible"
    :title="options.title"
    :width="options.width ?? 480"
    :top="options.top"
    :fullscreen="options.fullscreen"
    :modal="options.modal !== false"
    :close-on-click-modal="options.closeOnClickModal ?? false"
    :close-on-press-escape="options.closeOnPressEscape ?? true"
    :show-close="options.showClose !== false"
    :draggable="options.draggable ?? false"
    :align-center="options.alignCenter ?? true"
    :z-index="options.zIndex"
    @update:model-value="onVisibleChange"
    @closed="onDialogClosed"
  >
    <p v-if="options.description" class="pro-dialog-desc">{{ options.description }}</p>

    <!-- ① 配置式表单：复用 ProForm，确定时自动校验 -->
    <ProForm
      v-if="mode === 'form'"
      ref="formRef"
      :model="formModel"
      :fields="options.fields ?? []"
      :label-width="options.labelWidth ?? '96px'"
      :default-span="options.defaultSpan ?? 24"
      :gutter="options.gutter ?? 16"
      :size="options.size ?? 'default'"
    />

    <!-- ②③④ 自定义组件 / render 函数 / 文本 -->
    <ContentAdapter v-else-if="mode !== 'empty'" />

    <template v-if="options.showFooter !== false" #footer>
      <div class="pro-dialog-footer">
        <el-button v-bind="options.cancelButtonProps" @click="handleCancel">
          {{ options.cancelText ?? '取消' }}
        </el-button>
        <el-button
          v-bind="options.okButtonProps"
          :type="options.okType ?? 'primary'"
          :loading="okLoading"
          @click="handleOk"
        >
          {{ options.okText ?? '确定' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
