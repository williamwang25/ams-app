import type { BorrowCartAsset, BorrowCartItem } from '@/types/asset'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function normalizeQuantity(value: number, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value) || value < 1) {
    return 1
  }
  return Math.min(Math.floor(value), max)
}

export const useBorrowCartStore = defineStore(
  'borrow-cart',
  () => {
    const items = ref<BorrowCartItem[]>([])

    const count = computed(() => items.value.length)
    const isEmpty = computed(() => items.value.length === 0)

    function addAsset(asset: BorrowCartAsset) {
      const existing = items.value.find(item => item.asset_id === asset.asset_id)
      if (existing) {
        existing.quantity = normalizeQuantity(existing.quantity + 1, existing.available_quantity)
        return
      }
      items.value.push({
        ...asset,
        quantity: 1,
      })
    }

    function removeAsset(assetId: string) {
      items.value = items.value.filter(item => item.asset_id !== assetId)
    }

    function updateQuantity(assetId: string, quantity: number) {
      const item = items.value.find(current => current.asset_id === assetId)
      if (!item) return
      item.quantity = normalizeQuantity(quantity, item.available_quantity)
    }

    function clear() {
      items.value = []
    }

    return {
      addAsset,
      clear,
      count,
      isEmpty,
      items,
      removeAsset,
      updateQuantity,
    }
  },
  {
    persist: true,
  },
)
