# 小程序 UI 设计风格迁移说明（面向 wot-ui-v2 新项目）

本文档用于让新的 agent 理解并迁移当前小程序的 UI 美学风格。迁移目标是保留原项目的视觉气质、信息架构和交互节奏，但不能复用任何学校相关文字、logo、校训、校园图片或品牌资产。新项目使用 wot-ui-v2，不应照搬 uviewpro 的组件实现。

## 1. 风格总述

当前小程序的 UI 风格可以概括为：

> 蓝白色系、清爽可信、偏办公/教务/流程办理的小程序工具界面。

它不是营销页、品牌展示页，也不是强装饰性界面。它的重点是让用户快速理解功能、提交表单、查看状态、处理通知。整体审美克制、清晰、轻量，有明确的业务系统感。

迁移时应保留这些气质：

- 可信赖：主色稳定，视觉噪音少，页面层级清楚。
- 清爽：浅灰页面背景、白色内容卡片、蓝色重点动作。
- 高效：列表、表单、状态卡片、快捷入口都为任务完成服务。
- 轻量正式：可有柔和阴影和圆角，但不做夸张插画、复杂渐变、炫彩配色。
- 移动端优先：单列布局为主，信息密度适中，触控区域足够大。

## 2. 禁止迁移的学校绑定内容

新项目与原学校无关，必须删除或替换所有学校品牌资产和文字。

禁止使用：

- 学校名称、简称、英文简称、院系名称、实验中心名称。
- 学校 logo、logo+校名横版、校训图片、图书馆图片、校园背景图片。
- 原项目名称和品牌文案，例如“日新智课”“BJUT 智慧排课系统”“北京工业大学”“软件学院”“实验中心”等。
- 原首页底部的学校信息卡片。
- 登录页、版权区、页脚中出现的学校归属信息。

可替换为：

- 中性的应用名称，例如“智能预约平台”“业务申请平台”“服务管理助手”。
- 中性的副标题，例如“快速提交申请，实时查看进度”。
- 中性的图形资产，例如抽象业务插图、办公场景图片、系统默认头像、应用自有 logo。
- 中性的页脚，例如“v1.0.0”“服务支持”“© 平台名称”。

如没有明确新品牌，不要强行创造学校式品牌身份。宁可使用简洁的产品名称和功能描述。

## 3. 色彩体系

### 3.1 主色

原项目核心主色是蓝青色：

```scss
$primary: #0096c2;
$primary-dark: #0078a8;
$primary-deep: #006b8f;
$primary-light: #e6f7fb;
```

新项目可继续使用这组颜色，或在保持冷静蓝白气质的前提下微调。不要使用大面积紫色、彩虹渐变、高饱和荧光色、复杂装饰渐变。

### 3.2 中性色

```scss
$page-bg: #f5f7fa;
$card-bg: #ffffff;
$text-title: #333333;
$text-body: #666666;
$text-muted: #999999;
$text-placeholder: #c0c4cc;
$border: #e6e6e6;
$divider: #f0f0f0;
```

### 3.3 状态色

状态色只用于业务状态和反馈，不要抢主色。

```scss
$success: #52c41a;
$warning: #faad14;
$error: #ff4d4f;
$danger-soft: #fff5f5;
$info: #909399;
```

### 3.4 wot-ui-v2 主题变量建议

在全局样式中设置：

```scss
:root,
page {
  --wot-color-theme: #0096c2;
  --app-color-primary: #0096c2;
  --app-color-primary-dark: #0078a8;
  --app-color-primary-deep: #006b8f;
  --app-color-primary-light: #e6f7fb;
  --app-bg-page: #f5f7fa;
  --app-bg-card: #ffffff;
  --app-text-title: #333333;
  --app-text-body: #666666;
  --app-text-muted: #999999;
  --app-border: #e6e6e6;
}
```

## 4. 形状、阴影与间距

### 4.1 圆角

保持柔和但不过度可爱。

```scss
$radius-xs: 6rpx;
$radius-sm: 8rpx;
$radius-md: 12rpx;
$radius-card: 16rpx;
$radius-panel: 20rpx;
$radius-dialog: 24rpx;
$radius-pill: 999rpx;
```

使用建议：

- 普通输入框：`8rpx-12rpx`
- 信息卡片：`16rpx`
- 用户卡片、弹窗：`20rpx-24rpx`
- 圆形图标背景、头像、胶囊按钮：圆形或 `999rpx`

### 4.2 阴影

阴影应轻，不要制造强烈悬浮感。

```scss
$shadow-card: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
$shadow-primary: 0 8rpx 24rpx rgba(0, 150, 194, 0.12);
$shadow-dialog: 0 8rpx 40rpx rgba(0, 0, 0, 0.15);
```

### 4.3 页面间距

当前项目常用页面左右边距是 `30rpx`。迁移时建议继续使用：

- 页面水平 padding：`30rpx`
- 卡片内边距：`24rpx-30rpx`
- 分区之间：`20rpx-30rpx`
- 表单分区顶部间距：`30rpx`
- 底部安全距离：至少 `calc(env(safe-area-inset-bottom) + 40rpx)`

## 5. 字体层级

保持微信小程序常见的 rpx 字号层级。

```scss
$font-caption: 22rpx;
$font-small: 24rpx;
$font-body: 26rpx;
$font-form: 28rpx;
$font-title: 32rpx;
$font-page-title: 36rpx;
$font-hero-title: 44rpx;
```

建议：

- 页面标题：`32rpx-36rpx`，`font-weight: 600/bold`
- 卡片标题：`30rpx-32rpx`
- 正文和表单值：`26rpx-28rpx`
- 辅助信息、时间、说明：`22rpx-24rpx`
- 数字统计值：`36rpx-40rpx`，主色加粗

不要使用负字距。除登录页或品牌页外，不要大面积使用夸张 letter-spacing。

## 6. 页面结构模式

### 6.1 通用页面容器

典型结构：

```vue
<view class="page-container">
  <wd-navbar />
  <scroll-view scroll-y class="scroll-container">
    <view class="content-section">
      <!-- cards / forms / lists -->
    </view>
  </scroll-view>
</view>
```

样式基准：

```scss
.page-container {
  min-height: 100vh;
  background-color: var(--app-bg-page);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.scroll-container {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

.content-section {
  padding: 20rpx 30rpx 40rpx;
}
```

### 6.2 首页

首页保留“顶部识别区 + 通知 + 主要服务 + 常用功能”的信息架构。

推荐结构：

1. 顶部品牌/欢迎区
   - 使用新应用名称，不使用学校 logo。
   - 可放中性图标、应用 logo 或业务插图。
   - 背景可使用主色纯色、浅蓝色块或非常克制的蓝色层次。

2. 通知公告卡片
   - 白色卡片，标题左侧，更多按钮右侧。
   - 列表项使用小圆点或左侧状态标记。
   - 重要项使用错误色点缀。

3. 主要服务
   - 纵向服务卡片。
   - 左侧为主色图标块，中间标题和描述，右侧箭头。
   - 用于承载核心任务入口。

4. 常用功能
   - 四宫格或两行网格。
   - 图标使用浅蓝圆形背景，文字居中。

5. 底部信息
   - 不放学校信息。
   - 可放版本号、平台说明，或不显示。

### 6.3 登录页

原登录页的优点是层次清楚、登录卡片突出、主色背景稳定。迁移时应去学校化。

推荐结构：

- 全屏主色或深浅蓝背景。
- 顶部为应用名称和短副标题。
- 中部为白色半透明登录卡片。
- 输入框使用浅灰背景，聚焦时主色边框和淡蓝光晕。
- 主按钮为蓝色胶囊按钮。
- 页脚只放中性版本信息。

不要使用学校横版 logo、校名、学院名称或校园背景图。

### 6.4 我的页

我的页保留“用户卡片 + 统计 + 分组菜单”的模式。

结构建议：

- 顶部可使用蓝色背景块或中性业务背景图。
- 用户信息卡片使用白色或半透明白色，支持头像、昵称、ID、编辑按钮。
- 统计卡片显示关键状态数量，数字用主色。
- 菜单按业务分组，每组一个白色卡片。
- 菜单项结构：圆形浅色 icon 背景 + 标题 + 描述 + 右箭头。
- 未登录状态给出明确登录按钮。

### 6.5 表单页

表单页是本项目的重要视觉模式，应重点保留。

结构建议：

- 顶部使用 `wd-navbar`。
- 表单内容放在多个白色分区卡片中。
- 每个分区标题左侧用主色竖线。
- 表单项左右结构：左侧 label，右侧输入/选择结果。
- 长文本和签名等特殊输入使用完整宽度区域。
- 主要提交按钮放底部，宽度 100%。

分区标题样式：

```scss
.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.title-line {
  width: 6rpx;
  height: 32rpx;
  background-color: var(--app-color-primary);
  border-radius: 3rpx;
  margin-right: 16rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--app-text-title);
}
```

### 6.6 列表与查询页

列表页应保留清晰的状态筛选与卡片式记录。

结构建议：

- 顶部 tabs 筛选，激活项为主色，下方短横线。
- 列表项为白色卡片。
- 卡片顶部：标题/编号 + 状态 tag。
- 卡片中部：图标 + 关键字段。
- 卡片底部：时间 + 操作按钮。
- 异常或拒绝原因用浅红背景和红色左边线。
- 空状态使用灰色图标和简短文本。

### 6.7 通知页

通知页保留“筛选胶囊 + 消息卡片 + 未读标记”。

结构建议：

- 顶部筛选：全部/未读/已读。
- 未读数量使用红色徽标。
- 消息卡片使用左侧圆形 icon，右侧标题、时间、正文。
- 未读消息可加主色左边线和右上红点。

## 7. 组件迁移：uviewpro 到 wot-ui-v2

不要照搬 uviewpro 组件名。迁移时按语义替换。

| 原项目 uviewpro | 新项目 wot-ui-v2 | 说明 |
|---|---|---|
| `u-icon` | `wd-icon` | 图标名需要重新核对，不保证一一对应 |
| `u-button` | `wd-button` | 主按钮使用 theme 色，必要时 custom-style |
| `u-form` | `wd-form` | 表单校验按 wot-ui-v2 规则重写 |
| `u-form-item` | `wd-input` / `wd-cell` / `wd-picker` | 依据输入类型拆分 |
| `u-select` | `wd-picker` | 使用 `columns`、`v-model`、`confirm` |
| `u-popup` | `wd-popup` | 底部详情、筛选、复用弹窗继续使用 |
| `u-tag` | `wd-tag` | 用于状态标签 |
| `u-loading` | `wd-loading` 或按钮 loading | 根据 wot-ui-v2 能力选择 |
| 自定义 tabs | `wd-tabs` / `wd-tab` 或自定义 view | 如需高度还原可保留自定义样式 |
| 自定义 navbar | `wd-navbar` | 注意小程序胶囊区域，不建议右侧放复杂内容 |

## 8. wot-ui-v2 落地原则

- 优先使用 wot-ui-v2 的语义组件，但保留当前项目的布局节奏。
- 不为复刻旧项目而过度 custom-style；只覆盖颜色、圆角、间距等视觉令牌。
- 表单选择器使用 `wd-picker`，不要继续写 uview 的 `u-select` 思路。
- 顶部导航优先使用 `wd-navbar` 的 `left-arrow`、`title`、`safeAreaInsetTop`、`placeholder` 等能力。
- 底部弹窗使用 `wd-popup position="bottom"`，保留安全区。
- 图标统一使用 `wd-icon`，找不到完全一致图标时选择语义相近图标，不引入学校图标。

## 9. 交互与动效

交互动效应轻量：

- 卡片点击：`transform: scale(0.98)` 或背景变浅。
- 按钮点击：轻微缩放或透明度变化。
- 页面进入：可轻微上移淡入，但不要求每页都有。
- 弹窗：底部弹出或居中弹出，圆角 `20rpx-24rpx`。
- 下拉刷新：背景保持 `#f5f7fa`。

不要使用复杂动效、炫光、粒子、强动效转场。

## 10. 图标与图片

图标风格：

- 线性图标或简洁面性图标。
- 主功能图标用白色置于蓝色方形/圆形背景中。
- 快捷功能图标用主色置于浅蓝圆形背景中。
- 菜单图标可使用状态色，但应低饱和、少量使用。

图片策略：

- 不使用学校图片。
- 如果新项目没有明确图片素材，优先使用纯色背景和 icon 系统。
- 如果需要登录页背景图，选择与业务无关的中性办公/抽象图，并加蓝色遮罩。
- 不要用深色模糊大图让文字可读性变差。

## 11. 可复用 CSS 片段

### 页面容器

```scss
.page-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.scroll-container {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}
```

### 标准卡片

```scss
.app-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}
```

### 主功能卡片

```scss
.service-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.service-card:active {
  transform: scale(0.98);
}

.service-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  background-color: #0096c2;
}
```

### 表单分区

```scss
.form-section {
  margin-top: 30rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
```

### 状态提示块

```scss
.info-banner {
  display: flex;
  align-items: center;
  background-color: #e6f7fb;
  border: 1rpx solid #b3e5f0;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  color: #0096c2;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  background-color: #fff5f5;
  border-left: 6rpx solid #ff4d4f;
  border-radius: 12rpx;
  padding: 24rpx;
  color: #ff4d4f;
}
```

## 12. 新项目页面文案原则

新项目不要继承学校语境。文案要中性、功能导向。

推荐文案风格：

- “提交申请”
- “查看进度”
- “历史记录”
- “通知中心”
- “常见问题”
- “意见反馈”
- “个人信息”
- “暂无数据”
- “加载中...”
- “请完善表单信息”

避免文案：

- “学校”
- “学院”
- “校训”
- “实验中心”
- “BJUT”
- “北京工业大学”
- 任何原机构名称、原系统名称或原资源名。

## 13. 新 agent 执行清单

迁移或新建页面时，请按以下清单检查：

- 是否完全移除了学校名称、logo、校训、校园图片和学校版权信息。
- 是否设置了 `--wot-color-theme: #0096c2` 或等价主题色。
- 页面背景是否为浅灰，内容是否以白色卡片承载。
- 主按钮、激活 tab、重要入口是否使用主色。
- 表单是否按业务分区，每个分区是否有清晰标题。
- 列表是否有状态标签、时间、关键摘要和明确操作。
- 弹窗是否适配底部安全区。
- 图标是否来自 wot-ui-v2 或项目中性图标，不使用学校资源。
- 文字层级是否清晰，辅助信息是否弱化。
- 是否避免复杂渐变、紫色/彩虹配色、过度装饰和营销页式 hero。

## 14. 可直接给 UI 生成/实现 agent 的提示词

```text
请为一个与学校无关的小程序实现蓝白色系、清爽可信赖、适合流程办理和信息查询的 UI。视觉风格参考“办公/服务申请/状态查询”类工具：浅灰页面背景、白色卡片、蓝青主色 #0096C2、轻量阴影、16-24rpx 圆角、清晰的信息层级。

不得使用任何学校名称、学校 logo、校训、校园图片、学院名称或原项目品牌文案。所有品牌与页脚信息必须改为中性应用名称或新项目自有信息。

新项目使用 wot-ui-v2，请用 wd-button、wd-icon、wd-navbar、wd-popup、wd-picker、wd-tag、wd-tabs 等组件按语义实现，不要照搬 uviewpro 的组件名或 API。

页面结构保留：顶部识别区、通知卡片、主要服务入口、常用功能网格、用户信息卡片、统计卡片、分组菜单、表单分区、状态列表、底部详情弹窗。交互保持轻量，点击态可轻微缩放或背景变浅，弹窗从底部出现，状态反馈使用 tag、toast、modal、红点和徽标。
```

