/**
 * borrow.submit 入参校验（docs/04-api-spec.md 4.2.3.1）。
 *
 * 校验规则：
 *   - items 数组长度 1..20
 *   - 每条 asset_id 非空字符串、不重复
 *   - quantity 默认 1，整数 >= 1
 *   - expected_return_date 是 'YYYY-MM-DD'，可解析，且日期 >= 提交当日（北京时间）
 *   - usage 非空字符串、<= 50 字
 *   - signature_file_id 非空字符串
 *
 * 返回：
 *   { ok: true, normalizedItems: [...] }   归一化后的 items（quantity 默认值已填）
 *   { ok: false, code, message }
 *
 * 设计：所有 1xxx 校验错误在此集中产出，actions/submit.js 直接透传。
 */

const MAX_ITEMS = 20;
const USAGE_MAX = 50;

function validateSubmitInput(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, code: 1001, message: '入参缺失' };
  }
  const { items, signature_file_id } = data;
  if (!signature_file_id || typeof signature_file_id !== 'string' || !signature_file_id.trim()) {
    return { ok: false, code: 1001, message: '请上传签名图片' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, code: 1002, message: '请至少选择一个资产' };
  }
  if (items.length > MAX_ITEMS) {
    return { ok: false, code: 1002, message: `单次最多借用 ${MAX_ITEMS} 个资产` };
  }

  // 北京时间今天 00:00 的时间戳，用于比较拟归还日期是否过期
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const todayKey = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;

  const seen = new Set();
  const normalized = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it !== 'object') {
      return { ok: false, code: 1001, message: `第 ${i + 1} 行明细格式错误` };
    }
    const asset_id = typeof it.asset_id === 'string' ? it.asset_id.trim() : '';
    if (!asset_id) {
      return { ok: false, code: 1001, message: `第 ${i + 1} 行缺少 asset_id` };
    }
    if (seen.has(asset_id)) {
      return { ok: false, code: 1002, message: `第 ${i + 1} 行的资产已在前面出现，请合并数量` };
    }
    seen.add(asset_id);

    let quantity = 1;
    if (it.quantity != null) {
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || !Number.isInteger(q) || q < 1) {
        return { ok: false, code: 1001, message: `第 ${i + 1} 行数量必须为正整数` };
      }
      quantity = q;
    }

    const erd = typeof it.expected_return_date === 'string' ? it.expected_return_date.trim() : '';
    if (!isValidDateKey(erd)) {
      return {
        ok: false,
        code: 1001,
        message: `第 ${i + 1} 行拟归还日期格式应为 YYYY-MM-DD`,
      };
    }
    if (erd < todayKey) {
      return {
        ok: false,
        code: 1001,
        message: `第 ${i + 1} 行拟归还日期不能早于今天`,
      };
    }

    const usage = typeof it.usage === 'string' ? it.usage.trim() : '';
    if (!usage) {
      return { ok: false, code: 1001, message: `第 ${i + 1} 行请填写借用用途` };
    }
    if (usage.length > USAGE_MAX) {
      return { ok: false, code: 1001, message: `第 ${i + 1} 行借用用途不超过 ${USAGE_MAX} 字` };
    }

    normalized.push({ asset_id, quantity, expected_return_date: erd, usage });
  }

  return { ok: true, normalizedItems: normalized };
}

/** 'YYYY-MM-DD' 校验：长度 / 数字 / 月日范围；不做闰年精确校验，由 Date 解析覆盖 */
function isValidDateKey(s) {
  if (typeof s !== 'string' || s.length !== 10) return false;
  if (s[4] !== '-' || s[7] !== '-') return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 2000 || y > 2999) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // 用 Date 反查校验闰年/月份天数
  const dt = new Date(`${s}T00:00:00.000Z`);
  if (isNaN(dt.getTime())) return false;
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) return false;
  return true;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = { validateSubmitInput, isValidDateKey, MAX_ITEMS, USAGE_MAX };
