# AMS 重要变更记录

> **作用**：记录会影响其他模块或后续 agent 的关键变更。**不是**普通 commit log。
> **触发追加条件**（任一即写）：
> - 数据库字段 / 集合 / 枚举增删改
> - 云函数接口（新增 action、入参出参变化）
> - 路由 / 页面增删
> - 业务流程或状态机变更
> - 重要依赖升级 / 配置变更
> - 部署 / 环境变量变更
>
> **格式**：按日期倒序；每条注明类别、影响面、动作建议。

---

## 2026-05-14

### 管理端教师用户管理上线

- **类别**：云函数接口 / 管理端页面 / 配置
- **变更**：新增 `user` 云函数，提供 `listTeachers` / `createTeacher` / `updateTeacher` / `resetTeacherPassword` / `unbindTeacherOpenid` / `deleteTeacher`，用于超管维护 `ams_teacher`；`deleteTeacher` 会阻止删除已有借用记录的教师。
- **影响面**：管理端 `/admins` 页面、`src/modules/user/*`、`cloudbaserc.json`、`docs/04-api-spec.md`、`docs/05-admin-features.md`、`docs/10-init-and-deploy.md`。
- **动作建议**：教师密码仍为一期明文字段 `password`；上线前需按既有待办迁移到 `password_hash` + bcrypt，并补 `ams_teacher.username` / `openid` 索引。

### 教师端可借资产增加封面字段

- **类别**：云函数接口 / UI 展示
- **变更**：`borrow.searchAssets` 返回项新增 `cover_image_file_id`，取 `ams_asset.image_urls[0]`，用于教师端资产展示窗口优先渲染资产图片。
- **影响面**：教师端借用资产页、`src/types/asset.ts`、`src/utils/cloud.ts`。
- **动作建议**：前端仅使用该单一封面字段，不直接暴露完整图片数组；无封面时使用本地中性占位图形。

### 教师端微信上下文获取修复

- **类别**：云函数依赖 / 教师端鉴权
- **变更**：`auth` 与 `borrow` 云函数新增 `wx-server-sdk` 依赖，用 `wx-server-sdk.getWXContext()` 获取小程序调用注入的 `OPENID`；数据库访问继续沿用 `@cloudbase/node-sdk`。
- **影响面**：教师端账密登录绑定 openid、openid 免密登录、`borrow.searchAssets`、提交 / 撤回 / 归还 / 我的申请等所有依赖教师 OPENID 的 action。
- **动作建议**：云函数已重新部署；小程序端需清缓存并重新编译，若未绑定教师账号，免密登录应返回 2003 并进入账密登录页。

### 教师端可借资产搜索路径锁定

- **类别**：云函数接口 / 教师端流程
- **变更**：教师端资产搜索采用方案 B：新增 `borrow.searchAssets` action，由 `borrow` 云函数复用教师 OPENID 鉴权，只返回 `business_status=IDLE` 的可借资产精简字段。
- **影响面**：教师端借物车资产搜索、小程序 `src/api/asset.ts`、`cloudfunctions/borrow/index.js` 与 `actions/searchAssets.js`。
- **动作建议**：教师端不要调用管理员 `asset.list`，也不要直连 `ams_asset`；后续若启用 SDK 直连，需重新配置 CloudBase 安全规则并更新 `docs/04-api-spec.md` 4.4。

## 2026-05-11

### 项目初始化

- **类别**：项目结构
- **变更**：完成需求文档体系（`docs/00-11`）与根级 agent 入口（`AGENTS.md` / `.windsurf/rules/project.md` / `.codex/config.toml` / `README.md`），新增 `.memory/` 用于跨会话进度同步。
- **影响面**：所有后续开发活动。
- **动作建议**：所有 agent 在新会话开始前，必须先读 `AGENTS.md` 与 `.memory/PROGRESS.md`。

### 数据模型锁定

- **类别**：数据库 / 字段
- **变更**：确立 7 个集合的字段与索引方案，详见 `docs/03-data-model.md`：
  - `ams_admin`、`ams_teacher`、`ams_asset`、`ams_asset_log`、`ams_borrow_request`、`ams_notice`、`ams_dict`
  - 业务状态枚举锁定为 6 值：`IDLE` / `IN_USE` / `LENT` / `PENDING` / `MAINTAIN` / `SCRAPPED`
  - 借用申请状态枚举：`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` / `RETURNED`
- **影响面**：所有读写数据库的代码、安全规则、云函数。
- **动作建议**：建表与建索引按 `docs/10-init-and-deploy.md` 第 10.6 节执行。

### API 契约锁定

- **类别**：云函数接口
- **变更**：定义 7 个云函数（`auth` / `asset` / `borrow` / `dashboard` / `notice` / `init` / 预留 `report`、`share`），统一 `{ action, data }` 入参与 `{ code, message, data }` 返回结构，详见 `docs/04-api-spec.md`。
- **影响面**：前后端联调；前端 api 封装。
- **动作建议**：实现云函数时严格遵守 action 名称与角色权限矩阵；修改任何 action 入参出参须先改本 `04-api-spec.md`。

### 读写路径策略

- **类别**：架构
- **变更**：列表与看板等读操作用 CloudBase JS SDK 直连数据库；入库 / 审批 / 变动 / 借还等写操作走云函数。SDK 直连白名单见 `docs/04-api-spec.md` 4.4。
- **影响面**：前端调用方式；CloudBase 安全规则配置。

### 认证体系

- **类别**：业务流程
- **变更**：管理端账号密码登录（`ams_admin`）；教师端首登账密 → 绑定 openid → 后续免密（`ams_teacher`）。
- **影响面**：登录页面、`auth` 云函数、教师 `getPhoneNumber` 微信组件接入。

### 主题与禁忌

- **类别**：UI / 配置
- **变更**：主色 `#0096C2`、辅 `#006B8F`；全局禁用 emoji；管理端 DaisyUI 主题需扩展 `primary` / `primary-focus`，教师端 wot-ui v2 通过 `--wot-color-primary` 覆盖。
- **影响面**：所有 UI 代码、组件库主题配置。
