# 部署说明

## 环境变量
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER`（openai|deepseek）
- `OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`

## Supabase
- SQL：执行 `web/supabase/schema.sql`
- Auth：启用 GitHub Provider；设置 Redirect
- Storage：创建 `resumes` 存储桶（建议私有）

## 部署
- Vercel 连接项目；在 Vercel 配置环境变量；构建并上线