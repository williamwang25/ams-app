/**
 * 云函数统一返回结构（docs/04-api-spec.md 4.1.2）。
 *   错误码分段：1xxx 入参 / 2xxx 鉴权 / 3xxx 业务 / 4xxx 资源 / 5xxx 内部。
 */

function ok(data) {
  return { code: 0, message: 'ok', data: data == null ? null : data };
}

function err(code, message) {
  return { code, message: String(message || 'error'), data: null };
}

module.exports = { ok, err };
