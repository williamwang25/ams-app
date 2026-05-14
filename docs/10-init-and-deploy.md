# 10 初始化与部署

> **作用**：说明系统首次启动的初始化、本地开发、部署上线步骤。
> **读者**：DevOps / 上线负责人 / 新加入开发者。
> **编辑边界**：实际命令行步骤可由 agent 优化；一期鉴权以 `cloudfunctions/<func>/utils/credentials.js` 为唯一凭证源（零环境变量），后期重启 `init` 设计时以 `04-api-spec.md` 4.2.7 为准。

## 10.1 环境准备

- Node.js ≥ 18
- pnpm ≥ 7.30（教师端要求）
- 微信开发者工具（教师端调试）
- 腾讯云 CloudBase CLI（部署）
- 已开通的 CloudBase 环境，环境 ID 见根目录 `.env`：`ams-d8grnwwy6d8da557f`

## 10.2 部署云函数

一期鉴权采用**零环境变量**方案：账号密码硬编码在 `cloudfunctions/<func>/utils/credentials.js`，登录成功后将密码作为 token 返还给前端，业务云函数比对同源 credentials。所有云函数都不需要在控制台配任何环境变量。

集合需首次手动在 CloudBase 控制台建好（详见 10.6）；云函数运行时不再自动建表以避免冷启动额外开销。

### 10.2.1 部署所有云函数

```bash
tcb fn deploy auth
tcb fn deploy asset
tcb fn deploy borrow
tcb fn deploy user
```

`auth` / `asset` / `borrow` / `user` 均登记在 `admin/cloudbaserc.json`；`asset` / `borrow` / `user` 首次部署会拉 CloudBase SDK 依赖。

### 10.2.2 修改账号密码

直接编辑 `cloudfunctions/<func>/utils/credentials.js`（auth 一份、所有业务云函数各一份，**必须同步**），改完重新 `tcb fn deploy <func>`。一期默认账号 `admin` / `admin123`。

### 10.2.3 初始化集合（手动一次）

首次部署到一个新环境时，去 CloudBase 控制台 → 数据库 → 新建集合，手工建好：

- `ams_asset`
- `ams_asset_log`
- `ams_seq`

后期新增云函数依赖新集合时在本节补登记。

> 后期重新启用 `init` 云函数时可参考 `04-api-spec.md` 4.2.7 原设计。

## 10.3 管理端本地开发

```bash
# 在 admin/
npm install
# 配置 src/utils/cloudbase.ts 中的 ENV_ID（若未自动从根 .env 读取）
npm run dev
# 默认 http://localhost:5173
```

构建与部署：

```bash
npm run build           # 产物在 admin/dist/
tcb hosting deploy admin/dist -e <env-id>
```

或通过 CloudBase 控制台手动上传 `dist/`。

## 10.4 教师端本地开发

```bash
# 在 app/
pnpm install
pnpm dev:mp             # 编译微信小程序到 dist/dev/mp-weixin
```

随后用微信开发者工具导入 `app/dist/dev/mp-weixin`：

- 选择"导入项目"，AppID 可使用测试号或公司小程序 AppID。
- 工具内可调试、预览。

构建：

```bash
pnpm build:mp           # 产物在 app/dist/build/mp-weixin
# 在微信开发者工具中点击"上传"提交审核
```

## 10.5 云函数部署

```bash
# 在 cloudfunctions/<func> 目录
tcb fn deploy <func>
```

建议写一个根级脚本 `scripts/deploy-functions.sh` 批量部署所有函数。

## 10.6 数据库初次配置（控制台手动建一次）

云函数运行时**不再**自动建集合（省去冷启动额外开销 + 避免吞掉建集合相关异常）。首次部署新环境请去控制台手动建好下列集合：

- **初始必建**（asset 云函数依赖）：`ams_asset` / `ams_asset_log` / `ams_seq`。
- **后续业务集合**（随对应云函数上线同期新建）：`ams_admin`、`ams_teacher`、`ams_borrow_request`、`ams_notice`、`ams_dict`。
- **安全规则**：一期不作重点。云函数是唯一读写入口，全部走服务端身份，默认权限即可工作。
- **索引**：需控制台手工维护。**没索引也能跑**，仅上量变大后为实际高频查询字段补：
  - `ams_asset.asset_no` 唯一
  - `ams_asset.business_status` / `dept_code` / `created_at` 普通索引
  - `ams_asset_log.asset_id` + `created_at` 复合索引
  - `ams_teacher.username` 唯一，`openid` 唯一（允许 null）
  - `ams_borrow_request.teacher_id` + `created_at`，`status`

## 10.7 云存储配置

- 一期创建目录：需要上传时再手动建 `asset/`、`signature/`。
- **一期存储权限保持默认**，不额外配置安全规则；上传 `fileID` 由云函数落库，读取走云函数包装后返回临时 URL。
- **后期收口**参考原设计：
  - `asset/*`：所有登录用户可读，仅管理员可写。
  - `signature/{teacher_id}/*`：仅本人 + 管理员可读，仅本人可写。

## 10.8 上线检查清单

- [ ] `cloudfunctions/<func>/utils/credentials.js` 里的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 已从默认 `admin` / `admin123` 改为产品账密（两侧同步）
- [ ] `auth` 与业务云函数（`asset` / `borrow` / `notice` / …）已部署
- [ ] 首次部署新环境后，控制台手动建好 `ams_asset` / `ams_asset_log` / `ams_seq` 三个集合
- [ ] 高频查询字段已加索引（高压业务时补，MVP 随意）
- [ ] 上传场景出现后，云存储目录已手动创建
- [ ] 管理端已部署到静态托管，访问域名可用
- [ ] 教师端小程序版本已上传并提审（及后期阶段）
- [ ] `.env` / 秘钥未泄露到代码仓库
- [ ] 烟雾测试：管理员登录 → 入库一条资产 → 教师提交借用 → 管理员审批 → 教师查看凭证 → 教师归还
- [ ] **安全规则不作为上线阻塞项**，后期需要时再专项补齐
