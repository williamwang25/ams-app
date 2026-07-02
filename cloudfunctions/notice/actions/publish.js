/**
 * notice.publish：发布 / 下架通知。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { validateId, validatePublished } = require('../utils/validate');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let id;
  let published;
  try {
    id = validateId(data.id);
    published = validatePublished(data.published);
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  const now = Date.now();
  const patch = {
    published,
    published_at: published ? now : null,
    updated_at: now,
  };

  try {
    const existing = await db.collection(COLLECTIONS.NOTICE).doc(id).get();
    const row = existing && existing.data && existing.data[0];
    if (!row) return err(4002, '通知不存在');

    await db.collection(COLLECTIONS.NOTICE).doc(id).update(patch);
    return ok({ _id: id, published, published_at: patch.published_at });
  } catch (e) {
    console.error('[notice.publish]', e);
    return err(5001, '发布状态更新失败');
  }
};
