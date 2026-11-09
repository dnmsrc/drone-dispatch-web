<script setup lang="ts">
// ─────────────────────────────────────────────────────────────
// 回传媒体库（对齐后端 order_media 表；订单完成回传的照片/视频集中浏览）
//
//   - 搜索栏 → ProSearch（关键词 / 媒体类型）
//   - 素材用响应式卡片宫格（浏览型页面比表格更贴合素材属性）：
//       照片 → photoUrl 占位缩略图，点击 ElImageViewer 大图预览
//       视频 → 同源占位封面 + 播放图标遮罩（演示环境视频为占位，点击提示）
//   - 每张卡片可「查看订单」跳订单管理并带订单号关键词，形成回溯闭环
//   - 数据从订单域 orderStore.media 拍平派生（mock.ts），与订单详情同源
// TODO(server): 接 GET /admin/order-media 后仅替换 mock.ts，本页不改名。
// ─────────────────────────────────────────────────────────────
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElImageViewer } from 'element-plus'
import { VideoPlay } from '@element-plus/icons-vue'
import { ProSearch } from '@/components/pro'
import type { FormFieldConfig, OptionItem } from '@/components/pro'
import { MEDIA_TYPE_LABELS, fmtDate } from '@/utils/format'
import { photoUrl } from '@/views/order/mock'
import { mediaStats, queryMedia } from './mock'
import type { MediaRow, MediaType } from './types'

const router = useRouter()

/* ═══ 查询与分页状态 ═══ */
const loading = ref(false)
const rows = ref<MediaRow[]>([])
const stats = ref({ total: 0, photos: 0, videos: 0 })
const query = reactive<Record<string, unknown>>({ keyword: '', mediaType: '' })
const page = ref(1)
const size = ref(12)

const typeOptions: OptionItem[] = Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => ({
  label,
  value,
}))

const searchFields: FormFieldConfig[] = [
  {
    prop: 'keyword',
    label: '关键词',
    control: 'input',
    placeholder: '订单号 / 客户 / 手机号',
    width: 240,
  },
  {
    prop: 'mediaType',
    label: '媒体类型',
    control: 'select',
    placeholder: '全部类型',
    options: typeOptions,
    width: 160,
  },
]

async function load(resetPage = false): Promise<void> {
  if (resetPage) page.value = 1
  loading.value = true
  await new Promise((r) => window.setTimeout(r, 280))
  const filtered = queryMedia({
    keyword: String(query.keyword ?? ''),
    mediaType: String(query.mediaType ?? '') as MediaType | '',
  })
  rows.value = filtered.slice((page.value - 1) * size.value, page.value * size.value)
  stats.value = mediaStats()
  loading.value = false
}

onMounted(() => void load(true))

/* ═══ 照片大图预览 ═══ */
const viewerUrls = ref<string[]>([])
function previewPhoto(row: MediaRow): void {
  // 传入当前页所有照片，支持在预览器内左右切换
  viewerUrls.value = rows.value.filter((m) => m.mediaType === 'PHOTO').map((m) => photoUrl(m.url))
  if (!viewerUrls.value.includes(photoUrl(row.url))) viewerUrls.value = [photoUrl(row.url)]
}
function closeViewer(): void {
  viewerUrls.value = []
}

function previewVideo(row: MediaRow): void {
  // 演示环境视频为占位种子，无真实流；正式版此处打开视频播放器
  ElMessage.info(`演示环境视频为占位素材：${row.url}`)
}

/* ═══ 回溯订单（带订单号关键词跳订单管理）═══ */
function goOrder(row: MediaRow): void {
  void router.push({ path: '/order/list', query: { keyword: row.orderId } })
}
</script>

<template>
  <div v-loading="loading" class="page media-page">
    <div class="card">
      <ProSearch :model="query" :fields="searchFields" :loading="loading" :collapsible="false" />
    </div>

    <div class="card">
      <h3 class="card-title">
        回传媒体库
        <span class="sub">
          共 {{ stats.total }} 项 · 照片 {{ stats.photos }} · 视频 {{ stats.videos }}
        </span>
      </h3>

      <el-empty
        v-if="!rows.length"
        description="暂无回传素材 —— 订单完成并回传照片/视频后出现在这里"
        :image-size="90"
      />

      <div v-else class="media-grid">
        <div v-for="m in rows" :key="m.id" class="media-card">
          <!-- 缩略图区：照片可点开大图；视频带播放遮罩 -->
          <div
            class="media-thumb"
            @click="m.mediaType === 'PHOTO' ? previewPhoto(m) : previewVideo(m)"
          >
            <img :src="photoUrl(m.url)" :alt="m.orderId" loading="lazy" />
            <div v-if="m.mediaType === 'VIDEO'" class="video-mask">
              <el-icon :size="34"><VideoPlay /></el-icon>
            </div>
            <div class="media-type-badge">
              <el-tag
                :type="m.mediaType === 'VIDEO' ? 'warning' : 'primary'"
                size="small"
                effect="dark"
              >
                {{ MEDIA_TYPE_LABELS[m.mediaType] }}
              </el-tag>
            </div>
          </div>

          <!-- 素材信息 -->
          <div class="media-info">
            <div class="media-order ellipsis" :title="m.orderId">{{ m.orderId }}</div>
            <div class="media-meta">
              <span class="ellipsis">{{ m.userNickname || m.userPhone || '—' }}</span>
              <span class="nowrap">{{ fmtDate(m.performDate) }}</span>
            </div>
            <el-button link type="primary" size="small" @click="goOrder(m)">查看订单 ›</el-button>
          </div>
        </div>
      </div>

      <div v-if="rows.length" class="media-pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="stats.total"
          :current-page="page"
          :page-size="size"
          :page-sizes="[12, 24, 48]"
          @current-change="
            (p: number) => {
              page = p
              void load()
            }
          "
          @size-change="
            (s: number) => {
              size = s
              void load(true)
            }
          "
        />
      </div>
    </div>

    <ElImageViewer
      v-if="viewerUrls.length"
      :url-list="viewerUrls"
      teleported
      @close="closeViewer"
    />
  </div>
</template>

<style scoped>
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

.media-card {
  border: 1px solid var(--app-border-color, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  background: var(--app-bg-card, #fff);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.media-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.media-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  cursor: pointer;
  background: #0f172a;
}

.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(0, 0, 0, 0.28);
}

.media-type-badge {
  position: absolute;
  left: 8px;
  top: 8px;
}

.media-info {
  padding: 10px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-order {
  font-weight: 600;
  font-size: 13px;
}

.media-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.media-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
