import type { AssetBusinessStatus } from '@/utils/status'

export interface SearchAssetItem {
  _id: string
  asset_no: string
  name: string
  brand: string
  spec: string
  unit_price: number | null
  quantity: number
  location_name: string
  business_status: 'IDLE'
  cover_image_file_id?: string
}

export interface SearchAssetsInput {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface SearchAssetsResult {
  total: number
  page: number
  pageSize: number
  list: SearchAssetItem[]
}

export interface BorrowCartAsset {
  asset_id: string
  asset_no: string
  name: string
  brand: string
  spec: string
  unit_price: number | null
  location_name: string
  business_status: AssetBusinessStatus
  available_quantity: number
}

export interface BorrowCartItem extends BorrowCartAsset {
  quantity: number
}

export function searchAssetToCartAsset(asset: SearchAssetItem): BorrowCartAsset {
  return {
    asset_id: asset._id,
    asset_no: asset.asset_no,
    name: asset.name,
    brand: asset.brand,
    spec: asset.spec,
    unit_price: asset.unit_price,
    location_name: asset.location_name,
    business_status: asset.business_status,
    available_quantity: Math.max(1, asset.quantity || 1),
  }
}
