/**
 * 管理端鉴权：event.auth.token === ADMIN_PASSWORD。
 */

const { ADMIN_PASSWORD } = require('./credentials');

function requireSuperAdmin(event) {
  const token = (event && event.auth && event.auth.token) || '';
  if (!token) return { ok: false, error: { code: 2001, message: '未登录' } };
  if (token !== ADMIN_PASSWORD) return { ok: false, error: { code: 2001, message: 'token 无效' } };
  return {
    ok: true,
    operator: {
      id: 'env-admin',
      role: 'super_admin',
      name: '系统管理员',
    },
  };
}

module.exports = { requireSuperAdmin };
