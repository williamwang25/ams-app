/**
 * 借用流水号生成器：OU-YYYYMMDD-HHMMSS-XXX。
 *
 * 设计：日期 / 时间用云函数当前时间（UTC+8 北京时间），尾段 3 位
 * 通过 ams_seq.doc('borrow_serial:YYYYMMDD').n 原子 +1，保证当日内唯一。
 *
 * 一期单写场景，并发极低；高并发再换事务计数器。
 */

const { db, _, COLLECTIONS } = require('./cloudbase');

function pad(n, w) {
  return String(n).padStart(w, '0');
}

/** 当前北京时间（UTC+8）的 Date 对象副本 */
function nowBeijing() {
  const utc = Date.now();
  return new Date(utc + 8 * 3600 * 1000);
}

/** 取当日序号：原子 +1，文档不存在则建 */
async function nextDailySeq(dateKey) {
  const key = `borrow_serial:${dateKey}`;
  const r = await db.collection(COLLECTIONS.SEQ).doc(key).update({
    n: _.inc(1),
    updated_at: Date.now(),
  });
  if (r && r.updated > 0) {
    const { data } = await db.collection(COLLECTIONS.SEQ).doc(key).get();
    return data && typeof data.n === 'number' ? data.n : 1;
  }
  try {
    await db.collection(COLLECTIONS.SEQ).add({
      _id: key,
      n: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    return 1;
  } catch (e) {
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
 * 生成借用流水号：OU-YYYYMMDD-HHMMSS-XXX
 *   尾段 XXX = 当日顺序号 % 1000，三位补零
 */
async function nextBorrowSerialNo() {
  const d = nowBeijing();
  const dateKey = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
  const timeKey = `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}${pad(d.getUTCSeconds(), 2)}`;
  const seq = await nextDailySeq(dateKey);
  return `OU-${dateKey}-${timeKey}-${pad(seq % 1000, 3)}`;
}

module.exports = { nextBorrowSerialNo, nowBeijing };
