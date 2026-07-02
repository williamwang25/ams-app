/**
 * AMS notice 云函数入口。
 * 契约：docs/04-api-spec.md 4.2.6。
 *
 * actions：create / update / publish / delete / list / getDetail
 * 鉴权：除 list({ published_only: true }) 只读已发布通知外，均需管理端 token。
 */

const actions = {
  create: require('./actions/create'),
  update: require('./actions/update'),
  publish: require('./actions/publish'),
  delete: require('./actions/delete'),
  list: require('./actions/list'),
  getDetail: require('./actions/getDetail'),
};

exports.main = async (event) => {
  try {
    const action = event && event.action;
    if (!action || !actions[action]) {
      return { code: 1001, message: `unknown action: ${action || ''}`, data: null };
    }
    return await actions[action](event);
  } catch (e) {
    console.error('[notice] error:', event && event.action, e);
    return { code: 5000, message: (e && e.message) || 'internal error', data: null };
  }
};
