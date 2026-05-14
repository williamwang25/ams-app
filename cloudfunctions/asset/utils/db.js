/**
 * 共享的 CloudBase Node SDK / 数据库实例。
 * 所有 action 通过 `require('../utils/db')` 拿到同一份连接。
 *
 * 前置条件：ams_asset / ams_asset_log / ams_seq 集合必须已经在 CloudBase 控制台
 * 手动建好（一期不再做运行时自动建表，以降低每次冷启动开销）。
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = {
  ASSET: 'ams_asset',
  ASSET_LOG: 'ams_asset_log',
  SEQ: 'ams_seq',
  DICT: 'ams_dict',
};

module.exports = { app, db, _, COLLECTIONS };
