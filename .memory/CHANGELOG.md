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
