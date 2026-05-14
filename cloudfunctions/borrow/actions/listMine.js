/**
 * borrow.listMine：教师查询自己的申请列表。
 *
 * 契约：docs/04-api-spec.md 4.2.3.6
 *
 * 入参：{ status?, page?=1, pageSize?=20 }   pageSize 上限 100
 * 出参：{ total, list: BorrowRequest[] }
 *
 * 仅返核心字段（不含签名图 / 凭证 payload，前端拉详情时再要）。
 *
 * 错误码：2002 / 2003
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireTeacher } = require('../utils/identity');

const STATUS_SET = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED']);
const PAGE_SIZE_MAX = 100;
const PAGE_SIZE_DEFAULT = 20;

function clampPageSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return PAGE_SIZE_DEFAULT;
  return Math.min(Math.floor(n), PAGE_SIZE_MAX);
}

module.exports = async (event) => {
  const auth = await requireTeacher(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const page = Math.max(1, Math.floor(Number(data.page) || 1));
  const pageSize = clampPageSize(data.pageSize);
  const where = { teacher_id: auth.operator.id };
  if (data.status && STATUS_SET.has(data.status)) {
    where.status = data.status;
  }

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
      approved_at: true,
      returned_at: true,
      created_at: true,
      updated_at: true,
    })
    .get();

  return ok({ total, list: (listRes && listRes.data) || [] });
};
