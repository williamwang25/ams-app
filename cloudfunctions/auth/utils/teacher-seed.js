/**
 * 教师测试种子数据（M2/M3 阶段）。
 *
 * 触发时机：teacherLoginByPassword 入口在校验账密前调用 ensureTeacherSeed()。
 * 若 ams_teacher 集合 count === 0，则用固定 _id（seed_t001..seed_t005）通过
 * doc(id).set(...) 幂等注入 5 条记录，避免并发竞态。
 *
 * 字段对齐 docs/03-data-model.md 3.3：
 *   - password 一期明文存（上线前改字段名为 password_hash + bcrypt）
 *   - department 统一「软件学院」
 *   - openid / phone / unionid 留空，由首次账密登录自动绑定 openid
 */

const { db, COLLECTIONS } = require('./cloudbase');

const SEED_TEACHERS = [
  { _id: 'seed_t001', username: 't001', password: '123456', name: '张三', department: '软件学院' },
  { _id: 'seed_t002', username: 't002', password: '123456', name: '李四', department: '软件学院' },
  { _id: 'seed_t003', username: 't003', password: '123456', name: '王五', department: '软件学院' },
  { _id: 'seed_t004', username: 't004', password: '123456', name: '赵六', department: '软件学院' },
  { _id: 'seed_t005', username: 't005', password: '123456', name: '孙七', department: '软件学院' },
];

let _seedEnsured = false;

/**
 * 若 ams_teacher 为空则注入 5 条测试教师；进程内只跑一次。
 * 用 doc(id).set(...) 幂等写入，避免并发重复插入。
 */
async function ensureTeacherSeed() {
  if (_seedEnsured) return;
  const { total } = await db.collection(COLLECTIONS.TEACHER).count();
  if (typeof total === 'number' && total > 0) {
    _seedEnsured = true;
    return;
  }
  const now = Date.now();
  for (const t of SEED_TEACHERS) {
    const doc = {
      username: t.username,
      password: t.password,
      name: t.name,
      department: t.department,
      phone: '',
      openid: null,
      unionid: null,
      bound_at: null,
      created_at: now,
      updated_at: now,
    };
    // set() 在 _id 不存在时插入，存在时整体覆盖；并发场景下幂等。
    await db.collection(COLLECTIONS.TEACHER).doc(t._id).set(doc);
  }
  _seedEnsured = true;
}

module.exports = { SEED_TEACHERS, ensureTeacherSeed };
