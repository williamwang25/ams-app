/**
 * notice.delete：删除通知。
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
    const existing = await db.collection(COLLECTIONS.NOTICE).doc(id).get();
    const row = existing && existing.data && existing.data[0];
    if (!row) return err(4002, '通知不存在');

    await db.collection(COLLECTIONS.NOTICE).doc(id).remove();
    return ok({ _id: id });
  } catch (e) {
    console.error('[notice.delete]', e);
    return err(5001, '删除通知失败');
  }
};
