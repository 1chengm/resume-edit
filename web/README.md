# ResumeCraft 简历编辑与 AI 优化

一个基于 Next.js 16（App Router）、Supabase 与 Vercel AI SDK 的中文简历编辑与优化工具。支持邮箱密码与 GitHub 登录、简历编辑与实时预览、AI 分析与 JD 匹配、PDF 导出与分享统计。

## 核心功能

- 登录与鉴权：Supabase Auth（邮箱密码 + GitHub）
- 简历编辑器：结构化表单 + 预览区（支持 Markdown 轻渲染）
- AI 能力：简历分析与 JD 匹配，采用 `openai` 或 `deepseek`
- PDF 导出：纯 HTML 渲染生成，高兼容无 `lab()` 颜色函数问题
- 分享与统计：生成分享链接，访问统计入库

## 技术栈

- 前端：Next.js 16、React 19、Tailwind CSS v4
- UI：shadcn/ui 风格组件（自定义）、Material Symbols 图标
- 后端：Supabase（Postgres + Storage + Auth）
- AI：Vercel AI SDK（OpenAI / DeepSeek）

## 目录结构（关键）

- `app/` 应用路由与页面
- `app/api/*` 接口路由（Bearer 认证）
- `src/lib/*` 工具库（Supabase 客户端、Admin、YAML、脱敏、PDF）
- `lib/*` 兼容导出（保持旧的 `@/lib/*` 导入路径可用）
- `supabase/schema.sql` 数据库与 RLS 配置
- `tests/e2e/*` 端到端测试（Playwright）

## 环境变量

在 `web/.env.local` 中设置以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：匿名密钥（前端 + 服务端）
- `SUPABASE_SERVICE_ROLE_KEY`：服务端管理员密钥（仅服务端）
- `AI_PROVIDER`：`openai` 或 `deepseek`
- `OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`：根据 `AI_PROVIDER` 选择其一
- 可选 `NEXT_PUBLIC_SITE_URL`：默认 `http://localhost:3000`

注意：不要将任何密钥提交到仓库，`.gitignore` 已忽略 `.env*`。

## Supabase 配置

Auth 设置：

- Site URL：`http://localhost:3000`
- Redirect URLs：添加 `http://localhost:3000/auth/callback`

GitHub Provider：

- 在 GitHub OAuth 应用中设置回调：`https://<project-ref>.supabase.co/auth/v1/callback`
- 将 `Client ID / Client Secret` 填入 Supabase Provider 配置

## 开发与命令

- 启动开发：`npm run dev`
- 构建生产：`npm run build`
- 生产启动：`npm run start`
- 代码检查：`npm run lint`
- 单元测试：`npx vitest run`
- 端到端测试：`npx playwright test`

Node 要求：`>= 20.9.0`

## 使用示例

前端获取客户端与认证请求：

```typescript
import { supabase } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

// supabase client is a singleton, ready to use
const response = await authenticatedFetch('/api/resumes'), { method: 'GET' })
```

API 路由 Bearer 认证：

```ts
import { authenticateRequest } from '@/lib/api-auth'
import { createAuthenticatedClient } from '@/lib/api-client'

export async function GET(req: Request) {
  const { user, error } = await authenticateRequest(req as any)
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAuthenticatedClient(req as any)
  const { data } = await supabase.from('resumes').select('*').eq('user_id', user.id)
  return Response.json(data || [])
}
```

PDF 导出（纯 HTML 渲染）：

```ts
import { generateResumePDFFromData } from '@/lib/simple-pdf-generator'

await generateResumePDFFromData(resumeContent, resumeMetadata, { filename: 'resume.pdf' })
```

## 架构说明

- Supabase 客户端：
  - 浏览器端：`src/lib/supabase/client.ts`
  - 服务端：`src/lib/supabase/server.ts`
  - Admin：`src/lib/supabaseAdmin.ts`
- API 鉴权：`src/lib/api-auth.ts`（Bearer Token）
- 兼容导入：`lib/*` 对 `src/lib/*` 的再导出，保持旧路径可用

## 部署到 Vercel

- 在 Vercel 项目中配置与本地一致的环境变量
- 绑定 Supabase 项目与存储桶（`resumes`）
- 构建并上线（建议启用保护分支）

- PDF 颜色函数报错：已使用纯 HTML 渲染，避免 `lab()` 等现代颜色函数

## 许可证

本项目仅用于教学与演示用途，实际商用请根据自身需求调整与审计。
