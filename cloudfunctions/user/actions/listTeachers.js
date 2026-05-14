/**
 * user.listTeachers：分页查询教师账号。
 *
 * 入参：{ keyword?, department?, bound?, page?, pageSize? }
 * 出参：{ total, page, pageSize, list: TeacherUser[] }
 */

const { ok, err } = require('../utils/response');
const { db, _, COLLECTIONS } = require('../utils/cloudbase');
const { requireSuperAdmin } = require('../utils/auth');
const { parsePagination, trimText, escapeRegExp } = require('../utils/validate');
const { sanitizeTeacher } = require('../utils/teacher');

module.exports = async (event) => {
  const auth = requireSuperAdmin(event);
  if (!auth.ok) return err(auth.error.code, auth.error.message);

  const data = (event && event.data) || {};
  const { page, pageSize } = parsePagination(data);
  const conds = [];

  const keyword = trimText(data.keyword);
  if (keyword) {
    if (keyword.length > 50) return err(1001, '关键字不超过 50 字');
    const re = db.RegExp({ regexp: escapeRegExp(keyword), options: 'i' });
    conds.push(
      _.or([
        { username: re },
        { name: re },
        { phone: re },
        { department: re },
      ]),
    );
  }

  const department = trimText(data.department);
  if (department) {
    if (department.length > 50) return err(1001, '部门不超过 50 字');
    conds.push({ department });
  }

  if (typeof data.bound === 'boolean') {
    if (data.bound) {
      conds.push(_.and([{ openid: _.neq(null) }, { openid: _.neq('') }]));
    } else {
      conds.push(_.or([{ openid: null }, { openid: '' }]));
    }
  }

  const where = conds.length === 0 ? {} : conds.length === 1 ? conds[0] : _.and(conds);
  const query = db.collection(COLLECTIONS.TEACHER).where(where);

  const [{ total }, { data: rows }] = await Promise.all([
    query.count(),
    query
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: true,
        username: true,
        name: true,
        phone: true,
        department: true,
        openid: true,
        unionid: true,
        bound_at: true,
        created_at: true,
        updated_at: true,
      })
      .get(),
  ]);

  return ok({
    total: total || 0,
    page,
    pageSize,
    list: (rows || []).map(sanitizeTeacher),
  });
};
