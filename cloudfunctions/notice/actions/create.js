/**
 * notice.create：新建通知（默认未发布）。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { validateTitle, validateContent, validateLevel } = require('../utils/validate');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let payload;
  try {
    payload = {
      title: validateTitle(data.title),
      content: validateContent(data.content),
      level: validateLevel(data.level),
    };
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  const now = Date.now();
  const doc = {
    ...payload,
    published: false,
    published_at: null,
    created_by: auth.operator.id,
    created_at: now,
    updated_at: now,
  };

  try {
    const res = await db.collection(COLLECTIONS.NOTICE).add(doc);
    const id = (res && (res.id || res._id)) || null;
    if (!id) return err(5001, '创建通知失败');
    return ok({ _id: id, notice: { _id: id, ...doc } });
  } catch (e) {
    console.error('[notice.create]', e);
    return err(5001, '创建通知失败');
  }
};
