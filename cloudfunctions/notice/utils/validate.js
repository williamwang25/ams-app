/**
 * notice 云函数入参校验。
 */

const LEVEL_SET = new Set(['INFO', 'IMPORTANT']);
const TITLE_MAX = 120;
const CONTENT_MAX = 20000;

function validationError(message, code) {
  const err = new Error(message);
  err.code = code || 1001;
  return err;
}

function validateTitle(title) {
  const s = String(title || '').trim();
  if (!s) throw validationError('标题不能为空');
  if (s.length > TITLE_MAX) throw validationError(`标题不超过 ${TITLE_MAX} 字`);
  return s;
}

function validateContent(content) {
  const s = String(content || '').trim();
  if (!s) throw validationError('内容不能为空');
  if (s.length > CONTENT_MAX) throw validationError(`内容不超过 ${CONTENT_MAX} 字`);
  return s;
}

function validateLevel(level) {
  const s = String(level || 'INFO').trim().toUpperCase();
  if (!LEVEL_SET.has(s)) throw validationError('级别只能是 INFO 或 IMPORTANT');
  return s;
}

function validateId(id) {
  const s = String(id || '').trim();
  if (!s) throw validationError('id 不能为空');
  return s;
}

function validatePublished(value) {
  return Boolean(value);
}

module.exports = {
  LEVEL_SET,
  validateTitle,
  validateContent,
  validateLevel,
  validateId,
  validatePublished,
};
