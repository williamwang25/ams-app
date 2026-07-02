import type { ListNoticeResult } from '@/types/notice'
import { callCloud } from '@/utils/cloud'

export function listPublishedNotices(pageSize = 3) {
  return callCloud<ListNoticeResult>('notice', 'list', {
    page: 1,
    pageSize,
    published_only: true,
  })
}
