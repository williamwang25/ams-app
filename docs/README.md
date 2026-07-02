# AMS 资产管理系统 · 需求文档

> **作用**：本目录是资产管理系统（Asset Management System）的需求与设计文档集合，用于指导多人 / 多 agent 并行开发。
> **读者**：项目成员、编码 agent、后续接手维护者。
> **编辑边界**：本文件只维护导航与术语，正文内容拆分到各章节。

## 文档导航

| 序号 | 文件 | 说明 |
|------|------|------|
| 00 | [`README.md`](./README.md) | 本页：导航、术语、全局约束 |
| 01 | [`01-overview.md`](./01-overview.md) | 项目目标、角色、一期范围、技术栈 |
| 02 | [`02-architecture.md`](./02-architecture.md) | 三端架构、模块拆分、读写路径 |
| 03 | [`03-data-model.md`](./03-data-model.md) | 数据库集合定义、索引建议 |
| 04 | [`04-api-spec.md`](./04-api-spec.md) | 云函数契约、SDK 直连白名单 |
| 05 | [`05-admin-features.md`](./05-admin-features.md) | 管理端功能拆解与验收点 |
| 06 | [`06-teacher-features.md`](./06-teacher-features.md) | 教师小程序功能拆解 |
| 07 | [`07-workflows.md`](./07-workflows.md) | 关键业务流程与状态机 |
| 08 | [`08-ui-guidelines.md`](./08-ui-guidelines.md) | 主题色、组件库、页面规范 |
| 09 | [`09-dev-conventions.md`](./09-dev-conventions.md) | 目录结构、命名、协作边界 |
| 10 | [`10-init-and-deploy.md`](./10-init-and-deploy.md) | 初始化云函数、部署指南 |
| 11 | [`11-open-questions.md`](./11-open-questions.md) | 未明确、待后续讨论事项 |
| 12 | [`12-github-collaboration.md`](./12-github-collaboration.md) | GitHub 多人协作指南、提交规范、云函数部署权限 |

## 术语表

| 术语 | 含义 |
|------|------|
| AMS | Asset Management System，本项目代号 |
| 管理端 | 学校资产管理员使用的 Vue3 网页（目录 `admin/`） |
| 教师端 | 教师使用的微信小程序（目录 `app/`，基于 unibest + wot-ui v2） |
| 云开发 / CloudBase | 腾讯云一站式后端，提供数据库、云函数、存储、静态托管 |
| 业务状态 | 资产生命周期状态枚举：`IDLE`/`IN_USE`/`LENT`/`PENDING`/`MAINTAIN`/`SCRAPPED` |
| 借物车 | 教师端借用页下半屏选中资产的临时容器 |
| 凭证 | 借用申请通过审批后生成的、可展示给资产管理员的电子记录页面 |
| Timeline | 资产生命周期轨迹（入库 → 变动 → 借出 → 归还 → 报废），数据源为 `ams_asset_log` |

## 全局约束

- **环境 ID**：根目录 `.env` 中 `env=ams-d8grnwwy6d8da557f`，前后端通过该值连接 CloudBase。
- **集合命名前缀**：所有数据库集合一律以 `ams_` 开头（如 `ams_asset`、`ams_borrow_request`）。
- **主题色**
  - 主色：`#0096C2`（BJUT 蓝）
  - 辅助色：`#006B8F`
- **UI 风格**：简洁、专业，**全程禁止使用 emoji**（图标用 lucide / wot-ui 内置图标）。
- **代码要求**：模块解耦、无冗余、便于多 agent 并行。
- **多端共识**：三端共用同一套字段名与枚举值，跨端字段不一致的修改必须同步更新本目录文档。

## 数据来源参考

- `data/资产字段总表.md`：资产主表字段与示例行（建模直接参考）。
- `data/资产借用登记表.md`：教师端借用申请表字段。

## 文档贡献规范

- 每章节开头注明 **作用 / 读者 / 编辑边界**，便于 agent 判断改动范围。
- 字段、枚举、接口契约的变更需同步修改 `03-data-model.md` 与 `04-api-spec.md`，并在 PR / commit 中提及。
- 不在文档中放具体业务代码，最多伪代码或字段列表，避免锁死实现。
