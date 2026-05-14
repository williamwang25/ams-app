# 04 云函数与 SDK 契约

> **作用**：定义云函数清单与入参出参约定。
> 一期读写均走云函数（见 02 2.2），本文 4.4 的「SDK 直连白名单」仅为后期优化事项。
> **读者**：后端 agent、前端调用方。
> **编辑边界**：新增 / 修改接口前先更新本文；具体内部实现由后端 agent 决定。

## 4.1 通用约定

### 4.1.1 云函数入口

每个云函数以 `action` 字段分发：

```jsonc
// 入参
{
  "action": "list",   // 必填，子操作名
  "data": { ... }     // 业务参数
}
```

### 4.1.2 统一返回结构

```jsonc
{
  "code": 0,          // 0 成功；其他为错误码
  "message": "ok",
  "data": { ... }     // 业务数据
}
```

错误码段位约定（建议）：

| 段位 | 含义 |
|------|------|
| 0 | 成功 |
| 1xxx | 入参 / 校验错误 |
| 2xxx | 鉴权 / 权限错误 |
| 3xxx | 业务规则错误（如状态不允许） |
| 4xxx | 资源不存在 |
| 5xxx | 数据库 / 内部错误 |

### 4.1.3 鉴权

- 云函数通过 `context.AUTH` 获取调用者身份（管理员 `_id` / 教师 `_id`）；首次进入需校验 token / openid。
- 写操作必须校验角色权限：教师只能改自己的借用申请；管理员才能审批、变动资产。

## 4.2 云函数清单

### 4.2.1 `auth`

> **当前实现（M1 / M2）**：仅 `adminLogin` 已部署。`teacherLoginByPassword` / `teacherLoginByOpenid` 在 borrow 模块开发时同步落地。
> `getProfile` / `changePassword` / `teacherBindOpenid` 一期不实现：管理员 profile 由 `adminLogin` 返回后前端缓存即可；教师 openid 绑定合并进 `teacherLoginByPassword`。

#### 4.2.1.1 `adminLogin`（已实现）

- **角色**：公开
- **入参**：`{ username: string, password: string }`
- **副作用**：无（不查库、不写库；账号密码硬编码在 `cloudfunctions/auth/utils/credentials.js`）
- **成功返回**：

```jsonc
{
  "code": 0,
  "data": {
    "token": "<ADMIN_PASSWORD>",   // 管理端身份令牌，前端存 localStorage，后续每次 callFunction 注入 event.auth.token
    "profile": {
      "_id": "env-admin",
      "username": "admin",
      "name": "系统管理员",
      "role": "super_admin"
    }
  }
}
```

- **错误码**：
  - `1001` 入参缺失
  - `2001` 账号或密码错误

#### 4.2.1.2 `teacherLoginByPassword`

- **角色**：公开（仅小程序端调用，云函数侧依赖 `wx-server-sdk.getWXContext().OPENID`）
- **入参**：`{ username: string, password: string }`
- **副作用**：
  1. 若 `ams_teacher` 集合为空（`db.collection('ams_teacher').count() === 0`），先用固定 `_id` `seed_t001..seed_t005` 通过 `doc(id).set(...)` 幂等注入 5 条测试教师（用户名 `t001..t005`，初始密码 `123456`，姓名 / 部门见 `docs/06-teacher-features.md`）。
  2. 校验 `username` + `password`（一期密码以明文存 `password_hash` 字段；上线前替换为 bcrypt）。
  3. 取 `wx-server-sdk.getWXContext().OPENID`，写入对应 `ams_teacher.openid`、`ams_teacher.bound_at = now`、`updated_at = now`。
- **成功返回**：

```jsonc
{
  "code": 0,
  "data": {
    "profile": {
      "_id": "seed_t001",
      "username": "t001",
      "name": "测试教师 1",
      "department": "化工学院",
      "phone": "",
      "openid": "<bound openid>"
    }
  }
}
```

> 注意：教师端**不发 token**。后续调任何云函数，鉴权依赖 `wx-server-sdk.getWXContext().OPENID` 反查 `ams_teacher`，详见 4.6.1。

- **错误码**：
  - `1001` 入参缺失
  - `2001` 用户名或密码错误
  - `2002` 缺少微信上下文（在非小程序环境调用，未取到 OPENID）
  - `5001` 数据库写入失败

#### 4.2.1.3 `teacherLoginByOpenid`

- **角色**：公开（仅小程序端调用）
- **入参**：`{}`（不接受前端传 openid，全部由 `wx-server-sdk.getWXContext()` 拿）
- **副作用**：无（只读 `ams_teacher`，不更新）
- **成功返回**：

```jsonc
{
  "code": 0,
  "data": {
    "profile": { /* 同 teacherLoginByPassword */ }
  }
}
```

- **错误码**：
  - `2002` 缺少微信上下文
  - `2003` openid 未绑定（前端应跳转账密登录页）

### 4.2.2 `asset`

| action | 角色 | 说明 |
|--------|------|------|
| `create` | 管理员 | 单条入库；自动生成 `asset_no`、写 `ams_asset_log(CREATE)`、计算 `is_large` |
| `update` | 管理员 | 编辑资产（不含 `business_status`，状态由专用 action 改） |
| `changeStatus` | 管理员 | 变更 `business_status`（如 IDLE↔MAINTAIN / SCRAP），写日志 |
| `changeLocation` | 管理员 | 变更存放地点，写日志 `LOCATION_CHANGE` |
| `changeUser` | 管理员 | 变更使用人，写日志 `USER_CHANGE` |
| `getTimeline` | 管理员 / 教师 | 查询 `ams_asset_log` 单资产历史 |
| `getDetail` | 管理员 / 教师 | 获取资产详情 |

> 教师端可借资产搜索由 `borrow.searchAssets` 承接：复用教师 OPENID 鉴权，只返回可借资产精简字段，避免把管理员 `asset.list` 权限暴露给教师端。后期可考虑走 SDK 直连（见 4.4）。

### 4.2.3 `borrow`

> **状态机**详见 `docs/07-workflows.md` 7.2 / 7.5。
> **鉴权**：教师 action（`submit` / `cancel` / `listMine`、教师调的 `return` / `detail`）依赖 OPENID（见 4.6.1）；管理员 action（`approve` / `reject` / `adminList` / `summary`、管理员调的 `return` / `detail`）依赖 `event.auth.token === ADMIN_PASSWORD`。
> **日志**：所有借用相关变更写入 `ams_asset_log`（不另建 `ams_borrow_log`），`op_type` 取 `BORROW` / `RETURN`，`related_id = ams_borrow_request._id`。
> **一致性**：所有写操作必须用事务保证「更新 `ams_borrow_request` + 更新 `ams_asset.business_status` + `ams_asset.current_borrow_id` + 写 `ams_asset_log`」原子；任一失败回滚。
> **资产快照策略**：`ams_borrow_request.items[]` 在 `submit` 时把 `asset_no / name / brand / spec / unit_price / location_name` 冻结进申请，避免归还时资产已被改名导致历史记录失真；`quantity / expected_return_date / usage` 三个字段是教师在申请表单里逐条填写（详见 `docs/03-data-model.md` 3.6.1 与 `data/资产借用登记表.md`）。

#### 4.2.3.1 `submit`（教师）

提交借用申请。

- **入参**（字段语义对齐 `data/资产借用登记表.md`）：

```jsonc
{
  "items": [
    {
      "asset_id": "asset_xxx",            // 必填
      "quantity": 1,                       // 可选，默认 1，整数 >= 1
      "expected_return_date": "2026-06-15",// 必填，ISO 日期 >= 今日
      "usage": "科研"                      // 必填，<= 50 字
    },
    {
      "asset_id": "asset_yyy",
      "expected_return_date": "2026-06-15",
      "usage": "教学"
    }
  ],
  "signature_file_id": "cloud://.../sign.png" // 必填，签名图 fileID
}
```

- **校验**：
  - `items` 数组长度 1..20
  - 每条 `asset_id` 不重复（同一资产不可在同一申请里出现两次）
  - `expected_return_date` 解析合法且 ≥ 今日（按云函数时区判断）
  - `usage` 非空、≤ 50 字
  - `signature_file_id` 非空

- **副作用**（`db.runTransaction` 事务包裹整体）：
  1. 用 OPENID 反查 `teacher_id` / `teacher_name` / `teacher_phone`（事务外预查，不放进事务体）
  2. 事务体内拉取所有 `asset_id` 对应资产 → 任一不存在 → 抛 4001；任一 `business_status !== 'IDLE'` → 抛 3001（带 `offending_asset_ids[]`）
  3. 生成 `serial_no = 'OU-' + YYYYMMDD + '-' + HHMMSS + '-' + 3位随机`
  4. 在事务内创建 `ams_borrow_request`：`status=PENDING`，`items[]` 冻结资产快照（`asset_no` / `name` / `brand` / `spec` / `unit_price` / `location_name`）+ 教师填的 `quantity` / `expected_return_date` / `usage`
  5. 批量更新所有涉及资产：`business_status=PENDING`，`current_borrow_id=新建申请 _id`，`updated_at=now`
  6. 每个资产追加一条 `ams_asset_log`：`op_type=BORROW`，`changes=[{field:'business_status',before:'IDLE',after:'PENDING'}]`，`related_id=申请_id`，`operator_role=teacher`，`operator_id=teacher_id`，`operator_name=teacher_name`，`remark='提交借用申请，待审批'`

- **成功返回**：`{ code: 0, data: { _id, serial_no, status: 'PENDING' } }`
- **错误码**：
  - `1001` 入参缺失 / 格式错误（含 `expected_return_date` 解析失败、过期日期、空 `usage`）
  - `1002` `items` 长度超限或为空 / `asset_id` 重复
  - `2002` 缺少 OPENID 上下文
  - `2003` openid 未绑定教师
  - `3001` 存在非 IDLE 的资产（`data: { offending_asset_ids: string[] }`）
  - `4001` 部分资产不存在（`data: { missing_asset_ids: string[] }`）
  - `5001` 事务失败

#### 4.2.3.2 `approve`（管理员）

审批通过。

- **入参**：`{ borrow_id: string }`
- **副作用**（事务）：
  1. 校验 `ams_borrow_request.status === 'PENDING'`
  2. 更新申请：`status='APPROVED'`，`approved_by=env-admin`，`approved_by_name='系统管理员'`，`approved_at=now`
  3. 生成 `voucher_qr_payload = base64({ borrow_id, serial_no, approved_at })`，写回 `ams_borrow_request.voucher_qr_payload`
  4. 批量更新涉及资产：`business_status=LENT`（`current_borrow_id` 保持指向当前申请）
  5. 每个资产写 `ams_asset_log`：`op_type=BORROW`，`changes=[{field:'business_status',before:'PENDING',after:'LENT'}]`，`operator_role=admin`，`remark='审批通过'`
- **成功返回**：`{ code: 0, data: { _id, status: 'APPROVED', voucher_qr_payload } }`
- **错误码**：`2001`（无 token）/ `3002`（状态非 PENDING）/ `4002`（申请不存在）/ `5001`

#### 4.2.3.3 `reject`（管理员）

审批拒绝。

- **入参**：`{ borrow_id: string, reject_reason: string }`（理由 1..200 字）
- **副作用**（事务）：
  1. 校验 `status === 'PENDING'`
  2. 更新申请：`status='REJECTED'`，`reject_reason`，`approved_by` / `approved_at` 同 approve（标记审批人）
  3. 批量更新资产：`business_status=IDLE`，`current_borrow_id=null`
  4. 每个资产写 `ams_asset_log`：`op_type=BORROW`（保留 BORROW 表示借用流转），`changes=[{...PENDING→IDLE}]`，`remark='审批拒绝：' + reject_reason`
- **成功返回**：`{ code: 0, data: { _id, status: 'REJECTED' } }`
- **错误码**：同 `approve` + `1001`（理由缺失）

#### 4.2.3.4 `return`（教师 / 管理员）

归还。

- **入参**：`{ borrow_id: string }`
- **鉴权**：管理员可归还任何申请；教师只能归还 `teacher_id === 自己 _id` 的申请
- **副作用**（事务）：
  1. 校验 `status === 'APPROVED'`
  2. 更新申请：`status='RETURNED'`，`returned_at=now`
  3. 批量更新资产：`business_status=IDLE`，`current_borrow_id=null`
  4. 每个资产写 `ams_asset_log`：`op_type=RETURN`，`changes=[{LENT→IDLE}]`，`operator_role=admin|teacher`，`remark='归还'`
- **成功返回**：`{ code: 0, data: { _id, status: 'RETURNED', returned_at } }`
- **错误码**：`2001`/`2003`/`2004`（教师跨身份归还）/ `3003`（状态非 APPROVED）/ `4002` / `5001`

#### 4.2.3.5 `cancel`（教师）

撤回未审批申请。

- **入参**：`{ borrow_id: string }`
- **鉴权**：教师 OPENID 反查 `teacher_id`，必须等于申请的 `teacher_id`
- **副作用**（事务）：
  1. 校验 `status === 'PENDING'`
  2. 更新申请：`status='CANCELLED'`
  3. 批量更新资产：`business_status=IDLE`，`current_borrow_id=null`
  4. 每个资产写 `ams_asset_log`：`op_type=BORROW`，`changes=[{PENDING→IDLE}]`，`operator_role=teacher`，`remark='教师撤回申请'`
- **成功返回**：`{ code: 0, data: { _id, status: 'CANCELLED' } }`
- **错误码**：`2003` / `2004`（不是本人）/ `3002`（非 PENDING） / `4002` / `5001`

#### 4.2.3.6 `listMine`（教师）

教师端查自己的申请。

- **入参**：

```jsonc
{
  "status": "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "RETURNED" | undefined,
  "page": 1,        // 默认 1
  "pageSize": 20    // 默认 20，上限 100
}
```

- **副作用**：无
- **成功返回**：`{ code: 0, data: { total: number, list: BorrowRequest[] } }`
  - `list[]` 字段：`_id` / `serial_no` / `status` / `purpose` / `expected_return_date` / `items[]`（仅返资产快照核心字段）/ `created_at` / `approved_at` / `returned_at` / `reject_reason`
- **错误码**：`2002` / `2003`

#### 4.2.3.7 `searchAssets`（教师）

教师端借物车搜索可借资产。

- **角色**：教师（OPENID 鉴权）
- **入参**：

```jsonc
{
  "keyword": "Arduino",  // 可选，匹配 asset_no / name / brand / spec
  "page": 1,             // 默认 1
  "pageSize": 20         // 默认 20，上限 50
}
```

- **筛选规则**：
  - 固定只返回 `business_status === 'IDLE'` 的资产
  - 关键字最长 50 字，空关键字返回最近可借资产
  - 返回字段必须精简，不返回 `current_borrow_id`、审计字段、图片数组等非必要字段
  - 为教师端资产展示窗口可返回 `cover_image_file_id`，取 `ams_asset.image_urls[0]`，前端通过临时链接渲染

- **成功返回**：

```jsonc
{
  "code": 0,
  "data": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "_id": "asset_xxx",
        "asset_no": "YQJJ2026000431",
        "name": "基础开发套件",
        "brand": "Arduino",
        "spec": "Arduino Starter Kit",
        "unit_price": 1060,
        "quantity": 1,
        "location_name": "705",
        "business_status": "IDLE",
        "cover_image_file_id": "cloud://..."
      }
    ]
  }
}
```

- **错误码**：`1001`（关键字超长）/ `2002` / `2003` / `2004`

#### 4.2.3.8 `adminList`（管理员）

管理端审批列表。

- **入参**：

```jsonc
{
  "status": "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "RETURNED" | undefined,
  "keyword": "李",                  // 模糊匹配 serial_no / teacher_name / items.asset_no
  "date_from": "2026-05-01",        // 按 created_at 过滤
  "date_to": "2026-05-31",
  "page": 1,
  "pageSize": 20                    // 上限 200
}
```

- **副作用**：无
- **成功返回**：`{ code: 0, data: { total, list: BorrowRequest[] } }`
  - 比 `listMine` 多返 `teacher_id` / `teacher_name` / `teacher_phone` / `approved_by` / `approved_by_name`
- **错误码**：`1001` / `2001`

#### 4.2.3.9 `detail`（管理员 / 教师）

申请详情。

- **入参**：`{ borrow_id: string }`
- **鉴权**：管理员任意；教师只能读自己的申请
- **副作用**：无
- **成功返回**：`{ code: 0, data: BorrowRequest }`（全字段）
- **错误码**：`2001`/`2003`/`2004` / `4002`

#### 4.2.3.10 `summary`（管理员）

Dashboard 看板用，与 `asset.summary` 对齐风格。

- **入参**：`{}`
- **副作用**：无
- **成功返回**：

```jsonc
{
  "code": 0,
  "data": {
    "pending_count": 3,           // 待审批数
    "lent_count": 12,             // 借出中数（资产维度，可由 asset.summary 提供，这里冗余便于一次拉取）
    "today_borrow": 2,            // 今日新增申请数
    "today_return": 1,            // 今日归还数
    "trend_7d": [                 // 最近 7 天出入仓曲线
      { "date": "2026-05-06", "borrow": 1, "return": 0 },
      // ...
    ]
  }
}
```

- **错误码**：`2001` / `5001`

### 4.2.4 `asset-change`（可与 asset 合并，按 agent 偏好）

如独立维护，与 `asset.changeLocation` / `changeUser` 同义；本目录建议合并到 `asset`。

### 4.2.5 `dashboard`

| action | 角色 | 说明 |
|--------|------|------|
| `summary` | 管理员 | 返回指标卡数据：资产总数、总值、使用中、出借中、待审批 |
| `byDepartment` | 管理员 | 按部门资产分布（柱状图数据） |
| `byStatus` | 管理员 | 按业务状态占比（饼状图数据） |
| `borrowTrend` | 管理员 | 入参 `{ days|month }`，返回出入仓数量曲线 |
| `borrowAmountTrend` | 管理员 | 出入仓金额曲线 |
| `ledger` | 管理员 | 总账信息：按学院 / 部门聚合数量、总金额、借出数量 |
| `inoutStats` | 管理员 | 出入仓今日 / 本月 / 总计（数量 + 金额） |

> 全部为只读聚合；可由 SDK 直接做也可云函数缓存。一期建议云函数返回。

### 4.2.6 `notice`

| action | 角色 | 说明 |
|--------|------|------|
| `create` | 管理员 | 发布通知 |
| `update` | 管理员 | 修改通知 |
| `publish` | 管理员 | 上下架 |
| `delete` | 管理员 | 删除 |

> 一期列表读取走云函数；后期可考虑走 SDK 直连。

### 4.2.7 `init`（一期已下线）

为减少项目启动复杂度，当前不实现 `init` 云函数；超管账号、根密钥由 `auth` 云函数的环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN` 提供，需要的集合 / 字典可在 CloudBase 控制台手动创建。引入多管理员 / 教师端后再考虑恢复本节设计。

原设计作为后期参考保留：

| action | 角色 | 说明 |
|--------|------|------|
| `initialize` | 公开（带秘钥） | 一次性：创建超级管理员、字典数据、示例教师账号；重复调用幂等 |
| `seedAssets` | 公开（带秘钥） | （可选）导入 `data/资产字段总表.md` 示例数据 |

### 4.2.8 `user`

> 管理端超管用于维护教师账号（`ams_teacher`）。全部 action 依赖管理端 token，教师端不调用本云函数。
> 一期教师密码仍按 `ams_teacher.password` 明文测试字段存储；上线前需按 `docs/03-data-model.md` 3.3 改为 `password_hash`。

| action | 角色 | 说明 |
|--------|------|------|
| `listTeachers` | 超管 | 分页查询教师账号，支持关键字 / 部门 / 微信绑定状态筛选，不返回 `password` |
| `createTeacher` | 超管 | 新增教师账号，写 `username` / `password` / `name` / `phone` / `department` |
| `updateTeacher` | 超管 | 编辑教师基础资料，不允许改 `password` / `openid` |
| `resetTeacherPassword` | 超管 | 重置教师密码；未传密码时生成 8 位临时密码并返回给管理端 |
| `unbindTeacherOpenid` | 超管 | 清空 `openid` / `unionid` / `bound_at`，让教师下次重新账密绑定 |
| `deleteTeacher` | 超管 | 删除教师；若已有借用申请则拒绝删除，避免历史单据失去归属 |

#### 4.2.8.1 `listTeachers`

- **入参**：

```jsonc
{
  "keyword": "张",        // 可选，匹配 username / name / phone / department
  "department": "软件学院", // 可选，精确匹配
  "bound": true,          // 可选，是否已绑定微信 openid
  "page": 1,
  "pageSize": 20          // 上限 200
}
```

- **成功返回**：`{ code: 0, data: { total, page, pageSize, list: TeacherUser[] } }`
  - `TeacherUser` 字段：`_id` / `username` / `name` / `phone` / `department` / `openid` / `unionid` / `bound_at` / `created_at` / `updated_at` / `is_bound`
- **错误码**：`1001` / `2001`

#### 4.2.8.2 `createTeacher`

- **入参**：`{ username: string, password: string, name: string, phone?: string, department?: string }`
- **副作用**：创建 `ams_teacher` 文档，`openid=null`、`unionid=null`、`bound_at=null`。
- **成功返回**：`{ code: 0, data: { _id, teacher: TeacherUser } }`
- **错误码**：`1001`（入参错误）/ `2001`（未登录）/ `3002`（账号重复）/ `5001`

#### 4.2.8.3 `updateTeacher`

- **入参**：`{ id: string, username?: string, name?: string, phone?: string, department?: string }`
- **副作用**：更新教师基础资料与 `updated_at`；不允许通过本 action 修改密码或 openid。
- **成功返回**：`{ code: 0, data: { _id, teacher: TeacherUser, noop?: true } }`
- **错误码**：`1001` / `2001` / `3002`（账号重复）/ `4001`

#### 4.2.8.4 `resetTeacherPassword`

- **入参**：`{ id: string, password?: string }`
- **副作用**：更新 `ams_teacher.password` 与 `updated_at`；若未传 `password`，云函数生成临时密码。
- **成功返回**：`{ code: 0, data: { _id, temporary_password } }`
- **错误码**：`1001` / `2001` / `4001`

#### 4.2.8.5 `unbindTeacherOpenid`

- **入参**：`{ id: string }`
- **副作用**：清空 `openid` / `unionid` / `bound_at`，更新 `updated_at`。
- **成功返回**：`{ code: 0, data: { _id, teacher: TeacherUser } }`
- **错误码**：`1001` / `2001` / `4001`

#### 4.2.8.6 `deleteTeacher`

- **入参**：`{ id: string }`
- **副作用**：删除教师账号；若 `ams_borrow_request.teacher_id=id` 存在记录，返回 `3001` 并拒绝删除。
- **成功返回**：`{ code: 0, data: { _id, deleted: true } }`
- **错误码**：`1001` / `2001` / `3001` / `4001`

### 4.2.9 预留

- `report`：AI 语义报表（一期不实现）
- `share`：闲置共享（一期不实现）

## 4.3 输入参数与返回结构（指导级）

每个 action 的字段不在此一一锁死，由后端 agent 实现时附 JSDoc / 类型定义，但应遵守：

- **教师端可访问字段**：必须过滤 `password_hash` 等敏感字段。
- **分页**：统一 `{ page = 1, pageSize = 20 }`，返回 `{ total, list }`。
- **筛选**：列表查询通过 `filter: { field: value | { op, value } }` 传递，避免拼字符串。
- **时间区间**：用 ISO 字符串或时间戳对，由前端传入。

## 4.4 SDK 直连白名单（后期优化）

> **一期不实施**：为避免安全规则配置的复杂度卡住功能进度，一期所有读 / 写均走云函数（上表“读”的表达意图转为 `xxx.list` / `xxx.detail` 类云函数 action 的过滤逻辑）。
>
> **后期启用时机**：仅当特定列表 / 看板查询出现明显性能瓶颈、或需要绕开云函数冷启动时才考虑针对个别集合启用。

以下为后期可考虑的只读白名单（意图表，启用时再依据实际场景裁决）：

| 集合 | 管理端 | 教师端 |
|------|--------|--------|
| `ams_asset` | 读全部 | 读 `business_status != SCRAPPED` 的精简字段 |
| `ams_asset_log` | 读全部 | 不允许 |
| `ams_borrow_request` | 读全部 | 仅读 `teacher_id == 自己` |
| `ams_notice` | 读 published / 未发布 | 仅读 `published == true` |
| `ams_dict` | 读 enabled | 读 enabled |
| `ams_admin` / `ams_teacher` | 仅超管读 | 不允许 |

## 4.5 图片 / 签名上传

- 前端使用 `app.uploadFile({ cloudPath, filePath })` 直传云存储，路径建议：
  - 资产图片：`asset/{asset_no}/{timestamp}-{random}.jpg`
  - 签名图片：`signature/{teacher_id}/{borrow_serial_no}.png`
- 上传成功得到 `fileID`，再调用对应云函数（`asset.create` / `borrow.submit`）落库。
- 渲染时通过 `app.getTempFileURL({ fileList })` 转 https 链接。

## 4.6 双身份鉴权约定

> 三端在同一份云函数里要识别两类调用方：管理端 Web（CloudBase JS SDK）/ 教师端微信小程序（`wx.cloud.callFunction`）。本节是**所有 borrow / asset / 后续业务云函数必须遵守的鉴权基线**。

### 4.6.1 鉴权双轨

云函数收到 `event` 时，按下列优先级判定身份：

```
1. event.auth?.token === ADMIN_PASSWORD
     → role = 'admin'
     → operator = { _id: 'env-admin', name: '系统管理员', role: 'super_admin' }

2. const { OPENID } = wxServerSdk.getWXContext()
   if (OPENID) {
     teacher = await db.collection('ams_teacher').where({ openid: OPENID }).limit(1).get()
     if (teacher) → role = 'teacher', operator = teacher
     else        → 抛 2003（openid 未绑定）
   }

3. 都不命中 → 抛 2001（未登录）
```

### 4.6.2 关键安全约束

- **OPENID 不接受前端传值**。任何 action 都不读 `event.openid`、`event.data.openid`，只信 `wx-server-sdk.getWXContext().OPENID`（微信平台注入）。
- **管理端 token 不在小程序端使用**。管理员账密硬编码（一期），上线前替换为 `ams_admin` 表 + bcrypt + JWT（详见 `docs/11-open-questions.md`）。
- **教师端不发 token**。前端只缓存 `profile` 用于 UI 展示；`wx.cloud.callFunction` 时不需要在 `data` 里塞身份字段。
- **角色闸门**写在每个 action 入口**显式校验**，禁止「公共拦截器假设默认放行」。具体 action 期望角色见 4.2 各表。

### 4.6.3 公共错误码（鉴权相关）

| 错误码 | 含义 | 触发场景 |
|--------|------|---------|
| `2001` | 未登录 / token 无效 | 管理端 action 未提供有效 token |
| `2002` | 缺少微信上下文 | 教师端 action 未通过小程序云开发调用，`wx-server-sdk.getWXContext()` 取不到 OPENID |
| `2003` | openid 未绑定教师 | 已拿到 OPENID 但 `ams_teacher` 中查无此人 |
| `2004` | 越权 | 教师试图操作非本人申请；普通管理员试图调超管 action |

### 4.6.4 教师端 `wx.cloud.callFunction` 调用样板

> **app 端 agent 拷代码用**。教师端仅依赖此模式，不需要管理 token。

```js
// app/src/services/borrow.ts（示例）
import { ensureCloud } from '@/utils/cloud'

/** 提交借用申请（字段对应 docs/03-data-model.md 3.6.1） */
export async function submitBorrow(payload: {
  items: Array<{
    asset_id: string
    quantity?: number
    expected_return_date: string  // 'YYYY-MM-DD'
    usage: string
  }>
  signature_file_id: string
}) {
  await ensureCloud()
  const res = await wx.cloud.callFunction({
    name: 'borrow',
    data: { action: 'submit', data: payload },
    // 注意：不传 auth.token；身份由微信平台注入的 OPENID 决定
  })
  const { code, message, data } = res.result as ApiResp<{ _id: string; serial_no: string; status: 'PENDING' }>
  if (code !== 0) throw new CloudFunctionError(code, message)
  return data
}

/** 教师账密首登 + 自动绑 openid */
export async function teacherLoginByPassword(username: string, password: string) {
  await ensureCloud()
  const res = await wx.cloud.callFunction({
    name: 'auth',
    data: { action: 'teacherLoginByPassword', data: { username, password } },
  })
  const { code, message, data } = res.result as ApiResp<{ profile: TeacherProfile }>
  if (code !== 0) throw new CloudFunctionError(code, message)
  // 仅缓存 profile 用于 UI；身份后续靠 OPENID
  uni.setStorageSync('teacher_profile', data.profile)
  return data.profile
}

/** App 启动时尝试免密登录 */
export async function teacherLoginByOpenid() {
  await ensureCloud()
  const res = await wx.cloud.callFunction({
    name: 'auth',
    data: { action: 'teacherLoginByOpenid', data: {} },
  })
  const { code, data } = res.result as ApiResp<{ profile: TeacherProfile }>
  if (code === 2003) return null  // 未绑定，前端跳账密登录页
  if (code !== 0) throw new CloudFunctionError(code, res.result.message)
  uni.setStorageSync('teacher_profile', data.profile)
  return data.profile
}
```

### 4.6.5 管理端 CloudBase JS SDK 调用样板

> 管理端复用 `admin/src/utils/http.ts` 已有的 `callFunction` 包装器，自动注入 `event.auth.token`：

```ts
// admin/src/modules/borrow/api.ts（示例）
import { callFunction } from '@/utils/http'

export function approveBorrow(borrow_id: string) {
  return callFunction<{ _id: string; status: 'APPROVED'; voucher_qr_payload: string }>(
    'borrow',
    { action: 'approve', data: { borrow_id } },
  )
}
```
