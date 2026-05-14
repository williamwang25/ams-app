export type AssetBusinessStatus =
  | 'IDLE'
  | 'IN_USE'
  | 'LENT'
  | 'PENDING'
  | 'MAINTAIN'
  | 'SCRAPPED'

export type BorrowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RETURNED'

export const BORROW_STATUS_LABEL: Record<BorrowStatus, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
  RETURNED: '已归还',
}

export const BORROW_STATUS_TAG_TYPE: Record<BorrowStatus, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'primary',
  REJECTED: 'danger',
  CANCELLED: 'default',
  RETURNED: 'success',
}

export function getBorrowStatusLabel(status: BorrowStatus) {
  return BORROW_STATUS_LABEL[status]
}
