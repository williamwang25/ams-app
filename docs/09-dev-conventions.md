# 09 开发约定

> **作用**：统一目录、命名、协作边界，保证多人 / 多 agent 并行无冲突。
> **读者**：所有 agent。
> **编辑边界**：约定一旦确立尽量不改；如需变更需在 PR 中明确并通知所有模块负责人。

## 9.1 目录与模块边界

### 管理端 `admin/src/modules/<module>/`

每个模块自包含：

```
modules/asset/
├── pages/                  # 页面级组件
│   ├── AssetList.vue
│   ├── AssetCreate.vue
│   └── AssetDetail.vue
├── components/             # 模块内复用组件
├── composables/            # 模块内 hooks
├── api.ts                  # 模块调用的云函数 / SDK 封装
├── types.ts                # 模块类型定义
├── constants.ts            # 模块常量
└── routes.ts               # 模块路由表，被 router 聚合
```

**协作边界**：

- 模块目录内文件由该模块 agent 独占编辑。
- 跨模块调用通过 `import { fooApi } from '@/modules/asset/api'`。
- 共享组件统一放在 `admin/src/components/`，由架构负责人维护。

### 教师端 `app/src/pages/<page>/`

unibest 约定式路由，每个页面目录：

```
pages/borrow/
├── index.vue               # 主页
├── form.vue                # 子页（路径 /pages/borrow/form）
├── components/             # 页面内组件
└── ...
```

通用 api 与 store 按业务领域拆：`app/src/api/asset.ts`、`app/src/api/borrow.ts`、`app/src/store/user.ts` 等。

### 云函数 `cloudfunctions/<func>/`

```
cloudfunctions/asset/
├── index.js                # 入口，按 action 分发
├── actions/                # 每个 action 一个文件
│   ├── create.js
│   ├── update.js
│   └── ...
├── utils/                  # 辅助：鉴权 / 校验 / 日志
└── package.json
```

## 9.2 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 数据库集合 | `ams_<snake_case>` | `ams_borrow_request` |
| 字段 | `snake_case` | `unit_price`, `business_status` |
| 枚举值 | `UPPER_SNAKE_CASE` | `IDLE`, `LENT`, `APPROVED` |
| 云函数名 | `kebab-case` 或单词 | `asset`, `borrow`, `asset-change` |
| action | `camelCase` | `create`, `changeStatus`, `submit` |
| Vue 组件 | `PascalCase` | `AssetList.vue` |
| 页面文件 | unibest 约定 | `index.vue` |
| TS 类型 | `PascalCase` | `Asset`, `BorrowRequest` |
| 常量 | `UPPER_SNAKE_CASE` | `BORROW_STATUS`, `LARGE_ASSET_THRESHOLD` |
| 文件 / 目录 | `kebab-case` | `large-asset`, `asset-change` |

## 9.3 代码风格

- TypeScript 优先（教师端已是 TS；管理端 ts 已配置）。
- 函数式优先，组件用 `<script setup>`。
- 注释：仅在业务边界、复杂算法、临时妥协处加注释；其他靠命名表达。
- 不引入大型工具库（lodash、moment 等），可选 day.js / es-toolkit。

## 9.4 共享类型与常量

建议在仓库根目录创建：

```
shared/
├── types/
│   ├── asset.ts
│   ├── borrow.ts
│   └── ...
├── enums.ts                # 业务状态、借用状态、字典 category
└── constants.ts            # 错误码、阈值
```

三端通过相对路径或 tsconfig paths 引入。**字段名变化必须在 shared 中先改**。

> 是否引入 shared 包由架构 agent 决定；若不引入，则三端各自维护对应文件，并以 `docs/03-data-model.md` 为字段事实标准。

## 9.5 提交规范

- Commit message 建议 Conventional Commits：`feat(asset): xxx`、`fix(borrow): xxx`、`docs: xxx`。
- 一次提交聚焦一个模块；跨模块改动拆分。
- PR 标题包含模块前缀；描述里勾选受影响文档（`03-data-model.md` / `04-api-spec.md`）。

## 9.6 测试与验证

- 一期不强制单元测试；但关键云函数（`asset.create`、`borrow.submit/approve/return`）建议附手动验证清单。
- 提交前自查清单：
  - [ ] 字段名与 `03-data-model.md` 一致
  - [ ] 接口契约与 `04-api-spec.md` 一致
  - [ ] 写操作有写 `ams_asset_log`
  - [ ] 业务状态流转符合 `07-workflows.md`
  - [ ] UI 不含 emoji，主色一致

## 9.7 agent 协作守则

- **先读文档再动手**：任何模块改动前阅读对应章节，遇到歧义先在 PR 或群里同步。
- **改字段先改文档**：先 PR 修文档，合并后再改代码。
- **不重复造轮子**：检查 `components/` 与 `shared/` 是否已有同类实现。
- **保留模板能力**：不删除 `admin/`、`app/` 模板原有的能力（如 CloudBase 工具、wot-ui 引入）。

## 9.8 环境与配置

- `.env`：根目录已存 `env=ams-d8grnwwy6d8da557f`，**不要提交带密钥的 .env**。
- 各端在 `utils/cloudbase.ts`（或同等位置）读取环境 ID。
- 云函数环境变量（`INIT_SECRET`、`JWT_SECRET` 等）在 CloudBase 控制台配置，代码中读取 `process.env`。
