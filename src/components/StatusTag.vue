<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_MAP } from '@/utils/format'

const props = defineProps<{
  /** 订单状态枚举值（PENDING_ACCEPT / ACCEPTED / …），未识别时原样显示 */
  status: string
}>()

const conf = computed(() => STATUS_MAP[props.status] ?? { text: props.status, color: '#909399' })
</script>

<template>
  <!-- 语义主题走 el-tag 原生 type；超出五色的状态用自定义背景（原型 StatusTag 同款） -->
  <el-tag v-if="conf.type" :type="conf.type" effect="light" round disable-transitions>
    {{ conf.text }}
  </el-tag>
  <el-tag v-else :color="conf.color" effect="dark" round disable-transitions style="border: none">
    {{ conf.text }}
  </el-tag>
</template>
