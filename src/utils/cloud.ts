const DEFAULT_TCB_ENV_ID = 'ams-d8grnwwy6d8da557f'

export const TCB_ENV_ID = import.meta.env.VITE_TCB_ENV_ID || DEFAULT_TCB_ENV_ID

export interface CloudApiResponse<T> {
  code: number
  message: string
  data: T
}

export class CloudFunctionError extends Error {
  constructor(
    public code: number,
    message: string,
    public raw?: unknown,
  ) {
    super(message)
    this.name = 'CloudFunctionError'
  }
}

let cloudInited = false

export function initCloud() {
  if (cloudInited) {
    return true
  }
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: TCB_ENV_ID,
      traceUser: true,
    })
    cloudInited = true
    return true
  }
  return false
}

export async function ensureCloud() {
  if (!initCloud()) {
    throw new CloudFunctionError(2002, '请通过微信小程序打开')
  }
}

function isCloudApiResponse<T>(value: unknown): value is CloudApiResponse<T> {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.code === 'number' && typeof record.message === 'string' && 'data' in record
}

export async function callCloud<T>(name: string, action: string, data: object = {}): Promise<T> {
  await ensureCloud()
  const res = await wx.cloud.callFunction({
    name,
    data: { action, data },
  })
  const result = res.result
  if (!isCloudApiResponse<T>(result)) {
    throw new CloudFunctionError(-1, '云函数返回格式异常', res)
  }
  if (result.code !== 0) {
    throw new CloudFunctionError(result.code, result.message || '云函数错误', result)
  }
  return result.data
}

export async function uploadSignatureFile(teacherId: string, filePath: string) {
  await ensureCloud()
  const safeTeacherId = teacherId.trim() || 'unknown'
  const cloudPath = `signature/${safeTeacherId}/${Date.now()}.png`
  const res = await wx.cloud.uploadFile({ cloudPath, filePath })
  if (!res.fileID) {
    throw new CloudFunctionError(-1, '签名上传失败', res)
  }
  return res.fileID
}

export async function getTempFileURL(fileID: string) {
  await ensureCloud()
  const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
  const first = res.fileList[0]
  if (!first || first.status !== 0 || !first.tempFileURL) {
    throw new CloudFunctionError(-1, '文件临时链接获取失败', res)
  }
  return first.tempFileURL
}

export async function getTempFileURLs(fileIDs: string[]) {
  await ensureCloud()
  const uniqueFileIDs = [...new Set(fileIDs.map(fileID => fileID.trim()).filter(Boolean))]
  const result = new Map<string, string>()
  if (uniqueFileIDs.length === 0) {
    return result
  }
  const res = await wx.cloud.getTempFileURL({ fileList: uniqueFileIDs })
  res.fileList.forEach((file) => {
    if (file.fileID && file.status === 0 && file.tempFileURL) {
      result.set(file.fileID, file.tempFileURL)
    }
  })
  return result
}

export function getErrorMessage(error: unknown) {
  if (error instanceof CloudFunctionError) {
    if (error.code === 2002) return '请通过微信小程序打开'
    if (error.code === 2003) return '请先登录教师账号'
    if (error.code === 2004) return '你没有权限操作此申请'
    if (error.code >= 5000) return '服务器繁忙，请重试'
    return error.message || '操作失败'
  }
  if (error instanceof Error) {
    return error.message
  }
  return '操作失败'
}
