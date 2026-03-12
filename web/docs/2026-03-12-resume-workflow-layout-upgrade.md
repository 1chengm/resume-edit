# Resume Workflow Layout Upgrade

日期：2026-03-12

## 目标

本次改造同时解决 3 个问题：

1. `jd-match` 页面此前只有前端壳层，没有真正可用的后端路由与产品级工作流。
2. 简历编辑页此前是长表单堆叠结构，缺少模块导航、移动端预览和真实模板切换。
3. `analysis` 页面此前存在“按钮看起来可执行，实际上没有闭环”的问题，建议无法自然回到编辑流程。

## 已完成改造

### 1. JD Match 变成完整链路

- 新增后端路由：`app/api/ai/jd-match/route.ts`
- 复用现有 `ai_jd_match_prompt`
- 对相同简历内容 + 相同 JD 做缓存，写入 `ai_analysis_history`，类型为 `jd`
- OpenAI 使用结构化输出，DeepSeek 使用文本输出并通过 `parseChineseJSON` 归一化

前端页面改造：

- 不再要求用户手动粘贴 `Resume JSON`
- 自动读取当前简历作为匹配输入
- 页面结构调整为：
  - 当前简历摘要
  - JD 输入区
  - 匹配分与关键词
  - 可复制、可跳转编辑的推荐动作

### 2. 编辑页重构为真实工作台

文件：`app/resume/[id]/edit/client.tsx`

改造点：

- 新增左侧模块导航，支持快速跳转到：
  - 基本信息
  - 职业摘要
  - 工作经历
  - 项目经历
  - 教育经历
  - 技能证书
- 顶部显示当前完成进度
- 移动端新增预览浮层，不再完全失去实时预览能力
- 分析页与 JD Match 页可以通过 `?section=...&hint=...` 直接回跳到对应编辑模块
- 模板切换不再只是视觉按钮，已经接到共享预览组件

### 3. ResumeView 支持真实模板差异

文件：`components/resume-view.tsx`

此前问题：

- 虽然简历元数据中存在 `template`
- 但预览和导出几乎只渲染同一份布局

现在支持：

- `Modern`
- `Classic`
- `Creative`

这意味着：

- 编辑页右侧预览
- 分享页
- 导出页
- 浏览器打印 / PDF 导出

都会跟随模板切换显示不同版式。

### 4. Analysis 页面改为“总结优先 + 可执行建议”

文件：`app/resume/[id]/analysis/client.tsx`

改造点：

- 左侧固定展示总体评分、评分拆解和最优先动作
- 主区域展示：
  - 缺失模块
  - 结构建议
  - 表达建议
  - 可执行建议卡片
- 每条建议支持：
  - 复制建议
  - 跳转到编辑页对应模块
  - 本地忽略

这样分析页不再是只读报告，而是明确服务于“回到编辑页修改”的工作流。

## 相关文件

- `app/api/ai/jd-match/route.ts`
- `app/resume/[id]/jd-match/client.tsx`
- `app/resume/[id]/edit/client.tsx`
- `app/resume/[id]/analysis/client.tsx`
- `components/resume-view.tsx`
- `docs/api.md`

## 验证结果

已完成：

- `npm run lint`
- `npm run build`

补充说明：

- `npx tsc --noEmit` 当前会因仓库里既有的测试类型配置问题报错，问题集中在 `tests/unit/api/*` 中对 `vi/describe/it/expect` 的全局类型未声明，不是本次改造引入的编译问题。

## 后续建议

1. 为 `jd-match` 增加历史记录列表，支持同一份简历对多个岗位做比对。
2. 为 `analysis` 和 `jd-match` 增加“应用到摘要”或“生成改写草稿”的半自动动作。
3. 把编辑页模块卡片进一步拆成独立组件，减少单文件体积。
