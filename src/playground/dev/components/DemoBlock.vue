<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 演示区块：测试场每个示例的统一外壳
//   标题 + 说明 + 示例内容（默认插槽）+ 可选"配置代码"折叠
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'

defineProps<{
  /** 示例标题 */
  title: string
  /** 一句话说明（这个示例演示了什么） */
  desc?: string
  /** 配置代码源码；传入后底部出现"查看配置代码" */
  code?: string
}>()

const showCode = ref(false)
</script>

<template>
  <section class="demo-block">
    <div class="demo-block-head">
      <span class="demo-block-title">{{ title }}</span>
      <span v-if="desc" class="demo-block-desc">{{ desc }}</span>
    </div>

    <div class="demo-block-body">
      <slot />
    </div>

    <div v-if="code" class="demo-block-foot">
      <el-button link type="primary" @click="showCode = !showCode">
        {{ showCode ? '收起配置代码' : '查看配置代码' }}
      </el-button>
      <pre v-show="showCode" class="demo-block-code">{{ code }}</pre>
    </div>
  </section>
</template>
