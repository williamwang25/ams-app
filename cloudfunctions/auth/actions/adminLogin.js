/**
 * auth.adminLogin：管理员账密登录（精简版，零环境变量配置）。
 *
 * 入参：{ username, password }
 * 出参：{ token, profile: { _id, username, name, role } }
 * 逻辑：与 utils/credentials.js 里的常量比对。不查 DB、不加盐 hash、不签 JWT、不读 env。
 *
 * 修改账号 / 密码：直接改 utils/credentials.js 然后重新部署即可。
 *
 * 错误码:
 *   1001 缺参 / 2001 账密错误
 *
 * 错误码 2001（未登录 / 凭证无效）是 docs/04-api-spec.md 4.6.3 公共错误码：
 * 管理端 token 无效 / 账密错误统一用 2001；2003 留给「教师 openid 未绑定」。
 */

const { ok, err } = require('../utils/response');
const { ADMIN_USERNAME, ADMIN_PASSWORD } = require('../utils/credentials');

module.exports = async (event) => {
  const data = (event && event.data) || {};
  const inputUser = String(data.username || '').trim();
  const inputPwd = String(data.password || '');
  if (!inputUser || !inputPwd) return err(1001, '请输入用户名和密码');

  if (inputUser !== ADMIN_USERNAME || inputPwd !== ADMIN_PASSWORD) {
    return err(2001, '用户名或密码错误');
  }

  return ok({
    token: ADMIN_PASSWORD,
    profile: {
      _id: 'env-admin',
      username: ADMIN_USERNAME,
      name: '超级管理员',
      role: 'super_admin',
    },
  });
};
