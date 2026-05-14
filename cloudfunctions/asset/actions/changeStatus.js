/**
 * asset.changeStatus：变更资产业务状态。
 *
 * 入参：{ id: string, status: 'IDLE'|'IN_USE'|'MAINTAIN'|'SCRAPPED', remark?: string }
 * 出参：{ _id, before, after }
 *
 * 业务规则：
 *   - LENT / PENDING 由借还流程维护，本 action 拒绝设置。
 *   - SCRAPPED 后 op_type 记 SCRAP；其他变化记 STATUS_CHANGE。
 *   - 与现状态相同则视为 noop，但仍返回当前文档。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { BUSINESS_STATUS_VALUES } = require('../utils/validate');
const { writeLog } = require('../utils/log');

const ADMIN_ALLOWED = new Set(['IDLE', 'IN_USE', 'MAINTAIN', 'SCRAPPED']);

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  const status = String(data.status || '').trim();
  if (!id) return err(1001, '缺少资产 id');
  if (!BUSINESS_STATUS_VALUES.has(status)) return err(1002, '业务状态非法');
  if (!ADMIN_ALLOWED.has(status)) {
    return err(3001, `状态 ${status} 由借还流程维护，不能直接设置`);
  }

  const { data: rows } = await db
    .collection(COLLECTIONS.ASSET)
    .where({ _id: id })
    .limit(1)
    .get();
  const before = rows && rows[0];
  if (!before) return err(4001, '资产不存在');

  if (before.business_status === status) {
    return ok({ _id: id, before: before.business_status, after: status, noop: true });
  }

  // LENT / PENDING 资产不应被管理员强行改状态
  if (before.business_status === 'LENT' || before.business_status === 'PENDING') {
    return err(3002, '资产正处于借用流程中，请先归还或在借用单上处理');
  }

  const now = Date.now();
  await db.collection(COLLECTIONS.ASSET).doc(id).update({
    business_status: status,
    updated_at: now,
    updated_by: auth.operator.id,
  });

  await writeLog({
    asset: before,
    opType: status === 'SCRAPPED' ? 'SCRAP' : 'STATUS_CHANGE',
    changes: [{ field: 'business_status', before: before.business_status, after: status }],
    operator: auth.operator,
    remark: data.remark || '',
  });

  return ok({ _id: id, before: before.business_status, after: status });
};
