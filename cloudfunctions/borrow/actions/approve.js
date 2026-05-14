/**
 * borrow.approve：管理员审批通过。
 *
 * 契约：docs/04-api-spec.md 4.2.3.2
 * 流程：docs/07-workflows.md 7.5.3
 *
 * 事务化：状态校验 → 更新申请 → 批量更新资产 PENDING→LENT → 写日志。
 *
 * 错误码：1001 / 2001 / 2004 / 3002 / 4002 / 5001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireAdmin } = require('../utils/identity');
const { buildBorrowLog } = require('../utils/log');

module.exports = async (event) => {
  const auth = await requireAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const borrow_id = String(data.borrow_id || '').trim();
  if (!borrow_id) return err(1001, '缺少 borrow_id');

  const now = Date.now();

  let result;
  try {
    result = await db.runTransaction(async (transaction) => {
      const borrowRes = await transaction.collection(COLLECTIONS.BORROW).doc(borrow_id).get();
      const borrow = borrowRes && borrowRes.data;
      if (!borrow) {
        const e = new Error('借用申请不存在');
        e.bizCode = 4002;
        throw e;
      }
      if (borrow.status !== 'PENDING') {
        const e = new Error(`当前状态 ${borrow.status} 不允许审批通过`);
        e.bizCode = 3002;
        throw e;
      }

      const items = Array.isArray(borrow.items) ? borrow.items : [];
      const assetIds = items.map((it) => it.asset_id).filter(Boolean);

      // 生成凭证（一期简易：base64({ borrow_id, serial_no, approved_at })）
      const voucher_qr_payload = Buffer.from(
        JSON.stringify({ borrow_id, serial_no: borrow.serial_no, approved_at: now }),
      ).toString('base64');

      await transaction.collection(COLLECTIONS.BORROW).doc(borrow_id).update({
        status: 'APPROVED',
        approved_by: auth.operator.id,
        approved_by_name: auth.operator.name,
        approved_at: now,
        voucher_qr_payload,
        updated_at: now,
      });

      // 批量更新资产 PENDING→LENT，并写日志
      // 拉取资产以填充 asset_no（日志冗余字段）
      const assetsRes = await transaction
        .collection(COLLECTIONS.ASSET)
        .where({ _id: _.in(assetIds) })
        .get();
      const assetMap = new Map(((assetsRes && assetsRes.data) || []).map((a) => [a._id, a]));

      for (const id of assetIds) {
        const a = assetMap.get(id) || { _id: id, asset_no: '' };
        await transaction.collection(COLLECTIONS.ASSET).doc(id).update({
          business_status: 'LENT',
          updated_at: now,
        });
        await transaction.collection(COLLECTIONS.ASSET_LOG).add(
          buildBorrowLog({
            asset: a,
            opType: 'BORROW',
            changes: [{ field: 'business_status', before: 'PENDING', after: 'LENT' }],
            operator: auth.operator,
            relatedId: borrow_id,
            remark: '审批通过',
          }),
        );
      }

      return { voucher_qr_payload };
    });
  } catch (e) {
    if (e && typeof e.bizCode === 'number') return err(e.bizCode, e.message);
    console.error('[borrow.approve] transaction failed:', e);
    return err(5001, '审批失败，请稍后重试');
  }

  return ok({ _id: borrow_id, status: 'APPROVED', voucher_qr_payload: result.voucher_qr_payload });
};
