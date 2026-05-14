<script lang="ts" setup>
import type { BorrowRequest } from '@/types/borrow'
import { getMyBorrowDetail } from '@/api/borrow'
import { getErrorMessage, getTempFileURL } from '@/utils/cloud'
import { formatDateTime } from '@/utils/format'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '借用凭证',
  },
})

const toast = useAppToast()
const borrowId = ref('')
const detail = ref<BorrowRequest | null>(null)
const signatureUrl = ref('')
const loading = ref(false)

async function loadVoucher() {
  if (!borrowId.value) {
    toast.error('缺少申请 ID')
    return
  }
  loading.value = true
  try {
    const result = await getMyBorrowDetail(borrowId.value)
    detail.value = result
    if (result.signature_file_id) {
      signatureUrl.value = await getTempFileURL(result.signature_file_id)
    }
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

onLoad((query) => {
  borrowId.value = String(query?.id || '')
  void loadVoucher()
})
</script>

<template>
  <view class="page-container">
    <wd-toast />
    <wd-navbar title="借用凭证" left-arrow safe-area-inset-top placeholder @click-left="goBack" />

    <scroll-view scroll-y class="scroll-container">
      <view class="content-section">
        <wd-loading v-if="loading" />
        <wd-empty v-else-if="!detail" description="暂无凭证" />

        <block v-else>
          <view class="voucher-card">
            <view class="voucher-label">
              凭证编号
            </view>
            <view class="voucher-no">
              {{ detail.serial_no }}
            </view>
            <view class="voucher-time">
              审批时间：{{ formatDateTime(detail.approved_at) }}
            </view>
            <view class="voucher-grid">
              <view>
                <view class="cell-label">
                  教师
                </view>
                <view class="cell-value">
                  {{ detail.teacher_name || '--' }}
                </view>
              </view>
              <view>
                <view class="cell-label">
                  审批人
                </view>
                <view class="cell-value">
                  {{ detail.approved_by_name || '--' }}
                </view>
              </view>
            </view>
          </view>

          <view class="app-card">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                核验码
              </view>
            </view>
            <view class="qr-payload">
              {{ detail.voucher_qr_payload || '审批通过后生成' }}
            </view>
          </view>

          <view class="app-card">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                资产明细
              </view>
            </view>
            <view v-for="item in detail.items" :key="item.asset_id" class="asset-row">
              <view class="asset-title">
                {{ item.name }}
              </view>
              <view class="asset-meta">
                {{ item.asset_no }} · 数量 {{ item.quantity }} · {{ item.expected_return_date }}
              </view>
            </view>
          </view>

          <view class="app-card">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                教师签名
              </view>
            </view>
            <image v-if="signatureUrl" :src="signatureUrl" mode="aspectFit" class="signature-image" />
            <wd-empty v-else description="暂无签名" />
          </view>
        </block>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.voucher-card {
  background: linear-gradient(135deg, var(--app-color-primary) 0%, var(--app-color-primary-deep) 100%);
  border-radius: 20rpx;
  padding: 34rpx 30rpx;
  box-shadow: var(--app-shadow-primary);
  color: #fff;
  margin-bottom: 24rpx;
}

.voucher-label {
  font-size: 24rpx;
  opacity: 0.82;
}

.voucher-no {
  margin-top: 10rpx;
  font-size: 38rpx;
  font-weight: 800;
  word-break: break-all;
}

.voucher-time {
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.86;
}

.voucher-grid {
  margin-top: 30rpx;
  padding-top: 26rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.24);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.cell-label {
  font-size: 22rpx;
  opacity: 0.78;
}

.cell-value {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.qr-payload {
  background-color: var(--app-bg-page);
  border-radius: 12rpx;
  padding: 24rpx;
  color: var(--app-text-body);
  font-size: 24rpx;
  line-height: 1.6;
  word-break: break-all;
}

.asset-row {
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--app-divider);
}

.asset-row:last-child {
  border-bottom: 0;
}

.asset-title {
  color: var(--app-text-title);
  font-size: 28rpx;
  font-weight: 700;
}

.asset-meta {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.signature-image {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  background-color: var(--app-bg-page);
}
</style>
