/**
 * AMS user 云函数入口。
 * 契约：docs/04-api-spec.md 4.2.8。
 *
 * 已实现 actions：
 *   - listTeachers
 *   - createTeacher
 *   - updateTeacher
 *   - resetTeacherPassword
 *   - unbindTeacherOpenid
 *   - deleteTeacher
 *
 * 鉴权：全部仅允许管理端超级管理员 token。
 */

const actions = {
  listTeachers: require('./actions/listTeachers'),
  createTeacher: require('./actions/createTeacher'),
  updateTeacher: require('./actions/updateTeacher'),
  resetTeacherPassword: require('./actions/resetTeacherPassword'),
  unbindTeacherOpenid: require('./actions/unbindTeacherOpenid'),
  deleteTeacher: require('./actions/deleteTeacher'),
};

exports.main = async (event) => {
  try {
    const action = event && event.action;
    if (!action || !actions[action]) {
      return { code: 1001, message: `unknown action: ${action || ''}`, data: null };
    }
    return await actions[action](event);
  } catch (e) {
    console.error('[user] error:', event && event.action, e);
    return { code: 5000, message: (e && e.message) || 'internal error', data: null };
  }
};
