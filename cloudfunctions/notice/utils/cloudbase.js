/**
 * CloudBase Node SDK 实例（notice 云函数专用）。
 * 集合前置条件：ams_notice 须已在控制台创建。
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = {
  NOTICE: 'ams_notice',
};

module.exports = { app, db, _, COLLECTIONS };
