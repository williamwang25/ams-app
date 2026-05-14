/**
 * 微信小程序云函数上下文。
 *
 * @cloudbase/node-sdk 负责数据库访问，但不提供 getWXContext。
 * 小程序通过 wx.cloud.callFunction 调用时，OPENID 需要从 wx-server-sdk 读取。
 */

const wxCloud = require('wx-server-sdk');

wxCloud.init({ env: wxCloud.DYNAMIC_CURRENT_ENV });

function getWxContext() {
  if (typeof wxCloud.getWXContext !== 'function') return {};
  return wxCloud.getWXContext() || {};
}

module.exports = { getWxContext };
