/**
 * notice.getDetail：通知详情。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { validateId } = require('../utils/validate');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  let id;
  try {
    id = validateId((event && event.data && event.data.id) || '');
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  try {
    const res = await db.collection(COLLECTIONS.NOTICE).doc(id).get();
    const row = res && res.data && res.data[0];
    if (!row) return err(4002, '通知不存在');
    return ok(row);
  } catch (e) {
    console.error('[notice.getDetail]', e);
    return err(5001, '获取通知失败');
  }
};
