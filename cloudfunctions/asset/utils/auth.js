/**
 * 鉴权：比对前端传来的 token 与 utils/credentials.js 里的 ADMIN_PASSWORD。
 *
 * 与 cloudfunctions/auth/actions/adminLogin.js 同一约定：
 *   - auth.adminLogin 登录成功后将 ADMIN_PASSWORD 原样返回作为 token。
 *   - 前端把 token 存 localStorage，每次调用云函数通过 src/utils/http.ts
 *     注入到 event.auth.token。
 *   - 本函数比对一致即视为已登录管理员。
 *
 * 约定：操作人统一硬编码为 env-admin（一期单超管，后续接 DB 时再升级）。
 */

const { ADMIN_PASSWORD } = require('./credentials');

function authenticate(event) {
  const token = (event && event.auth && event.auth.token) || '';
  if (!token) return { ok: false, error: { code: 2001, message: '未登录' } };
  if (token !== ADMIN_PASSWORD) return { ok: false, error: { code: 2001, message: 'token 无效' } };
  return {
    ok: true,
    operator: {
      id: 'env-admin',
      role: 'admin',
      name: '超级管理员',
    },
  };
}

module.exports = { authenticate };
