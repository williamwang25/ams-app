<script lang="ts" setup>
import type { BorrowListMineItem } from '@/types/borrow'
import { listMyBorrows, returnBorrow } from '@/api/borrow'
import { getErrorMessage } from '@/utils/cloud'
import { formatDateTime } from '@/utils/format'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '归还',
  },
})

const toast = useAppToast()
const loading = ref(false)
const operatingId = ref('')
const list = ref<BorrowListMineItem[]>([])

async function loadList() {
  loading.value = true
  try {
    const result = await listMyBorrows({ status: 'APPROVED', page: 1, pageSize: 100 })
    list.value = result.list
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function confirmReturn() {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认归还',
      content: '归还后该申请将结束',
      confirmColor: '#0096C2',
      success: res => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
}

async function handleReturn(item: BorrowListMineItem) {
  if (!(await confirmReturn())) return
  operatingId.value = item._id
  try {
    await returnBorrow(item._id)
    toast.success('已归还')
    await loadList()
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    operatingId.value = ''
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/borrow/detail?id=${id}` })
}

function goBack() {
  uni.navigateBack()
}

onShow(() => {
  void loadList()
})
</script>

<template>
  <view class="page-container">
    <wd-toast />
    <wd-navbar title="归还" left-arrow safe-area-inset-top placeholder @click-left="goBack" />

    <scroll-view scroll-y class="scroll-container">
      <view class="content-section">
        <view class="info-banner">
          <wd-icon name="info-circle" size="34rpx" />
          <view class="banner-text">
            仅展示已审批通过且尚未归还的申请，当前为整单归还。
          </view>
        </view>

        <wd-loading v-if="loading" custom-class="page-loading" />
        <wd-empty v-else-if="list.length === 0" description="暂无可归还申请" />

        <block v-else>
          <view v-for="item in list" :key="item._id" class="list-card return-card">
            <view class="record-title">
              {{ item.serial_no }}
            </view>
            <view class="record-meta">
              {{ item.items.length }} 件资产 · {{ formatDateTime(item.approved_at) }}
            </view>
            <view class="button-row">
              <wd-button type="primary" plain @click="goDetail(item._id)">
                详情
              </wd-button>
              <wd-button type="success" :loading="operatingId === item._id" @click="handleReturn(item)">
                确认归还
              </wd-button>
            </view>
          </view>
        </block>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.banner-text {
  margin-left: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.page-loading {
  margin-top: 40rpx;
}

.return-card {
  margin-top: 22rpx;
}

.record-title {
  color: var(--app-text-title);
  font-size: 30rpx;
  font-weight: 800;
  word-break: break-all;
}

.record-meta {
  margin-top: 10rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.button-row {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
}
</style>
