# AMS 项目上下文（教师端）

> **本文件是 AMS 项目在 `app/` 工作区的精简入口**。
> 当你单独打开 `app/` 文件夹时，**先读本文，再读 `AGENTS.md` / `.windsurf/rules/`**。
> 完整规则与文档以根仓库 `d:\Code\AMS\` 为准；本目录通过 junction 已挂载 `docs/`、`.memory/`、`data/`。

## 项目身份

- **AMS** = 资产管理系统（学校资产入库 / 借还 / 看板）。
- 本工作区 (`app/`) = **教师端微信小程序**，unibest 4.4.0 + uniapp + Vue 3 + TypeScript + Vite + UnoCSS + **wot-ui v2** + z-paging。
- 兄弟工作区 (`../admin/`) = 管理员 Web 端（Vue3 + DaisyUI + CloudBase JS SDK），三端共用同一份 CloudBase 数据库与云函数。
- 主题色：主 `#0096C2`（BJUT 蓝），辅 `#006B8F`。**禁止 emoji**（图标用 wot-ui 内置或 iconfont）。

## 必读文档（任何动作前先读）

> 通过 junction 挂载，路径直接以 `app/` 为基准。

1. `docs/README.md` — 文档导航
2. `docs/01-overview.md` — 项目目标、范围
3. `docs/02-architecture.md` — 三端架构、读写路径（**读 SDK / 写云函数**）
4. `docs/03-data-model.md` — 数据库字段事实唯一源
5. `docs/04-api-spec.md` — 云函数契约 + SDK 直连白名单
6. `docs/06-teacher-features.md` — **教师端功能拆解（本工作区主战场）**
7. `docs/07-workflows.md` — 业务流程与状态机（借用全流程）
8. `docs/08-ui-guidelines.md` — UI 规范 / 主题色 / 状态标签色
9. `docs/09-dev-conventions.md` — 命名、目录、协作守则
10. `.memory/PROGRESS.md` — 当前进度
11. `.memory/CHANGELOG.md` — 重要变更

## 工程铁律（与根仓库 `AGENTS.md` 同源）

1. **字段事实唯一源** = `docs/03-data-model.md`。**改字段先改文档再改代码**。
2. **三端字段一致**：管理端 / 教师端 / 云函数同名字段必须一致；教师端不得擅自给字段改名或新增枚举值。
3. **写操作走云函数，读操作走 SDK**：教师端因小程序限制，建议默认全部走云函数；只读集合可考虑直连。详见 `docs/02-architecture.md` 2.2 与 `docs/04-api-spec.md` 4.4。
4. **集合命名前缀** `ams_xxx`。
5. **业务状态枚举** `IDLE` / `IN_USE` / `LENT` / `PENDING` / `MAINTAIN` / `SCRAPPED`。
6. **借用申请状态** `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` / `RETURNED`。
7. **认证流程（已锁）**：教师首登账号密码 → `wx.login` 取 code → 微信 `getPhoneNumber` 组件取手机号 → 后端绑定 openid 写入 `ams_teacher` → 后续免密登录。
8. **借物车交互（已锁）**：上下分屏、点击加入为主、长按拖拽为加强（详见 `docs/06-teacher-features.md` 6.4）。
9. **签名（已锁）**：canvas 手写 → 转 PNG → 上传云存储 `signature/{teacher_id}/{serial_no}.png`，凭证为小程序 HTML 页面。
10. **页面边界即 agent 边界**：`src/pages/<page>/` 内文件由该页面独占编辑；详见 `docs/02-architecture.md` 2.3 与 `docs/09-dev-conventions.md`。
11. **TypeScript 严格**：禁止 `any` / `as any` / `@ts-ignore` / `@ts-nocheck` / 空 `try/catch` / 删失败用例换"通过"。
12. **UI 不含 emoji**；wot-ui v2 主题色通过 `--wot-color-primary: #0096C2` 在 `uni.scss` 全局覆盖。
13. **完成前自验证**：`pnpm dev:mp` + 微信开发者工具跑通；`tsc --noEmit` / lint 通过。

## 文件来源说明

`app/` 下这些文件夹通过 Windows 目录联接（junction）挂载自父仓库：

| 路径 | 真实位置 | 用途 |
|------|----------|------|
| `app/docs/` | `d:\Code\AMS\docs\` | 项目需求与设计文档 |
| `app/.memory/` | `d:\Code\AMS\.memory\` | 进度与变更日志 |
| `app/data/` | `d:\Code\AMS\data\` | 业务原始资料（资产字段总表、借用登记表） |

**写入这些路径相当于写入根仓库**，请直接编辑（无需复制粘贴）。

## 框架与组件库参考

- **wot-ui v2 文档（重要）**：`wot-ui/llms.txt`（速查 6KB）、`wot-ui/llms-full.txt`（完整 ~570KB）。生成 UI 前先查组件 API。
- **unibest 约定式路由**：`src/pages/<page>/index.vue` 自动注册路由；子路由 `src/pages/<page>/foo.vue` → `/pages/<page>/foo`。
- **请求封装**：见 `src/http/`；按业务领域拆 `src/api/asset.ts` / `src/api/borrow.ts` 等。
- **状态管理**：pinia（`src/store/`），全局态如 user、cart。

## CloudBase 小程序端规则

教师端调用 CloudBase 时，相关 CloudBase AI ToolKit 规则集中在父仓库 `../admin/rules/` 下（教师端如需要可阅读，但无法在单独打开 `app/` 时直接索引）：

- `rules/auth-wechat/`：微信小程序鉴权（`wx.login` + 自定义登录）
- `rules/no-sql-wx-mp-sdk/`：小程序端 NoSQL SDK
- `rules/miniprogram-development/`：小程序平台规则
- `rules/cloud-functions/`：云函数调用约定
- `rules/ui-design/`：UI 设计规范
- `rules/ai-model-wechat/`：（如未来接 AI）

> 如需访问，可临时切到根工作区 `d:\Code\AMS\` 或通过 CloudBase MCP 服务获取（详见 `.codex/config.toml`）。

## 用户准备 git 提交时的强制动作

当用户表达 **"提交 / commit / 推送 / push / 提到 GitHub / 提一下代码"** 等意图时，**生成 commit 之前**必须：

1. 更新 `.memory/PROGRESS.md`：本会话已完成的工作追加到"已完成"段。
2. 评估改动是否触发 `.memory/CHANGELOG.md` 追加（任一即触发）：
   - 数据库字段 / 集合 / 枚举增删改
   - 云函数接口变化
   - 路由 / 页面增删
   - 业务流程或状态机变更
   - 重要依赖 / 配置变更
3. 把 `.memory/` 下的更新一并纳入本次 commit。
4. Commit message 用 Conventional Commits（`feat(borrow): xxx` / `fix(login): xxx` / `docs: xxx` / `chore(memory): update progress`）。

> Agent 不主动执行 `git commit` / `git push`；只准备好待提交内容。
