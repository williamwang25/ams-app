# AMS 项目进度

> **作用**：跨会话、跨 agent 共享当前迭代状态。每次完成一段工作后追加；用户准备 git 提交时强制刷新（详见 `AGENTS.md`）。
> **格式约定**：按"已完成 / 进行中 / 待办"三段维护；条目越新越靠上；保留日期戳便于追溯。
>
> **⚠️ 新会话请先读 `.memory/HANDOFF.md`**（最新接力上下文，覆盖即将开始的 borrow 模块工作 + `cloudfunctions` junction 待办）。

## 里程碑

- M0 项目初始化与需求文档（**当前**）
- M1 后端骨架：`init` 云函数 + 共享类型 + auth 与 asset 基础接口
- M2 管理端 MVP：登录 + 资产 CRUD + Dashboard
- M3 教师端 MVP：登录绑定 + 借用申请 + 凭证 + 归还
- M4 借用审批闭环 + 大型资产页 + 通知公告
- M5 联调 / 上线烟雾测试

---

## 已完成

### 2026-07-03

- **教师端借用页加号修复**：`src/pages/borrow/index.vue` 将资产卡片右下角加号改为 `touchend.stop` 明确加入借物车，避免父级拖拽 touch 流吞掉 `tap` 导致点击无反应；保留原飞入动画和拖拽加入能力。
- **教师端首页通知提醒接入**：新增 `src/api/notice.ts` / `src/types/notice.ts`，首页通知栏合并展示本人借用审批提醒（待审批 / 已通过 / 已拒绝）和管理员端已发布公告；借用提醒点击进入申请详情，公告点击弹窗查看内容。
- **notice 云函数教师端只读路径**：`notice.list({ published_only: true })` 无需管理端 token，仅返回已发布通知安全字段；管理端其他列表模式和通知增删改发布仍需管理员 token。已同步 `docs/04-api-spec.md` 与 `.memory/CHANGELOG.md`。
- **“我的”页面个人中心**：新增个人信息展示卡和底部编辑弹窗，教师可编辑本人姓名、部门、手机号；账号和微信绑定状态只读。新增 `auth.teacherUpdateProfile` 云函数 action，按 OPENID 反查本人后更新 `ams_teacher` 基础字段，并同步刷新本地 user store。
- **自检结果**：`node --check cloudfunctions/auth/index.js`、`node --check cloudfunctions/auth/actions/teacherUpdateProfile.js`、`node --check cloudfunctions/notice/index.js`、`node --check cloudfunctions/notice/actions/list.js` 通过；本次涉及前端文件 ESLint 通过。`node_modules\.bin\vue-tsc.CMD --noEmit` 被 `node_modules/@wot-ui/ui/components/wd-button/wd-button.vue` 内部 `ButtonOpenType` 与 `_ButtonOpenType` 不兼容阻塞，未进入本次代码错误。

### 2026-05-20

- **管理端资产图片上传完成**：新增 `asset.uploadImages` / `asset.resolveImageUrls` 云函数 action、`src/modules/asset/storage.ts`、`AssetImageUploader.vue`、`AssetImageGallery.vue`；资产入库先调用 `asset.create` 获取 `asset_no`，前端转 base64 后经云函数上传图片到 `asset/{asset_no}/`，图片名按 `asset_no-01.ext` / `asset_no-02.ext` 命名，再通过 `asset.update` 回写 `image_urls`；资产编辑支持追加 / 移除图片并保存。
- **资产编号递增修复**：修复 `cloudfunctions/asset/utils/seq.js` 对 CloudBase `doc().get()` 返回结构的兼容读取，并将计数器初始化改为 `doc(key).set(...)`；`asset_no` 生成时会跳过已存在编号，避免历史重复编号继续影响后续入库。
- **资产图片展示接入**：资产列表显示首图缩略图，资产详情展示图片图库，所有预览通过 `asset.resolveImageUrls` 解析临时 URL，不拼接公开 URL。
- **自检结果**：CloudBase 环境 `ams-d8grnwwy6d8da557f` 查询正常；`node --check`、`vue-tsc --noEmit`、ESLint、`npm run build` 通过；`asset` 云函数已更新并云端 smoke 验证 `create` 生成 `YQJJ2026000004`、`uploadImages` 生成 `asset/YQJJ2026000004/YQJJ2026000004-01.png` / `-02.png`、`resolveImageUrls` 返回 `code=0`，测试资产 / 日志 / 图片已删除。浏览器直传曾因 storage 403 / 本地安全域名套餐限制受阻，现改为资产图片上传与临时 URL 解析都走 `asset` 云函数。smoke 已消耗序列号 `000004`，当前 `ams_seq.asset_no:YQJJ:2026.n=4`，下一次真实入库会生成 `YQJJ2026000005`。

### 2026-05-14

- **管理端教师用户管理完成并上线**：新增 `cloudfunctions/user` Event 云函数（`listTeachers` / `createTeacher` / `updateTeacher` / `resetTeacherPassword` / `unbindTeacherOpenid` / `deleteTeacher`），超管 token 鉴权，列表不返回 `password`，删除教师会检查 `ams_borrow_request` 防止历史单据失去归属；`cloudbaserc.json` 已登记 `user`。
- **管理端 `/admins` 替换占位为真实教师账号管理页**：新增 `src/modules/user/types.ts` / `api.ts`，页面支持关键字 / 部门 / 微信绑定状态筛选，新增教师、编辑资料、重置临时密码、解绑微信、删除教师；同步更新 `docs/04-api-spec.md`、`docs/05-admin-features.md`、`docs/10-init-and-deploy.md` 与 `.memory/CHANGELOG.md`。
- **教师用户管理自检与云端 smoke 通过**：`node --check cloudfunctions/user/**/*.js`、`vue-tsc --noEmit`、ESLint、`npm run build` 通过；已在 `ams-d8grnwwy6d8da557f` 创建 `user` 云函数并云端验证教师列表 + 临时教师 create/update/reset/unbind/delete，临时账号已删除。
- **教师端 CloudBase 调用与页面骨架落地**：小程序开启 `mp-weixin.cloud`，`src/main.ts` / `src/utils/cloud.ts` 初始化 CloudBase；新增 `src/api/auth.ts` / `src/api/borrow.ts` / `src/api/asset.ts`，教师端登录、借用、可借资产搜索均走云函数。
- **教师端借用主链路完成代码侧闭环**：完成账密登录 + openid 免密、首页、借用资产搜索、借物车、申请表、签名上传、详情、凭证、归还、我的申请页面；借物车数量按可借数量约束，申请表按 per-item `quantity / expected_return_date / usage` 提交。
- **可借资产搜索方案 B 已实现**：新增 `borrow.searchAssets` 云函数 action，只返回 `business_status=IDLE` 的可借资产精简字段；同步更新 `docs/04-api-spec.md` 和 `.memory/CHANGELOG.md`。
- **微信上下文获取修复并已部署**：`auth` / `borrow` 云函数新增 `wx-server-sdk` 读取小程序 `OPENID`，修复 `cloud.getWXContext is not a function`；云端直调已验证退化为业务错误 `2002`。
- **借用资产页交互重构**：借用页改为顶部小搜索栏 + 中部资产图片网格 + 底部借物车托盘；支持点击加号飞入借物车动画、长按拖拽资产到借物车；首页主要服务与底部 tabbar 的借用入口图标改为资产/借物车语义。
- **可借资产封面接入并已部署**：`borrow.searchAssets` 新增 `cover_image_file_id`，小程序端批量换取临时链接展示资产封面，无图片时使用本地中性资产占位图形；`borrow` 云函数已重新部署。
- **wot-ui v2 UI 风格迁移**：按 `docs/ui-style-migration-wot-ui-v2.md` 重构教师端主要页面，统一蓝白办公风、浅灰页面背景、白色卡片、`wd-navbar` / `wd-button` / `wd-icon` / `wd-tag` 等 wot-ui 组件与全局主题变量。
- **教师端类型自检通过**：本地 `pnpm` 不在 sandbox PATH，改用 `node_modules\.bin\vue-tsc.CMD --noEmit` 等价执行并通过；新增 `borrow.searchAssets` 云函数文件 `node --check` 通过。

### 2026-05-12

- **cloudfunctions junction 落定**：`d:\Code\AMS\admin\cloudfunctions\` 为真实主目录；`d:\Code\AMS\app\cloudfunctions\` 为 junction 指向 admin。三端写云函数后教师端 agent 直接 `read_file app/cloudfunctions/borrow/index.js` 可取，**消除"小程序端不知道云函数契约"问题**。
- **教师端鉴权方案锁定**：账号密码登录 + 自动绑定 openid → 后续免密；**OPENID 作为鉴权依据**（来自 `wx-server-sdk.getWXContext()`，前端不传），不发 token。具体 docs/04 4.6.1 双身份鉴权约定。
- **借用申请字段对齐 `data/资产借用登记表.md`**：`数量 / 拟归还日期 / 用途` 三字段从申请头部下沉到 `items[i]`（per-item），UI 可提供"整单同步"按钮但数据库以 items[i] 为准。详见 docs/03 3.6.1。
- **docs 全量更新**：
  - `docs/04-api-spec.md` 4.2.1 重整 auth 为 3 个 action（adminLogin / teacherLoginByPassword / teacherLoginByOpenid，含完整入参出参错误码副作用）；4.2.3 borrow 9 个 action 完整契约（含事务步骤、错误码、状态变迁）；新增 4.6 双身份鉴权约定（4.6.1 鉴权双轨伪代码 / 4.6.2 安全约束 / 4.6.3 公共错误码 2001/2002/2003/2004 / 4.6.4 教师端 wx.cloud.callFunction 调用样板 / 4.6.5 管理端样板）。
  - `docs/03-data-model.md` 3.3 ams_teacher 字段名 `password_hash` → `password`（一期明文）+ 加 5 条种子数据说明（`seed_t001..t005`，密码 `123456`，部门 `软件学院`）；3.5 ams_asset_log 加「借用日志复用本表，op_type=BORROW/RETURN，related_id=ams_borrow_request._id」决策；3.6 申请头部去掉 purpose / expected_return_date；3.6.1 新增 items[] 字段表（per-item quantity / expected_return_date / usage）。
  - `docs/07-workflows.md` 7.5 拆 5 个子节（教师提交 / 教师撤回 / 管理员审批通过/拒绝 / 归还 / 状态机一览），每节标注鉴权与日志路径。
- **auth 云函数扩增**（已 `tcb fn deploy auth`）：`package.json` 加 `@cloudbase/node-sdk` 依赖；新增 `utils/cloudbase.js` / `utils/teacher-seed.js`（首次调用 `teacherLoginByPassword` 且 `ams_teacher` 为空时用 `seed_t001..seed_t005` 固定 `_id` + `doc().set()` 幂等注入 5 条测试教师）/ `actions/teacherLoginByPassword.js`（账密 + 自动绑 openid，零环境变量）/ `actions/teacherLoginByOpenid.js`（openid 免密查 ams_teacher，未绑定返 2003）；`adminLogin.js` 错误码 2003 → 2001 与 docs/04 4.6.3 对齐。
- **borrow 云函数全新落地**（已 `tcb fn deploy borrow`，17 个 .js）：骨架 `index.js` + utils（`credentials/cloudbase/response/identity/serial/log/validate`）+ 9 个 action：写操作（`submit/approve/reject/return/cancel`）全部用 `db.runTransaction` 事务化（更新 `ams_borrow_request` + `ams_asset.business_status` + `ams_asset.current_borrow_id` + 写 `ams_asset_log` 原子化）；`submit` 入参对齐 per-item 设计 + 入参 12 项 smoke 测试全过；`serial.js` 生成 `OU-YYYYMMDD-HHMMSS-XXX`（依赖 `ams_seq.borrow_serial:YYYYMMDD`）；`identity.js` 实现双身份鉴权（admin token / 教师 OPENID 反查 ams_teacher）；读操作 `listMine` / `adminList`（关键字 + 日期范围 + 服务端分页）/ `detail`（双身份）/ `summary`（应用层 7 天分桶，避开 aggregate 跨方言）。
- **cloudbaserc.json 登记 borrow**：auth 改 `installDependency=true`（因装了 SDK 依赖），新增 borrow 函数（256MB / 20s / Node 18）。
- **管理端 borrow 模块前端接入**：
  - `src/modules/borrow/types.ts` 与 `cloudfunctions/borrow` 严格对齐（`BorrowRequest` / `BorrowItem` per-item / `AdminListInput` 等）。
  - `src/modules/borrow/api.ts` 封装 6 个管理端 API（`adminListBorrows` / `getBorrowDetail` / `approveBorrow` / `rejectBorrow` / `returnBorrow` / `getBorrowSummary`）。
  - `BorrowList.vue` 重写：6 个状态标签页（全部 / PENDING / APPROVED / RETURNED / REJECTED / CANCELLED）+ 关键字 + 起止日期 + 服务端分页；表格列含教师姓名/电话、申请时间、资产数、用途摘要（去重）、最早拟归还、状态、详情链接。
  - `BorrowDetail.vue` 重写：头部信息卡（申请人 / 状态 / 审批信息 / 拒绝原因）+ per-item 资产明细表（含 quantity / usage / expected_return_date）+ 教师签名预览（`app.getTempFileURL` 解析 fileID）+ 凭证 payload 展示（base64 编码） + 三个操作按钮（审批通过 / 拒绝弹窗含原因 200 字 / 代教师归还）+ 状态机闸门（按钮按 status 显示）。
  - `DashboardPage.vue` 接入 `borrow.summary`：第 5 张卡「待审批」启用并跳借用列表；底部新增「出入仓曲线（最近 7 天）」双色条状图（借出蓝 / 归还绿，按周内最大值归一化）；与 `asset.summary` 并行调用，单边失败不影响另一边。
  - 副标题更新："数据来自 asset.summary + borrow.summary"。
- **自检全绿**：`node --check` 22/22（17 borrow + 5 auth）、`validate.js` smoke 12/12（覆盖入参缺失 / 数量 / 日期格式 / 过期日期 / 用途空 / 重复 asset_id 等边界）、`pnpm typecheck` 通过。
- **三个云函数已重新部署到 `ams-d8grnwwy6d8da557f`**：`tcb fn deploy auth asset borrow` 全部成功（exit code 0）。

### 2026-05-11

- 项目模板就位：`admin/`（CloudBase Vue3 模板）、`app/`（unibest + wot-ui v2）。
- `data/` 业务原始资料齐备：资产字段总表、借用登记表。
- 完成 12 项关键需求决策（认证、数据模型、范围、审批、签名、编号、看板、借物车、审计、模块拆分、读写路径、初始化）。
- 产出 `docs/` 需求文档 12 份（README + 01–11 章节），覆盖架构、数据模型、API 契约、双端功能、流程、UI、开发约定、部署、开放问题。
- 建立根级 agent 入口：`AGENTS.md`、`.windsurf/rules/project.md`、`.codex/config.toml`、根 `README.md`，统一指向 `docs/` 与 `.memory/`。
- 管理端骨架完成：DaisyUI `ams` 主题（主色 `#0096C2`、辅色 `#006B8F`）；9 个模块目录（auth / dashboard / asset / borrow / large-asset / notice / user / report / share），每模块 `routes.ts` + 占位页面；全局布局 `AppLayout` / `AppSidebar` / `AppTopbar`；Pinia auth store；hash 路由 + 守卫（未登录跳 `/login`、`/admins` 仅超管）；`@` 路径别名；`pnpm typecheck` + `pnpm build` 双绿。
- 前端工具就绪：`utils/cloudbase.ts`（SDK 单例 + `db()`）、`utils/http.ts`（`callFunction` 统一封装，自动注入 token，非 0 code 抛 `CloudFunctionError`）、`utils/token.ts`（localStorage 存取 + `AdminRole` 小写枚举对齐 docs/03 3.2）、`utils/status.ts`（资产 / 借用状态 label + badge 映射）、`utils/format.ts`（金额 / 日期）。
- 云函数 M1 鉴权骨架（**零环境变量**）：`cloudfunctions/auth` 只剩 `adminLogin` 一个 action，账号 / 密码完全由 `cloudfunctions/auth/utils/credentials.js` 提供（默认 `admin` / `admin123`），不读任何 env。登录成功返回 `token = ADMIN_PASSWORD` + 固定 profile（`_id=env-admin`、`role=super_admin`）。**不查数据库 / 不哈希 / 不签 JWT / 不读 env / 无外部依赖**。已删除：`cloudfunctions/init/` 整个目录、`cloudfunctions/auth/utils/{password,jwt,authenticate}.js`、`cloudfunctions/auth/actions/{getProfile,changePassword}.js`，模板 `cloudfunctions/hello/` 也已清理。`cloudbaserc.json` 修正 `functionRoot` 到 `./cloudfunctions`，仅登记 `auth`（`installDependency: false`）。前端 `src/modules/auth/api.ts` 同步只保留 `adminLogin`。`pnpm typecheck` + `node --check` 双绿。
- 云函数 M1 资产模块落地（**零环境变量**）：`cloudfunctions/asset` 含 9 个 action（1 个看板聚合 + 8 个主体）（写：`create` / `update` / `changeStatus` / `changeLocation` / `changeUser`；读：`getDetail` / `getTimeline` / `list` / `summary`）。**所有 action 都需要有效 token**（`event.auth.token === ADMIN_PASSWORD`，与 auth 云函数共享同源 `utils/credentials.js`）。集合 `ams_asset` / `ams_asset_log` / `ams_seq` 需首次部署新环境时在控制台手动建好（运行时不再自动建集合，避免冷启动额外开销，详见下方独立条目与 docs/10-init-and-deploy.md 10.6）。入库自动生成 `asset_no = YQJJ + 4位年 + 6位顺序号`（依赖 `ams_seq`原子 +1）；`is_large` 按 `LARGE_ASSET_THRESHOLD` 环境变量（默认 50000）自动打标。所有写操作写入 `ams_asset_log`（CREATE / UPDATE / STATUS_CHANGE / LOCATION_CHANGE / USER_CHANGE / SCRAP），`changes` 数组由通用 `diffFields` 生成。`changeStatus` 拒绝管理员直接设置 `LENT` / `PENDING`（留给借还流程）。`update` 的字段白名单与 `docs/03` 3.4.2 对齐，过滤了 `business_status` / `asset_no` / `current_borrow_id` / `is_large` 等系统字段。`list` 支持 `business_status` / `dept_code` / `is_large` / `category_national` / `location_code` 筛选与 `name` 正则模糊 + 多字段排序 + 分页（上限 200）。`cloudbaserc.json` 已登记 `asset`（`installDependency: true`）。全 15 个 `.js` 过 `node --check`，`utils/validate.js` 本地 smoke 测试通过（白名单过滤 / 数字转型 / 1002 拒绝非法值 / `pageSize` 装断到 200）。

- 前端资产模块完成：`src/modules/asset/types.ts`（Asset / AssetLog / Filter / Sort / List 与 Create/Update Input 等 TS 完整类型，与 `cloudfunctions/asset/utils/validate.js` 白名单同步）；`src/modules/asset/api.ts` 封装 8 个云函数调用。三个页面全部重写：`AssetList.vue`（表格 + 关键字 / 部门 / 状态 / 大型筛选 + 服务端分页 + 状态标签）、`AssetCreate.vue`（入库表单，5 个分组 × ~30 字段 + 必填校验 + 提交后跳详情）、`AssetDetail.vue`（详细字段 5 分组 tab + Timeline tab，后者含 op_type 颜色点 + before/after diff 高亮，按需加载）。`pnpm typecheck` + `pnpm build` 双绿。
- Dashboard 看板接入实数据：后端新增 `cloudfunctions/asset/actions/summary.js`，一次 CloudBase 聚合查询返 `{ total, total_value, large_count, large_value, by_status: {6 status × count+value}, by_dept: top 10 }`（用 `db.command.aggregate.sum` 分别按 `business_status` / `is_large=true` / `dept_name` 分组，空库提前返零），同步注册到 `index.js` 并更新模块文档；前端 `src/modules/asset/api.ts` 加 `getAssetSummary()`，`types.ts` 加 `AssetSummary` / `AssetStatusBucket` / `AssetDeptBucket`。`DashboardPage.vue` 重写：5 张指标卡（资产总数 / 总值 / 使用中 / 出借中 实数 + 「待审批」默认 `--` 并标注「借用模块上线后启用」）+ 「按状态分布」条状图（状态色调与 StatusTag 一致 + 占比 + 金额）+ 「部门资产 Top 10」条状图 + 刷新按钮 + loading/error/empty 三态 + 未上线模块虚线占位（通知 / 出入仓曲线）。`AssetList.vue` 增接 URL query 预填筛选（`?status=IN_USE` / `?large=true` / `?keyword=` / `?dept_code=`），看板状态行点击可直接跳到带筛选的资产列表。未引入图表库（纯 CSS + DaisyUI 进度条表达，依赖零增量）。`pnpm typecheck` + `node --check` 双绿。

- 移除 asset 云函数运行时自动建表：删掉 `cloudfunctions/asset/utils/db.js` 里的 `ensureCollections` / `_ensureOnce` / `_ensuredPromise` / `REQUIRED_COLLECTIONS`（保留 `app` / `db` / `_` / `COLLECTIONS`），主入口 `cloudfunctions/asset/index.js` 不再 `require` / `await` 它；同步更新模块顶部注释 + `docs/10-init-and-deploy.md` 10.2 / 10.2.3 / 10.6 / 10.8 检查清单，明确「首次部署新环境请去 CloudBase 控制台手动建好 `ams_asset` / `ams_asset_log` / `ams_seq`」。`node --check` 双绿。**重新部署 `tcb fn deploy asset` 即生效**，部署后每次调用都不再触发集合创建逻辑。

- 前端资产变更弹窗 4 件套完成：`src/modules/asset/components/` 下新增 `EditAssetModal.vue`（27 字段轻量编辑，只提交「与原值不同」的字段以减少噪音日志）、`ChangeStatusModal.vue`（状态变更，只允许选 IDLE / IN_USE / MAINTAIN / SCRAPPED，LENT / PENDING 由借还流程驱动）、`ChangeLocationModal.vue`（位置变更，预填当前值）、`ChangeUserModal.vue`（使用人 + 部门变更）。`AssetDetail.vue` 头部新增 4 个操作按钮区，`v-if` 控制弹窗挂载，成功后通过 `onMutationSuccess` 统一关弹窗 + 重拉详情 + 失效 Timeline 缓存（若停留在 Timeline tab 立即重载）。所有变更都会自动写入 `ams_asset_log` 并在 Timeline 中可见。`pnpm typecheck` 通过。

## 进行中

- **教师端通知与个人信息联调待跑**：本地代码与语法检查已完成，仍需重新部署 `auth` / `notice` 云函数后，在微信开发者工具中验证首页公告、审批提醒和个人信息保存。
- **教师端微信开发者工具联调待跑**：代码侧已完成登录 + 借用 + 凭证 + 我的申请 + 归还主链路，尚需用户按要求在微信开发者工具中实测 `pnpm dev:mp` 产物与真机/模拟器交互。
- **管理端联调待跑**：用户尚未实测 `pnpm dev` 进 `/borrows` 与 Dashboard。需要联调路径：
  1. 教师端 submit 一笔申请 → 管理端 `/borrows` 看到 PENDING → 详情页点「审批通过」→ 资产 Timeline 出 BORROW 日志 → Dashboard「待审批 / 出入仓曲线」数字变化。
  2. 教师端调 cancel / return；管理端代归还。
  3. 资产 4 个变更弹窗（编辑 / 状态 / 位置 / 使用人）联调（M2 阶段就在 backlog）。

## 待办

### M1 · 后端骨架

- [x] **运维**：`tcb fn deploy auth asset borrow` 全部上线（2026-05-12）
- [ ] **运维**：CloudBase 控制台手动建集合 `ams_teacher` / `ams_borrow_request`（首次教师登录 / 借用提交前必须建好；asset / asset_log / seq / dict 已有）
- [ ] **运维**：当查询压力变大后补索引：
  - `ams_borrow_request.serial_no` 唯一、`teacher_id+created_at`、`status`
  - `ams_teacher.username` 唯一、`openid` 唯一（允许 null）
  - `ams_asset.asset_no` 唯一 / `business_status` / `dept_code` / `created_at`、`ams_asset_log.asset_id+created_at`
- [ ] 产品上线前同步改 `cloudfunctions/{auth,asset,borrow}/utils/credentials.js` 默认 `admin/admin123` 为产品账密，3 个云函数全部重新部署
- [ ] 上线前把 `ams_teacher.password` 字段改为 `password_hash` + bcrypt（一期明文；docs/03 3.3 已标注）
- [ ] 接入多管理员时引入 DB 查询 + JWT（恢复 `cloudfunctions/init/` 可从 git 历史恢复）
- [ ] （可选）创建 `shared/types/` 与 `shared/enums.ts`，三端共享字段类型与枚举

### M2 · 管理端 MVP

- [x] DaisyUI 主题扩展 `primary=#0096C2` / `primary-focus=#006B8F`
- [x] `admin/src/modules/auth/` 登录页 + 路由守卫 + token 存取（待联调真实云函数）
- [x] `admin/src/modules/asset/api.ts`：封装 8 个 `asset.*` 云函数调用
- [x] `admin/src/modules/asset/pages/AssetList.vue`：表格 + 筛选 + 服务端分页
- [x] `admin/src/modules/asset/pages/AssetCreate.vue`：入库表单（5 分组），提交跳详情
- [x] `admin/src/modules/asset/pages/AssetDetail.vue`：详情字段 tab + Timeline tab
- [x] `admin/src/modules/asset/`：资产图片上传到云存储 + 列表缩略图 + 详情图库 + 编辑图片（2026-05-20）
- [x] `admin/src/modules/asset/pages/AssetDetail.vue` 增补：编辑 / 状态变更 / 位置变更 / 使用人变更 4 个 modal（接入 `update` / `changeStatus` / `changeLocation` / `changeUser`）
- [x] `admin/src/modules/dashboard/` 看板首期实数据接入（3 枚有效指标卡 + 总值卡 + 待审批占位 + 按状态分布 + 部门 Top 10）——只调一次 `asset.summary` 拿全部数字
- [x] Dashboard 接入 `borrow.summary`：待审批卡启用、7 天出入仓曲线（2026-05-12）
- [ ] 通知公告卡（依赖 notice 云函数上线）
- [x] `admin/src/modules/borrow/`：types / api / BorrowList / BorrowDetail（含审批 / 拒绝 / 代归还 / 签名预览 / 凭证 payload）（2026-05-12）
- [x] `admin/src/modules/user/`：教师用户管理（列表筛选 / 新增 / 编辑 / 重置密码 / 解绑微信 / 删除保护）+ `user` 云函数上线（2026-05-14）

### M3 · 教师端 MVP（**当前阶段**）

> 开发指引详见 `.memory/HANDOFF_APP.md`。云函数契约固定在 `docs/04-api-spec.md` 4.2.1 + 4.2.3 + 4.6。

- [x] `app/manifest.config.ts` 增加 `mp-weixin.cloud = true`，`src/main.ts` 内初始化 CloudBase（2026-05-14）
- [x] `app/src/api/borrow.ts`、`app/src/api/auth.ts`：用 `wx.cloud.callFunction` 替换现有 `http.post` 模板（2026-05-14）
- [x] `app/src/pages/login/` 账密登录（首次自动绑 openid）+ 启动时 openid 免密尝试（2026-05-14）
- [x] `app/src/pages/index/` 首页（教师看板 / 常用功能入口）（2026-05-14）
- [x] `app/src/pages/borrow/` 借物车 + 申请表（per-item quantity / expected_return_date / usage）（2026-05-14）
- [x] canvas 手写签名组件 + 上传到云存储 `signature/{teacher_id}/{serial_no}.png`（2026-05-14）
- [x] `app/src/pages/borrow/voucher` 凭证页（解析 `voucher_qr_payload`）（2026-05-14）
- [x] `app/src/pages/me/` 我的申请列表 + 归还入口 + 撤回（2026-05-14）
- [x] wot-ui v2 主题色覆盖 `--wot-color-primary: #0096C2`（2026-05-14）

### M4 · 闭环

- [x] `cloudfunctions/borrow/` 9 个 action 全部上线（2026-05-12）
- [x] 管理端 `borrow` 模块审批列表与详情（2026-05-12）
- [ ] 大型资产页 `large-asset`
- [ ] 通知公告 `notice` 管理与教师端展示

### M5 · 联调

- [ ] 端到端烟雾测试：入库 → 借用 → 审批 → 凭证 → 归还
- [ ] 管理端部署到 CloudBase 静态托管
- [ ] 小程序提审

---

## 历史会话留言

> 简短记录跨会话需要传递的口头约定 / 临时决策。

- 2026-05-11：教师端首登采用账密 + 微信组件获取手机号 → 绑定 openid → 后续免密；签名仅做 canvas + HTML 凭证（不出 PDF）。
- 2026-05-11：第一期不实现 AI 报表 / 闲置共享 / Excel 批量导入 / 扫码，但保留路由占位。
