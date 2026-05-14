/**
 * 顺序号生成器。
 *
 * 约定：在 ams_seq 集合存键值文档 `{ _id: <key>, n: <int>, updated_at }`，
 *       每次调用对 n 原子 +1 并返回新值。
 *
 * 一期单写场景，并发极低；高并发再换事务或 Redis-like 计数器。
 */

const { db, _, COLLECTIONS } = require('./db');

/**
 * 取下一个顺序号。
 * @param {string} key  例 `asset_no:YQJJ:2026`
 * @returns {Promise<number>} 新的 n
 */
async function nextSeq(key) {
  if (typeof key !== 'string' || !key) {
    throw new Error('seq key must be non-empty string');
  }
  // 优先尝试 +1
  const r = await db.collection(COLLECTIONS.SEQ).doc(key).update({
    n: _.inc(1),
    updated_at: Date.now(),
  });
  if (r && r.updated > 0) {
    const { data } = await db.collection(COLLECTIONS.SEQ).doc(key).get();
    return data && typeof data.n === 'number' ? data.n : 1;
  }
  // 文档不存在 → 创建
  try {
    await db.collection(COLLECTIONS.SEQ).add({
      _id: key,
      n: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    return 1;
  } catch (e) {
    // 创建撞车：重试一次 +1（极小概率，单管理员一期忽略）
    const retry = await db.collection(COLLECTIONS.SEQ).doc(key).update({
      n: _.inc(1),
      updated_at: Date.now(),
    });
    if (retry && retry.updated > 0) {
      const { data } = await db.collection(COLLECTIONS.SEQ).doc(key).get();
      return data && typeof data.n === 'number' ? data.n : 1;
    }
    throw e;
  }
}

/**
 * 生成 6 位补零的资产编号尾段。
 * @param {number} n
 * @returns {string} 例如 12 → "000012"
 */
function pad6(n) {
  return String(n).padStart(6, '0');
}

/**
 * 生成完整 asset_no（一期前缀固定 YQJJ；分类字典上线后再按分类切分）。
 * @param {object} options { prefix?: string, year?: number }
 */
async function nextAssetNo(options) {
  const opts = options || {};
  const prefix = String(opts.prefix || 'YQJJ').toUpperCase();
  const year = Number(opts.year) || new Date().getFullYear();
  const n = await nextSeq(`asset_no:${prefix}:${year}`);
  return `${prefix}${year}${pad6(n)}`;
}

module.exports = { nextSeq, nextAssetNo, pad6 };
