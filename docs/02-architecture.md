# 02 架构设计

> **作用**：呈现系统三端架构、模块拆分与数据读写路径。
> **读者**：架构对齐、agent 协作边界判断。
> **编辑边界**：可调整模块拆分细节。读写路径策略一期统一走云函数（见 2.2），后期再考虑 SDK 直连。

## 2.1 总体架构

```
┌────────────────────────┐        ┌──────────────────────────┐
│  管理端 Web (admin/)   │        │  教师端 微信小程序 (app/)│
│  Vue3 + Vite + Tailwind │       │  unibest + wot-ui v2     │
└──────────┬─────────────┘        └──────────────┬───────────┘
           │ 一期：读写均走云函数                │ 一期：读写均走云函数
           │ 后期可放开只读 SDK 直连              │ 后期视性能放开只读 SDK 直连
           ▼                                     ▼
┌────────────────────────────────────────────────────────────┐
│                 腾讯云 CloudBase (env: ams-xxxx)            │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  云函数      │  │  JSON 数据库    │  │  云存储        │  │
│  │  auth/asset/ │  │  ams_admin     │  │  资产图片      │  │
│  │  borrow/...  │  │  ams_teacher   │  │  签名图片      │  │
│  └──────────────┘  │  ams_asset...  │  └────────────────┘  │
│                    └────────────────┘                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  静态网站托管：托管管理端 dist                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## 2.2 读写路径策略

**一期（功能优先，不引入安全规则）**：所有读 / 写都走云函数，由云函数内部用应用层 token（`ADMIN_TOKEN`）做鉴权。前端 CloudBase SDK 仅作为调用云函数的传输通道，不直连数据库。

| 操作类型 | 一期路径 | 说明 |
|----------|----------|------|
| 列表查询 / 详情 / Dashboard 聚合 | 前端调用云函数 | 简单直接；不依赖数据库安全规则 |
| 写操作（入库 / 变动 / 审批 / 借还 / 通知发布 / 账号绑定） | 前端调用云函数 | 云函数集中鉴权、参数校验、写 `ams_asset_log`、必要时事务 |
| 图片 / 签名上传 | 前端 SDK 直传云存储 | 上传成功后将 `fileID` 传给云函数落库；存储桶权限保持默认 |

**后期（按需收口）**：当列表 / 看板查询出现性能瓶颈或并发压力时，再考虑放开只读 SDK 直连，并在 CloudBase 控制台为对应集合配置安全规则（候选白名单见 `04-api-spec.md` 4.4）。本期不投入此项工作。

## 2.3 模块拆分（feature-based）

### 管理端 `admin/src/`

```
admin/src/
├── modules/                # 按业务领域拆分（agent 协作边界）
│   ├── auth/               # 登录、当前用户、路由守卫
│   ├── dashboard/          # 首页看板
│   ├── asset/              # 资产 CRUD、入库、详情、Timeline
│   ├── asset-change/       # 资产变动（位置/使用人）
│   ├── borrow/             # 借用申请列表、审批
│   ├── large-asset/        # 大型资产管理页
│   ├── notice/             # 通知公告管理
│   ├── user/               # 管理员账号管理（超管）
│   └── (预留) report/      # AI 报表占位
├── components/             # 跨模块通用组件（如 Table、StatusTag、AssetImage）
├── composables/            # 跨模块 hooks（usePagination、useDict）
├── utils/                  # cloudbase.ts、formatters、constants
├── router/                 # 路由聚合（每模块自带 routes.ts）
├── App.vue
├── main.ts
└── style.css
```

### 教师端 `app/src/`

```
app/src/
├── pages/                  # unibest 约定式路由
│   ├── index/              # 首页（看板/通知/常用功能）
│   ├── login/              # 账号密码 + 绑定 openid
│   ├── borrow/             # 借用主流程（搜索 + 拖拽借物车 + 申请表 + 签名）
│   ├── borrow-detail/      # 借用详情 / 凭证
│   ├── return/             # 归还
│   └── profile/            # 我的（账号、凭证列表）
├── components/             # 共享组件（AssetCard、SignaturePad、Cart）
├── api/                    # 云函数 / SDK 封装（按领域拆 asset.ts / borrow.ts）
├── store/                  # pinia / 全局状态（user、cart）
├── hooks/                  # useAuth、useAssetSearch
├── http/                   # 请求拦截、错误处理
├── utils/                  # cloudbase、formatters、constants
├── static/                 # 静态资源
└── ...
```

### 云函数（建议目录）

```
cloudfunctions/
├── auth/                   # 登录、绑定 openid、token 校验
├── asset/                  # 资产 CRUD、Timeline 查询
├── asset-change/           # 资产变动
├── borrow/                 # 借用申请、审批、归还
├── dashboard/              # 看板聚合（按月借还、出入仓金额等）
├── notice/                 # 通知公告发布
├── upload/                 # （可选）签名 / 图片上传辅助接口
└── init/                   # 首次初始化：超管、字典、示例数据
```

> 每个云函数对应一个目录，内部按 `action` 字段分发；详见 `04-api-spec.md`。

## 2.4 公共契约约定

- **集合命名**：一律 `ams_xxx`（详见 `03-data-model.md`）。
- **时间字段**：统一使用 ISO 8601 字符串或服务端时间戳；同一字段三端一致。
- **金额字段**：以**分**为单位的整数（避免浮点误差），展示时除以 100；或保留两位小数的 `number`——由 agent 选择，但同一字段必须三端一致。
- **图片字段**：存 `fileID` 数组（云存储返回的 ID），渲染时通过 SDK `getTempFileURL` 转 https。
- **错误码**：云函数统一返回 `{ code: 0|非0, message, data }`；前端拦截器按 code 提示。
- **分页**：默认 `{ page, pageSize, total, list }`；推荐 pageSize 默认 20。

## 2.5 agent 协作边界

- 模块目录内文件由该模块负责的 agent 独占编辑。
- 跨模块的修改（如新增字段）需先更新 `03-data-model.md` / `04-api-spec.md`，再分发到各端模块。
- 共享代码（components、composables、utils）修改需向所有模块负责人公告。
