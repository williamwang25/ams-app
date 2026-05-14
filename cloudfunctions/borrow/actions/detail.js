/**
 * borrow.detail：申请详情（双身份）。
 *
 * 契约：docs/04-api-spec.md 4.2.3.8
 *
 * 鉴权：管理员任意；教师仅可读自己的申请。
 *
 * 错误码：1001 / 2001 / 2003 / 2004 / 4002
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { authenticate } = require('../utils/identity');

module.exports = async (event) => {
  const auth = await authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const borrow_id = String(data.borrow_id || '').trim();
  if (!borrow_id) return err(1001, '缺少 borrow_id');

  // 用 where 而非 doc().get()：CloudBase doc().get() 文档不存在时行为不一致，
  // where + limit(1) 取空数组语义更稳定。
  const res = await db.collection(COLLECTIONS.BORROW).where({ _id: borrow_id }).limit(1).get();
  const borrow = res && Array.isArray(res.data) && res.data[0];
  if (!borrow) return err(4002, '借用申请不存在');

  if (auth.role === 'teacher' && borrow.teacher_id !== auth.operator.id) {
    return err(2004, '只能查看自己的申请');
  }

  return ok(borrow);
};
