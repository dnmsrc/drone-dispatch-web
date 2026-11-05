<script setup lang="ts">
defineProps<{
  /** 页面标题（与菜单、面包屑一致） */
  title: string
  /** 原型页面路径，便于迁移时对照 */
  note?: string
}>()
</script>

<template>
  <div class="page">
    <el-card shadow="never">
      <div class="placeholder">
        <div class="placeholder-title">{{ title }}</div>
        <div class="placeholder-tip">
          布局框架已就绪，业务内容待从原型迁移。
          <span v-if="note">原型页面：{{ note }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.placeholder {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--app-text-secondary);
}

.placeholder-title {
  font-size: var(--app-font-size-lg);
  font-weight: 600;
  color: var(--app-text-primary);
}

.placeholder-tip {
  font-size: var(--app-font-size-sm);
  line-height: 1.8;
  text-align: center;
}

.placeholder-tip span {
  display: block;
  margin-top: 4px;
  color: var(--app-text-placeholder);
}
</style>
