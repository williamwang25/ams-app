/**
 * asset.update：编辑资产基础字段。
 *
 * 入参：{ id: string, ...资产字段... }
 * 出参：{ _id, changes, asset }
 *
 * 不允许通过本 action 修改：
 *   - asset_no / business_status / current_borrow_id / is_large
 *     这些字段由系统或专用 action（changeStatus / 借还流程）维护。
 *
 * 写 ams_asset_log(UPDATE)，仅当确有字段变化时记录。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { pickAssetFields, ASSET_EDITABLE_FIELDS } = require('../utils/validate');
const { writeLog, diffFields } = require('../utils/log');

const DEFAULT_THRESHOLD = 50000;

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少资产 id');

  let patch;
  try {
    patch = pickAssetFields(data);
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }
  if (Object.keys(patch).length === 0) {
    return err(1001, '请提供要更新的字段');
  }

  const { data: rows } = await db
    .collection(COLLECTIONS.ASSET)
    .where({ _id: id })
    .limit(1)
    .get();
  const before = rows && rows[0];
  if (!before) return err(4001, '资产不存在');

  // unit_price 变化时同步重算 is_large
  const after = { ...before, ...patch };
  if ('unit_price' in patch) {
    const threshold = Number(process.env.LARGE_ASSET_THRESHOLD || DEFAULT_THRESHOLD);
    after.is_large = (Number(patch.unit_price) || 0) >= threshold;
  }

  const now = Date.now();
  const updateDoc = {
    ...patch,
    updated_at: now,
    updated_by: auth.operator.id,
  };
  if ('unit_price' in patch) {
    updateDoc.is_large = after.is_large;
  }

  const changes = diffFields(before, after, [...ASSET_EDITABLE_FIELDS, 'is_large']);
  if (changes.length === 0) {
    return ok({ _id: id, changes: [], asset: before });
  }

  await db.collection(COLLECTIONS.ASSET).doc(id).update(updateDoc);

  await writeLog({
    asset: before,
    opType: 'UPDATE',
    changes,
    operator: auth.operator,
  });

  return ok({ _id: id, changes, asset: { ...before, ...updateDoc } });
};
