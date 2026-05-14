const { db, COLLECTIONS } = require('./cloudbase');

function sanitizeTeacher(teacher) {
  if (!teacher) return null;
  const openid = teacher.openid || null;
  return {
    _id: teacher._id,
    username: teacher.username || '',
    name: teacher.name || '',
    phone: teacher.phone || '',
    department: teacher.department || '',
    openid,
    unionid: teacher.unionid || null,
    bound_at: teacher.bound_at || null,
    created_at: teacher.created_at || null,
    updated_at: teacher.updated_at || null,
    is_bound: Boolean(openid),
  };
}

async function getTeacherById(id) {
  const res = await db.collection(COLLECTIONS.TEACHER).where({ _id: id }).limit(1).get();
  return res && res.data && res.data[0] ? res.data[0] : null;
}

async function getTeacherByUsername(username) {
  const res = await db.collection(COLLECTIONS.TEACHER).where({ username }).limit(1).get();
  return res && res.data && res.data[0] ? res.data[0] : null;
}

async function assertUsernameAvailable(username, currentId) {
  const sameName = await getTeacherByUsername(username);
  if (sameName && sameName._id !== currentId) {
    throw Object.assign(new Error('教师账号已存在'), { code: 3002 });
  }
}

module.exports = {
  sanitizeTeacher,
  getTeacherById,
  getTeacherByUsername,
  assertUsernameAvailable,
};
