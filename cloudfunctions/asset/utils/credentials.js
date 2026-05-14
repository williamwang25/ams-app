/**
 * AMS 管理员凭证（与 cloudfunctions/auth/utils/credentials.js 同源副本）。
 *
 * !!! 同步约定 !!!
 *   修改账号 / 密码后必须同步两侧（auth + 所有业务云函数），
 *   然后重新 `tcb fn deploy <func>` 部署对应云函数。
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

module.exports = { ADMIN_USERNAME, ADMIN_PASSWORD };
