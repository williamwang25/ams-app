/**
 * notice.update：编辑通知（不含发布状态）。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { validateTitle, validateContent, validateLevel, validateId } = require('../utils/validate');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let id;
  let patch;
  try {
    id = validateId(data.id);
    patch = {
      title: validateTitle(data.title),
      content: validateContent(data.content),
      level: validateLevel(data.level),
      updated_at: Date.now(),
    };
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  try {
    const existing = await db.collection(COLLECTIONS.NOTICE).doc(id).get();
    const row = existing && existing.data && existing.data[0];
    if (!row) return err(4002, '通知不存在');

    await db.collection(COLLECTIONS.NOTICE).doc(id).update(patch);
    return ok({ _id: id, notice: { ...row, ...patch } });
  } catch (e) {
    console.error('[notice.update]', e);
    return err(5001, '更新通知失败');
  }
};
