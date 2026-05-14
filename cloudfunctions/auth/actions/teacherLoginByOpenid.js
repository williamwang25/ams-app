/**
 * auth.teacherLoginByOpenid：教师 openid 免密登录。
 *
 * 入参：{}（不接受前端传 openid，只信微信云函数上下文）
 * 出参：{ profile: { _id, username, name, department, phone, openid } }
 *
 * 流程（docs/04-api-spec.md 4.2.1.3）：
 *   1. 取 wx-server-sdk getWXContext().OPENID；缺失 → 2002。
 *   2. 用 openid 查 ams_teacher；查不到 → 2003（提示前端跳账密登录页）。
 *   3. 返回 profile（不更新任何字段，纯只读）。
 *
 * 错误码：
 *   2002 缺少微信上下文
 *   2003 openid 未绑定教师
 */

const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { getWxContext } = require('../utils/wx-context');

module.exports = async () => {
  const { OPENID } = getWxContext();
  if (!OPENID) return err(2002, '缺少微信上下文，请通过小程序登录');

  const queryRes = await db
    .collection(COLLECTIONS.TEACHER)
    .where({ openid: OPENID })
    .limit(1)
    .get();
  const teacher = queryRes && queryRes.data && queryRes.data[0];
  if (!teacher) return err(2003, 'openid 未绑定教师，请先用账号密码登录');

  return ok({
    profile: {
      _id: teacher._id,
      username: teacher.username,
      name: teacher.name || '',
      department: teacher.department || '',
      phone: teacher.phone || '',
      openid: teacher.openid,
    },
  });
};
