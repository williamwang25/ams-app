/**
 * borrow.submit：教师提交借用申请。
 *
 * 契约：docs/04-api-spec.md 4.2.3.1
 * 流程：docs/07-workflows.md 7.5.1
 *
 * 事务化：用 db.runTransaction 保证「创建申请 + 批量更新资产 + 写日志」原子。
 *
 * 错误码：1001 / 1002 / 2001 / 2002 / 2003 / 3001 / 4001 / 5001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireTeacher } = require('../utils/identity');
const { validateSubmitInput } = require('../utils/validate');
const { nextBorrowSerialNo } = require('../utils/serial');
const { buildBorrowLog } = require('../utils/log');

module.exports = async (event) => {
  // 1. 鉴权（教师）
  const auth = await requireTeacher(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);
  const teacher = auth.teacher;

  // 2. 校验入参
  const input = (event && event.data) || {};
  const v = validateSubmitInput(input);
  if (!v.ok) return err(v.code, v.message);
  const { normalizedItems } = v;
  const signature_file_id = String(input.signature_file_id).trim();

  // 3. 生成流水号（不在事务内：seq 自带原子性，且事务内不允许嵌套）
  const serial_no = await nextBorrowSerialNo();
  const now = Date.now();
  const assetIds = normalizedItems.map((it) => it.asset_id);

  // 4. 事务体
  let result;
  try {
    result = await db.runTransaction(async (transaction) => {
      // 4.1 拉取所有资产（一次 where in 取全部）
      const assetsRes = await transaction
        .collection(COLLECTIONS.ASSET)
        .where({ _id: _.in(assetIds) })
        .get();
      const assets = (assetsRes && assetsRes.data) || [];
      const assetMap = new Map(assets.map((a) => [a._id, a]));

      // 4.2 校验资产存在性
      const missing = assetIds.filter((id) => !assetMap.has(id));
      if (missing.length > 0) {
        const e = new Error('部分资产不存在');
        e.bizCode = 4001;
        e.bizExtra = { missing_asset_ids: missing };
        throw e;
      }

      // 4.3 校验全部 IDLE
      const offending = [];
      for (const id of assetIds) {
        const a = assetMap.get(id);
        if (a.business_status !== 'IDLE') offending.push(id);
      }
      if (offending.length > 0) {
        const e = new Error('存在非闲置资产，无法借用');
        e.bizCode = 3001;
        e.bizExtra = { offending_asset_ids: offending };
        throw e;
      }

      // 4.4 创建申请
      const itemsSnapshot = normalizedItems.map((it) => {
        const a = assetMap.get(it.asset_id);
        return {
          asset_id: a._id,
          asset_no: a.asset_no || '',
          name: a.name || '',
          brand: a.brand || '',
          spec: a.spec || '',
          unit_price: typeof a.unit_price === 'number' ? a.unit_price : null,
          location_name: a.location_name || '',
          quantity: it.quantity,
          expected_return_date: it.expected_return_date,
          usage: it.usage,
        };
      });
      const borrowDoc = {
        serial_no,
        teacher_id: teacher._id,
        teacher_name: teacher.name || '',
        teacher_phone: teacher.phone || '',
        items: itemsSnapshot,
        signature_file_id,
        status: 'PENDING',
        reject_reason: '',
        approved_by: '',
        approved_by_name: '',
        approved_at: null,
        returned_at: null,
        voucher_qr_payload: '',
        created_at: now,
        updated_at: now,
      };
      const addRes = await transaction.collection(COLLECTIONS.BORROW).add(borrowDoc);
      const borrowId = addRes && (addRes.id || addRes._id);
      if (!borrowId) {
        throw new Error('创建借用申请失败');
      }

      // 4.5 批量更新资产 + 写日志（按 asset_id 顺序逐条做，确保事务能 rollback）
      for (const id of assetIds) {
        const a = assetMap.get(id);
        await transaction.collection(COLLECTIONS.ASSET).doc(id).update({
          business_status: 'PENDING',
          current_borrow_id: borrowId,
          updated_at: now,
        });
        await transaction.collection(COLLECTIONS.ASSET_LOG).add(
          buildBorrowLog({
            asset: a,
            opType: 'BORROW',
            changes: [{ field: 'business_status', before: 'IDLE', after: 'PENDING' }],
            operator: auth.operator,
            relatedId: borrowId,
            remark: '提交借用申请，待审批',
          }),
        );
      }

      return { borrowId };
    });
  } catch (e) {
    if (e && typeof e.bizCode === 'number') {
      return err(e.bizCode, e.message, e.bizExtra);
    }
    console.error('[borrow.submit] transaction failed:', e);
    return err(5001, '提交申请失败，请稍后重试');
  }

  return ok({ _id: result.borrowId, serial_no, status: 'PENDING' });
};
