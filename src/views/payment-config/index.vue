<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 支付管理（UI 复刻原型 admin/src/views/payment-config/index.vue）
//
// 只管「钱怎么付」：支付时限（本期可用）、在线渠道开关与收款账户（即将上线骨架）。
// 不含任何计价字段——带价格的规则在「计价管理」维护（硬边界）。
// 数据走本地 mock（./mock，同构原型 GET/PUT /admin/payment-config）；
// 后端 PaymentController 就绪后只替换 mock 调用。
// 权限：非 ADMIN 只读（输入/保存 disabled），路由 meta.roles 同步限定 ADMIN。
// ─────────────────────────────────────────────────────────────
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getPaymentConfig, savePaymentConfig } from './mock'
import { PAY_EXPIRE_LIMITS } from './types'

const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const form = reactive<{ payExpireMinutes: number }>({ payExpireMinutes: 15 })

async function load(): Promise<void> {
  loading.value = true
  // 模拟异步（接真接口后删掉这行）
  await new Promise((r) => window.setTimeout(r, 200))
  const d = getPaymentConfig()
  form.payExpireMinutes = d.payExpireMinutes ?? 15
  loading.value = false
}

onMounted(() => void load())

function save(): void {
  const n = Number(form.payExpireMinutes)
  if (!Number.isFinite(n) || n < PAY_EXPIRE_LIMITS.min || n > PAY_EXPIRE_LIMITS.max) {
    ElMessage.warning('支付时限需在 1-120 分钟之间')
    return
  }
  saving.value = true
  try {
    savePaymentConfig({ payExpireMinutes: n })
    ElMessage.success('支付配置已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-loading="loading" class="page">
    <!-- 边界说明 -->
    <div class="card intro-card">
      <h3 class="card-title">
        支付管理<span class="sub"
          >只管「钱怎么付」：支付时限、支付渠道、收款账户；计价规则请前往「计价管理」</span
        >
      </h3>
    </div>

    <!-- 支付时限（本期可用） -->
    <div class="card">
      <h4 class="section-title">订单支付时限</h4>
      <el-form label-width="180px" class="pay-form">
        <el-form-item label="下单后支付时限（分钟）">
          <el-input-number
            v-model="form.payExpireMinutes"
            :min="PAY_EXPIRE_LIMITS.min"
            :max="PAY_EXPIRE_LIMITS.max"
            :disabled="!auth.isAdmin"
          />
          <div class="form-tip">
            用户下单后超过该时长仍未支付，订单自动取消（订单 expire_at 据此计算）
          </div>
        </el-form-item>
        <el-form-item v-if="auth.isAdmin">
          <el-button type="primary" :loading="saving" @click="save">保存支付时限</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 在线支付渠道（骨架占位，本期不启用） -->
    <div class="card">
      <div class="block-head">
        <h4 class="section-title" style="margin: 0">在线支付渠道</h4>
        <el-tag size="small" type="info" effect="plain">即将上线</el-tag>
      </div>
      <p class="block-tip">
        正式版接入微信支付 / 支付宝后在此维护渠道开关与凭证；当前支付走模拟收银台，渠道暂不启用。
      </p>
      <el-form label-width="180px" class="pay-form">
        <el-form-item label="微信支付（JSAPI）">
          <el-switch :model-value="false" disabled />
          <span class="switch-note">未接入</span>
        </el-form-item>
        <el-form-item label="支付宝（手机网站支付）">
          <el-switch :model-value="false" disabled />
          <span class="switch-note">未接入</span>
        </el-form-item>
      </el-form>
    </div>

    <!-- 对公转账与收款账户（骨架占位） -->
    <div class="card">
      <div class="block-head">
        <h4 class="section-title" style="margin: 0">对公转账与收款账户</h4>
        <el-tag size="small" type="info" effect="plain">即将上线</el-tag>
      </div>
      <p class="block-tip">
        正式版在此维护公司收款账户（对齐
        company_bank_accounts）与对公转账到账核对；本期暂不提供该能力。
      </p>
      <el-empty description="收款账户管理将随正式支付模块上线" :image-size="70" />
    </div>
  </div>
</template>

<style scoped>
.intro-card {
  margin-bottom: 14px;
}

.pay-form {
  max-width: 560px;
  padding-top: 8px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}

.block-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.block-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin: 0 0 12px;
}

.switch-note {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}
</style>
