<script setup lang="ts">
import { ref } from 'vue'

const keyword = ref('')
const orderType = ref('')
const dateRange = ref('')

const typeOptions = [
  { label: '无人机编队表演', value: 'show' },
  { label: '商业航拍', value: 'aerial' },
  { label: '巡检 / 测绘', value: 'survey' },
]
</script>

<template>
  <div class="app-shell">
    <el-card class="app-card">
      <template #header>
        <div class="app-header">
          <span class="app-title">星穹 SkyShow · 无人机派单系统</span>
          <el-tag type="success" effect="plain">主题自检</el-tag>
        </div>
      </template>

      <div>
        <div class="section-title">主题包（--app-* CSS 变量）</div>
        <div class="token-row">
          <span class="token dot-primary">主色 #409eff</span>
          <span class="token dot-success">成功 #67c23a</span>
          <span class="token dot-warning">警告 #e6a23c</span>
          <span class="token dot-danger">危险 #f56c6c</span>
          <span class="token dot-info">信息 #909399</span>
        </div>
      </div>

      <div class="section-title">按钮重写（13px 字号 / 4px 圆角）</div>
      <div class="demo-row">
        <el-button type="primary">主要按钮</el-button>
        <el-button>次要按钮</el-button>
        <el-button type="success">成功</el-button>
        <el-button type="warning">警告</el-button>
        <el-button type="danger">危险</el-button>
        <el-button type="primary" plain>朴素按钮</el-button>
        <el-button disabled>禁用</el-button>
        <el-button type="primary" size="small">小按钮</el-button>
        <el-button type="primary" size="large">大按钮</el-button>
      </div>

      <div class="section-title">输入框 / 下拉重写（13px 字号 / 32px 高度）</div>
      <div class="demo-row">
        <el-input v-model="keyword" placeholder="请输入关键词" class="demo-control" />
        <el-select v-model="orderType" placeholder="请选择订单类型" class="demo-control">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </div>

      <div class="section-title">自检说明</div>
      <p class="tip">
        本页仅用于确认主题包与 Element 控件重写生效：卡片阴影、按钮/输入框/下拉字号与高度应保持一致。
        业务页面（登录、订单、看板等）待从原型迁移后替换此页。
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.app-card {
  width: 100%;
  max-width: 960px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
  margin: 20px 0 10px;
  padding-left: 8px;
  border-left: 3px solid var(--app-color-primary);
  line-height: 1.2;
}

.section-title:first-child {
  margin-top: 0;
}

.token-row,
.demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--app-text-regular);
}

.dot-primary,
.dot-success,
.dot-warning,
.dot-danger,
.dot-info {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-primary { background: var(--app-color-primary); }
.dot-success { background: var(--app-color-success); }
.dot-warning { background: var(--app-color-warning); }
.dot-danger { background: var(--app-color-danger); }
.dot-info { background: var(--app-color-info); }

.demo-control {
  width: 200px;
}

.tip {
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.6;
}
</style>
