/**
 * 共享的 CloudBase Node SDK / 数据库实例（auth 云函数专用）。
 *
 * 仅在引入教师身份后才需要：teacherLoginByPassword / teacherLoginByOpenid 要查 ams_teacher。
 * adminLogin 不依赖本模块，因此本文件懒导入即可，不影响 cold start。
 *
 * 集合前置条件：ams_teacher 必须已经在 CloudBase 控制台手动建好
 * （docs/10-init-and-deploy.md 10.6 部署清单）。
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = {
  TEACHER: 'ams_teacher',
};

module.exports = { app, db, _, COLLECTIONS };
