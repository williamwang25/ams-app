/**
 * AMS borrow 云函数入口。
 *
 * Action 清单（docs/04-api-spec.md 4.2.3）：
 *
 *   写操作（事务化）：
 *     - submit    教师：提交借用申请；资产 IDLE→PENDING；写 BORROW 日志
 *     - approve   管理员：通过；资产 PENDING→LENT；生成凭证；写 BORROW 日志
 *     - reject    管理员：拒绝；资产 PENDING→IDLE；写 BORROW 日志
 *     - return    教师/管理员：归还；资产 LENT→IDLE；写 RETURN 日志
 *     - cancel    教师：撤回未审批申请；资产 PENDING→IDLE；写 BORROW 日志
 *
 *   读操作：
 *     - listMine  教师：自己的申请列表（按状态/分页）
 *     - adminList 管理员：全量审批列表（按状态/关键字/日期/分页）
 *     - detail    管理员任意 / 教师仅本人
 *     - summary   管理员：Dashboard 看板数据（待审批数 / 借出数 / 7 天曲线）
 *
 * 鉴权契约（docs/04-api-spec.md 4.6.1）：双身份双轨
 *   1. event.auth.token === ADMIN_PASSWORD → admin
 *   2. cloud.getWXContext().OPENID 命中 ams_teacher → teacher
 *   3. 都不符 → 401
 *
 * 集合前置：ams_borrow_request / ams_asset / ams_asset_log / ams_teacher / ams_seq
 * 必须已经在 CloudBase 控制台手动建好（一期不做运行时自动建集合）。
 */

const actions = {
  submit: require('./actions/submit'),
  approve: require('./actions/approve'),
  reject: require('./actions/reject'),
  return: require('./actions/return'),
  cancel: require('./actions/cancel'),
  listMine: require('./actions/listMine'),
  adminList: require('./actions/adminList'),
  detail: require('./actions/detail'),
  summary: require('./actions/summary'),
};

exports.main = async (event) => {
  try {
    const action = event && event.action;
    if (!action || !actions[action]) {
      return { code: 1001, message: `unknown action: ${action || ''}`, data: null };
    }
    return await actions[action](event);
  } catch (e) {
    console.error('[borrow] error:', event && event.action, e);
    return { code: 5000, message: (e && e.message) || 'internal error', data: null };
  }
};
