# 12 GitHub 多人协作指南

> **作用**：规范多人、多 agent 并行开发的 Git 工作流、提交规范、云函数部署权限与文档同步守则。
> **读者**：所有参与 AMS 开发的人员与 agent。
> **编辑边界**：分支策略、commit 格式一旦确立不轻易修改；云函数部署权限变更需团队同步。

---

## 12.1 仓库克隆后的一次性初始化

> Windows 用户须以**管理员身份**打开 PowerShell（Junction 需要管理员权限）。

```bash
# 克隆仓库
git clone https://github.com/<org>/ams.git
cd ams

# Windows
.\scripts\setup-links.ps1

# macOS / Linux
bash scripts/setup-links.sh
```

脚本完成后，检查以下内容：

| 检查项 | 预期 |
|--------|------|
| `app/cloudfunctions/` | Junction（Windows）或软链接（Mac/Linux），指向 `admin/cloudfunctions/` |
| `.env` | 已从 `.env.example` 复制，**填入真实 CloudBase Env ID** |
| `admin/node_modules/` | 运行 `cd admin && pnpm install` |
| `app/node_modules/` | 运行 `cd app && pnpm install` |

---

## 12.2 分支策略

```
main          ← 生产就绪，仅通过 PR 合入；保护分支，禁止直接 push
  └── develop ← 集成分支，各功能开发完成后合入此处
        ├── feat/admin-<feature>    管理端功能
        ├── feat/app-<feature>      教师端功能
        ├── feat/cf-<funcname>      云函数（必须由有 tcb 权限的人合并）
        ├── fix/<scope>-<desc>      Bug 修复
        └── docs/<topic>            文档 / .memory 更新
```

**规则：**

1. **从 `develop` 切出分支，合回 `develop`**。`develop` → `main` 由负责人做阶段性合入。
2. **云函数分支（`feat/cf-*`）必须由持有 tcb 部署权限的人审批并合并**，合并后触发手动部署（见 12.5）。
3. **不允许在 `main` / `develop` 直接提交**；分支合入须 PR + 至少 1 人 review。
4. 分支命名全小写 `kebab-case`，示例：`feat/admin-asset-detail`、`fix/borrow-submit-validate`。

---

## 12.3 Commit 规范（Conventional Commits）

格式：

```
<type>(<scope>): <subject>

[可选 body]

[可选 footer：关联 issue / BREAKING CHANGE]
```

### type 枚举

| type | 使用场景 |
|------|----------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 仅文档变更（含 `docs/`、`AGENTS.md`、`README.md`） |
| `chore` | 构建 / 依赖 / 配置，不影响业务逻辑 |
| `refactor` | 重构（无新功能、无 Bug 修复） |
| `test` | 测试用例增删改 |
| `style` | 仅格式（空格、分号等，不影响逻辑） |
| `perf` | 性能优化 |

### scope 枚举（与模块对齐）

| scope | 含义 |
|-------|------|
| `admin` | 管理端整体 |
| `app` | 教师小程序整体 |
| `auth` | 认证模块（前端 + 云函数） |
| `asset` | 资产模块 |
| `borrow` | 借用模块 |
| `user` | 用户管理模块 |
| `dashboard` | 看板模块 |
| `cf` | 云函数（不属于单一业务模块时） |
| `docs` | 文档 |
| `memory` | `.memory/` 进度与变更日志 |
| `ci` | CI/CD 配置 |

### 示例

```bash
# 新增功能
feat(asset): 资产详情页增加 Timeline 展示

# Bug 修复
fix(borrow): submit 云函数缺少 quantity 校验

# 文档
docs(03-data-model): 新增 ams_asset_log borrow 字段说明

# 进度文档（多 agent 协作时，每次会话结束都提交一次）
chore(memory): 更新 PROGRESS 与 CHANGELOG

# 云函数部署后的记录提交
chore(cf): 部署 borrow 云函数 v1.3 至 ams-d8grnwwy6d8da557f
```

---

## 12.4 Pull Request 检查清单

每个 PR 在合入前须确认：

**代码层面**

- [ ] `tsc --noEmit`（或 `pnpm typecheck`）通过，零 `any` / `@ts-ignore`
- [ ] ESLint 通过（`pnpm lint`）
- [ ] 本地 `pnpm build` 通过（管理端 / 教师端各自验证）
- [ ] 云函数变更：`node --check cloudfunctions/<func>/**/*.js` 通过

**文档层面**

- [ ] 若改了字段 / 枚举：已同步 `docs/03-data-model.md`
- [ ] 若改了云函数 API：已同步 `docs/04-api-spec.md`
- [ ] 若新增路由 / 页面：已同步 `docs/05-admin-features.md` 或 `docs/06-teacher-features.md`
- [ ] 若涉及业务流程变更：已同步 `docs/07-workflows.md`
- [ ] `.memory/CHANGELOG.md` 已追加本次重要变更
- [ ] `.memory/PROGRESS.md` 已刷新当前状态

**三端一致性**

- [ ] 若改字段名：admin、app、cloudfunctions 三端均已同步

---

## 12.5 云函数部署与权限管理

### 背景

`admin/cloudfunctions/` 是**真实主目录**，`app/cloudfunctions/` 为 Junction/软链接。部署云函数需要腾讯云 CloudBase CLI（`tcb`）并完成身份认证。**`.env` 文件不提交 Git**，云函数部署者需本地自行配置。

### 本地部署（推荐人工触发，非 CI/CD）

```bash
# 1. 安装 tcb CLI（一次性）
npm install -g @cloudbase/cli

# 2. 登录（浏览器 OAuth，授权后本地缓存凭据）
tcb login

# 3. 切换到 admin 目录（cloudbaserc.json 在此）
cd admin

# 4. 部署单个云函数
tcb fn deploy asset
tcb fn deploy borrow
tcb fn deploy auth
tcb fn deploy user

# 5. 部署全部
tcb fn deploy
```

### 团队权限策略

| 角色 | 权限 |
|------|------|
| **Tech Lead（技术负责人）** | 持有 CloudBase 主账号，负责生产环境 `main` → 部署 |
| **核心开发者** | 腾讯云子账号，被授予 CloudBase 开发环境的云函数写权限，可在 `develop` 阶段部署测试 |
| **普通成员** | 只读；不持有云函数部署凭据；不参与云函数提交的 PR 合并 |

> **强烈建议**：在腾讯云控制台 -> 访问管理（CAM）中为每位核心开发者创建单独子账号，授予 `QcloudTCBFullAccess` 策略绑定到指定 CloudBase 环境，**不共享主账号密钥**。

### 为何不用 CI/CD 自动部署

- 腾讯云 TCB API Key 属于高权限密钥，即使通过 GitHub Secrets 管理，一旦泄漏风险极高。
- 当前团队规模小（2-5 人），手动部署完全可控。
- 如后续需要 CI/CD，可在 GitHub Actions 中用 `CLOUDBASE_SECRET_ID` + `CLOUDBASE_SECRET_KEY` 作为 Secrets，并搭配 `cloudbase-action` 部署，此处预留扩展空间。

---

## 12.6 docs/ 与 .memory/ 一致性守则

`docs/` 和 `.memory/` 是所有人（和 agent）共享的**事实唯一源**，冲突代价极高。

### 写文档的原则

1. **改字段先改文档**：任何字段 / 枚举 / 接口变更，先在 `docs/03-data-model.md` 或 `docs/04-api-spec.md` 中确认，再写代码。
2. **文档改动独立提交**：文档变更单独一个 commit（`docs(...):`），不与功能代码混在同一 commit。
3. **同一时间只有一人编辑同一文档**：避免并行修改同一 `.md` 文件。用分支 + PR 解决，不要同时在两个分支里改 `docs/03-data-model.md`。
4. **`.memory/PROGRESS.md` 每次会话结束必须更新**：agent 写完代码后，必须追加已完成条目再提交。
5. **`.memory/CHANGELOG.md` 仅追加**：不修改历史条目；每个重要技术决策（字段变更、API 变更、部署变更）新增一条。

### 冲突处理

当 `docs/` 或 `.memory/` 出现 merge conflict：

```bash
# 选择手动合并，保留双方修改（追加，不覆盖）
git checkout --conflict=merge docs/03-data-model.md
# 用编辑器打开，手动解决冲突标记
# 确保双方变更都保留，然后
git add docs/03-data-model.md
git commit -m "docs: resolve merge conflict in 03-data-model"
```

---

## 12.7 多 agent 协作边界

当多个 AI agent 同时工作时，遵循以下边界划分，避免互相覆盖：

| agent 负责 | 可独占编辑 | 不可单独编辑（需协商） |
|-----------|-----------|----------------------|
| admin-agent | `admin/src/modules/<module>/` | `docs/`、`admin/src/components/`、`admin/src/router/` |
| app-agent | `app/src/pages/<page>/` | `docs/`、`app/src/api/`、`app/src/components/` |
| cf-agent | `admin/cloudfunctions/<func>/` | `docs/04-api-spec.md`、`admin/cloudbaserc.json` |
| docs-agent | `docs/`、`.memory/` | 代码目录 |

> agent 完成工作后，必须在同一次 commit 中更新 `.memory/PROGRESS.md` 和（如需）`.memory/CHANGELOG.md`。

---

## 12.8 GitHub 仓库初始化步骤（Tech Lead 操作）

```bash
# 1. 在 GitHub 创建空仓库（不初始化 README，不添加 .gitignore）

# 2. 在本地项目根目录
cd d:\Code\AMS
git init
git add .
git commit -m "chore: initial commit — AMS project scaffold"

# 3. 关联远程并推送
git remote add origin https://github.com/<org>/ams.git
git branch -M main
git push -u origin main

# 4. 创建 develop 分支
git checkout -b develop
git push -u origin develop

# 5. 在 GitHub 上设置分支保护规则
#    Settings -> Branches -> Add rule
#    - Branch name pattern: main
#      ✓ Require a pull request before merging
#      ✓ Require approvals: 1
#      ✓ Dismiss stale pull request approvals
#    - 同样保护 develop（可放宽为 0 approvals 方便快速迭代）
```

---

## 12.9 日常开发工作流示例

```bash
# 开始一个功能
git checkout develop
git pull origin develop
git checkout -b feat/admin-asset-detail

# 开发 + 自检
pnpm typecheck   # in admin/
pnpm lint
pnpm build

# 提交
git add admin/src/modules/asset/
git add docs/05-admin-features.md   # 如果功能文档有更新
git commit -m "feat(asset): 资产详情页增加 Timeline 展示"

# 同步文档状态（每次会话结束时）
git add .memory/PROGRESS.md .memory/CHANGELOG.md
git commit -m "chore(memory): 更新进度 - 资产详情 Timeline 完成"

# 推送并创建 PR
git push origin feat/admin-asset-detail
# 在 GitHub 上创建 PR: feat/admin-asset-detail -> develop
```

---

## 12.10 常见问题

### Q：克隆后 `app/cloudfunctions/` 目录为空？

运行 `scripts/setup-links.ps1`（Windows）或 `scripts/setup-links.sh`（Mac/Linux）重建 Junction / 软链接。

### Q：多人同时改云函数怎么协作？

云函数按业务域拆分（`asset` / `borrow` / `auth` / `user`）。不同业务的云函数可并行开发不同分支。**同一云函数同一时刻只能有一人负责**；在 PR 描述中标注"云函数已修改，需 Tech Lead 审批并部署"。

### Q：`tcb login` 在 CI 环境怎么处理？

暂不使用 CI 自动部署。如未来需要，向团队负责人申请独立 API Key，存入 GitHub Secrets（`CLOUDBASE_SECRET_ID` / `CLOUDBASE_SECRET_KEY`），参考 `cloudbase-action` 官方文档。

### Q：docs/ 合并冲突怎么解决？

见 12.6 冲突处理节。原则是双方追加内容均保留，不丢弃任何一方的改动。

### Q：agent 写代码忘记更新 .memory/ 怎么办？

在下一次会话开始时补充更新，单独一个 commit：`chore(memory): 补录上次会话进度`。
