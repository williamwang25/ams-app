<script lang="ts" setup>
import type { BorrowListMineItem } from '@/types/borrow'
import type { NoticeItem, NoticeLevel } from '@/types/notice'
import { listMyBorrows } from '@/api/borrow'
import { listPublishedNotices } from '@/api/notice'
import { useUserStore } from '@/store'
import { getErrorMessage } from '@/utils/cloud'
import { formatDateTime } from '@/utils/format'
import { BORROW_STATUS_LABEL, BORROW_STATUS_TAG_TYPE } from '@/utils/status'
import { useAppToast } from '@/utils/toast'

defineOptions({
  name: 'Home',
})

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
    enablePullDownRefresh: true,
  },
})

const userStore = useUserStore()
const toast = useAppToast()
const loading = ref(false)
const borrows = ref<BorrowListMineItem[]>([])
const publishedNotices = ref<NoticeItem[]>([])

interface HomeNoticeItem {
  id: string
  source: 'borrow' | 'notice'
  title: string
  desc: string
  time: number
  tag: string
  tagType: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  content?: string
  borrowId?: string
}

const pendingCount = computed(() => borrows.value.filter(item => item.status === 'PENDING').length)
const approvedCount = computed(() => borrows.value.filter(item => item.status === 'APPROVED').length)
const monthBorrowCount = computed(() => {
  const now = new Date()
  return borrows.value.filter((item) => {
    const createdAt = new Date(item.created_at)
    return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
  }).length
})
const recentList = computed(() => borrows.value.slice(0, 3))
const approvalNotices = computed<HomeNoticeItem[]>(() => {
  return borrows.value
    .filter(item => item.status === 'PENDING' || item.status === 'APPROVED' || item.status === 'REJECTED')
    .map((item) => {
      const statusLabel = BORROW_STATUS_LABEL[item.status]
      const time = item.approved_at || item.updated_at || item.created_at
      return {
        id: `borrow-${item._id}`,
        source: 'borrow',
        title: `借用申请${statusLabel}`,
        desc: `${item.serial_no} · ${item.items.length} 件资产`,
        time,
        tag: '审批',
        tagType: BORROW_STATUS_TAG_TYPE[item.status],
        borrowId: item._id,
      }
    })
})
const adminNotices = computed<HomeNoticeItem[]>(() => {
  return publishedNotices.value.map(item => ({
    id: `notice-${item._id}`,
    source: 'notice',
    title: item.title,
    desc: item.content,
    time: item.published_at || item.updated_at || item.created_at,
    tag: item.level === 'IMPORTANT' ? '重要' : '公告',
    tagType: getNoticeTagType(item.level),
    content: item.content,
  }))
})
const noticeItems = computed(() => {
  return [...approvalNotices.value, ...adminNotices.value]
    .sort((a, b) => b.time - a.time)
    .slice(0, 5)
})

function getNoticeTagType(level: NoticeLevel) {
  return level === 'IMPORTANT' ? 'warning' : 'primary'
}

function clipNoticeContent(content: string) {
  const text = content.trim()
  if (text.length <= 300)
    return text
  return `${text.slice(0, 300)}...`
}

async function ensureSignedIn() {
  const profile = await userStore.bootstrapAuth()
  if (!profile) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}

async function loadDashboard() {
  if (!(await ensureSignedIn()))
    return
  loading.value = true
  const [borrowResult, noticeResult] = await Promise.allSettled([
    listMyBorrows({ page: 1, pageSize: 100 }),
    listPublishedNotices(5),
  ])

  if (borrowResult.status === 'fulfilled') {
    borrows.value = borrowResult.value.list
  }
  else {
    borrows.value = []
    toast.error(getErrorMessage(borrowResult.reason))
  }

  if (noticeResult.status === 'fulfilled') {
    publishedNotices.value = noticeResult.value.list
  }
  else {
    publishedNotices.value = []
    toast.warning(`通知加载失败：${getErrorMessage(noticeResult.reason)}`)
  }

  loading.value = false
}

function goBorrow() {
  uni.switchTab({ url: '/pages/borrow/index' })
}

function goMine() {
  uni.switchTab({ url: '/pages/me/me' })
}

function goReturn() {
  uni.navigateTo({ url: '/pages/return/index' })
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/borrow/detail?id=${id}` })
}

function handleNoticeClick(item: HomeNoticeItem) {
  if (item.source === 'borrow' && item.borrowId) {
    goDetail(item.borrowId)
    return
  }
  uni.showModal({
    title: item.title,
    content: clipNoticeContent(item.content || item.desc || '暂无内容'),
    showCancel: false,
    confirmColor: '#0096C2',
  })
}

onShow(() => {
  void loadDashboard()
})

onPullDownRefresh(() => {
  void loadDashboard().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<template>
  <view class="page-container home-page">
    <wd-toast />

    <view class="home-hero">
      <view class="hero-content">
        <view class="hero-title">
          {{ userStore.profile?.name || '教师' }}
        </view>
        <view class="hero-subtitle">
          {{ userStore.profile?.department || '资产借用工作台' }} · 今天也可以高效处理资产申请
        </view>
      </view>
    </view>

    <view class="content-section home-content">
      <view class="stat-grid">
        <view class="stat-card">
          <view class="stat-value">
            {{ approvedCount }}
          </view>
          <view class="stat-label">
            在借
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-value warning">
            {{ pendingCount }}
          </view>
          <view class="stat-label">
            待审批
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-value dark">
            {{ monthBorrowCount }}
          </view>
          <view class="stat-label">
            本月申请
          </view>
        </view>
      </view>

      <view class="app-card notice-card">
        <view class="section-title">
          <view class="title-line" />
          <view class="title-text">
            通知提醒
          </view>
        </view>

        <wd-empty v-if="!loading && noticeItems.length === 0" description="暂无通知" />
        <block v-else>
          <view
            v-for="item in noticeItems"
            :key="item.id"
            class="notice-row"
            @click="handleNoticeClick(item)"
          >
            <view class="notice-main">
              <view class="notice-title-line">
                <view class="notice-title">
                  {{ item.title }}
                </view>
                <wd-tag :type="item.tagType">
                  {{ item.tag }}
                </wd-tag>
              </view>
              <view class="notice-text">
                {{ item.desc }}
              </view>
              <view class="notice-time">
                {{ formatDateTime(item.time) }}
              </view>
            </view>
            <view class="notice-arrow" />
          </view>
        </block>
      </view>

      <view class="service-list">
        <view class="section-title">
          <view class="title-line" />
          <view class="title-text">
            主要服务
          </view>
        </view>
        <view class="service-card" @click="goBorrow">
          <view class="service-logo borrow-service-logo">
            <view class="borrow-logo-box" />
            <view class="borrow-logo-plus">
              <view class="borrow-plus-line horizontal" />
              <view class="borrow-plus-line vertical" />
            </view>
          </view>
          <view class="service-body">
            <view class="service-title">
              借用资产
            </view>
            <view class="service-desc">
              搜索闲置资产，加入借物车并提交申请
            </view>
          </view>
          <view class="service-arrow" />
        </view>
        <view class="service-card" @click="goReturn">
          <view class="service-logo return-service-logo">
            <view class="return-logo-check" />
          </view>
          <view class="service-body">
            <view class="service-title">
              归还资产
            </view>
            <view class="service-desc">
              查看已通过申请，确认归还当前借用单
            </view>
          </view>
          <view class="service-arrow" />
        </view>
      </view>

      <view class="app-card">
        <view class="section-title">
          <view class="title-line" />
          <view class="title-text">
            最近申请
          </view>
          <wd-loading v-if="loading" custom-class="section-loading" />
        </view>

        <wd-empty v-if="!loading && recentList.length === 0" description="暂无申请" />

        <view
          v-for="item in recentList"
          :key="item._id"
          class="recent-item"
          @click="goDetail(item._id)"
        >
          <view class="recent-main">
            <view class="recent-info">
              <view class="recent-title">
                {{ item.serial_no }}
              </view>
              <view class="recent-meta">
                {{ item.items.length }} 件资产 · {{ formatDateTime(item.created_at) }}
              </view>
            </view>
            <wd-tag :type="BORROW_STATUS_TAG_TYPE[item.status]">
              {{ BORROW_STATUS_LABEL[item.status] }}
            </wd-tag>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-page {
  padding-bottom: 100rpx;
}

.home-hero {
  min-height: 250rpx;
  background: linear-gradient(135deg, var(--app-color-primary) 0%, var(--app-color-primary-deep) 100%);
  padding: 72rpx 30rpx 66rpx;
  box-sizing: border-box;
}

.hero-title {
  color: #fff;
  font-size: 42rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 26rpx;
  line-height: 1.5;
}

.home-content {
  margin-top: -54rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx 18rpx;
  text-align: center;
  box-shadow: var(--app-shadow-card);
}

.stat-value {
  color: var(--app-color-primary);
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.2;
}

.stat-value.warning {
  color: #faad14;
}

.stat-value.dark {
  color: var(--app-text-title);
}

.stat-label {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.notice-card {
  margin-bottom: 24rpx;
}

.notice-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--app-divider);
}

.notice-row:last-child {
  border-bottom: 0;
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-title-line {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.notice-title {
  flex: 1;
  min-width: 0;
  color: var(--app-text-title);
  font-size: 28rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-text {
  margin-top: 8rpx;
  color: var(--app-text-body);
  font-size: 24rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-time {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
}

.notice-arrow {
  width: 14rpx;
  height: 14rpx;
  border-top: 3rpx solid #a0a8ad;
  border-right: 3rpx solid #a0a8ad;
  transform: rotate(45deg);
  margin-left: 18rpx;
  flex-shrink: 0;
}

.service-list {
  margin-bottom: 24rpx;
}

.service-list .service-card + .service-card {
  margin-top: 20rpx;
}

.service-logo {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  border-radius: 22rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.borrow-service-logo {
  background: linear-gradient(145deg, var(--app-color-primary) 0%, var(--app-color-primary-deep) 100%);
  box-shadow: 0 10rpx 24rpx rgba(0, 150, 194, 0.2);
}

.borrow-logo-box {
  position: absolute;
  left: 19rpx;
  top: 26rpx;
  width: 38rpx;
  height: 30rpx;
  border-radius: 8rpx;
  background: #fff;
  box-shadow: 10rpx 7rpx 0 rgba(255, 255, 255, 0.55);
}

.borrow-logo-plus {
  position: absolute;
  right: 10rpx;
  bottom: 10rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #fff;
}

.borrow-plus-line {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999rpx;
  background: var(--app-color-primary);
  transform: translate(-50%, -50%);
}

.borrow-plus-line.horizontal {
  width: 13rpx;
  height: 3rpx;
}

.borrow-plus-line.vertical {
  width: 3rpx;
  height: 13rpx;
}

.return-service-logo {
  background-color: var(--app-color-primary-light);
}

.return-logo-check {
  position: absolute;
  left: 25rpx;
  top: 22rpx;
  width: 30rpx;
  height: 18rpx;
  border-left: 7rpx solid var(--app-color-primary);
  border-bottom: 7rpx solid var(--app-color-primary);
  transform: rotate(-45deg);
}

.service-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #a0a8ad;
  border-right: 3rpx solid #a0a8ad;
  transform: rotate(45deg);
  margin-left: 16rpx;
  flex-shrink: 0;
}

.service-body {
  flex: 1;
}

.service-title {
  color: var(--app-text-title);
  font-size: 30rpx;
  font-weight: 700;
}

.service-desc {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 1.5;
}

.recent-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--app-divider);
}

.recent-item:last-child {
  border-bottom: 0;
}

.recent-main {
  display: flex;
  align-items: center;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-title {
  color: var(--app-text-title);
  font-size: 28rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.section-loading {
  margin-left: 16rpx;
}
</style>
