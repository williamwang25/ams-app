# AMS 教师端 · Agent 总纲

> **本文件适用于**：OpenAI Codex CLI、Cursor、Claude Code、Windsurf（通用 fallback）等读取 `AGENTS.md` 的 agent 工具。
> **Windsurf 用户**：另见 `.windsurf/rules/ams-project.md`，规则等价。
> **作用范围**：教师端微信小程序工作区（`app/`）。

> **AMS 项目上下文（必先读）**
>
> 本工作区是 AMS 资产管理系统的教师端微信小程序。在动手之前必须先读：
> 1. [`AMS.md`](./AMS.md)（本工作区精简手册：项目身份、必读文档、工程铁律）
> 2. `docs/README.md` → `docs/03-data-model.md` → `docs/04-api-spec.md` → `docs/06-teacher-features.md` → `docs/07-workflows.md`
> 3. `.memory/PROGRESS.md`（当前进度）
>
> `docs/` / `.memory/` / `data/` 通过 junction 挂载自父仓库，写入即写入根仓库单一事实源。
> 业务约定（字段、状态、读写路径）以 `docs/` 为准。
> 用户表达"提交"意图时，先更新 `.memory/PROGRESS.md` 和 `.memory/CHANGELOG.md` 再生成 commit（详见 `AMS.md`）。

## 项目身份

- **AMS** = 资产管理系统（学校资产入库 / 借还 / 看板）。
- 本工作区：**教师端微信小程序**。技术栈 `unibest 4.4.0 + uniapp + Vue 3 + TypeScript + Vite + UnoCSS + wot-ui v2 + z-paging`。
- 兄弟工作区：`../admin/`（管理员 Web 端，Vue3 + DaisyUI + CloudBase JS SDK）。
- 后端：腾讯云 CloudBase（云函数 + JSON 数据库 + 云存储）。环境 ID 在根仓库 `.env`。
- 主题色：主 `#0096C2`，辅 `#006B8F`。**禁止 emoji**。

## 必读文档

按顺序读：

1. [`AMS.md`](./AMS.md)
2. `docs/README.md`、`docs/01-overview.md`、`docs/02-architecture.md`
3. `docs/03-data-model.md` — **字段事实唯一源**
4. `docs/04-api-spec.md` — 云函数契约 + SDK 直连白名单
5. `docs/06-teacher-features.md` — 教师端功能拆解（**主战场**）
6. `docs/07-workflows.md` — 借用全流程与状态机
7. `docs/08-ui-guidelines.md` — 主题色与状态标签色
8. `docs/09-dev-conventions.md` — 命名、目录、协作守则
9. `.memory/PROGRESS.md`、`.memory/CHANGELOG.md`

## 工程铁律

1. **字段事实唯一源** = `docs/03-data-model.md`。改字段先改文档再改代码。
2. **三端字段一致**：管理端、教师端、云函数同名字段必须一致。
3. **写操作走云函数，读操作走 SDK**（教师端默认全走云函数；只读白名单见 `docs/04-api-spec.md` 4.4）。
4. **集合命名前缀** `ams_xxx`。
5. **业务状态枚举** `IDLE` / `IN_USE` / `LENT` / `PENDING` / `MAINTAIN` / `SCRAPPED` —— 不可随意新增。
6. **借用申请状态** `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` / `RETURNED`。
7. **登录流程（已锁）**：账号密码首登 → `wx.login` code → `getPhoneNumber` 组件 → 后端绑定 openid → 后续免密。
8. **借物车（已锁）**：上下分屏 + 点击加入 + 长按拖拽增强。
9. **签名（已锁）**：canvas 手写 → PNG → 云存储 → 凭证为小程序 HTML 页面。
10. **不破坏 unibest / wot-ui 模板能力**：约定式路由、自动 import、wot-ui resolver 等保持。
11. **TypeScript 严格**：禁止 `any` / `as any` / `@ts-ignore` / `@ts-nocheck` / 空 `try/catch`。
12. **UI 不含 emoji**：图标用 wot-ui 内置或 iconfont；主题色通过 `uni.scss` 中 `--wot-color-primary` 覆盖。
13. **完成前自验证**：`pnpm dev:mp` + 微信开发者工具跑通；`tsc --noEmit` + lint 通过。

## 框架与组件库速查

- **wot-ui v2**：先查 `wot-ui/llms.txt`（6KB 速查），不足再读 `wot-ui/llms-full.txt`（570KB 完整文档）。
- **unibest 约定式路由**：`src/pages/<page>/index.vue` 自动注册路由；子页面同目录加 `.vue` 文件即可。
- **请求封装**：参考 `src/http/`；按业务领域拆 `src/api/asset.ts` / `borrow.ts` / `auth.ts` 等。
- **状态管理**：pinia（`src/store/`）。
- **样式**：UnoCSS 原子化优先；wot-ui 组件直接用。

## 子目录附加规则（按需读）

- 写云函数（在父仓库 `../admin/cloudfunctions/` 或 `../cloudfunctions/`）：暂不在本工作区。
- 微信小程序鉴权细节：父仓库 `../admin/rules/auth-wechat/`、`../admin/rules/no-sql-wx-mp-sdk/`。
- UI 设计规范：父仓库 `../admin/rules/ui-design/`、本仓库 `docs/08-ui-guidelines.md`。

> 单独打开 `app/` 时无法直接索引父仓库的 CloudBase 规则；如需要可临时切到根工作区，或通过 CloudBase MCP 服务（见 `.codex/config.toml`）。

## 提交规范

- Conventional Commits：`feat(borrow): xxx` / `fix(login): xxx` / `docs: xxx` / `chore(memory): update progress`。
- 仓库已配置 commitlint（`.commitlintrc.cjs`），不符合规范的 message 会被 hook 拦截。
- 单次提交聚焦一个页面或功能；跨模块改动拆分。

## 用户准备 git 提交时的强制动作

当用户表达 **"提交 / commit / 推送 / push / 提到 GitHub / 提一下代码"** 等意图时，**生成 commit 之前**必须：

1. 更新 `.memory/PROGRESS.md`：本会话已完成的工作追加到"已完成"段；未完成事项移入"进行中"或"待办"。
2. 评估改动是否触发 `.memory/CHANGELOG.md` 追加（任一即触发）：
   - 数据库字段 / 集合 / 枚举增删改
   - 云函数接口变化
   - 路由 / 页面增删
   - 业务流程或状态机变更
   - 重要依赖 / 配置变更
3. 把 `.memory/` 下的更新一并纳入本次 commit。
4. Commit message 用 Conventional Commits 并体现文档同步。

> 用户只说"保存"或"运行"不触发；用户说"不更新文档"则跳过。

## 不要做的事

- 不要直接 `git commit` / `git push`，提交时机由用户决定。
- 不要在代码 / `.env` 里硬编码秘钥；秘钥通过 CloudBase 控制台环境变量传入。
- 不要改字段名 / 枚举值 / 状态机而不更新 `docs/`。
- 不要为了"通过编译"用 `any` / 空 catch / 删失败用例。
- 不要删除 unibest / wot-ui 模板原有 import / resolver / 路由约定。

## agent 协作快速指引

- **首次会话**：先读 `AMS.md` → `docs/06-teacher-features.md` → `.memory/PROGRESS.md`。
- **接手某页面**：再读对应 wot-ui 组件文档片段 + `docs/03-data-model.md` 相关字段。
- **写完一阶段**：更新 `.memory/PROGRESS.md`（即使不提交也建议）。
- **遇歧义**：参考 `docs/11-open-questions.md`；若仍不清，停下问用户，不要猜。
