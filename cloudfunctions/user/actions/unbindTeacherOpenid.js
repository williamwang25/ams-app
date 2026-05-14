/**
 * user.unbindTeacherOpenid：解除教师微信 openid 绑定。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { getTeacherById, sanitizeTeacher } = require('../utils/teacher');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少教师 id');

  const before = await getTeacherById(id);
  if (!before) return err(4001, '教师不存在');

  const updateDoc = {
    openid: null,
    unionid: null,
    bound_at: null,
    updated_at: Date.now(),
  };
  await db.collection(COLLECTIONS.TEACHER).doc(id).update(updateDoc);

  return ok({
    _id: id,
    teacher: sanitizeTeacher({ ...before, ...updateDoc }),
  });
};
