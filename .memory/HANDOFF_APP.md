# AMS 教师端交接文档（2026-05-12 启动）

> **新会话第一件事：读完这份再动代码。**
> 这是 `app/` 工作区（教师端微信小程序）的接力上下文。完整规则与字段事实见 `docs/`，历史进度见 `.memory/PROGRESS.md`。
> 本文件位于 `app/.memory/HANDOFF_APP.md`（通过 junction 共享自根仓库 `d:\Code\AMS\.memory\`）。
> **角色**：你是 `app/` 工作区独占 agent，负责把云函数契约（admin agent 已写好并部署）落到小程序页面。**不修改 `cloudfunctions/`、`docs/`、管理端代码**；遇字段冲突先停下问用户。

---

## 1. 当前位置

- M1 后端骨架 ✅（`auth` / `asset` / `borrow` 已部署到 `ams-d8grnwwy6d8da557f`）
- M2 管理端 MVP ✅（资产 CRUD + Dashboard + 借用审批列表 / 详情 / 通过 / 拒绝 / 代归还 / 出入仓曲线）
- **M3 教师端 MVP**（你的任务）❌ 未启动，需要从空 `src/pages/login` 开始
- M4 通知公告 / 大型资产页、M5 联调上线 → 后续

**本次任务范围（用户已明确）**：登录 + 借用闭环（借物车 → 申请表 → 凭证 → 归还 → 撤回）。
首页、我的页面、归还页面属于附带，UI 简洁能跑通即可，不要过度设计。

---

## 2. 必读顺序（不许跳）

1. `app/AMS.md` — 工作区入口（项目身份、铁律、junction 说明）
2. `app/AGENTS.md` — CloudBase AI 通用规则（合规等保兜底）
3. `docs/03-data-model.md` 3.3（`ams_teacher`） + 3.6 / 3.6.1（`ams_borrow_request` 含 per-item）—— **字段事实唯一源**
4. `docs/04-api-spec.md` 4.2.1（auth 三个 action）+ 4.2.3（borrow 9 个 action 完整契约，**入参 / 出参 / 错误码 / 副作用都在里面**）+ 4.6（双身份鉴权 + **4.6.4 教师端 wx.cloud.callFunction 调用样板，可直接拷贝**）
5. `docs/06-teacher-features.md` — 教师端页面拆解、借物车交互、签名流程
   > ⚠️ 注意：6.2 描述的「token + teacherBindOpenid」**已过时**，以 docs/04 4.2.1 + 4.6 为准（教师端不发 token，鉴权靠 OPENID；绑定动作合并进 `teacherLoginByPassword`）。
6. `docs/07-workflows.md` 7.5（借用全流程）+ 7.2（借用状态机）
7. `data/资产借用登记表.md` — 用户提供的现实表单字段语义（`数量 / 拟归还日期 / 用途` 是 per-item 的来源）
8. `cloudfunctions/borrow/index.js` 与 `cloudfunctions/borrow/actions/*.js` —— 直接读云函数源码确认行为（junction 已挂，路径就是 `app/cloudfunctions/borrow/`）
9. `.memory/PROGRESS.md` — 当前进度
10. `.memory/CHANGELOG.md` — 重要变更（特别是 2026-05-12 那段，含本次 docs / 云函数 / 管理端 borrow 的完整改动）

---

## 3. 已部署云函数（你只调用，不改）

CloudBase 环境：`ams-d8grnwwy6d8da557f`

### 3.1 auth（用于登录）

| Action | 入参 | 副作用 | 主要错误码 |
|--------|------|--------|-----------|
| `teacherLoginByPassword` | `{ username, password }` | 校验账密 + 写入当前 OPENID 完成绑定；首次调用且 ams_teacher 为空时**自动注入 5 条种子数据** | 1001 缺参 / 2001 账密错 / 2002 缺微信上下文 |
| `teacherLoginByOpenid` | `{}`（前端不传 openid） | 只读，不更新 | 2002 缺微信上下文 / 2003 openid 未绑定（前端跳账密页） |

### 3.2 borrow（用于借出 / 撤回 / 归还 / 我的申请）

| Action | 角色 | 入参（关键字段） | 错误码 |
|--------|------|------------------|-------|
| `submit` | 教师 | `{ items[{asset_id, quantity?=1, expected_return_date, usage}], signature_file_id }` | 1001 / 1002 / 2002 / 2003 / 3001（非 IDLE）/ 4001（资产不存在） |
| `cancel` | 教师 | `{ borrow_id }`（仅 PENDING） | 2003 / 2004（不是本人）/ 3002 / 4002 |
| `return` | 教师 / 管理员 | `{ borrow_id }`（仅 APPROVED） | 2003 / 2004 / 3003 / 4002 |
| `listMine` | 教师 | `{ status?, page?=1, pageSize?=20 (上限 100) }` | 2002 / 2003 |
| `detail` | 教师本人 | `{ borrow_id }` | 2003 / 2004 / 4002 |

> 管理员专属（`approve` / `reject` / `adminList` / `summary`）你**不需要调**，由 admin 工作区使用。

### 3.3 asset（用于借物车选资产）

教师端只需要查询 IDLE 资产，建议用 `asset.list`（管理员 token）查或者**直接走 SDK 直连白名单**（详见 docs/04 4.4，但一期一律走云函数；**教师端目前没有 token**，只能等后续放开 `asset.list` 的教师权限或新增一个 `asset.listForTeacher` action）。

⚠️ **这是 docs/04 没完全锁的事项**。你着手时先停下问用户：
- 方案 A：临时给 `cloudfunctions/asset/utils/auth.js` 加教师身份分支（识别 OPENID）
- 方案 B：新增 `borrow.searchAssets` action 走 borrow 云函数（已识别教师）
- 方案 C：让教师端通过 SDK 直连 `ams_asset`（需要 CloudBase 安全规则）

不要自己擅自动 `cloudfunctions/`，先和用户对齐。

---

## 4. 鉴权约定（关键，不要搞错）

详见 `docs/04-api-spec.md` 4.6.1。

```
1. 管理端 token = ADMIN_PASSWORD → 教师端绝对不能用！
2. 教师端调云函数时 wx.cloud.callFunction 不传 token；
   云函数侧靠 cloud.getWXContext().OPENID 反查 ams_teacher 识别身份。
3. 因此教师端登录后只缓存 profile 用于 UI，不需要存 token。
4. OPENID 由微信平台在云函数请求里自动注入，前端无法伪造，无法手动传。
```

**前端登录流程**（已锁）：

```
启动 → wx.cloud.init({ env: 'ams-d8grnwwy6d8da557f' })
     → 尝试 teacherLoginByOpenid()
        ├─ 命中 → 缓存 profile，进首页
        └─ 2003 未绑定 → 跳登录页

登录页 → 用户输 t001 / 123456 → teacherLoginByPassword(username, password)
       → 后端校验 + 自动绑 openid → 缓存 profile，进首页
```

**测试账号**（已写入 cloudfunctions/auth/utils/teacher-seed.js，首次调用 teacherLoginByPassword 自动注入）：

| username | password | name | department |
|----------|----------|------|-----------|
| t001 | 123456 | 张三 | 软件学院 |
| t002 | 123456 | 李四 | 软件学院 |
| t003 | 123456 | 王五 | 软件学院 |
| t004 | 123456 | 赵六 | 软件学院 |
| t005 | 123456 | 孙七 | 软件学院 |

---

## 5. wx.cloud 接入清单（启动 checklist）

按顺序做：

1. **`app/manifest.config.ts`**：在 `mp-weixin` 段加 `cloud: true`
   ```ts
   'mp-weixin': {
     appid: VITE_WX_APPID,
     cloud: true,  // 启用云开发
     setting: { urlCheck: false, es6: true, minified: true },
     // ...
   }
   ```
2. **`app/src/main.ts`**：在 `app.use(...)` 之前调一次 `wx.cloud.init`：
   ```ts
   if (typeof wx !== 'undefined' && wx.cloud) {
     wx.cloud.init({ env: 'ams-d8grnwwy6d8da557f', traceUser: true })
   }
   ```
   建议把环境 ID 配置到 `app/env/.env.development` 等，用 `import.meta.env.VITE_TCB_ENV_ID`。
3. **新建 `app/src/utils/cloud.ts`**：暴露一个 `callCloud<T>(name, action, data)` 包装，统一处理 `code/message/data` + 抛 `CloudFunctionError`，参考 `admin/src/utils/http.ts` 但去掉 token 注入。
4. **删除 / 重写** `app/src/api/login.ts`、`app/src/api/foo*.ts`、`app/src/http/*`、`app/src/service/*`：这些是 unibest 模板代码，基于 HTTP API，与 CloudBase 不兼容，**不要试图复用**。
5. **新建** `app/src/api/auth.ts`、`app/src/api/borrow.ts`、`app/src/api/asset.ts`，对应云函数 action 一一封装（参考 `admin/src/modules/borrow/api.ts` 风格）。
6. **新建** `app/src/types/borrow.ts`：把 `admin/src/modules/borrow/types.ts` **整段拷过来**（字段事实一致，否则违反「三端字段一致」铁律）。

---

## 6. 教师端 wx.cloud.callFunction 样板（直接拷）

`docs/04-api-spec.md` 4.6.4 已写完整样板。摘要：

```ts
// app/src/utils/cloud.ts
export class CloudFunctionError extends Error {
  constructor(public code: number, message: string, public raw?: unknown) {
    super(message)
    this.name = 'CloudFunctionError'
  }
}

export async function callCloud<T>(name: string, action: string, data: object = {}): Promise<T> {
  const res = await wx.cloud.callFunction({
    name,
    data: { action, data },  // 不传 auth.token；OPENID 由微信注入
  })
  const r = res.result as { code: number; message: string; data: T }
  if (!r || typeof r.code !== 'number') throw new CloudFunctionError(-1, '云函数返回格式异常', res)
  if (r.code !== 0) throw new CloudFunctionError(r.code, r.message || '云函数错误', r)
  return r.data
}
```

```ts
// app/src/api/borrow.ts
import { callCloud } from '@/utils/cloud'
import type { BorrowRequest, BorrowListMineItem } from '@/types/borrow'

export const submitBorrow = (input: {
  items: Array<{ asset_id: string; quantity?: number; expected_return_date: string; usage: string }>
  signature_file_id: string
}) => callCloud<{ _id: string; serial_no: string; status: 'PENDING' }>('borrow', 'submit', input)

export const cancelBorrow = (borrow_id: string) =>
  callCloud<{ _id: string; status: 'CANCELLED' }>('borrow', 'cancel', { borrow_id })

export const returnBorrow = (borrow_id: string) =>
  callCloud<{ _id: string; status: 'RETURNED'; returned_at: number }>('borrow', 'return', { borrow_id })

export const listMyBorrows = (input: { status?: string; page?: number; pageSize?: number } = {}) =>
  callCloud<{ total: number; list: BorrowListMineItem[] }>('borrow', 'listMine', input)

export const getMyBorrowDetail = (borrow_id: string) =>
  callCloud<BorrowRequest>('borrow', 'detail', { borrow_id })
```

---

## 7. 关键页面与字段约束

### 7.1 借用申请表字段（**严格 per-item，不能放申请头部**）

对齐 `docs/03-data-model.md` 3.6.1 + `data/资产借用登记表.md`：

每条资产明细必须有：
- `asset_id`（教师选）
- `quantity`（数量，默认 1，整数 ≥ 1）
- `expected_return_date`（**'YYYY-MM-DD' 字符串**，不是时间戳；必须 ≥ 提交日）
- `usage`（用途，如「科研」「教学」「实验」，≤ 50 字）

**UI 建议**：在申请表第一行设 3 个全局输入框（数量 / 拟归还日期 / 用途），加「同步到所有资产」按钮，点击后下发到所有 items；但提交时**仍按 items[i] 各自值发**到云函数，不要简化成"一份字段适用全部"。

### 7.2 状态机（不许走错）

资产层：`IDLE → PENDING → LENT → IDLE`（reject / cancel 让 PENDING 回 IDLE）
申请层：`PENDING → APPROVED → RETURNED` / `→ REJECTED` / `→ CANCELLED`

教师端：
- 「撤回」按钮**仅在 status === PENDING** 时显示
- 「归还」按钮**仅在 status === APPROVED** 时显示
- REJECTED / CANCELLED / RETURNED 是终态，不可恢复

### 7.3 签名

- canvas 手写 → toTempFilePath → `wx.cloud.uploadFile({ cloudPath: 'signature/{teacher_id}/{时间戳}.png', filePath })`
- 拿到 `fileID`（形如 `cloud://...png`）传给 `submitBorrow.signature_file_id`
- 凭证页要展示签名时用 `wx.cloud.getTempFileURL({ fileList: [fileID] })` 拿 https URL

### 7.4 凭证页

`borrow.detail` 返回 `voucher_qr_payload`（base64 编码 `{ borrow_id, serial_no, approved_at }`），用 `tki-qrcode` 之类的小程序二维码组件渲染，给现场管理员扫码核验。

### 7.5 错误码 → Toast 文案建议

| code | 场景 | UI |
|------|------|----|
| 1001 / 1002 | 入参错误 | Toast 显示 message |
| 2002 | 缺微信上下文 | "请通过微信小程序打开" |
| 2003 | openid 未绑定 | 跳转登录页（不是 Toast） |
| 2004 | 越权 | "你没有权限操作此申请" |
| 3001 | 资产被抢 | "资产 XXX 已被借出，请重新选择" + 用 data.offending_asset_ids 高亮 |
| 3002 / 3003 | 状态不允许 | Toast 显示 message |
| 4001 / 4002 | 资源不存在 | Toast + 返回上一页 |
| 5xxx | 服务端错误 | Toast 「服务器繁忙，请重试」 + 上报 |

---

## 8. UI / 主题

- wot-ui v2（已装），主题色覆盖：在 `src/style/` 全局加 `:root { --wot-color-primary: #0096C2; --wot-color-primary-active: #006B8F; }`
- **不要 emoji**（铁律）
- 借物车交互（docs/06 6.4 已锁）：上下分屏 / 点击加入为主 / 长按拖拽为加强
- 主页风格简洁，不要过度炫技；优先把闭环跑通

---

## 9. 不许做的事

1. **不要改 `cloudfunctions/`**（junction 写入会同步污染管理端；遇云函数行为问题先汇报）
2. **不要改 `docs/`**（字段事实唯一源；遇字段需要调整先汇报）
3. **不要改管理端 `admin/src/`**（不在你的工作区）
4. **不要复用 unibest 模板的 alova / http 包装**（与 wx.cloud 不兼容）
5. **不要硬编码 OPENID 或 token 到前端代码**（OPENID 是平台注入；token 教师端根本不用）
6. **不要把 per-item 字段塞回申请头部**（会破坏 docs/03 3.6.1）
7. **不要在云函数 event 里手动塞 openid**（云函数侧只信 `cloud.getWXContext()`）
8. **不要主动 `git commit`**（用户表达"提交"意图时才更新 `.memory/PROGRESS.md` + `.memory/CHANGELOG.md` 准备 commit 信息）

---

## 10. 推荐开发顺序

1. **wx.cloud 接入**（manifest + main.ts + utils/cloud.ts）→ 在控制台手动调一次 `auth.teacherLoginByPassword({username:'t001',password:'123456'})` 验证连通
2. **types + api 全套写完**（auth / borrow / asset），先打稳类型层
3. **登录页**（账密 + 启动免密尝试）→ Pinia store 缓存 profile
4. **路由守卫 + 我的页面**（拿到 profile 显示姓名 / 部门）
5. **借用主页**（先做最简版：资产搜索调 asset.list 走通 → 借物车 → 跳申请表）
6. **申请表 + 签名 canvas + 上传 + 提交** → 提交成功跳凭证页
7. **凭证页**（解析 `voucher_qr_payload` + 二维码组件）
8. **我的申请列表**（listMine） → 详情 → 撤回 / 归还
9. **首页**（卡片入口 + 简单看板，可调 listMine 算"我的在借数量"）
10. 自检：`pnpm type-check`（不是 typecheck，看 package.json scripts）+ 微信开发者工具实测

---

## 11. 用户偏好（必须遵守）

- **不要跑 `pnpm dev:mp` / `pnpm build:mp`**（用户自己开微信开发者工具）
- agent 自检只跑 `pnpm type-check` + 必要时 `node --check`
- 不擅自 git commit；用户说"提交 / commit / 推送"才更新 `.memory/` 并准备 Conventional Commits 信息
- 遇歧义先停下问用户，不要猜字段或规则（参考 docs/11-open-questions.md）

---

## 12. 一句话状态

> 云函数已就位、管理端审批闭环已完成。**你的任务是从空登录页开始，按 docs/04 4.6.4 的样板把 wx.cloud.callFunction 接通，先跑通教师身份识别，再做借用申请闭环。** 第一阶段（登录 + 借用 submit + 我的列表 + 撤回 + 归还）通过即可向用户报告，凭证 / 首页 UI 后续打磨。

任何字段冲突、状态机争议、需要新增云函数 action 的情况，**先停下汇报用户**，不要自己擅作主张。
