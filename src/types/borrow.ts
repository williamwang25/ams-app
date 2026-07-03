import type { BorrowStatus } from '@/utils/status'

export interface BorrowItem {
  asset_id: string
  asset_no: string
  name: string
  brand: string
  spec: string
  unit_price: number | null
  location_name: string
  quantity: number
  expected_return_date: string
  usage: string
}

export interface BorrowRequest {
  _id: string
  serial_no: string
  teacher_id: string
  teacher_name: string
  teacher_phone: string
  items: BorrowItem[]
  signature_file_id: string
  status: BorrowStatus
  reject_reason: string
  approved_by: string
  approved_by_name: string
  approved_at: number | null
  returned_at: number | null
  voucher_qr_payload: string
  created_at: number
  updated_at: number
}

export type BorrowListMineItem = Pick<
  BorrowRequest,
  | '_id'
  | 'serial_no'
  | 'status'
  | 'items'
  | 'reject_reason'
  | 'approved_at'
  | 'returned_at'
  | 'created_at'
  | 'updated_at'
>

export interface SubmitBorrowItem {
  asset_id: string
  quantity?: number
  expected_return_date: string
  usage: string
}

export interface SubmitBorrowInput {
  items: SubmitBorrowItem[]
  signature_file_id: string
}

export interface SubmitBorrowResult {
  _id: string
  serial_no: string
  status: 'PENDING'
}

export interface CancelBorrowResult {
  _id: string
  status: 'CANCELLED'
}

export interface ReturnBorrowResult {
  _id: string
  status: 'RETURNED'
  returned_at: number
}

export interface ListMineInput {
  status?: BorrowStatus
  page?: number
  pageSize?: number
}

export interface ListMineResult {
  total: number
  list: BorrowListMineItem[]
}
