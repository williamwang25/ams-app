/**
 * 共享的 CloudBase Node SDK / 数据库实例（borrow 云函数专用）。
 *
 * 集合前置条件：以下集合必须已经在 CloudBase 控制台手动建好
 * （docs/10-init-and-deploy.md 10.6 部署清单）：
 *   - ams_borrow_request   借用申请
 *   - ams_asset            资产主表
 *   - ams_asset_log        资产生命周期日志（借用复用 op_type=BORROW/RETURN）
 *   - ams_teacher          教师账号
 *   - ams_seq              顺序号生成器（serial_no 用 borrow_serial:YYYYMMDD 键）
 */

const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const COLLECTIONS = {
  BORROW: 'ams_borrow_request',
  ASSET: 'ams_asset',
  ASSET_LOG: 'ams_asset_log',
  TEACHER: 'ams_teacher',
  SEQ: 'ams_seq',
};

module.exports = { app, db, _, cloud, COLLECTIONS };
