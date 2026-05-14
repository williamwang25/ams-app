# 07 业务流程与状态机

> **作用**：用文字与伪流程图描述关键业务的执行路径与状态流转。
> **读者**：所有需要理解业务全貌的成员。
> **编辑边界**：流程可优化但状态枚举值需与 `03-data-model.md` 保持一致。

## 7.1 资产业务状态机

```
                ┌──── changeStatus → MAINTAIN ────┐
                │                                  │
   CREATE → IDLE ←──────── borrow.return ──────── LENT
              │                                    ▲
              │  borrow.submit                     │
              ▼                                    │
            PENDING ──── borrow.approve ───────────┘
              │
              └──── borrow.reject ──→ IDLE
              
   任意状态 ── changeStatus → SCRAPPED（终态，不可逆）
```

- `IDLE` 闲置（默认入库状态，可借）
- `IN_USE` 使用中（管理员可手动设置；不参与借用流程）
- `PENDING` 待审批（借用申请已提交）
- `LENT` 借出中
- `MAINTAIN` 维修（不可借）
- `SCRAPPED` 报废（终态）

## 7.2 借用申请状态机

```
   submit → PENDING ── approve ──→ APPROVED ── return ──→ RETURNED
              │
              ├── reject ──→ REJECTED
              └── cancel ──→ CANCELLED
```

| 状态 | 说明 |
|------|------|
| `PENDING` | 已提交，等待管理员审批 |
| `APPROVED` | 已通过，凭证生效，资产已 LENT |
| `REJECTED` | 已拒绝，资产回到 IDLE |
| `CANCELLED` | 教师主动取消（仅 PENDING 可取消） |
| `RETURNED` | 已归还 |

## 7.3 入库流程

```
管理员 → 资产/新建 → 填写表单（含图片上传）
       → 提交 → asset.create
            ├── 生成 asset_no（按分类前缀 + 年份 + 顺序号）
            ├── 写入 ams_asset (business_status=IDLE, is_large=计算)
            └── 写 ams_asset_log (op_type=CREATE)
       → 列表显示新资产
```

## 7.4 变动流程（位置 / 使用人 / 状态）

```
管理员 → 资产详情 → 选择变动类型
       → 提交 → asset.changeLocation / changeUser / changeStatus
            ├── 校验：LENT / PENDING 状态不允许使用人变动
            ├── 更新 ams_asset
            └── 写 ams_asset_log (op_type=LOCATION_CHANGE / USER_CHANGE / STATUS_CHANGE)
       → Timeline 出现新条目
```

## 7.5 借用全流程

> **触发方与鉴权**：教师 action 由 `cloud.getWXContext().OPENID` → `ams_teacher` 反查；管理员 action 由 `event.auth.token === ADMIN_PASSWORD`。详见 `docs/04-api-spec.md` 4.6.1。
> **日志统一写 `ams_asset_log`**（不另建 `ams_borrow_log`），`op_type ∈ { BORROW, RETURN }`，`related_id = ams_borrow_request._id`。
> **所有写操作走事务**：`ams_borrow_request` + `ams_asset` + `ams_asset_log` 三处变更原子化。

### 7.5.1 教师提交（`borrow.submit`，教师身份）

```
教师 → 借用主页 → 搜索/选择资产 → 加入借物车
     → 申请表逐条填写（每条资产：数量 / 拟归还日期 / 用途）   ← 字段语义见 data/资产借用登记表.md
     → 手写签名 → 上传 → 拿到 signature_file_id
     → borrow.submit({ items[], signature_file_id })          ← 不传 token，OPENID 由平台注入
          ├── (事务外) OPENID → ams_teacher 反查 teacher_id / 姓名 / 电话
          ├── (事务内) 拉资产，校验全部 IDLE（任一不符整体回滚）
          ├── 生成 serial_no = OU-YYYYMMDD-HHMMSS-XXX
          ├── 创建 ams_borrow_request：
          │     status=PENDING
          │     items[] = 冻结资产快照(asset_no/name/brand/spec/unit_price/location_name)
          │            + 教师填字段(quantity/expected_return_date/usage)
          ├── 批量更新资产 IDLE→PENDING, current_borrow_id=申请_id
          └── 每个资产写 ams_asset_log (op_type=BORROW, operator_role=teacher,
                                       changes=[{business_status:IDLE→PENDING}],
                                       remark='提交借用申请，待审批')
```

> **per-item 字段**（数量 / 拟归还日期 / 用途）逐条独立存储，UI 可提供「整单同步」按钮把首行字段批量下发到剩余条目，但 `ams_borrow_request.items[i]` 始终保留各自值。

### 7.5.2 教师撤回（`borrow.cancel`，教师身份，仅 PENDING）

```
教师 → 我的申请 → 待审批 → 撤回
     → borrow.cancel
          ├── 校验申请 teacher_id === 当前教师 _id  且 status === PENDING
          ├── ams_borrow_request: status=CANCELLED
          ├── 批量恢复资产 PENDING→IDLE, current_borrow_id=null
          └── 写 ams_asset_log (op_type=BORROW, operator_role=teacher,
                                 changes=[{PENDING→IDLE}], remark='教师撤回申请')
```

### 7.5.3 管理员审批（`borrow.approve` / `reject`，管理员身份）

```
管理员 → 审批列表 → 详情
     → 通过：borrow.approve
          ├── 校验 status === PENDING
          ├── ams_borrow_request: status=APPROVED, approved_by, approved_at
          ├── 生成 voucher_qr_payload = base64({ borrow_id, serial_no, approved_at })
          ├── 批量更新资产 PENDING→LENT
          └── 写 ams_asset_log (op_type=BORROW, operator_role=admin,
                                 changes=[{PENDING→LENT}], remark='审批通过')

     → 拒绝：borrow.reject
          ├── 校验 status === PENDING
          ├── ams_borrow_request: status=REJECTED, reject_reason, approved_by, approved_at
          ├── 批量恢复资产 PENDING→IDLE, current_borrow_id=null
          └── 写 ams_asset_log (op_type=BORROW, operator_role=admin,
                                 changes=[{PENDING→IDLE}], remark='审批拒绝：'+reason)
```

> 教师端凭证页：`status=APPROVED` 后用 `voucher_qr_payload` 渲染二维码，出示给现场管理员核验。

### 7.5.4 归还（`borrow.return`，双身份）

```
教师 / 管理员 → 选择借用单 → 确认归还
     → borrow.return
          ├── 鉴权：管理员任意 / 教师仅可还自己的申请（teacher_id === 当前教师 _id）
          ├── 校验 status === APPROVED
          ├── ams_borrow_request: status=RETURNED, returned_at=now
          ├── 批量更新资产 LENT→IDLE, current_borrow_id=null
          └── 写 ams_asset_log (op_type=RETURN, operator_role=admin|teacher,
                                 changes=[{LENT→IDLE}], remark='归还')
```

### 7.5.5 状态机一览

```
              submit                approve            return
   IDLE ─────────────→ PENDING ──────────────→ APPROVED ────────→ RETURNED
                         │                        │
                         │ reject (admin)         │ （仅管理员或申请人 teacher）
                         │ cancel (teacher)       │
                         ▼                        │
                       IDLE                       │
                                                  │
              资产层： IDLE → PENDING → LENT → IDLE（终）
                              ↘ IDLE（被 reject/cancel）
```

## 7.6 通知公告流程

```
管理员 → 通知管理 → 新建 → 保存草稿（published=false）
       → 编辑 → 发布（published=true, published_at=now）
教师端首页 → 拉取 published=true 最近 N 条
```

## 7.7 初始化流程

```
开发者 → 部署云函数 → 设置 INIT_SECRET 环境变量
       → 调用 init.initialize { secret }
            ├── 创建超管账号（环境变量配置默认账号密码）
            ├── 写入字典：部门 / 国标分类 / 资产用途 / 业务状态 / 配置阈值
            └── （可选）创建示例教师账号
       → 调用 init.seedAssets { secret }（可选）
            └── 导入 data/资产字段总表.md 示例行
       → 控制台关闭 init 触发器或改密
```

## 7.8 错误恢复

- **借用提交后管理员长期不审批**：教师可在凭证页发起"催办"（一期不实现，仅状态显示提交时间）。
- **资产 PENDING 卡住**：管理员可在审批列表手动拒绝，使资产回 IDLE。
- **签名上传失败**：前端保留本地草稿，重试上传。
