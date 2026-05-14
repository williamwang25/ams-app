/**
 * asset.create：单条入库。
 *
 * 入参：{ ...资产字段..., prefix?: 'YQJJ' }
 * 出参：{ _id, asset_no, is_large, asset }
 *
 * 业务规则：
 *   - 自动生成 `asset_no`：`<prefix><year><6位顺序号>`，前缀默认 YQJJ。
 *   - `business_status` 默认 IDLE。
 *   - `is_large = unit_price >= LARGE_ASSET_THRESHOLD`（环境变量，默认 50000）。
 *   - 写 ams_asset_log(CREATE)。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { pickAssetFields, requireCreateFields } = require('../utils/validate');
const { nextAssetNo } = require('../utils/seq');
const { writeLog } = require('../utils/log');

const DEFAULT_PREFIX = 'YQJJ';
const DEFAULT_THRESHOLD = 50000;

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let payload;
  try {
    payload = pickAssetFields(data);
    requireCreateFields(payload);
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  const prefix = String(data.prefix || DEFAULT_PREFIX).toUpperCase();
  const year = new Date().getFullYear();

  const asset_no = await nextAssetNo({ prefix, year });

  const threshold = Number(process.env.LARGE_ASSET_THRESHOLD || DEFAULT_THRESHOLD);
  const unitPrice = Number(payload.unit_price) || 0;
  const is_large = unitPrice >= threshold;

  const now = Date.now();
  const doc = {
    ...payload,
    asset_no,
    business_status: 'IDLE',
    is_large,
    current_borrow_id: null,
    created_at: now,
    updated_at: now,
    created_by: auth.operator.id,
    updated_by: auth.operator.id,
  };

  const r = await db.collection(COLLECTIONS.ASSET).add(doc);
  // Node SDK add 返回 { id } 或 { _id }，兼容两种
  const id = (r && (r.id || r._id)) || null;
  if (!id) return err(5000, '入库失败：未返回新文档 id');

  await writeLog({
    asset: { _id: id, asset_no },
    opType: 'CREATE',
    changes: [],
    operator: auth.operator,
    remark: `入库 ${doc.name}`,
  });

  return ok({
    _id: id,
    asset_no,
    is_large,
    asset: { _id: id, ...doc },
  });
};
