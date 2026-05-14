/**
 * asset.changeLocation：变更资产存放地点。
 *
 * 入参：{ id, location_code?, location_name?, remark? }
 * 出参：{ _id, changes }
 *
 * 至少需提供 location_code 或 location_name 其一。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { writeLog, diffFields } = require('../utils/log');

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少资产 id');

  const patch = {};
  if ('location_code' in data) patch.location_code = String(data.location_code || '');
  if ('location_name' in data) patch.location_name = String(data.location_name || '');
  if (Object.keys(patch).length === 0) {
    return err(1001, '请提供 location_code 或 location_name');
  }

  const { data: rows } = await db
    .collection(COLLECTIONS.ASSET)
    .where({ _id: id })
    .limit(1)
    .get();
  const before = rows && rows[0];
  if (!before) return err(4001, '资产不存在');

  const after = { ...before, ...patch };
  const changes = diffFields(before, after, ['location_code', 'location_name']);
  if (changes.length === 0) {
    return ok({ _id: id, changes: [], noop: true });
  }

  const now = Date.now();
  await db.collection(COLLECTIONS.ASSET).doc(id).update({
    ...patch,
    updated_at: now,
    updated_by: auth.operator.id,
  });

  await writeLog({
    asset: before,
    opType: 'LOCATION_CHANGE',
    changes,
    operator: auth.operator,
    remark: data.remark || '',
  });

  return ok({ _id: id, changes });
};
