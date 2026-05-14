/**
 * user.resetTeacherPassword：重置教师密码。
 *
 * 入参：{ id, password? }；未传 password 时生成 8 位临时密码。
 * 出参：{ _id, temporary_password }
 */

const crypto = require('crypto');
const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { validatePassword } = require('../utils/validate');
const { getTeacherById } = require('../utils/teacher');

function generateTemporaryPassword() {
  return crypto.randomBytes(4).toString('hex');
}

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少教师 id');

  const teacher = await getTeacherById(id);
  if (!teacher) return err(4001, '教师不存在');

  let password;
  try {
    password = data.password ? validatePassword(data.password) : generateTemporaryPassword();
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  await db.collection(COLLECTIONS.TEACHER).doc(id).update({
    password,
    updated_at: Date.now(),
  });

  return ok({ _id: id, temporary_password: password });
};
