/**
 * borrow.cancel：教师撤回未审批申请。
 *
 * 契约：docs/04-api-spec.md 4.2.3.5
 * 流程：docs/07-workflows.md 7.5.2
 *
 * 鉴权：教师专属；teacher_id 必须等于自己 _id。
 *
 * 事务化：状态校验（必须 PENDING）→ 更新申请 → 批量恢复资产 PENDING→IDLE → 写日志。
 *
 * 错误码：1001 / 2002 / 2003 / 2004 / 3002 / 4002 / 5001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireTeacher } = require('../utils/identity');
const { buildBorrowLog } = require('../utils/log');

module.exports = async (event) => {
  const auth = await requireTeacher(event);
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
      if (borrow.teacher_id !== auth.operator.id) {
        const e = new Error('只能撤回自己提交的申请');
        e.bizCode = 2004;
        throw e;
      }
      if (borrow.status !== 'PENDING') {
        const e = new Error(`当前状态 ${borrow.status} 不允许撤回`);
        e.bizCode = 3002;
        throw e;
      }

      const items = Array.isArray(borrow.items) ? borrow.items : [];
      const assetIds = items.map((it) => it.asset_id).filter(Boolean);

      await transaction.collection(COLLECTIONS.BORROW).doc(borrow_id).update({
        status: 'CANCELLED',
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
            opType: 'BORROW',
            changes: [{ field: 'business_status', before: 'PENDING', after: 'IDLE' }],
            operator: auth.operator,
            relatedId: borrow_id,
            remark: '教师撤回申请',
          }),
        );
      }
    });
  } catch (e) {
    if (e && typeof e.bizCode === 'number') return err(e.bizCode, e.message);
    console.error('[borrow.cancel] transaction failed:', e);
    return err(5001, '撤回失败，请稍后重试');
  }

  return ok({ _id: borrow_id, status: 'CANCELLED' });
};
