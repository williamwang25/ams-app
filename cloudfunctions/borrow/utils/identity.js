/**
 * 双身份鉴权工具（docs/04-api-spec.md 4.6.1）。
 *
 * 两类调用方：
 *   1. 管理端 Web（CloudBase JS SDK）：event.auth.token === ADMIN_PASSWORD
 *      → role: 'admin', operator { id: 'env-admin', name: '系统管理员', role: 'admin' }
 *   2. 教师端微信小程序（wx.cloud.callFunction）：wx-server-sdk getWXContext().OPENID
 *      命中 ams_teacher → role: 'teacher', operator { id: teacher._id, name, role: 'teacher' }
 *
 * 安全约束：
 *   - OPENID 不接受前端传值，只信微信云函数上下文
 *   - 管理端 token 不在小程序端使用
 *   - 各 action 入口必须显式校验角色（require('./utils/identity').requireAdmin / requireTeacher / authenticate）
 *
 * 返回结构：
 *   { ok: true, role: 'admin'|'teacher', operator, openid?, teacher? }
 *   { ok: false, error: { code, message } }
 */

const { ADMIN_PASSWORD } = require('./credentials');
const { db, COLLECTIONS } = require('./cloudbase');
const { getWxContext } = require('./wx-context');

const ADMIN_OPERATOR = Object.freeze({
  id: 'env-admin',
  name: '系统管理员',
  role: 'admin',
});

/**
 * 通用鉴权：管理员优先 → 教师 → 401。
 * 返回 { ok, role, operator, openid?, teacher? } 或 { ok: false, error }。
 */
async function authenticate(event) {
  const token = event && event.auth && event.auth.token;
  if (token && token === ADMIN_PASSWORD) {
    return { ok: true, role: 'admin', operator: { ...ADMIN_OPERATOR } };
  }

  const wxCtx = getWxContext();
  const OPENID = wxCtx && wxCtx.OPENID;
  if (OPENID) {
    const queryRes = await db
      .collection(COLLECTIONS.TEACHER)
      .where({ openid: OPENID })
      .limit(1)
      .get();
    const teacher = queryRes && queryRes.data && queryRes.data[0];
    if (!teacher) {
      return { ok: false, error: { code: 2003, message: 'openid 未绑定教师，请先用账号密码登录' } };
    }
    return {
      ok: true,
      role: 'teacher',
      operator: {
        id: teacher._id,
        name: teacher.name || '',
        role: 'teacher',
      },
      openid: OPENID,
      teacher,
    };
  }

  return { ok: false, error: { code: 2001, message: '未登录' } };
}

/** 仅允许管理员；不是管理员一律返 2001 / 2003 / 2004 */
async function requireAdmin(event) {
  const r = await authenticate(event);
  if (!r.ok) return r;
  if (r.role !== 'admin') return { ok: false, error: { code: 2004, message: '此操作仅管理员可执行' } };
  return r;
}

/** 仅允许教师；管理员调教师专属 action 也拒（cancel / submit / listMine） */
async function requireTeacher(event) {
  const r = await authenticate(event);
  if (!r.ok) return r;
  if (r.role !== 'teacher') return { ok: false, error: { code: 2004, message: '此操作仅教师可执行' } };
  return r;
}

module.exports = { authenticate, requireAdmin, requireTeacher, ADMIN_OPERATOR };
