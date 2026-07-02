/**
 * asset.summary：资产看板聚合查询。
 *
 * 入参：无
 * 出参扩展（0702）：
 *   by_dept[].lent_count  各部门当前借出数
 *   large_lent_count      大型资产借出中数量
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

  const totalRes = await col.count();
  const total = totalRes.total || 0;

  if (total === 0) {
    return ok({
      total: 0,
      total_value: 0,
      large_count: 0,
      large_value: 0,
      large_lent_count: 0,
      by_status: emptyByStatus(),
      by_dept: [],
    });
  }

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

  const largeLentRes = await col.where({ is_large: true, business_status: 'LENT' }).count();
  const large_lent_count = (largeLentRes && largeLentRes.total) || 0;

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

  const lentByDeptRes = await col
    .aggregate()
    .match({ business_status: 'LENT' })
    .group({
      _id: '$dept_name',
      lent_count: $.sum(1),
    })
    .end();

  const lentMap = new Map();
  for (const row of lentByDeptRes.data || []) {
    lentMap.set(row._id || '未分部门', Number(row.lent_count) || 0);
  }

  const by_dept = (byDeptRes.data || []).map((row) => {
    const dept_name = row._id || '未分部门';
    return {
      dept_name,
      count: Number(row.count) || 0,
      value: Number(row.value) || 0,
      lent_count: lentMap.get(dept_name) || 0,
    };
  });

  return ok({
    total,
    total_value,
    large_count,
    large_value,
    large_lent_count,
    by_status,
    by_dept,
  });
};

function emptyByStatus() {
  const out = {};
  for (const s of ALL_STATUSES) out[s] = { count: 0, value: 0 };
  return out;
}
