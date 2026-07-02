/**
 * notice.list：通知列表。
 *
 * 入参：
 *   - published_only?: boolean  仅已发布（Dashboard / 教师端预览用）
 *   - published?: boolean        精确筛选发布状态
 *   - level?: 'INFO' | 'IMPORTANT'
 *   - keyword?: string  标题模糊
 *   - page?: number
 *   - pageSize?: number  上限 50
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { LEVEL_SET } = require('../utils/validate');
const { requireSuperAdmin } = require('../utils/auth');

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;
const KEYWORD_MAX = 50;

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = async (event) => {
  const data = (event && event.data) || {};
  const publicPublishedOnly = data.published_only === true;
  if (!publicPublishedOnly) {
    const auth = requireSuperAdmin(event);
    if (!auth.ok) return err(auth.error.code, auth.error.message);
  }

  const page = Math.max(1, Math.floor(Number(data.page) || 1));
  let pageSize = Math.floor(Number(data.pageSize) || PAGE_SIZE_DEFAULT);
  if (!Number.isFinite(pageSize) || pageSize <= 0) pageSize = PAGE_SIZE_DEFAULT;
  pageSize = Math.min(pageSize, PAGE_SIZE_MAX);

  const conds = [];
  if (publicPublishedOnly || data.published === true) {
    conds.push({ published: true });
  } else if (data.published === false) {
    conds.push({ published: false });
  }
  if (data.level && LEVEL_SET.has(String(data.level).toUpperCase())) {
    conds.push({ level: String(data.level).toUpperCase() });
  }
  if (data.keyword) {
    const kw = String(data.keyword).trim();
    if (kw.length > KEYWORD_MAX) return err(1001, `关键字不超过 ${KEYWORD_MAX} 字`);
    if (kw) conds.push({ title: new RegExp(escapeRegExp(kw), 'i') });
  }

  const where = conds.length === 0 ? {} : conds.length === 1 ? conds[0] : _.and(conds);

  try {
    const collection = db.collection(COLLECTIONS.NOTICE).where(where);
    const countRes = await collection.count();
    const total = (countRes && countRes.total) || 0;
    if (total === 0) return ok({ total: 0, list: [] });

    const listRes = await collection
      .orderBy(publicPublishedOnly ? 'published_at' : 'created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const list = (listRes && listRes.data) || [];
    if (!publicPublishedOnly) return ok({ total, list });

    return ok({
      total,
      list: list.map((item) => ({
        _id: item._id,
        title: item.title || '',
        content: item.content || '',
        level: item.level || 'INFO',
        published: Boolean(item.published),
        published_at: item.published_at || null,
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      })),
    });
  } catch (e) {
    console.error('[notice.list]', e);
    return err(5001, '获取通知列表失败');
  }
};
