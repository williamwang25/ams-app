/**
 * 写 ams_asset_log（变动审计）。
 * 字段定义：docs/03-data-model.md 3.5。
 *
 * 调用约定：写操作 action 在主表写完之后调用 writeLog，传入：
 *   - asset: 主表当前文档（用其 _id / asset_no）
 *   - opType: 'CREATE' / 'UPDATE' / 'STATUS_CHANGE' / 'LOCATION_CHANGE' / 'USER_CHANGE' / ...
 *   - changes: [{ field, before, after }]，create 时可省略
 *   - operator: authenticate() 返回的 operator 对象
 *   - relatedId / remark：可选
 */

const { db, COLLECTIONS } = require('./db');

async function writeLog(params) {
  const {
    asset,
    opType,
    changes,
    operator,
    relatedId,
    remark,
  } = params || {};

  if (!asset || !asset._id) throw new Error('writeLog: asset is required');
  if (!opType) throw new Error('writeLog: opType is required');
  if (!operator || !operator.id) throw new Error('writeLog: operator is required');

  await db.collection(COLLECTIONS.ASSET_LOG).add({
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
  });
}

/**
 * 比较 before / after 两个对象在指定字段上的差异，返回 changes 数组。
 * 仅纳入有实质变化的字段（!== 比较，对象 / 数组用 JSON.stringify）。
 */
function diffFields(before, after, fields) {
  const result = [];
  if (!before || !after || !Array.isArray(fields)) return result;
  for (const f of fields) {
    const b = before[f];
    const a = after[f];
    const same =
      b === a ||
      (b == null && a == null) ||
      (typeof b === 'object' && typeof a === 'object' && JSON.stringify(b) === JSON.stringify(a));
    if (!same) result.push({ field: f, before: b == null ? null : b, after: a == null ? null : a });
  }
  return result;
}

module.exports = { writeLog, diffFields };
