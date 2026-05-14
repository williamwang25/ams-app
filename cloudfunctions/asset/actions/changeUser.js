/**
 * asset.changeUser：变更资产使用人 / 使用部门。
 *
 * 入参：{ id, user_name?, dept_code?, dept_name?, remark? }
 * 出参：{ _id, changes }
 *
 * 至少需提供 user_name / dept_code / dept_name 其一。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { writeLog, diffFields } = require('../utils/log');

const ALLOWED = ['user_name', 'dept_code', 'dept_name'];

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少资产 id');

  const patch = {};
  for (const f of ALLOWED) {
    if (f in data) patch[f] = String(data[f] || '');
  }
  if (Object.keys(patch).length === 0) {
    return err(1001, '请提供 user_name / dept_code / dept_name 之一');
  }

  const { data: rows } = await db
    .collection(COLLECTIONS.ASSET)
    .where({ _id: id })
    .limit(1)
    .get();
  const before = rows && rows[0];
  if (!before) return err(4001, '资产不存在');

  const after = { ...before, ...patch };
  const changes = diffFields(before, after, ALLOWED);
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
    opType: 'USER_CHANGE',
    changes,
    operator: auth.operator,
    remark: data.remark || '',
  });

  return ok({ _id: id, changes });
};
