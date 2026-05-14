/**
 * AMS 管理员凭证（一期单超管，硬编码在代码里以实现"零环境变量配置"）。
 *
 * !!! 同步约定 !!!
 *   修改账号 / 密码后，必须同步修改：
 *     - cloudfunctions/asset/utils/credentials.js
 *     - 后续新增的业务云函数 utils/credentials.js
 *   然后重新 `tcb fn deploy <func>` 部署对应云函数。
 *
 * 设计简化：登录成功后将 ADMIN_PASSWORD 作为 token 返还给前端，
 * 业务云函数也以 ADMIN_PASSWORD 作为共享秘密做鉴权比对。
 * 一期单超管内部使用，token 等同于密码，安全等级足够。
 *
 * 后期接入多管理员 / 教师端时，把此文件迁移到 DB 查询 + JWT 模型。
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

module.exports = { ADMIN_USERNAME, ADMIN_PASSWORD };
