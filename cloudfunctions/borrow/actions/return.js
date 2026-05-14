/**
 * borrow.return：归还（双身份）。
 *
 * 契约：docs/04-api-spec.md 4.2.3.4
 * 流程：docs/07-workflows.md 7.5.4
 *
 * 鉴权：
 *   - 管理员：可归还任何申请
 *   - 教师：teacher_id 必须等于自己 _id（越权 → 2004）
 *
 * 事务化：状态校验 → 更新申请 → 批量更新资产 LENT→IDLE → 写 RETURN 日志。
 *
 * 错误码：1001 / 2001 / 2002 / 2003 / 2004 / 3003 / 4002 / 5001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { authenticate } = require('../utils/identity');
const { buildBorrowLog } = require('../utils/log');

module.exports = async (event) => {
  const auth = await authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const borrow_id = String(data.borrow_id || '').trim();
  if (!borrow_id) return err(1001, '缺少 borrow_id');

  const now = Date.now();

  try {
    await db.runTransaction(async (transaction) => {
      const borrowRes = await transaction.collection(COLLECTIONS.BORROW).doc(borrow_id).get();
      const borrow = borrowRes && borrowRes.data;
      if (!borrow) {
        const e = new Error('借用申请不存在');
        e.bizCode = 4002;
        throw e;
      }
      if (auth.role === 'teacher' && borrow.teacher_id !== auth.operator.id) {
        const e = new Error('只能归还自己提交的申请');
        e.bizCode = 2004;
        throw e;
      }
      if (borrow.status !== 'APPROVED') {
        const e = new Error(`当前状态 ${borrow.status} 不允许归还`);
        e.bizCode = 3003;
        throw e;
      }

      const items = Array.isArray(borrow.items) ? borrow.items : [];
      const assetIds = items.map((it) => it.asset_id).filter(Boolean);

      await transaction.collection(COLLECTIONS.BORROW).doc(borrow_id).update({
        status: 'RETURNED',
        returned_at: now,
        updated_at: now,
      });

      const assetsRes = await transaction
        .collection(COLLECTIONS.ASSET)
        .where({ _id: _.in(assetIds) })
        .get();
      const assetMap = new Map(((assetsRes && assetsRes.data) || []).map((a) => [a._id, a]));

      for (const id of assetIds) {
        const a = assetMap.get(id) || { _id: id, asset_no: '' };
        await transaction.collection(COLLECTIONS.ASSET).doc(id).update({
          business_status: 'IDLE',
          current_borrow_id: null,
          updated_at: now,
        });
        await transaction.collection(COLLECTIONS.ASSET_LOG).add(
          buildBorrowLog({
            asset: a,
            opType: 'RETURN',
            changes: [{ field: 'business_status', before: 'LENT', after: 'IDLE' }],
            operator: auth.operator,
            relatedId: borrow_id,
            remark: auth.role === 'teacher' ? '教师归还' : '管理员归还',
          }),
        );
      }
    });
  } catch (e) {
    if (e && typeof e.bizCode === 'number') return err(e.bizCode, e.message);
    console.error('[borrow.return] transaction failed:', e);
    return err(5001, '归还失败，请稍后重试');
  }

  return ok({ _id: borrow_id, status: 'RETURNED', returned_at: now });
};
