/**
 * AMS auth 云函数入口。
 *
 * Action 清单（docs/04-api-spec.md 4.2.1）：
 *   - adminLogin                管理员账密登录（硬编码账号，零环境变量）
 *   - teacherLoginByPassword    教师账密首登 + 自动绑 openid（首次注入 5 条种子）
 *   - teacherLoginByOpenid      教师 openid 免密登录
 *   - teacherUpdateProfile      教师端编辑本人基础资料
 *
 * 鉴权契约：
 *   管理端：adminLogin 成功返回 token = ADMIN_PASSWORD；其他业务云函数比对
 *          event.auth.token === ADMIN_PASSWORD 即视为管理员。
 *   教师端：登录后**不发 token**；后续业务云函数靠微信云函数上下文 OPENID
 *          反查 ams_teacher 识别身份（详见 docs/04-api-spec.md 4.6.1）。
 */

const actions = {
  adminLogin: require('./actions/adminLogin'),
  teacherLoginByPassword: require('./actions/teacherLoginByPassword'),
  teacherLoginByOpenid: require('./actions/teacherLoginByOpenid'),
  teacherUpdateProfile: require('./actions/teacherUpdateProfile'),
};

exports.main = async (event) => {
  try {
    const action = event && event.action;
    if (!action || !actions[action]) {
      return { code: 1001, message: `unknown action: ${action || ''}`, data: null };
    }
    return await actions[action](event);
  } catch (e) {
    console.error('[auth] error:', event && event.action, e);
    return { code: 5000, message: (e && e.message) || 'internal error', data: null };
  }
};
