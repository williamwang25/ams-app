/**
 * asset.resolveImageUrls：管理员解析资产图片临时访问地址。
 */

const { app } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');

function readString(value, key) {
  if (!value || typeof value !== 'object') return '';
  const next = value[key];
  return typeof next === 'string' ? next : '';
}

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const fileIDs = Array.isArray(data.fileIDs)
    ? Array.from(new Set(data.fileIDs.map((id) => String(id || '').trim()).filter(Boolean)))
    : [];
  if (fileIDs.length === 0) return ok({ urls: [] });

  const requestedMaxAge = Number(data.maxAge || 3600);
  const maxAge = Number.isFinite(requestedMaxAge)
    ? Math.min(86400, Math.max(60, Math.floor(requestedMaxAge)))
    : 3600;

  const result = await app.getTempFileURL({
    fileList: fileIDs.map((fileID) => ({ fileID, maxAge })),
  });
  const rawList = result && Array.isArray(result.fileList) ? result.fileList : [];
  const urls = rawList
    .map((item) => {
      const fileID = readString(item, 'fileID') || readString(item, 'fileId');
      const url =
        readString(item, 'tempFileURL') ||
        readString(item, 'download_url') ||
        readString(item, 'url');
      return fileID && url ? { fileID, url } : null;
    })
    .filter(Boolean);

  return ok({ urls });
};
