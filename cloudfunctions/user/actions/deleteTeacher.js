/**
 * user.deleteTeacher：删除教师账号。
 *
 * 保护规则：已有借用申请的教师不允许删除，避免历史单据失去归属。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { getTeacherById } = require('../utils/teacher');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少教师 id');

  const teacher = await getTeacherById(id);
  if (!teacher) return err(4001, '教师不存在');

  const borrowCount = await db.collection(COLLECTIONS.BORROW).where({ teacher_id: id }).count();
  if ((borrowCount && borrowCount.total) > 0) {
    return err(3001, '该教师已有借用记录，不允许删除；可重置密码或解绑微信');
  }

  await db.collection(COLLECTIONS.TEACHER).doc(id).remove();
  return ok({ _id: id, deleted: true });
};
