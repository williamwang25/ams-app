/**
 * borrow.adminList：管理员审批列表。
 *
 * 契约：docs/04-api-spec.md 4.2.3.7
 *
 * 入参：{ status?, keyword?, date_from?, date_to?, page?=1, pageSize?=20 }
 *   - keyword 模糊匹配 serial_no / teacher_name / items.asset_no
 *   - date_from/to 是 'YYYY-MM-DD'，按 created_at 过滤；含端点
 *
 * 出参：{ total, list: BorrowRequest[] }
 *   - 返回字段比 listMine 多 teacher_id / teacher_name / teacher_phone / approved_by / approved_by_name
 *
 * 错误码：1001 / 2001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireAdmin } = require('../utils/identity');

const STATUS_SET = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED']);
const PAGE_SIZE_MAX = 200;
const PAGE_SIZE_DEFAULT = 20;
const KEYWORD_MAX = 50;

function clampPageSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return PAGE_SIZE_DEFAULT;
  return Math.min(Math.floor(n), PAGE_SIZE_MAX);
}

/** 'YYYY-MM-DD' → 当日 00:00 北京时间对应的 UTC 毫秒数 */
function dateKeyToTsStart(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ts = Date.parse(`${s}T00:00:00.000+08:00`);
  return Number.isFinite(ts) ? ts : null;
}
function dateKeyToTsEnd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ts = Date.parse(`${s}T23:59:59.999+08:00`);
  return Number.isFinite(ts) ? ts : null;
}

/** 安全转义正则元字符，避免关键字注入 */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = async (event) => {
  const auth = await requireAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const page = Math.max(1, Math.floor(Number(data.page) || 1));
  const pageSize = clampPageSize(data.pageSize);

  const conds = [];
  if (data.status && STATUS_SET.has(data.status)) {
    conds.push({ status: data.status });
  }

  if (data.date_from) {
    const ts = dateKeyToTsStart(data.date_from);
    if (ts == null) return err(1001, 'date_from 格式应为 YYYY-MM-DD');
    conds.push({ created_at: _.gte(ts) });
  }
  if (data.date_to) {
    const ts = dateKeyToTsEnd(data.date_to);
    if (ts == null) return err(1001, 'date_to 格式应为 YYYY-MM-DD');
    conds.push({ created_at: _.lte(ts) });
  }

  if (data.keyword) {
    const kw = String(data.keyword).trim();
    if (kw.length > KEYWORD_MAX) return err(1001, `关键字不超过 ${KEYWORD_MAX} 字`);
    if (kw) {
      const re = new RegExp(escapeRegExp(kw), 'i');
      conds.push(
        _.or([
          { serial_no: re },
          { teacher_name: re },
          { 'items.asset_no': re },
        ]),
      );
    }
  }

  const where = conds.length === 0 ? {} : conds.length === 1 ? conds[0] : _.and(conds);
  const collection = db.collection(COLLECTIONS.BORROW).where(where);
  const countRes = await collection.count();
  const total = (countRes && countRes.total) || 0;
  if (total === 0) return ok({ total: 0, list: [] });

  const listRes = await collection
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .field({
      _id: true,
      serial_no: true,
      status: true,
      items: true,
      reject_reason: true,
      teacher_id: true,
      teacher_name: true,
      teacher_phone: true,
      approved_by: true,
      approved_by_name: true,
      approved_at: true,
      returned_at: true,
      created_at: true,
      updated_at: true,
    })
    .get();

  return ok({ total, list: (listRes && listRes.data) || [] });
};
