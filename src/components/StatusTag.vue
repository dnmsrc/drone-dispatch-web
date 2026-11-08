<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_MAP } from '@/utils/format'
import type { StatusConf } from '@/utils/format'

const props = defineProps<{
  /** 状态枚举值（PENDING_ACCEPT / ACCEPTED / …），未识别时原样显示 */
  status: string
  /** 状态字典，默认订单 STATUS_MAP；咨询/退款等其他单据传对应字典 */
  map?: Record<string, StatusConf>
  /** el-tag 尺寸（原型列表内联标签用 small） */
  size?: '' | 'large' | 'default' | 'small'
  /** 外形：round 胶囊（默认，首页订单表风格）/ rect 方角（原型列表页 el-tag 风格） */
  shape?: 'round' | 'rect'
  /** 悬浮提示（如接口返回的 statusText 用户态文案） */
  title?: string
}>()

const conf = computed(
  () => (props.map ?? STATUS_MAP)[props.status] ?? { text: props.status || '—', color: '#909399' },
)
</script>

<template>
  <!-- 语义主题走 el-tag 原生 type；超出五色的状态用自定义背景（原型 StatusTag 同款） -->
  <el-tag
    v-if="conf.type"
    :type="conf.type"
    :size="size || undefined"
    :round="shape !== 'rect'"
    :title="title || undefined"
    effect="light"
    disable-transitions
  >
    {{ conf.text }}
  </el-tag>
  <el-tag
    v-else
    :color="conf.color"
    :size="size || undefined"
    :round="shape !== 'rect'"
    :title="title || undefined"
    effect="dark"
    disable-transitions
    style="border: none"
  >
    {{ conf.text }}
  </el-tag>
</template>
