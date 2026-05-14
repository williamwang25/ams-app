/**
 * user.updateTeacher：编辑教师基础资料。
 *
 * 入参：{ id, username?, name?, phone?, department? }
 * 不允许通过本 action 修改 password / openid。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const {
  validateUsername,
  validateName,
  validateOptionalText,
} = require('../utils/validate');
const { getTeacherById, assertUsernameAvailable, sanitizeTeacher } = require('../utils/teacher');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const id = String(data.id || '').trim();
  if (!id) return err(1001, '缺少教师 id');

  const before = await getTeacherById(id);
  if (!before) return err(4001, '教师不存在');

  const patch = {};
  try {
    if ('username' in data) {
      const username = validateUsername(data.username);
      await assertUsernameAvailable(username, id);
      patch.username = username;
    }
    if ('name' in data) patch.name = validateName(data.name);
    if ('phone' in data) patch.phone = validateOptionalText(data.phone, '手机号', 30);
    if ('department' in data) {
      patch.department = validateOptionalText(data.department, '部门', 50);
    }
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  if (Object.keys(patch).length === 0) {
    return ok({ _id: id, teacher: sanitizeTeacher(before), noop: true });
  }

  const updateDoc = { ...patch, updated_at: Date.now() };
  await db.collection(COLLECTIONS.TEACHER).doc(id).update(updateDoc);

  return ok({
    _id: id,
    teacher: sanitizeTeacher({ ...before, ...updateDoc }),
  });
};
