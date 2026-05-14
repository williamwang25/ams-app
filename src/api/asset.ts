import type { SearchAssetsInput, SearchAssetsResult } from '@/types/asset'
import { callCloud } from '@/utils/cloud'

export function searchAssets(input: SearchAssetsInput = {}) {
  return callCloud<SearchAssetsResult>('borrow', 'searchAssets', input)
}
