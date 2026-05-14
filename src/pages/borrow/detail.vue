<script lang="ts" setup>
import type { BorrowRequest } from '@/types/borrow'
import { cancelBorrow, getMyBorrowDetail, returnBorrow } from '@/api/borrow'
import { getErrorMessage } from '@/utils/cloud'
import { formatDateTime } from '@/utils/format'
import { BORROW_STATUS_LABEL, BORROW_STATUS_TAG_TYPE } from '@/utils/status'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '申请详情',
  },
})

const toast = useAppToast()
const borrowId = ref('')
const detail = ref<BorrowRequest | null>(null)
const loading = ref(false)
const operating = ref(false)

async function loadDetail() {
  if (!borrowId.value) {
    toast.error('缺少申请 ID')
    return
  }
  loading.value = true
  try {
    detail.value = await getMyBorrowDetail(borrowId.value)
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function confirmAction(title: string) {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title,
      content: '请确认后继续',
      confirmColor: '#0096C2',
      success: res => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
}

async function handleCancel() {
  if (!detail.value || !(await confirmAction('撤回申请'))) return
  operating.value = true
  try {
    await cancelBorrow(detail.value._id)
    toast.success('已撤回')
    await loadDetail()
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    operating.value = false
  }
}

async function handleReturn() {
  if (!detail.value || !(await confirmAction('确认归还'))) return
  operating.value = true
  try {
    await returnBorrow(detail.value._id)
    toast.success('已归还')
    await loadDetail()
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    operating.value = false
  }
}

function goVoucher() {
  if (!detail.value) return
  uni.navigateTo({ url: `/pages/borrow/voucher?id=${detail.value._id}` })
}

function goBack() {
  uni.navigateBack()
}

onLoad((query) => {
  borrowId.value = String(query?.id || '')
  void loadDetail()
})
</script>

<template>
  <view class="page-container">
    <wd-toast />
    <wd-navbar title="申请详情" left-arrow safe-area-inset-top placeholder @click-left="goBack" />

    <scroll-view scroll-y class="scroll-container">
      <view class="content-section">
        <wd-loading v-if="loading" />
        <wd-empty v-else-if="!detail" description="暂无详情" />

        <block v-else>
          <view class="app-card">
            <view class="detail-top">
              <view class="detail-title-wrap">
                <view class="detail-title">
                  {{ detail.serial_no }}
                </view>
                <view class="detail-time">
                  {{ formatDateTime(detail.created_at) }}
                </view>
              </view>
              <wd-tag :type="BORROW_STATUS_TAG_TYPE[detail.status]">
                {{ BORROW_STATUS_LABEL[detail.status] }}
              </wd-tag>
            </view>

            <view class="detail-grid">
              <view class="detail-cell">
                <view class="cell-label">
                  借用人
                </view>
                <view class="cell-value">
                  {{ detail.teacher_name || '--' }}
                </view>
              </view>
              <view class="detail-cell">
                <view class="cell-label">
                  联系电话
                </view>
                <view class="cell-value">
                  {{ detail.teacher_phone || '--' }}
                </view>
              </view>
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
                {{ item.name || item.asset_no }}
              </view>
              <view class="asset-meta">
                {{ item.asset_no }} · {{ item.brand || '--' }} {{ item.spec || '' }}
              </view>
              <view class="asset-fields">
                <view>数量 {{ item.quantity }}</view>
                <view>{{ item.expected_return_date }}</view>
                <view>{{ item.usage }}</view>
              </view>
            </view>
          </view>

          <view v-if="detail.reject_reason" class="error-banner reject-box">
            {{ detail.reject_reason }}
          </view>

          <view class="action-row">
            <wd-button v-if="detail.status === 'PENDING'" type="warning" block :loading="operating" @click="handleCancel">
              撤回
            </wd-button>
            <wd-button v-if="detail.status === 'APPROVED'" type="success" block :loading="operating" @click="handleReturn">
              归还
            </wd-button>
            <wd-button v-if="detail.status === 'APPROVED'" type="primary" block @click="goVoucher">
              凭证
            </wd-button>
          </view>
        </block>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.detail-top {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.detail-title-wrap {
  flex: 1;
  min-width: 0;
}

.detail-title {
  color: var(--app-text-title);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.4;
  word-break: break-all;
}

.detail-time {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.detail-grid {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.detail-cell {
  background-color: var(--app-bg-page);
  border-radius: 12rpx;
  padding: 22rpx;
}

.cell-label {
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.cell-value {
  margin-top: 8rpx;
  color: var(--app-text-title);
  font-size: 28rpx;
  font-weight: 700;
}

.asset-row {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--app-divider);
}

.asset-row:last-child {
  border-bottom: 0;
}

.asset-title {
  color: var(--app-text-title);
  font-size: 30rpx;
  font-weight: 700;
}

.asset-meta {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 1.5;
}

.asset-fields {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  color: var(--app-text-body);
  font-size: 24rpx;
}

.reject-box {
  margin-top: 24rpx;
}

.action-row {
  margin-top: 30rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}
</style>
