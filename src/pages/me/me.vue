<script lang="ts" setup>
import type { BorrowListMineItem } from '@/types/borrow'
import type { BorrowStatus } from '@/utils/status'
import { cancelBorrow, listMyBorrows, returnBorrow } from '@/api/borrow'
import { useUserStore } from '@/store'
import { getErrorMessage } from '@/utils/cloud'
import { formatDateTime } from '@/utils/format'
import { BORROW_STATUS_LABEL, BORROW_STATUS_TAG_TYPE } from '@/utils/status'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的',
  },
})

const statusOptions: Array<{ label: string, value: BorrowStatus | '' }> = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已归还', value: 'RETURNED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' },
]

const userStore = useUserStore()
const toast = useAppToast()
const activeStatus = ref<BorrowStatus | ''>('')
const loading = ref(false)
const operatingId = ref('')
const list = ref<BorrowListMineItem[]>([])

async function loadList() {
  const profile = await userStore.bootstrapAuth()
  if (!profile) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  loading.value = true
  try {
    const result = await listMyBorrows({
      status: activeStatus.value || undefined,
      page: 1,
      pageSize: 100,
    })
    list.value = result.list
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/borrow/detail?id=${id}` })
}

function askConfirm(title: string) {
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

async function handleCancel(item: BorrowListMineItem) {
  if (!(await askConfirm('撤回申请'))) return
  operatingId.value = item._id
  try {
    await cancelBorrow(item._id)
    toast.success('已撤回')
    await loadList()
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    operatingId.value = ''
  }
}

async function handleReturn(item: BorrowListMineItem) {
  if (!(await askConfirm('确认归还'))) return
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

function logout() {
  userStore.logout()
  uni.reLaunch({ url: '/pages/login/index' })
}

watch(activeStatus, () => {
  void loadList()
})

onShow(() => {
  void loadList()
})
</script>

<template>
  <view class="page-container profile-page">
    <wd-toast />

    <view class="profile-hero">
      <view class="profile-card">
        <view class="avatar">
          <wd-icon name="user" size="42rpx" />
        </view>
        <view class="profile-info">
          <view class="profile-name">
            {{ userStore.profile?.name || '教师' }}
          </view>
          <view class="profile-meta">
            {{ userStore.profile?.department || '未填部门' }} · {{ userStore.profile?.phone || '未填手机号' }}
          </view>
        </view>
        <wd-button type="primary" plain size="small" @click="logout">
          退出
        </wd-button>
      </view>
    </view>

    <view class="content-section profile-content">
      <view class="filter-card">
        <scroll-view scroll-x class="filter-scroll">
          <view class="filter-list">
            <view
              v-for="item in statusOptions"
              :key="item.label"
              class="filter-pill"
              :class="{ active: activeStatus === item.value }"
              @click="activeStatus = item.value"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>
      </view>

      <wd-loading v-if="loading" custom-class="page-loading" />
      <wd-empty v-else-if="list.length === 0" description="暂无申请" />

      <block v-else>
        <view
          v-for="item in list"
          :key="item._id"
          class="list-card borrow-record"
          @click="goDetail(item._id)"
        >
          <view class="record-head">
            <view class="record-title">
              {{ item.serial_no }}
            </view>
            <wd-tag :type="BORROW_STATUS_TAG_TYPE[item.status]">
              {{ BORROW_STATUS_LABEL[item.status] }}
            </wd-tag>
          </view>
          <view class="record-meta">
            {{ item.items.length }} 件资产 · {{ formatDateTime(item.created_at) }}
          </view>

          <view class="button-row" @click.stop>
            <wd-button v-if="item.status === 'PENDING'" size="small" type="warning" :loading="operatingId === item._id" @click="handleCancel(item)">
              撤回
            </wd-button>
            <wd-button v-if="item.status === 'APPROVED'" size="small" type="success" :loading="operatingId === item._id" @click="handleReturn(item)">
              归还
            </wd-button>
            <wd-button size="small" type="primary" plain @click="goDetail(item._id)">
              详情
            </wd-button>
          </view>
        </view>
      </block>
    </view>
  </view>
</template>

<style scoped lang="scss">
.profile-page {
  padding-bottom: 100rpx;
}

.profile-hero {
  background: linear-gradient(135deg, var(--app-color-primary) 0%, var(--app-color-primary-deep) 100%);
  padding: 96rpx 30rpx 78rpx;
  box-sizing: border-box;
}

.profile-card {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.96);
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: var(--app-shadow-primary);
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: var(--app-color-primary-light);
  color: var(--app-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  color: var(--app-text-title);
  font-size: 34rpx;
  font-weight: 800;
}

.profile-meta {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 1.5;
}

.profile-content {
  margin-top: -48rpx;
}

.filter-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 18rpx;
  box-shadow: var(--app-shadow-card);
  margin-bottom: 24rpx;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: inline-flex;
  gap: 16rpx;
}

.filter-pill {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background-color: var(--app-bg-page);
  color: var(--app-text-body);
  font-size: 24rpx;
}

.filter-pill.active {
  background-color: var(--app-color-primary);
  color: #fff;
}

.page-loading {
  margin-top: 40rpx;
}

.borrow-record {
  margin-top: 20rpx;
}

.record-head {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.record-title {
  flex: 1;
  min-width: 0;
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
  gap: 16rpx;
  margin-top: 24rpx;
}
</style>
