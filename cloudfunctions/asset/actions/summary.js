/**
 * asset.summary：资产看板聚合查询。
 *
 * 入参：无
 * 出参：
 *   {
 *     total: number,                                  // 资产总条数
 *     total_value: number,                            // 单价合计（元）
 *     large_count: number,                            // 大型资产条数（is_large=true）
 *     large_value: number,                            // 大型资产单价合计
 *     by_status: {                                    // 各业务状态计数 + 金额
 *       IDLE: { count, value },
 *       IN_USE: { count, value },
 *       LENT: { count, value },
 *       PENDING: { count, value },
 *       MAINTAIN: { count, value },
 *       SCRAPPED: { count, value },
 *     },
 *     by_dept: Array<{ dept_name, count, value }>,    // 按部门分组 top 10
 *   }
 *
 * 实现：CloudBase 聚合一次性出全部数字。
 */

const { db, COLLECTIONS } = require('../utils/db');
const { authenticate } = require('../utils/auth');
const { ok, err } = require('../utils/response');

const $ = db.command.aggregate;

const ALL_STATUSES = ['IDLE', 'IN_USE', 'LENT', 'PENDING', 'MAINTAIN', 'SCRAPPED'];

module.exports = async (event) => {
  const auth = authenticate(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const col = db.collection(COLLECTIONS.ASSET);

  // 1. 总数（用 count 即可，便宜）
  const totalRes = await col.count();
  const total = totalRes.total || 0;

  if (total === 0) {
    return ok({
      total: 0,
      total_value: 0,
      large_count: 0,
      large_value: 0,
      by_status: emptyByStatus(),
      by_dept: [],
    });
  }

  // 2. 按业务状态聚合：count + value
  const byStatusRes = await col
    .aggregate()
    .group({
      _id: '$business_status',
      count: $.sum(1),
      value: $.sum('$unit_price'),
    })
    .end();

  const by_status = emptyByStatus();
  let total_value = 0;
  for (const row of byStatusRes.data || []) {
    const key = String(row._id || '');
    const count = Number(row.count) || 0;
    const value = Number(row.value) || 0;
    total_value += value;
    if (by_status[key]) {
      by_status[key].count = count;
      by_status[key].value = value;
    }
  }

  // 3. 大型资产：单独 match + group
  const largeRes = await col
    .aggregate()
    .match({ is_large: true })
    .group({
      _id: null,
      count: $.sum(1),
      value: $.sum('$unit_price'),
    })
    .end();
  const large_count = largeRes.data && largeRes.data[0] ? Number(largeRes.data[0].count) || 0 : 0;
  const large_value = largeRes.data && largeRes.data[0] ? Number(largeRes.data[0].value) || 0 : 0;

  // 4. 按部门聚合：top 10（含未设置部门的 null 项，前端按需展示）
  const byDeptRes = await col
    .aggregate()
    .group({
      _id: '$dept_name',
      count: $.sum(1),
      value: $.sum('$unit_price'),
    })
    .sort({ count: -1 })
    .limit(10)
    .end();
  const by_dept = (byDeptRes.data || []).map((row) => ({
    dept_name: row._id || '未分部门',
    count: Number(row.count) || 0,
    value: Number(row.value) || 0,
  }));

  return ok({
    total,
    total_value,
    large_count,
    large_value,
    by_status,
    by_dept,
  });
};

function emptyByStatus() {
  const out = {};
  for (const s of ALL_STATUSES) out[s] = { count: 0, value: 0 };
  return out;
}
