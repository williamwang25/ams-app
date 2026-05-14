/**
 * auth.teacherLoginByPassword：教师账密首登 + 自动绑定 openid。
 *
 * 入参：{ username, password }
 * 出参：{ profile: { _id, username, name, department, phone, openid } }
 *
 * 流程（docs/04-api-spec.md 4.2.1.2）：
 *   1. 取 cloud.getWXContext().OPENID（仅小程序云开发上下文有；不接受前端传值）。
 *      没有 OPENID → 2002（缺少微信上下文）。
 *   2. ensureTeacherSeed()：若 ams_teacher 为空，幂等注入 5 条测试教师。
 *   3. 用 username 查 ams_teacher，password 比对（一期明文）。
 *      用户名不存在或密码错误统一 2001。
 *   4. 写回该教师的 openid / bound_at / updated_at（覆盖式绑定，便于换设备登录）。
 *   5. 返回 profile（不发 token，后续靠 OPENID 鉴权）。
 *
 * 错误码：
 *   1001 入参缺失
 *   2001 用户名或密码错误
 *   2002 缺少微信上下文
 *   5001 数据库写入失败
 */

const cloud = require('@cloudbase/node-sdk');
const { ok, err } = require('../utils/response');
const { db, COLLECTIONS } = require('../utils/cloudbase');
const { ensureTeacherSeed } = require('../utils/teacher-seed');

module.exports = async (event) => {
  const data = (event && event.data) || {};
  const username = String(data.username || '').trim();
  const password = String(data.password || '');
  if (!username || !password) return err(1001, '请输入用户名和密码');

  const { OPENID } = cloud.getWXContext() || {};
  if (!OPENID) return err(2002, '缺少微信上下文，请通过小程序登录');

  await ensureTeacherSeed();

  const queryRes = await db
    .collection(COLLECTIONS.TEACHER)
    .where({ username })
    .limit(1)
    .get();
  const teacher = queryRes && queryRes.data && queryRes.data[0];
  if (!teacher) return err(2001, '用户名或密码错误');
  if (String(teacher.password) !== password) return err(2001, '用户名或密码错误');

  const now = Date.now();
  try {
    await db.collection(COLLECTIONS.TEACHER).doc(teacher._id).update({
      openid: OPENID,
      bound_at: now,
      updated_at: now,
    });
  } catch (e) {
    console.error('[auth.teacherLoginByPassword] update openid failed:', e);
    return err(5001, '绑定 openid 失败，请重试');
  }

  return ok({
    profile: {
      _id: teacher._id,
      username: teacher.username,
      name: teacher.name || '',
      department: teacher.department || '',
      phone: teacher.phone || '',
      openid: OPENID,
    },
  });
};
