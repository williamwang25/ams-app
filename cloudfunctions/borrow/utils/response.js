/**
 * 云函数统一返回结构（docs/04-api-spec.md 4.1.2）。
 *
 * err 支持第三参数 extra，用于把 offending_asset_ids / missing_asset_ids
 * 等业务上下文塞进 data 字段（前端可据此精确提示）。
 */

function ok(data) {
  return { code: 0, message: 'ok', data: data == null ? null : data };
}

function err(code, message, extra) {
  return { code, message: String(message || 'error'), data: extra == null ? null : extra };
}

module.exports = { ok, err };
