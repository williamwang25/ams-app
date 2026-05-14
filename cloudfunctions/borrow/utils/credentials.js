/**
 * AMS 管理员凭证副本（一期硬编码）。
 *
 * !!! 同步约定 !!!
 *   修改账号 / 密码后，必须同步：
 *     - cloudfunctions/auth/utils/credentials.js
 *     - cloudfunctions/asset/utils/credentials.js
 *     - cloudfunctions/borrow/utils/credentials.js（本文件）
 *   然后重新 `tcb fn deploy auth asset borrow` 三个全部部署。
 *
 * 设计简化见 cloudfunctions/auth/utils/credentials.js 的注释。
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

module.exports = { ADMIN_USERNAME, ADMIN_PASSWORD };
