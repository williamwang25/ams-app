/**
 * 写 ams_asset_log（借用相关变更复用本表，op_type ∈ { BORROW, RETURN }）。
 *
 * 字段定义：docs/03-data-model.md 3.5 + 3.5 末尾的复用决议。
 *
 * 调用约定：
 *   - 在事务体内通过 transaction.collection(...).add(...) 写入（避免与主体表割裂）
 *   - 因此本模块只负责构建 log 文档对象，不直接调用 add；由 action 在事务内 add
 *
 * 入参（buildBorrowLog）：
 *   - asset:        ams_asset 当前文档（用 _id / asset_no）
 *   - opType:       'BORROW' | 'RETURN'
 *   - changes:      [{ field, before, after }, ...]
 *   - operator:     identity.authenticate() 返回的 operator
 *   - relatedId:    申请 _id
 *   - remark:       简短备注
 */

function buildBorrowLog(params) {
  const { asset, opType, changes, operator, relatedId, remark } = params || {};
  if (!asset || !asset._id) throw new Error('buildBorrowLog: asset is required');
  if (opType !== 'BORROW' && opType !== 'RETURN') {
    throw new Error('buildBorrowLog: opType must be BORROW or RETURN');
  }
  if (!operator || !operator.id) throw new Error('buildBorrowLog: operator is required');

  return {
    asset_id: asset._id,
    asset_no: asset.asset_no || null,
    op_type: opType,
    changes: Array.isArray(changes) ? changes : [],
    operator_id: operator.id,
    operator_role: operator.role || 'admin',
    operator_name: operator.name || '',
    related_id: relatedId || null,
    remark: remark || '',
    created_at: Date.now(),
  };
}

module.exports = { buildBorrowLog };
