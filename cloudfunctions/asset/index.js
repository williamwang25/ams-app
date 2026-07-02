/**
 * AMS asset 云函数入口。
 * 契约：docs/04-api-spec.md 4.2.2。
 *
 * 已实现 actions（M1 管理端）：
 *   写：create / update / changeStatus / changeLocation / changeUser / uploadImages
 *   读：getDetail / getTimeline / list / summary / resolveImageUrls
 *
 * 鉴权：所有 action 必须带 event.auth.token === utils/credentials.js 中
 *       的 ADMIN_PASSWORD，否则返回 2001（auth.js 中实现）。
 *
 * 集合前置条件：环境中必须已存在 ams_asset / ams_asset_log / ams_seq 三个集合。
 *           初次部署到新环境时请手动到 CloudBase 控制台建好，或参考
 *           docs/10-init-and-deploy.md。
 *
 * 写操作均写入 ams_asset_log（log.js 中实现）。
 */

const actions = {
  create: require('./actions/create'),
  update: require('./actions/update'),
  changeStatus: require('./actions/changeStatus'),
  changeLocation: require('./actions/changeLocation'),
  changeUser: require('./actions/changeUser'),
  uploadImages: require('./actions/uploadImages'),
  getDetail: require('./actions/getDetail'),
  getTimeline: require('./actions/getTimeline'),
  list: require('./actions/list'),
  summary: require('./actions/summary'),
  resolveImageUrls: require('./actions/resolveImageUrls'),
};

exports.main = async (event) => {
  try {
    const action = event && event.action;
    if (!action || !actions[action]) {
      return { code: 1001, message: `unknown action: ${action || ''}`, data: null };
    }
    return await actions[action](event);
  } catch (e) {
    console.error('[asset] error:', event && event.action, e);
    return { code: 5000, message: (e && e.message) || 'internal error', data: null };
  }
};
