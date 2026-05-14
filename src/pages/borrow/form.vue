<script lang="ts" setup>
import type { SubmitBorrowItem } from '@/types/borrow'
import { submitBorrow } from '@/api/borrow'
import { useBorrowCartStore, useUserStore } from '@/store'
import { getErrorMessage, uploadSignatureFile } from '@/utils/cloud'
import { todayString } from '@/utils/format'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '填写申请',
  },
})

interface FormItem extends SubmitBorrowItem {
  asset_no: string
  name: string
  available_quantity: number
}

interface SignatureResult {
  success: boolean
  tempFilePath: string
  message?: string
}

const toast = useAppToast()
const cartStore = useBorrowCartStore()
const userStore = useUserStore()
const submitting = ref(false)
const signatureTempPath = ref('')
const syncQuantity = ref(1)
const syncReturnDate = ref(todayString())
const syncUsage = ref('')
const formItems = ref<FormItem[]>([])

const canSubmit = computed(() => {
  return formItems.value.length > 0
    && formItems.value.every(item => item.asset_id && Number(item.quantity) >= 1 && item.expected_return_date && item.usage.trim() && item.usage.trim().length <= 50)
    && Boolean(signatureTempPath.value)
    && !submitting.value
})

function resetFromCart() {
  formItems.value = cartStore.items.map(item => ({
    asset_id: item.asset_id,
    asset_no: item.asset_no,
    name: item.name,
    available_quantity: item.available_quantity,
    quantity: item.quantity,
    expected_return_date: syncReturnDate.value,
    usage: syncUsage.value,
  }))
}

function syncToAll() {
  formItems.value = formItems.value.map(item => ({
    ...item,
    quantity: syncQuantity.value,
    expected_return_date: syncReturnDate.value,
    usage: syncUsage.value,
  }))
  toast.success('已同步')
}

function getPickerValue(event: unknown) {
  const detail = event && typeof event === 'object'
    ? (event as { detail?: { value?: unknown } }).detail
    : undefined
  const value = detail?.value
  if (Array.isArray(value)) {
    return String(value[0] || '')
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function handleSyncDateChange(event: unknown) {
  syncReturnDate.value = getPickerValue(event)
}

function handleDateChange(index: number, event: unknown) {
  const item = formItems.value[index]
  if (!item)
    return
  item.expected_return_date = getPickerValue(event)
}

function goBack() {
  uni.navigateBack()
}

function handleSignatureConfirm(result: SignatureResult) {
  if (result.success && result.tempFilePath) {
    signatureTempPath.value = result.tempFilePath
    toast.success('签名已确认')
    return
  }
  toast.warning(result.message || '请先完成签名')
}

async function handleSubmit() {
  const profile = userStore.profile || await userStore.bootstrapAuth()
  if (!profile) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  if (!canSubmit.value) {
    toast.warning('请补全申请信息和签名')
    return
  }
  submitting.value = true
  try {
    const signatureFileId = await uploadSignatureFile(profile._id, signatureTempPath.value)
    const result = await submitBorrow({
      signature_file_id: signatureFileId,
      items: formItems.value.map(item => ({
        asset_id: item.asset_id,
        quantity: Number(item.quantity) || 1,
        expected_return_date: item.expected_return_date,
        usage: item.usage.trim(),
      })),
    })
    cartStore.clear()
    toast.success('已提交')
    uni.redirectTo({ url: `/pages/borrow/detail?id=${result._id}` })
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    submitting.value = false
  }
}

onLoad(() => {
  resetFromCart()
})
</script>

<template>
  <view class="page-container">
    <wd-toast />
    <wd-navbar title="填写申请" left-arrow safe-area-inset-top placeholder @click-left="goBack" />

    <scroll-view scroll-y class="scroll-container">
      <view class="content-section">
        <wd-empty v-if="formItems.length === 0" description="借物车为空">
          <template #default>
            <wd-button type="primary" @click="goBack">
              返回选择
            </wd-button>
          </template>
        </wd-empty>

        <block v-else>
          <view class="info-banner">
            <wd-icon name="info-circle" size="34rpx" />
            <view class="banner-text">
              数量、拟归还日期和用途会按每条资产独立提交，可先批量填写再逐条调整。
            </view>
          </view>

          <view class="form-section">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                批量填写
              </view>
            </view>
            <view class="form-line">
              <view class="form-label">
                数量
              </view>
              <wd-input-number v-model="syncQuantity" :min="1" />
            </view>
            <picker mode="date" :start="todayString()" :value="syncReturnDate" @change="handleSyncDateChange">
              <view class="select-line">
                <text>拟归还日期</text>
                <text class="select-value">{{ syncReturnDate }}</text>
              </view>
            </picker>
            <wd-input v-model="syncUsage" label="用途" placeholder="申请用途" clearable />
            <wd-button custom-class="sync-button" type="primary" plain block @click="syncToAll">
              同步到所有资产
            </wd-button>
          </view>

          <view class="form-section">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                资产明细
              </view>
            </view>
            <view v-for="(item, index) in formItems" :key="item.asset_id" class="asset-form-card">
              <view class="asset-form-title">
                {{ item.name || item.asset_no }}
              </view>
              <view class="asset-form-meta">
                {{ item.asset_no }}
              </view>
              <view class="form-line">
                <view class="form-label">
                  数量
                </view>
                <wd-input-number v-model="item.quantity" :min="1" :max="item.available_quantity" />
              </view>
              <picker mode="date" :start="todayString()" :value="item.expected_return_date" @change="handleDateChange(index, $event)">
                <view class="select-line">
                  <text>拟归还日期</text>
                  <text class="select-value">{{ item.expected_return_date }}</text>
                </view>
              </picker>
              <wd-input v-model="item.usage" label="用途" placeholder="请输入用途" clearable />
            </view>
          </view>

          <view class="form-section">
            <view class="section-title">
              <view class="title-line" />
              <view class="title-text">
                教师签名
              </view>
            </view>
            <wd-signature
              enable-history
              pressure
              background-color="#ffffff"
              :height="260"
              :export-scale="2"
              @confirm="handleSignatureConfirm"
            />
            <view v-if="signatureTempPath" class="signature-done">
              签名已确认
            </view>
          </view>

          <wd-button custom-class="submit-button" type="primary" block :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
            提交申请
          </wd-button>
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

.form-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  border-bottom: 1rpx solid var(--app-divider);
}

.form-label {
  color: var(--app-text-body);
  font-size: 28rpx;
}

.select-line {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid var(--app-divider);
  color: var(--app-text-body);
  font-size: 28rpx;
}

.select-value {
  color: var(--app-text-title);
  font-weight: 600;
}

.sync-button,
.submit-button {
  margin-top: 30rpx;
}

.asset-form-card {
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--app-divider);
}

.asset-form-card:last-child {
  border-bottom: 0;
}

.asset-form-title {
  color: var(--app-text-title);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
}

.asset-form-meta {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  word-break: break-all;
}

.signature-done {
  margin-top: 18rpx;
  color: var(--app-color-primary-deep);
  font-size: 24rpx;
}
</style>
