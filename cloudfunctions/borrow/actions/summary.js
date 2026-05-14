/**
 * borrow.summary：管理员看板聚合。
 *
 * 契约：docs/04-api-spec.md 4.2.3.9
 *
 * 出参：
 *   - pending_count    待审批申请数
 *   - lent_count       借出中资产数（资产维度，与 asset.summary 冗余）
 *   - today_borrow     今日新建申请数（按 created_at >= 今日 0 点）
 *   - today_return     今日归还数（按 returned_at >= 今日 0 点 且 status=RETURNED）
 *   - trend_7d         最近 7 天每日 { date, borrow, return }
 *
 * 错误码：2001 / 5001
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireAdmin } = require('../utils/identity');

const DAY_MS = 24 * 3600 * 1000;
const TZ_OFFSET_MS = 8 * 3600 * 1000; // 北京时间
const TREND_DAYS = 7;
const TREND_FETCH_LIMIT = 1000; // 7 天范围内申请数上限保护

/** 北京时间今天 00:00 的 UTC 毫秒数 */
function beijingTodayStart() {
  const now = Date.now();
  return Math.floor((now + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
}

/** 把 UTC 毫秒数格式化为该时间所在北京日期 'YYYY-MM-DD' */
function tsToBeijingDateKey(ts) {
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts + TZ_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = async (event) => {
  const auth = await requireAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const todayStart = beijingTodayStart();
  const trendStart = todayStart - (TREND_DAYS - 1) * DAY_MS; // 含今天共 7 天

  try {
    // 1. 计数指标（4 个并行 count）
    const [pendingRes, lentRes, todayBorrowRes, todayReturnRes] = await Promise.all([
      db.collection(COLLECTIONS.BORROW).where({ status: 'PENDING' }).count(),
      db.collection(COLLECTIONS.ASSET).where({ business_status: 'LENT' }).count(),
      db.collection(COLLECTIONS.BORROW).where({ created_at: _.gte(todayStart) }).count(),
      db
        .collection(COLLECTIONS.BORROW)
        .where({ status: 'RETURNED', returned_at: _.gte(todayStart) })
        .count(),
    ]);

    // 2. 7 天曲线：拉取范围内申请的 created_at + returned_at + status，应用层分桶。
    //    一周量级的申请很小（几十至几百），网络与内存压力可忽略。
    const trendRes = await db
      .collection(COLLECTIONS.BORROW)
      .where(
        _.or([
          { created_at: _.gte(trendStart) },
          { returned_at: _.gte(trendStart) },
        ]),
      )
      .field({ created_at: true, returned_at: true, status: true })
      .limit(TREND_FETCH_LIMIT)
      .get();
    const rows = (trendRes && trendRes.data) || [];

    // 初始化 7 天桶
    const buckets = new Map();
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const ts = todayStart - i * DAY_MS;
      buckets.set(tsToBeijingDateKey(ts), { borrow: 0, return: 0 });
    }
    for (const r of rows) {
      const cKey = tsToBeijingDateKey(Number(r.created_at));
      if (cKey && buckets.has(cKey)) buckets.get(cKey).borrow += 1;
      if (r.status === 'RETURNED') {
        const rKey = tsToBeijingDateKey(Number(r.returned_at));
        if (rKey && buckets.has(rKey)) buckets.get(rKey).return += 1;
      }
    }
    const trend_7d = [];
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const ts = todayStart - i * DAY_MS;
      const key = tsToBeijingDateKey(ts);
      const b = buckets.get(key) || { borrow: 0, return: 0 };
      trend_7d.push({ date: key, borrow: b.borrow, return: b.return });
    }

    return ok({
      pending_count: (pendingRes && pendingRes.total) || 0,
      lent_count: (lentRes && lentRes.total) || 0,
      today_borrow: (todayBorrowRes && todayBorrowRes.total) || 0,
      today_return: (todayReturnRes && todayReturnRes.total) || 0,
      trend_7d,
    });
  } catch (e) {
    console.error('[borrow.summary] failed:', e);
    return err(5001, '看板数据获取失败');
  }
};
