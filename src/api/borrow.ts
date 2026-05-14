import type {
  BorrowRequest,
  CancelBorrowResult,
  ListMineInput,
  ListMineResult,
  ReturnBorrowResult,
  SubmitBorrowInput,
  SubmitBorrowResult,
} from '@/types/borrow'
import { callCloud } from '@/utils/cloud'

export function submitBorrow(input: SubmitBorrowInput) {
  return callCloud<SubmitBorrowResult>('borrow', 'submit', input)
}

export function cancelBorrow(borrow_id: string) {
  return callCloud<CancelBorrowResult>('borrow', 'cancel', { borrow_id })
}

export function returnBorrow(borrow_id: string) {
  return callCloud<ReturnBorrowResult>('borrow', 'return', { borrow_id })
}

export function listMyBorrows(input: ListMineInput = {}) {
  return callCloud<ListMineResult>('borrow', 'listMine', input)
}

export function getMyBorrowDetail(borrow_id: string) {
  return callCloud<BorrowRequest>('borrow', 'detail', { borrow_id })
}
