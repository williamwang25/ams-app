export type NoticeLevel = 'INFO' | 'IMPORTANT'

export interface NoticeItem {
  _id: string
  title: string
  content: string
  level: NoticeLevel
  published: boolean
  published_at: number | null
  created_at: number
  updated_at: number
}

export interface ListNoticeInput {
  published_only?: boolean
  page?: number
  pageSize?: number
}

export interface ListNoticeResult {
  total: number
  list: NoticeItem[]
}
