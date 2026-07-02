/**
 * borrow.summary：管理员看板聚合。
 *
 * 契约：docs/04-api-spec.md 4.2.3.10（0702 扩展）
 *
 * 入参：{ days?: 7 | 30 | 90 }  趋势天数，默认 7
 *
 * 出参：
 *   - pending_count / lent_count / today_borrow / today_return
 *   - trend_7d  兼容旧字段，等同 trend
 *   - trend       [{ date, borrow, return, borrow_amount, return_amount }]
 *   - inout_stats { today, month, total } 各含 borrow_count/return_count/borrow_amount/return_amount
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireAdmin } = require('../utils/identity');

const DAY_MS = 24 * 3600 * 1000;
const TZ_OFFSET_MS = 8 * 3600 * 1000;
const TREND_FETCH_LIMIT = 5000;
const ALLOWED_DAYS = new Set([7, 30, 90]);

function beijingTodayStart() {
  const now = Date.now();
  return Math.floor((now + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
}

function beijingMonthStart() {
  const todayStart = beijingTodayStart();
  const d = new Date(todayStart + TZ_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return Date.parse(`${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000+08:00`);
}

function tsToBeijingDateKey(ts) {
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts + TZ_OFFSET_MS);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function sumItemsAmount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => {
    const price = Number(it && it.unit_price) || 0;
    const qty = Number(it && it.quantity) || 1;
    return sum + price * qty;
  }, 0);
}

function emptyInOutBucket() {
  return {
    borrow_count: 0,
    return_count: 0,
    borrow_amount: 0,
    return_amount: 0,
  };
}

function addToBucket(bucket, type, amount) {
  if (type === 'borrow') {
    bucket.borrow_count += 1;
    bucket.borrow_amount += amount;
  } else if (type === 'return') {
    bucket.return_count += 1;
    bucket.return_amount += amount;
  }
}

module.exports = async (event) => {
  const auth = await requireAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  let trendDays = Number(data.days) || 7;
  if (!ALLOWED_DAYS.has(trendDays)) trendDays = 7;

  const todayStart = beijingTodayStart();
  const monthStart = beijingMonthStart();
  const trendStart = todayStart - (trendDays - 1) * DAY_MS;

  try {
    const [pendingRes, lentRes, todayBorrowRes, todayReturnRes] = await Promise.all([
      db.collection(COLLECTIONS.BORROW).where({ status: 'PENDING' }).count(),
      db.collection(COLLECTIONS.ASSET).where({ business_status: 'LENT' }).count(),
      db.collection(COLLECTIONS.BORROW).where({ created_at: _.gte(todayStart) }).count(),
      db
        .collection(COLLECTIONS.BORROW)
        .where({ status: 'RETURNED', returned_at: _.gte(todayStart) })
        .count(),
    ]);

    const trendRes = await db
      .collection(COLLECTIONS.BORROW)
      .where(
        _.or([
          { created_at: _.gte(trendStart) },
          { returned_at: _.gte(trendStart) },
          { approved_at: _.gte(trendStart) },
        ]),
      )
      .field({
        created_at: true,
        returned_at: true,
        approved_at: true,
        status: true,
        items: true,
      })
      .limit(TREND_FETCH_LIMIT)
      .get();
    const rows = (trendRes && trendRes.data) || [];

    const buckets = new Map();
    for (let i = trendDays - 1; i >= 0; i--) {
      const ts = todayStart - i * DAY_MS;
      const key = tsToBeijingDateKey(ts);
      buckets.set(key, { borrow: 0, return: 0, borrow_amount: 0, return_amount: 0 });
    }

    const inout_stats = {
      today: emptyInOutBucket(),
      month: emptyInOutBucket(),
      total: emptyInOutBucket(),
    };

    for (const r of rows) {
      const amount = sumItemsAmount(r.items);
      const createdAt = Number(r.created_at);
      const returnedAt = Number(r.returned_at);
      const approvedAt = Number(r.approved_at);

      if (Number.isFinite(createdAt)) {
        const cKey = tsToBeijingDateKey(createdAt);
        if (cKey && buckets.has(cKey)) {
          buckets.get(cKey).borrow += 1;
        }
        addToBucket(inout_stats.total, 'borrow', amount);
        if (createdAt >= monthStart) addToBucket(inout_stats.month, 'borrow', amount);
        if (createdAt >= todayStart) addToBucket(inout_stats.today, 'borrow', amount);
      }

      if (r.status === 'RETURNED' && Number.isFinite(returnedAt)) {
        const rKey = tsToBeijingDateKey(returnedAt);
        if (rKey && buckets.has(rKey)) {
          buckets.get(rKey).return += 1;
          buckets.get(rKey).return_amount += amount;
        }
        addToBucket(inout_stats.total, 'return', amount);
        if (returnedAt >= monthStart) addToBucket(inout_stats.month, 'return', amount);
        if (returnedAt >= todayStart) addToBucket(inout_stats.today, 'return', amount);
      }

      if (
        (r.status === 'APPROVED' || r.status === 'RETURNED') &&
        Number.isFinite(approvedAt) &&
        approvedAt >= trendStart
      ) {
        const aKey = tsToBeijingDateKey(approvedAt);
        if (aKey && buckets.has(aKey)) {
          buckets.get(aKey).borrow_amount += amount;
        }
      }
    }

    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const ts = todayStart - i * DAY_MS;
      const key = tsToBeijingDateKey(ts);
      const b = buckets.get(key) || { borrow: 0, return: 0, borrow_amount: 0, return_amount: 0 };
      trend.push({
        date: key,
        borrow: b.borrow,
        return: b.return,
        borrow_amount: Math.round(b.borrow_amount * 100) / 100,
        return_amount: Math.round(b.return_amount * 100) / 100,
      });
    }

    inout_stats.today.borrow_amount = Math.round(inout_stats.today.borrow_amount * 100) / 100;
    inout_stats.today.return_amount = Math.round(inout_stats.today.return_amount * 100) / 100;
    inout_stats.month.borrow_amount = Math.round(inout_stats.month.borrow_amount * 100) / 100;
    inout_stats.month.return_amount = Math.round(inout_stats.month.return_amount * 100) / 100;
    inout_stats.total.borrow_amount = Math.round(inout_stats.total.borrow_amount * 100) / 100;
    inout_stats.total.return_amount = Math.round(inout_stats.total.return_amount * 100) / 100;

    return ok({
      pending_count: (pendingRes && pendingRes.total) || 0,
      lent_count: (lentRes && lentRes.total) || 0,
      today_borrow: (todayBorrowRes && todayBorrowRes.total) || 0,
      today_return: (todayReturnRes && todayReturnRes.total) || 0,
      trend_days: trendDays,
      trend,
      trend_7d: trend,
      inout_stats,
    });
  } catch (e) {
    console.error('[borrow.summary] failed:', e);
    return err(5001, '看板数据获取失败');
  }
};
