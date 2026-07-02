<script lang="ts" setup>
import type { SearchAssetItem } from '@/types/asset'
import { searchAssets } from '@/api/asset'
import { useBorrowCartStore, useUserStore } from '@/store'
import { searchAssetToCartAsset } from '@/types/asset'
import { getErrorMessage, getTempFileURLs } from '@/utils/cloud'
import { useAppToast } from '@/utils/toast'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '借用资产',
  },
})

interface TouchPoint {
  clientX: number
  clientY: number
}

interface MiniTouchEvent {
  touches?: TouchPoint[]
  changedTouches?: TouchPoint[]
}

interface CartRect {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

interface DragState {
  visible: boolean
  asset: SearchAssetItem | null
  x: number
  y: number
  canDrop: boolean
}

interface PendingDrag {
  asset: SearchAssetItem
  startX: number
  startY: number
}

interface FlightState {
  visible: boolean
  active: boolean
  asset: SearchAssetItem | null
  fromX: number
  fromY: number
  toX: number
  toY: number
}

const userStore = useUserStore()
const cartStore = useBorrowCartStore()
const toast = useAppToast()
const keyword = ref('')
const loading = ref(false)
const list = ref<SearchAssetItem[]>([])
const total = ref(0)
const coverUrls = ref<Record<string, string>>({})
const cartRect = ref<CartRect | null>(null)
const lastTouchPoint = ref<TouchPoint | null>(null)
const pendingDrag = ref<PendingDrag | null>(null)
const dragState = ref<DragState>(createDragState())
const flightState = ref<FlightState>(createFlightState())

let flightStartTimer: ReturnType<typeof setTimeout> | undefined
let flightEndTimer: ReturnType<typeof setTimeout> | undefined
const DRAG_START_DISTANCE = 8

const cartQuantity = computed(() => cartStore.items.reduce((sum, item) => sum + item.quantity, 0))

const dragStyle = computed<Record<string, string>>(() => ({
  left: `${dragState.value.x}px`,
  top: `${dragState.value.y}px`,
}))

const flightStyle = computed<Record<string, string>>(() => ({
  'left': `${flightState.value.fromX}px`,
  'top': `${flightState.value.fromY}px`,
  '--fly-x': `${flightState.value.toX - flightState.value.fromX}px`,
  '--fly-y': `${flightState.value.toY - flightState.value.fromY}px`,
}))

function createDragState(): DragState {
  return {
    asset: null,
    canDrop: false,
    visible: false,
    x: 0,
    y: 0,
  }
}

function createFlightState(): FlightState {
  return {
    active: false,
    asset: null,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    visible: false,
  }
}

function getPoint(event: MiniTouchEvent): TouchPoint | null {
  const point = event.changedTouches?.[0] || event.touches?.[0]
  if (!point || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) {
    return null
  }
  return {
    clientX: point.clientX,
    clientY: point.clientY,
  }
}

function normalizeRect(rect: UniApp.NodeInfo | UniApp.NodeInfo[] | null | undefined): CartRect | null {
  const node = Array.isArray(rect) ? rect[0] : rect
  if (!node)
    return null
  const { left, right, top, bottom, width, height } = node
  if (
    typeof left !== 'number'
    || typeof right !== 'number'
    || typeof top !== 'number'
    || typeof bottom !== 'number'
    || typeof width !== 'number'
    || typeof height !== 'number'
  ) {
    return null
  }
  return { bottom, height, left, right, top, width }
}

function measureCartZone() {
  nextTick(() => {
    uni
      .createSelectorQuery()
      .select('.cart-dock')
      .boundingClientRect((rect) => {
        cartRect.value = normalizeRect(rect)
      })
      .exec()
  })
}

function getCartTarget(): TouchPoint {
  const rect = cartRect.value
  if (rect) {
    return {
      clientX: rect.left + Math.min(rect.width * 0.28, 168),
      clientY: rect.top + Math.min(rect.height * 0.42, 84),
    }
  }
  const systemInfo = uni.getSystemInfoSync()
  return {
    clientX: systemInfo.windowWidth / 2,
    clientY: systemInfo.windowHeight - 190,
  }
}

function isPointInCart(point: TouchPoint) {
  const rect = cartRect.value
  if (!rect)
    return false
  return (
    point.clientX >= rect.left - 16
    && point.clientX <= rect.right + 16
    && point.clientY >= rect.top - 16
    && point.clientY <= rect.bottom + 16
  )
}

function getAssetCover(asset: SearchAssetItem) {
  const fileID = asset.cover_image_file_id || ''
  return fileID ? coverUrls.value[fileID] || '' : ''
}

async function ensureSignedIn() {
  const profile = await userStore.bootstrapAuth()
  if (!profile) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}

async function hydrateAssetCovers(assets: SearchAssetItem[]) {
  const fileIDs = assets.map(asset => asset.cover_image_file_id || '').filter(Boolean)
  if (fileIDs.length === 0) {
    coverUrls.value = {}
    return
  }
  try {
    const urls = await getTempFileURLs(fileIDs)
    coverUrls.value = Object.fromEntries(urls)
  }
  catch (error) {
    console.warn('资产封面临时链接获取失败', error)
    coverUrls.value = {}
  }
}

async function loadAssets() {
  if (!(await ensureSignedIn()))
    return
  loading.value = true
  try {
    const result = await searchAssets({
      keyword: keyword.value.trim(),
      page: 1,
      pageSize: 30,
    })
    list.value = result.list
    total.value = result.total
    void hydrateAssetCovers(result.list)
  }
  catch (error) {
    toast.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

function runAddAnimation(asset: SearchAssetItem, startPoint: TouchPoint | null) {
  if (flightStartTimer)
    clearTimeout(flightStartTimer)
  if (flightEndTimer)
    clearTimeout(flightEndTimer)

  const from = startPoint || lastTouchPoint.value || {
    clientX: uni.getSystemInfoSync().windowWidth / 2,
    clientY: 280,
  }
  const to = getCartTarget()
  flightState.value = {
    active: false,
    asset,
    fromX: from.clientX,
    fromY: from.clientY,
    toX: to.clientX,
    toY: to.clientY,
    visible: true,
  }
  flightStartTimer = setTimeout(() => {
    flightState.value = {
      ...flightState.value,
      active: true,
    }
  }, 20)
  flightEndTimer = setTimeout(() => {
    flightState.value = createFlightState()
  }, 520)
}

function addAsset(asset: SearchAssetItem, startPoint: TouchPoint | null) {
  cartStore.addAsset(searchAssetToCartAsset(asset))
  runAddAnimation(asset, startPoint)
  measureCartZone()
}

function addFromButton(asset: SearchAssetItem, event: MiniTouchEvent) {
  const point = getPoint(event)
  addAsset(asset, point)
}

function rememberTouch(event: MiniTouchEvent) {
  const point = getPoint(event)
  if (point) {
    lastTouchPoint.value = point
  }
}

function prepareDrag(asset: SearchAssetItem, event: MiniTouchEvent) {
  const point = getPoint(event)
  if (!point)
    return
  lastTouchPoint.value = point
  pendingDrag.value = {
    asset,
    startX: point.clientX,
    startY: point.clientY,
  }
  measureCartZone()
}

function startDrag(asset: SearchAssetItem, point: TouchPoint) {
  if (!point)
    return
  dragState.value = {
    asset,
    canDrop: isPointInCart(point),
    visible: true,
    x: point.clientX,
    y: point.clientY,
  }
  uni.vibrateShort({ type: 'light' })
}

function handleTouchMove(event: MiniTouchEvent) {
  const point = getPoint(event)
  if (!point)
    return
  lastTouchPoint.value = point
  if (!dragState.value.visible && pendingDrag.value) {
    const dx = point.clientX - pendingDrag.value.startX
    const dy = point.clientY - pendingDrag.value.startY
    if (Math.sqrt(dx * dx + dy * dy) >= DRAG_START_DISTANCE) {
      startDrag(pendingDrag.value.asset, point)
      pendingDrag.value = null
    }
  }
  if (!dragState.value.visible)
    return
  dragState.value = {
    ...dragState.value,
    canDrop: isPointInCart(point),
    x: point.clientX,
    y: point.clientY,
  }
}

function handleTouchEnd(event: MiniTouchEvent) {
  pendingDrag.value = null
  if (!dragState.value.visible)
    return
  const point = getPoint(event) || lastTouchPoint.value
  const asset = dragState.value.asset
  const shouldDrop = point ? isPointInCart(point) : false
  dragState.value = createDragState()
  if (asset && point && shouldDrop) {
    addAsset(asset, point)
  }
}

function cancelDrag() {
  pendingDrag.value = null
  dragState.value = createDragState()
}

function removeCartItem(assetId: string) {
  cartStore.removeAsset(assetId)
  measureCartZone()
}

function clearCart() {
  cartStore.clear()
  measureCartZone()
}

function goForm() {
  if (cartStore.isEmpty) {
    toast.warning('请先加入资产')
    return
  }
  uni.navigateTo({ url: '/pages/borrow/form' })
}

function isInCart(assetId: string) {
  return cartStore.items.some(item => item.asset_id === assetId)
}

watch(() => cartStore.items.length, () => {
  measureCartZone()
})

onReady(() => {
  measureCartZone()
})

onShow(() => {
  void loadAssets()
  measureCartZone()
})

onUnmounted(() => {
  if (flightStartTimer)
    clearTimeout(flightStartTimer)
  if (flightEndTimer)
    clearTimeout(flightEndTimer)
})
</script>

<template>
  <view class="borrow-workbench" @touchmove="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="cancelDrag">
    <wd-toast />

    <view class="search-shell">
      <view class="search-box">
        <view class="search-symbol i-carbon-search" />
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索资产名称 / 编号 / 品牌"
          placeholder-class="search-placeholder"
          @confirm="loadAssets"
        >
        <view class="search-action" @tap="loadAssets">
          搜索
        </view>
      </view>
    </view>

    <view class="asset-window">
      <view class="asset-window-meta">
        <view class="asset-count">
          {{ loading ? '加载中' : `可借 ${total} 件` }}
        </view>
        <view class="asset-tip">
          点击加号或拖入借物车
        </view>
      </view>

      <view v-if="loading" class="loading-panel">
        <wd-loading />
      </view>
      <scroll-view v-else scroll-y class="asset-scroll" enhanced>
        <view v-if="list.length > 0" class="asset-grid">
          <view
            v-for="asset in list"
            :key="asset._id"
            class="asset-tile"
            :class="{ selected: isInCart(asset._id) }"
            @touchstart="prepareDrag(asset, $event)"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @touchcancel="cancelDrag"
          >
            <view class="asset-photo-box">
              <image v-if="getAssetCover(asset)" class="asset-photo" mode="aspectFill" :src="getAssetCover(asset)" />
              <view v-else class="asset-photo-placeholder">
                <view class="placeholder-cube">
                  <view class="cube-top" />
                  <view class="cube-front" />
                  <view class="cube-side" />
                </view>
              </view>
              <view
                class="add-bubble"
                :class="{ added: isInCart(asset._id) }"
                @touchstart.stop="rememberTouch"
                @touchend.stop="addFromButton(asset, $event)"
              >
                <view class="plus-line horizontal" />
                <view class="plus-line vertical" />
              </view>
            </view>
            <view class="asset-name">
              {{ asset.name || asset.asset_no }}
            </view>
            <view class="asset-sub">
              {{ asset.brand || '未填品牌' }} · {{ asset.location_name || '未填地点' }}
            </view>
          </view>
        </view>
        <view v-else class="empty-panel">
          <view class="empty-asset-logo">
            <view class="empty-box" />
          </view>
          <view class="empty-title">
            暂无可借资产
          </view>
          <view class="empty-desc">
            换个关键词再试试
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="cart-dock" :class="{ 'drop-ready': dragState.canDrop }">
      <view class="cart-header">
        <view class="cart-logo">
          <view class="cart-basket" />
          <view class="cart-handle" />
        </view>
        <view class="cart-main">
          <view class="cart-title">
            借物车
          </view>
          <view class="cart-summary">
            {{ cartStore.isEmpty ? '拖拽资产到这里' : `${cartStore.count} 类 / ${cartQuantity} 件` }}
          </view>
        </view>
        <view v-if="!cartStore.isEmpty" class="cart-clear" @tap="clearCart">
          清空
        </view>
        <button class="cart-submit" :disabled="cartStore.isEmpty" @tap="goForm">
          下一步
        </button>
      </view>

      <scroll-view scroll-x class="cart-strip" enhanced>
        <view v-if="cartStore.isEmpty" class="cart-empty">
          点击资产右下角加号，也可以直接拖入借物车
        </view>
        <view v-else class="cart-items">
          <view v-for="item in cartStore.items" :key="item.asset_id" class="cart-chip">
            <view class="cart-chip-cover">
              <view class="mini-cube" />
            </view>
            <view class="cart-chip-text">
              <view class="cart-chip-name">
                {{ item.name || item.asset_no }}
              </view>
              <view class="cart-chip-qty">
                x{{ item.quantity }}
              </view>
            </view>
            <view class="cart-chip-remove" @tap="removeCartItem(item.asset_id)" />
          </view>
        </view>
      </scroll-view>
    </view>

    <view
      v-if="dragState.visible && dragState.asset"
      class="drag-preview"
      :class="{ dropping: dragState.canDrop }"
      :style="dragStyle"
    >
      <image v-if="getAssetCover(dragState.asset)" class="preview-image" mode="aspectFill" :src="getAssetCover(dragState.asset)" />
      <view v-else class="preview-placeholder">
        <view class="mini-cube large" />
      </view>
    </view>

    <view
      v-if="flightState.visible && flightState.asset"
      class="flight-card"
      :class="{ active: flightState.active }"
      :style="flightStyle"
    >
      <image v-if="getAssetCover(flightState.asset)" class="preview-image" mode="aspectFill" :src="getAssetCover(flightState.asset)" />
      <view v-else class="preview-placeholder">
        <view class="mini-cube large" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.borrow-workbench {
  min-height: 100vh;
  background: var(--app-bg-page);
  box-sizing: border-box;
  padding-bottom: 360rpx;
  overflow: hidden;
}

.search-shell {
  padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top) + 36rpx) 30rpx 20rpx;
  background: var(--app-bg-page);
}

.search-box {
  height: 72rpx;
  border-radius: 999rpx;
  background: #fff;
  box-shadow: var(--app-shadow-card);
  display: flex;
  align-items: center;
  padding: 0 12rpx 0 24rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(0, 150, 194, 0.08);
}

.search-symbol {
  width: 32rpx;
  height: 32rpx;
  color: var(--app-color-primary);
  margin-right: 14rpx;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  color: var(--app-text-title);
  font-size: 26rpx;
}

.search-placeholder {
  color: var(--app-text-muted);
  font-size: 26rpx;
}

.search-action {
  min-width: 92rpx;
  height: 52rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 999rpx;
  color: #fff;
  background: var(--app-color-primary);
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.asset-window {
  margin: 10rpx 24rpx 0;
  min-height: 58vh;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: var(--app-shadow-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.asset-window-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 22rpx 12rpx;
}

.asset-count {
  color: var(--app-text-title);
  font-size: 26rpx;
  font-weight: 700;
}

.asset-tip {
  color: var(--app-text-muted);
  font-size: 22rpx;
}

.asset-scroll {
  height: 58vh;
}

.asset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 12rpx 20rpx 28rpx;
  box-sizing: border-box;
}

.asset-tile {
  position: relative;
  width: calc((100% - 20rpx) / 2);
  border-radius: 18rpx;
  background: #fff;
  border: 1rpx solid var(--app-divider);
  box-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
  box-sizing: border-box;
}

.asset-tile.selected {
  border-color: rgba(0, 150, 194, 0.35);
  box-shadow: 0 8rpx 24rpx rgba(0, 150, 194, 0.12);
}

.asset-photo-box {
  position: relative;
  height: 184rpx;
  background: linear-gradient(145deg, #e8f8fc 0%, #f7fbfc 100%);
  overflow: hidden;
}

.asset-photo {
  width: 100%;
  height: 100%;
  display: block;
}

.asset-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-cube {
  position: relative;
  width: 96rpx;
  height: 82rpx;
}

.cube-top,
.cube-front,
.cube-side {
  position: absolute;
  border-radius: 8rpx;
}

.cube-top {
  left: 18rpx;
  top: 0;
  width: 64rpx;
  height: 28rpx;
  background: #b7e7f2;
  transform: skewX(-28deg);
}

.cube-front {
  left: 10rpx;
  top: 26rpx;
  width: 62rpx;
  height: 52rpx;
  background: var(--app-color-primary);
}

.cube-side {
  right: 2rpx;
  top: 26rpx;
  width: 30rpx;
  height: 52rpx;
  background: var(--app-color-primary-deep);
  transform: skewY(-24deg);
}

.add-bubble {
  position: absolute;
  right: 14rpx;
  bottom: 14rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: var(--app-color-primary);
  box-shadow: 0 8rpx 18rpx rgba(0, 150, 194, 0.32);
}

.add-bubble.added {
  background: var(--app-color-primary-deep);
}

.plus-line {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999rpx;
  background: #fff;
  transform: translate(-50%, -50%);
}

.plus-line.horizontal {
  width: 24rpx;
  height: 4rpx;
}

.plus-line.vertical {
  width: 4rpx;
  height: 24rpx;
}

.asset-name {
  padding: 16rpx 16rpx 0;
  color: var(--app-text-title);
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-sub {
  padding: 8rpx 16rpx 18rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-panel,
.empty-panel {
  height: 48vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
}

.empty-asset-logo {
  width: 112rpx;
  height: 112rpx;
  border-radius: 28rpx;
  background: var(--app-color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-box,
.mini-cube {
  width: 48rpx;
  height: 40rpx;
  border-radius: 8rpx;
  background: var(--app-color-primary);
  box-shadow: 16rpx 12rpx 0 var(--app-color-primary-deep);
}

.empty-title {
  margin-top: 22rpx;
  color: var(--app-text-title);
  font-size: 28rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.cart-dock {
  position: fixed;
  left: 20rpx;
  right: 20rpx;
  bottom: calc(50px + env(safe-area-inset-bottom) + 14rpx);
  z-index: 20;
  min-height: 240rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 44, 60, 0.14);
  border: 2rpx solid transparent;
  padding: 24rpx;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease;
}

.cart-dock.drop-ready {
  border-color: var(--app-color-primary);
  transform: translateY(-8rpx);
}

.cart-header {
  display: flex;
  align-items: center;
}

.cart-logo {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: var(--app-color-primary-light);
  margin-right: 18rpx;
  flex-shrink: 0;
}

.cart-basket {
  position: absolute;
  left: 18rpx;
  right: 14rpx;
  bottom: 17rpx;
  height: 28rpx;
  border-radius: 8rpx 8rpx 10rpx 10rpx;
  border: 5rpx solid var(--app-color-primary);
  border-top: 0;
}

.cart-handle {
  position: absolute;
  left: 24rpx;
  top: 16rpx;
  width: 26rpx;
  height: 18rpx;
  border-radius: 999rpx 999rpx 0 0;
  border: 5rpx solid var(--app-color-primary);
  border-bottom: 0;
}

.cart-main {
  flex: 1;
  min-width: 0;
}

.cart-title {
  color: var(--app-text-title);
  font-size: 30rpx;
  font-weight: 800;
}

.cart-summary {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
}

.cart-clear {
  color: var(--app-text-muted);
  font-size: 24rpx;
  padding: 16rpx;
}

.cart-submit {
  margin: 0;
  padding: 0 28rpx;
  min-width: 132rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 999rpx;
  background: var(--app-color-primary);
  color: #fff;
  font-size: 25rpx;
  font-weight: 700;
}

.cart-submit[disabled] {
  background: #d8e4e8;
  color: #fff;
}

.cart-submit::after {
  border: 0;
}

.cart-strip {
  margin-top: 18rpx;
  white-space: nowrap;
}

.cart-empty {
  height: 72rpx;
  line-height: 72rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.cart-items {
  display: inline-flex;
  gap: 14rpx;
}

.cart-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 244rpx;
  height: 78rpx;
  border-radius: 18rpx;
  background: #f7fbfc;
  border: 1rpx solid var(--app-divider);
  padding: 10rpx 34rpx 10rpx 12rpx;
  box-sizing: border-box;
}

.cart-chip-cover {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: var(--app-color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.cart-chip-cover .mini-cube {
  width: 24rpx;
  height: 20rpx;
  border-radius: 5rpx;
  box-shadow: 8rpx 6rpx 0 var(--app-color-primary-deep);
}

.cart-chip-text {
  flex: 1;
  min-width: 0;
}

.cart-chip-name {
  color: var(--app-text-title);
  font-size: 23rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-chip-qty {
  margin-top: 4rpx;
  color: var(--app-color-primary);
  font-size: 21rpx;
}

.cart-chip-remove {
  position: absolute;
  right: 10rpx;
  top: 10rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #dce8ec;
}

.cart-chip-remove::before,
.cart-chip-remove::after {
  content: '';
  position: absolute;
  left: 7rpx;
  top: 12rpx;
  width: 12rpx;
  height: 2rpx;
  background: #78909c;
}

.cart-chip-remove::before {
  transform: rotate(45deg);
}

.cart-chip-remove::after {
  transform: rotate(-45deg);
}

.drag-preview,
.flight-card {
  position: fixed;
  z-index: 80;
  width: 128rpx;
  height: 96rpx;
  margin-left: -64rpx;
  margin-top: -48rpx;
  border-radius: 18rpx;
  overflow: hidden;
  background: var(--app-color-primary-light);
  box-shadow: 0 12rpx 34rpx rgba(0, 44, 60, 0.22);
  pointer-events: none;
}

.drag-preview.dropping {
  transform: scale(0.92);
  box-shadow: 0 14rpx 42rpx rgba(0, 150, 194, 0.32);
}

.flight-card {
  transition:
    transform 0.46s cubic-bezier(0.2, 0.78, 0.2, 1),
    opacity 0.46s ease;
}

.flight-card.active {
  opacity: 0;
  transform: translate3d(var(--fly-x), var(--fly-y), 0) scale(0.28);
}

.preview-image,
.preview-placeholder {
  width: 100%;
  height: 100%;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-cube.large {
  width: 44rpx;
  height: 36rpx;
  box-shadow: 14rpx 10rpx 0 var(--app-color-primary-deep);
}
</style>
