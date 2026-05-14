/**
 * AMS 管理员凭证（与 cloudfunctions/auth/utils/credentials.js 同源副本）。
 *
 * 修改账号 / 密码后必须同步 auth + 所有业务云函数并重新部署。
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

module.exports = { ADMIN_USERNAME, ADMIN_PASSWORD };
