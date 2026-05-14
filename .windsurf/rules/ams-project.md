---
trigger: always_on
description: AMS 项目级规则（教师端工作区）。等价于根仓库 .windsurf/rules/project.md，对所有 Windsurf 会话生效。
---

# AMS 项目规则（教师端）

> 与根仓库 `/AGENTS.md` 同源；如有冲突以本文件为准（教师端工作区专用）。
> **完整版**：`app/AMS.md`。

## 项目身份

- AMS = 资产管理系统（学校资产入库 / 借还 / 看板）。
- 本工作区 = 教师端微信小程序（unibest 4.4.0 + uniapp + Vue3 + TS + Vite + UnoCSS + **wot-ui v2** + z-paging）。
- 兄弟端：管理员 Web 端在 `../admin/`（Vue3 + DaisyUI + CloudBase JS SDK）。
- 主题色：主 `#0096C2`，辅 `#006B8F`。**严禁 emoji**。
- 集合命名前缀：`ams_xxx`。

## 必读顺序（每次新会话过一遍）

1. `AMS.md`（本工作区精简手册）
2. `docs/README.md` → `docs/01-overview.md` → `docs/02-architecture.md` → `docs/03-data-model.md` → `docs/04-api-spec.md`
3. `docs/06-teacher-features.md`（**教师端功能锚点**）
4. `docs/07-workflows.md`（借用 / 归还流程）
5. `docs/08-ui-guidelines.md`、`docs/09-dev-conventions.md`
6. `.memory/PROGRESS.md`（当前进度）
7. `.memory/CHANGELOG.md`（重要历史变更）

> `docs/`、`.memory/`、`data/` 三个目录通过 junction 挂载，写入它们即写入根仓库。

## 框架附加规则（按需读）

- **wot-ui v2 组件**：先查 `wot-ui/llms.txt`（速查），找不到再读 `wot-ui/llms-full.txt`。
- **unibest 约定式路由**：`src/pages/<p>/index.vue` 主页 + 同目录子文件即子路由。
- **CloudBase 小程序端规则**（在父仓库 `../admin/rules/`）：
  - `auth-wechat/`、`no-sql-wx-mp-sdk/`、`miniprogram-development/`、`cloud-functions/`、`ui-design/`

## 工程铁律

1. **字段事实唯一源** = `docs/03-data-model.md`。改字段先改文档。
2. **三端字段一致**：管理端、教师端、云函数同名字段必须一致。
3. **教师端默认走云函数**；只读集合可考虑 SDK 直连（按 `docs/04-api-spec.md` 4.4 白名单）。
4. **业务状态枚举固定**：`IDLE` / `IN_USE` / `LENT` / `PENDING` / `MAINTAIN` / `SCRAPPED`。
5. **借用申请状态**：`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` / `RETURNED`。
6. **登录流程（已锁）**：账号密码首登 → `wx.login` 取 code → `getPhoneNumber` 组件取手机号 → 后端绑定 openid → 后续免密。
7. **借物车（已锁）**：上下分屏 + 点击加入 + 长按拖拽增强（`movable-area` / `movable-view`）。
8. **签名（已锁）**：canvas 手写 → PNG → 云存储 → 凭证为小程序 HTML 页面。
9. **页面边界即 agent 边界**：`src/pages/<p>/` 内文件由该页面独占编辑。
10. **TypeScript 严格**：禁止 `any` / `@ts-ignore` / 空 `try/catch` / 删失败用例。
11. **UI 不含 emoji**；wot-ui 主题色通过 `--wot-color-primary: #0096C2` 在 `uni.scss` 全局覆盖。
12. **完成前自验证**：`pnpm dev:mp` + 微信开发者工具跑通；`tsc --noEmit` + lint。

## 用户表达"提交"意图时的强制动作

当用户说出 **"提交 / commit / 推送 / push / 提到 GitHub / 提一下代码"**：

1. 更新 `.memory/PROGRESS.md`（已完成段追加，未完成移待办）。
2. 评估是否触发 `.memory/CHANGELOG.md`（数据库 / 云函数 / 路由 / 流程 / 依赖 / 部署任一变更即追加）。
3. `.memory/` 下的更新纳入本次 commit。
4. Commit message 用 Conventional Commits（`commitlint` 已在仓库配置，需符合）。

> 用户只说"保存"或"运行"不触发；用户说"不更新文档"则跳过。

## 禁止事项

- 业务代码不放仓库根（归 `app/src/pages/` 或 `app/src/components/` 等）。
- `.env` / 代码不存秘钥；秘钥走 CloudBase 控制台环境变量。
- 用 `any` / 空 catch / 删失败用例换"通过"。
- agent 主动执行 `git commit` / `git push`。
- 删除 unibest / wot-ui 模板原有能力。

## 协作建议

- 写完阶段性工作即使不提交，也更新 `.memory/PROGRESS.md`，便于跨会话续作。
- 遇歧义先查 `docs/11-open-questions.md`；不清楚就停下问用户，不要猜字段或规则。
