/**
 * borrow.searchAssets：教师端搜索可借资产。
 *
 * 契约：docs/04-api-spec.md 4.2.3.7
 *
 * 入参：{ keyword?, page?=1, pageSize?=20 } pageSize 上限 50
 * 出参：{ total, page, pageSize, list }
 *
 * 安全边界：
 *   - 仅教师 OPENID 鉴权可调用
 *   - 固定只返回 business_status=IDLE
 *   - 仅返回借物车所需精简字段
 *
 * 错误码：1001 / 2002 / 2003 / 2004
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireTeacher } = require('../utils/identity');

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;
const KEYWORD_MAX = 50;

function clampPageSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return PAGE_SIZE_DEFAULT;
  return Math.min(Math.floor(n), PAGE_SIZE_MAX);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAsset(asset) {
  const imageUrls = Array.isArray(asset.image_urls) ? asset.image_urls : [];
  return {
    _id: asset._id,
    asset_no: asset.asset_no || '',
    name: asset.name || '',
    brand: asset.brand || '',
    spec: asset.spec || '',
    unit_price: typeof asset.unit_price === 'number' ? asset.unit_price : null,
    quantity: typeof asset.quantity === 'number' && asset.quantity > 0 ? asset.quantity : 1,
    location_name: asset.location_name || '',
    business_status: 'IDLE',
    cover_image_file_id: imageUrls[0] || '',
  };
}

module.exports = async (event) => {
  const auth = await requireTeacher(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const page = Math.max(1, Math.floor(Number(data.page) || 1));
  const pageSize = clampPageSize(data.pageSize);
  const keyword = String(data.keyword || '').trim();
  if (keyword.length > KEYWORD_MAX) {
    return err(1001, `关键字不超过 ${KEYWORD_MAX} 字`);
  }

  const conds = [{ business_status: 'IDLE' }];
  if (keyword) {
    const re = new RegExp(escapeRegExp(keyword), 'i');
    conds.push(
      _.or([
        { asset_no: re },
        { name: re },
        { brand: re },
        { spec: re },
      ]),
    );
  }

  const where = conds.length === 1 ? conds[0] : _.and(conds);
  const collection = db.collection(COLLECTIONS.ASSET).where(where);
  const countRes = await collection.count();
  const total = (countRes && countRes.total) || 0;
  if (total === 0) return ok({ total: 0, page, pageSize, list: [] });

  const listRes = await collection
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .field({
      _id: true,
      asset_no: true,
      name: true,
      brand: true,
      spec: true,
      unit_price: true,
      quantity: true,
      location_name: true,
      business_status: true,
      image_urls: true,
    })
    .get();

  return ok({
    total,
    page,
    pageSize,
    list: ((listRes && listRes.data) || []).map(normalizeAsset),
  });
};
