/**
 * asset.list：资产分页列表。
 *
 * 入参：
 *   {
 *     page?: number = 1,
 *     pageSize?: number = 20,   // 上限 200
 *     filter?: {
 *       business_status?: string | string[],
 *       dept_code?: string,
 *       is_large?: boolean,
 *       category_national?: string,
 *       location_code?: string,
 *       keyword?: string,        // name 模糊匹配
 *     },
 *     sort?: { field?: string, order?: 'asc'|'desc' }  // 默认按 created_at desc
 *   }
 *
 * 出参：{ total, page, pageSize, list }
 */

const { db, _, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');
const { parsePagination, BUSINESS_STATUS_VALUES } = require('../utils/validate');

const SORTABLE_FIELDS = new Set([
  'created_at',
  'updated_at',
  'unit_price',
  'asset_no',
  'name',
]);

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWhere(filter) {
  const where = {};
  if (!filter || typeof filter !== 'object') return where;

  if (filter.business_status) {
    if (Array.isArray(filter.business_status)) {
      const arr = filter.business_status.filter((s) => BUSINESS_STATUS_VALUES.has(String(s)));
      if (arr.length === 1) where.business_status = arr[0];
      else if (arr.length > 1) where.business_status = _.in(arr);
    } else if (BUSINESS_STATUS_VALUES.has(String(filter.business_status))) {
      where.business_status = String(filter.business_status);
    }
  }
  if (filter.dept_code) where.dept_code = String(filter.dept_code);
  if (filter.category_national) where.category_national = String(filter.category_national);
  if (filter.location_code) where.location_code = String(filter.location_code);
  if (typeof filter.is_large === 'boolean') where.is_large = filter.is_large;

  if (filter.keyword) {
    const kw = String(filter.keyword).trim();
    if (kw) {
      where.name = db.RegExp({ regexp: escapeRegex(kw), options: 'i' });
    }
  }
  return where;
}

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const { page, pageSize } = parsePagination(data);
  const where = buildWhere(data.filter);

  const sort = data.sort || {};
  const sortField = SORTABLE_FIELDS.has(String(sort.field)) ? String(sort.field) : 'created_at';
  const sortOrder = sort.order === 'asc' ? 'asc' : 'desc';

  const query = db.collection(COLLECTIONS.ASSET).where(where);

  const [{ data: list }, { total }] = await Promise.all([
    query
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get(),
    query.count(),
  ]);

  return ok({
    total: total || 0,
    page,
    pageSize,
    list: list || [],
  });
};
