const USERNAME_RE = /^[A-Za-z0-9_-]{2,32}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 64;

function validationError(message, code = 1001) {
  return Object.assign(new Error(message), { code });
}

function trimText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function validateUsername(value) {
  const username = trimText(value);
  if (!username) throw validationError('请输入教师账号');
  if (!USERNAME_RE.test(username)) {
    throw validationError('教师账号需为 2-32 位字母、数字、下划线或连字符');
  }
  return username;
}

function validatePassword(value) {
  const password = String(value || '');
  if (!password) throw validationError('请输入密码');
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw validationError(`密码长度需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位`);
  }
  return password;
}

function validateName(value) {
  const name = trimText(value);
  if (!name) throw validationError('请输入教师姓名');
  if (name.length > 50) throw validationError('教师姓名不超过 50 字');
  return name;
}

function validateOptionalText(value, label, maxLength) {
  const text = trimText(value);
  if (text.length > maxLength) throw validationError(`${label}不超过 ${maxLength} 字`);
  return text;
}

function parsePagination(input) {
  const data = input || {};
  let page = Number(data.page);
  let pageSize = Number(data.pageSize);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
  if (pageSize > 200) pageSize = 200;
  return { page: Math.floor(page), pageSize: Math.floor(pageSize) };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  validationError,
  trimText,
  validateUsername,
  validatePassword,
  validateName,
  validateOptionalText,
  parsePagination,
  escapeRegExp,
};
