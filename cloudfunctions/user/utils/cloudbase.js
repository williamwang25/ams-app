/**
 * 共享的 CloudBase Node SDK / 数据库实例（user 云函数专用）。
 *
 * 集合前置条件：ams_teacher 必须已存在；删除教师时会检查 ams_borrow_request。
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = {
  TEACHER: 'ams_teacher',
  BORROW: 'ams_borrow_request',
};

module.exports = { app, db, _, COLLECTIONS };
