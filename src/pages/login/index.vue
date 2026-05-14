<script lang="ts" setup>
import { useUserStore } from '@/store'
import { getErrorMessage } from '@/utils/cloud'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '教师登录',
  },
})

const userStore = useUserStore()
const toast = useAppToast()
const username = ref('t001')
const password = ref('123456')
const loading = ref(false)

async function handleLogin() {
  const account = username.value.trim()
  const secret = password.value
  if (!account || !secret) {
    toast.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await userStore.loginByPassword(account, secret)
    toast.success('登录成功')
    uni.reLaunch({ url: '/pages/index/index' })
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <wd-toast />

    <view class="login-header">
      <view class="login-logo">
        <wd-icon name="user" size="42rpx" />
      </view>
      <view class="login-title">
        资产管理助手
      </view>
      <view class="login-subtitle">
        快速提交申请，实时查看进度
      </view>
    </view>

    <view class="login-card">
      <view class="section-title">
        <view class="title-line" />
        <view class="title-text">
          教师登录
        </view>
      </view>
      <wd-input v-model="username" label="账号" placeholder="请输入教师账号" clearable />
      <wd-input v-model="password" label="密码" placeholder="请输入密码" show-password />
      <wd-button custom-class="login-button" type="primary" block :loading="loading" @click="handleLogin">
        登录
      </wd-button>
    </view>

    <view class="login-tip">
      测试账号 t001 至 t005，初始密码 123456。
    </view>
    <view class="login-version">
      v1.0.0
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  padding: 104rpx 30rpx 40rpx;
  box-sizing: border-box;
  background:
    linear-gradient(180deg, rgba(0, 150, 194, 0.96) 0%, rgba(0, 107, 143, 0.92) 42%, #f5f7fa 42%),
    var(--app-bg-page);
}

.login-header {
  color: #fff;
  padding: 24rpx 6rpx 58rpx;
}

.login-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.18);
  margin-bottom: 24rpx;
}

.login-title {
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.25;
}

.login-subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  opacity: 0.86;
}

.login-card {
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 24rpx;
  padding: 34rpx 30rpx 38rpx;
  box-shadow: var(--app-shadow-primary);
}

.login-button {
  margin-top: 36rpx;
  border-radius: 999rpx;
}

.login-tip {
  margin-top: 28rpx;
  background-color: var(--app-color-primary-light);
  border: 1rpx solid #b3e5f0;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  font-size: 24rpx;
  color: var(--app-color-primary-deep);
  line-height: 1.6;
}

.login-version {
  margin-top: 40rpx;
  text-align: center;
  color: var(--app-text-muted);
  font-size: 22rpx;
}
</style>
