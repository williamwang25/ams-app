/**
 * 管理端鉴权：仅允许超级管理员 token 调用教师账号管理。
 *
 * 一期单超管实现中，auth.adminLogin 返回 ADMIN_PASSWORD 作为 token；
 * 前端通过 src/utils/http.ts 注入 event.auth.token。
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
