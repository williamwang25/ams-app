/**
 * 入参校验工具。
 * 字段白名单与 docs/03-data-model.md 3.4.2 对齐。
 */

// 资产入库 / 编辑允许的字段（不含 business_status / current_borrow_id / asset_no / is_large 等系统字段）
const ASSET_EDITABLE_FIELDS = [
  'voucher_no',
  'name',
  'brand',
  'spec',
  'category_national',
  'category_industry',
  'unit_price',
  'quantity',
  'unit',
  'book_date',
  'original_value',
  'accumulated_depreciation',
  'net_value',
  'depreciation_years',
  'depreciated_months',
  'dept_code',
  'dept_name',
  'user_name',
  'location_code',
  'location_name',
  'purchase_mode',
  'acquire_date',
  'book_in_date',
  'supplier',
  'manufacturer',
  'invoice_no',
  'contract_no',
  'usage',
  'edu_direction',
  'vehicle_no',
  'project_name',
  'claim_status',
  'status_raw',
  'remark',
  'image_urls',
];

const NUMERIC_FIELDS = new Set([
  'unit_price',
  'quantity',
  'original_value',
  'accumulated_depreciation',
  'net_value',
  'depreciation_years',
  'depreciated_months',
]);

const BUSINESS_STATUS_VALUES = new Set([
  'IDLE',
  'IN_USE',
  'LENT',
  'PENDING',
  'MAINTAIN',
  'SCRAPPED',
]);

/**
 * 从原始 input 中按 ASSET_EDITABLE_FIELDS 过滤白名单字段，并对数字字段做类型规范化。
 * 不在白名单的字段会被直接丢弃（防止前端注入 business_status 等敏感字段）。
 *
 * @param {object} input
 * @returns {object}
 */
function pickAssetFields(input) {
  const result = {};
  if (!input || typeof input !== 'object') return result;
  for (const f of ASSET_EDITABLE_FIELDS) {
    if (!(f in input)) continue;
    const v = input[f];
    if (v === undefined) continue;
    if (NUMERIC_FIELDS.has(f)) {
      if (v === null || v === '') {
        result[f] = null;
      } else {
        const n = Number(v);
        if (!Number.isFinite(n)) {
          throw Object.assign(new Error(`字段 ${f} 必须是数字`), { code: 1002 });
        }
        result[f] = n;
      }
    } else if (f === 'image_urls') {
      if (!Array.isArray(v)) {
        throw Object.assign(new Error('image_urls 必须是数组'), { code: 1002 });
      }
      result[f] = v.map((s) => String(s || '')).filter(Boolean);
    } else {
      result[f] = typeof v === 'string' ? v : String(v);
    }
  }
  return result;
}

/**
 * create 时必填字段校验。一期最低要求：name + unit_price。
 * 其余字段可补录。
 */
function requireCreateFields(payload) {
  const errors = [];
  if (!payload.name) errors.push('name');
  if (payload.unit_price == null) errors.push('unit_price');
  if (errors.length) {
    throw Object.assign(new Error(`缺少必填字段：${errors.join(', ')}`), { code: 1001 });
  }
}

/**
 * 分页参数解析。
 */
function parsePagination(input) {
  const data = input || {};
  let page = Number(data.page);
  let pageSize = Number(data.pageSize);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
  if (pageSize > 200) pageSize = 200;
  return { page, pageSize };
}

module.exports = {
  ASSET_EDITABLE_FIELDS,
  NUMERIC_FIELDS,
  BUSINESS_STATUS_VALUES,
  pickAssetFields,
  requireCreateFields,
  parsePagination,
};
