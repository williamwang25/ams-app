/**
 * auth.teacherUpdateProfile：教师端编辑本人基础资料。
 *
 * 入参：{ name: string, phone?: string, department?: string }
 * 鉴权：只信微信云函数上下文 OPENID，反查 ams_teacher 后更新本人记录。
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { getWxContext } = require('../utils/wx-context');

function trimText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function validationError(message, code) {
  const error = new Error(message);
  error.code = code || 1001;
  return error;
}

function validateName(value) {
  const name = trimText(value);
  if (!name) throw validationError('请输入教师姓名');
  if (name.length > 50) throw validationError('教师姓名不超过 50 字');
  return name;
}

function validateOptionalText(value, label, maxLength) {
  const text = trimText(value);
  if (text.length > maxLength) throw validationError(`${label}不超过 ${maxLength} 字`);
  return text;
}

function toProfile(teacher) {
  return {
    _id: teacher._id,
    username: teacher.username,
    name: teacher.name || '',
    department: teacher.department || '',
    phone: teacher.phone || '',
    openid: teacher.openid,
  };
}

module.exports = async (event) => {
  const { OPENID } = getWxContext();
  if (!OPENID) return err(2002, '缺少微信上下文，请通过小程序登录');

  const data = (event && event.data) || {};
  let patch;
  try {
    patch = {
      name: validateName(data.name),
      phone: validateOptionalText(data.phone, '手机号', 30),
      department: validateOptionalText(data.department, '部门', 50),
      updated_at: Date.now(),
    };
  } catch (e) {
    return err(e.code || 1001, e.message || '参数错误');
  }

  const queryRes = await db
    .collection(COLLECTIONS.TEACHER)
    .where({ openid: OPENID })
    .limit(1)
    .get();
  const teacher = queryRes && queryRes.data && queryRes.data[0];
  if (!teacher) return err(2003, 'openid 未绑定教师，请先用账号密码登录');

  try {
    await db.collection(COLLECTIONS.TEACHER).doc(teacher._id).update(patch);
  } catch (e) {
    console.error('[auth.teacherUpdateProfile] update failed:', e);
    return err(5001, '更新个人信息失败，请重试');
  }

  return ok({
    profile: toProfile({
      ...teacher,
      ...patch,
      openid: OPENID,
    }),
  });
};
