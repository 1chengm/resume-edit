# 开发文档

## 目录结构
- `app/` 路由与页面
- `app/api/*` 接口
- `src/lib/*` 工具（Supabase、Admin、脱敏、YAML）
- `prompts/*` 系统提示词
- `supabase/schema.sql` 数据库与 RLS

## 开发
- 启动：`npm run dev`
- 测试：`npx vitest run`

## 流程
- 登录 → Dashboard → 新建 → 编辑器（保存）→ AI 分析/JD 匹配 → 导出/分享 → 分享页访问与统计