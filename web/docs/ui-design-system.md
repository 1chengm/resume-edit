# UI Design System (Atelier Theme)

## 1. 目标
统一整个项目页面风格，形成一套可复用、可扩展、可落地的视觉语言：

- 现代化：轻玻璃、柔和光感、清晰层次
- 美观：统一间距、统一边框、统一卡片结构
- 特色：`Editorial + Tech Atelier` 的品牌感
- 实用：不改变核心业务流程，优先提升观感和一致性

## 2. 全局视觉语言

### 2.1 基础主题
依赖现有语义 token（`--background`, `--foreground`, `--primary`, `--border` 等），不在业务页面写死主色。

### 2.2 新增全局样式类（`app/globals.css`）

- `.atelier-app-bg`：
  - 全站基础背景（径向光感 + 纯色底）
- `.atelier-grid-bg`：
  - 轻网格纹理（增强页面结构感）
- `.atelier-topbar`：
  - 统一顶部栏样式（半透明 + 模糊 + 细边框）
- `.atelier-panel`：
  - 统一卡片容器（边框、圆角、阴影、磨砂）
- `.atelier-loading`：
  - 统一 Loading 占位屏
- `.hero-noise` / `.hero-float`：
  - 首页专用氛围纹理与浮动动效

## 3. 页面统一改造清单

### 3.1 已改造页面

- 首页：`app/page.tsx`
- 登录页：`app/(auth)/sign-in/page.tsx`
- 注册页：`app/(auth)/sign-up/page.tsx`
- 重置页：`app/(auth)/reset/page.tsx`
- OAuth 错误页：`app/auth/auth-code-error/page.tsx`
- 仪表盘：`app/dashboard/client.tsx`
- 个人中心：`app/profile/client.tsx`
- 简历编辑页：`app/resume/[id]/edit/client.tsx`
- 简历分析页：`app/resume/[id]/analysis/client.tsx`
- JD 匹配页：`app/resume/[id]/jd-match/client.tsx`
- 预览导出页：`app/resume/[id]/export-share/client.tsx`
- 分享只读页：`app/s/[uuid]/page.tsx`
- 渲染页（loading/fallback 对齐）：`app/render/[id]/page.tsx`

### 3.2 统一 Suspense / Loading

下列页面 fallback 已统一到 `.atelier-loading`：

- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `app/resume/[id]/edit/page.tsx`
- `app/resume/[id]/analysis/page.tsx`
- `app/resume/[id]/jd-match/page.tsx`
- `app/resume/[id]/export-share/page.tsx`
- `app/s/[uuid]/page.tsx`
- `app/render/[id]/page.tsx`

## 4. 组件层统一

- `components/share-page-actions.tsx`
  - 顶部操作按钮改为统一操作组容器（边框 + `ghost` 按钮）
- `components/resume-view.tsx`
  - 预览卡容器统一为高质量纸张视觉（`shadow-2xl`, `rounded-xl`）
  - 补充 `resume-print resume-content`，打印规则与编辑页一致

## 5. 交互与可访问性规范

- 图标按钮尽量补 `aria-label`
- 可点击目标建议 >= 40px
- 表单标签至少 `text-sm`
- 错误与成功提示统一使用边框状态框：
  - 错误：`destructive`
  - 成功：`emerald` 语义样式

## 6. 打印体系

使用现有打印规则（`@media print`）并统一可打印容器类：

- `.resume-print`
- `.resume-content`
- `.no-print`
- `.print-visible`

目标：编辑页、预览页、分享页在浏览器打印/PDF 导出时保持一致。

## 7. 后续扩展建议

1. 抽象 `AppShell` 组件
- 把常见布局（Topbar + Content Container）组件化，减少页面重复样式。

2. 抽象 `ActionGroup`
- 把右上角操作组（保存/分享/导出）变成标准组件，统一所有业务页。

3. 引入页面级动效规范
- 统一进入动画时长（`180-280ms`），并在 `prefers-reduced-motion` 下自动降级。

4. 增加 UI 回归截图
- 对首页、Dashboard、Edit、Analysis、JD-Match 做视觉回归基线，避免样式漂移。

---

当前状态：全站核心页面已迁移到 Atelier 视觉语言，并通过 `lint` 与 `build` 校验。
