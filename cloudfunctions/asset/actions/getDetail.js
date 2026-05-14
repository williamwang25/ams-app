/**
 * asset.getDetail：按 id 或 asset_no 取资产详情。
 *
 * 入参：{ id?: string, asset_no?: string }
 * 出参：资产文档（或 4001 不存在）
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  const asset_no = String(data.asset_no || '').trim();
  if (!id && !asset_no) return err(1001, '请提供 id 或 asset_no');

  const where = id ? { _id: id } : { asset_no };
  const { data: rows } = await db.collection(COLLECTIONS.ASSET).where(where).limit(1).get();
  const doc = rows && rows[0];
  if (!doc) return err(4001, '资产不存在');
  return ok(doc);
};
