/**
 * asset.getTimeline：按 asset_id 取该资产的全部 ams_asset_log，倒序。
 *
 * 入参：{ asset_id: string, limit?: number }
 * 出参：{ list: AssetLog[], total }
 *
 * limit 默认 100，上限 500。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const asset_id = String(data.asset_id || '').trim();
  if (!asset_id) return err(1001, '缺少 asset_id');

  let limit = Number(data.limit);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const query = db.collection(COLLECTIONS.ASSET_LOG).where({ asset_id });

  const [{ data: list }, { total }] = await Promise.all([
    query.orderBy('created_at', 'desc').limit(limit).get(),
    query.count(),
  ]);

  return ok({ list: list || [], total: total || 0 });
};
