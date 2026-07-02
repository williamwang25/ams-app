/**
 * asset.uploadImages：管理员上传资产图片到云存储。
 *
 * 目的：管理端使用自定义 admin token 鉴权，不依赖 CloudBase Auth 用户态。
 * 因此资产图片写入存储统一走云函数，避免浏览器直传 storage 的 403。
 */

const { app, db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');

const MAX_IMAGE_COUNT = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function safePathSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .replace(/-+/g, '-') || 'unknown';
}

function buildCloudPath(assetNo, ext, imageNumber) {
  const safeAssetNo = safePathSegment(assetNo);
  const seq = String(imageNumber).padStart(2, '0');
  return `asset/${safeAssetNo}/${safeAssetNo}-${seq}.${ext}`;
}

function readFileInput(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw Object.assign(new Error(`第 ${index + 1} 张图片参数错误`), { code: 1001 });
  }

  const name = String(raw.name || `image-${index + 1}`);
  const contentType = String(raw.content_type || raw.contentType || '').toLowerCase();
  const base64 = String(raw.base64 || '').replace(/^data:[^;]+;base64,/, '');

  if (!ACCEPTED_TYPES.has(contentType)) {
    throw Object.assign(new Error('仅支持 JPG、PNG、WebP 图片'), { code: 1002 });
  }
  if (!base64) {
    throw Object.assign(new Error(`${name} 缺少图片内容`), { code: 1001 });
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    throw Object.assign(new Error(`${name} 图片内容为空`), { code: 1002 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('单张图片不能超过 5MB'), { code: 1002 });
  }

  return {
    name,
    contentType,
    ext: EXT_BY_TYPE[contentType],
    buffer,
  };
}

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const assetNo = String(data.asset_no || '').trim();
  if (!assetNo) return err(1001, '缺少资产编号');

  const files = Array.isArray(data.files) ? data.files : [];
  if (files.length === 0) return err(1001, '请选择要上传的图片');
  if (files.length > MAX_IMAGE_COUNT) return err(1002, `资产图片最多上传 ${MAX_IMAGE_COUNT} 张`);

  let normalizedFiles;
  try {
    normalizedFiles = files.map((file, index) => readFileInput(file, index));
  } catch (e) {
    return err(e.code || 1001, e.message || '图片参数错误');
  }

  const { data: rows } = await db
    .collection(COLLECTIONS.ASSET)
    .where({ asset_no: assetNo })
    .limit(1)
    .get();
  if (!rows || !rows[0]) return err(4001, '资产不存在');

  const baseIndex = Array.isArray(rows[0].image_urls) ? rows[0].image_urls.length : 0;
  const uploadedFiles = [];

  for (const [index, file] of normalizedFiles.entries()) {
    const cloudPath = buildCloudPath(assetNo, file.ext, baseIndex + index + 1);
    const result = await app.uploadFile({
      cloudPath,
      fileContent: file.buffer,
    });
    const fileID = result && (result.fileID || result.fileId);
    if (!fileID) return err(5001, `${file.name} 上传失败：未返回 fileID`);
    uploadedFiles.push({
      fileID,
      cloudPath,
      content_type: file.contentType,
      size: file.buffer.length,
    });
  }

  return ok({
    fileIDs: uploadedFiles.map((file) => file.fileID),
    files: uploadedFiles,
  });
};
