/**
 * user.createTeacher：新增教师账号。
 *
 * 入参：{ username, password, name, phone?, department? }
 * 出参：{ _id, teacher }
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const {
  validateUsername,
  validatePassword,
  validateName,
  validateOptionalText,
} = require('../utils/validate');
const { assertUsernameAvailable, sanitizeTeacher } = require('../utils/teacher');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let payload;
  try {
    const username = validateUsername(data.username);
    await assertUsernameAvailable(username);
    payload = {
      username,
      password: validatePassword(data.password),
      name: validateName(data.name),
      phone: validateOptionalText(data.phone, '手机号', 30),
      department: validateOptionalText(data.department, '部门', 50),
    };
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  const now = Date.now();
  const doc = {
    ...payload,
    openid: null,
    unionid: null,
    bound_at: null,
    created_at: now,
    updated_at: now,
  };

  const res = await db.collection(COLLECTIONS.TEACHER).add(doc);
  const id = (res && (res.id || res._id)) || null;
  if (!id) return err(5001, '新增教师失败：未返回文档 id');

  return ok({ _id: id, teacher: sanitizeTeacher({ _id: id, ...doc }) });
};
