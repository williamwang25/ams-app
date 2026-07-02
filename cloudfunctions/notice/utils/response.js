/**
 * 云函数统一返回结构（docs/04-api-spec.md 4.1.2）。
 */

function ok(data) {
  return { code: 0, message: 'ok', data: data == null ? null : data };
}

function err(code, message) {
  return { code, message: String(message || 'error'), data: null };
}

module.exports = { ok, err };
