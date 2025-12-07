# ResumeCraft 简历编辑与 AI 优化

一个基于 Next.js 16（App Router）、Supabase 与 Vercel AI SDK 的中文简历编辑与优化工具。支持邮箱密码与 GitHub 登录、简历编辑与实时预览、AI 分析与 JD 匹配、PDF 导出与分享统计。

## 核心功能

- **登录与鉴权**：Supabase Auth（邮箱密码 + GitHub OAuth）
- **简历编辑器**：结构化表单 + 预览区（支持 Markdown 轻渲染）
- **AI 能力**：简历分析与 JD 匹配，采用 `openai` 或 `deepseek`
- **PDF 导出**：Puppeteer 服务端渲染，支持 Vercel Serverless
- **分享与统计**：生成分享链接，访问统计入库

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | Next.js 16、React 19、Tailwind CSS v4 |
| UI | shadcn/ui 风格组件、Lucide 图标 |
| 后端 | Supabase（Postgres + Storage + Auth） |
| AI | Vercel AI SDK（OpenAI / DeepSeek） |
| PDF | Puppeteer + @sparticuz/chromium |
| 测试 | Playwright (E2E)、Vitest (Unit) |

## 目录结构

```
web/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/             # 认证相关页面（sign-in, sign-up, reset）
│   ├── api/                # API 路由（Bearer 认证）
│   ├── auth/               # OAuth 回调处理
│   ├── dashboard/          # 用户仪表板
│   ├── resume/[id]/        # 简历编辑、分析、导出
│   └── s/[uuid]/           # 公开分享页面
├── components/             # React 组件
│   ├── auth/               # 认证相关组件
│   ├── ui/                 # 基础 UI 组件
│   └── auth-provider.tsx   # 全局认证状态管理
├── lib/                    # 兼容导出层（re-exports）
├── src/lib/                # 核心工具库
│   ├── supabase/           # Supabase 客户端（client/server/admin）
│   └── ...                 # 其他工具
├── types/                  # TypeScript 类型定义
├── middleware.ts           # 路由保护中间件
└── supabase/schema.sql     # 数据库 Schema 与 RLS
```

## 环境变量

在 `web/.env.local` 中配置：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Provider
AI_PROVIDER=openai          # 或 deepseek
OPENAI_API_KEY=sk-...       # 或 DEEPSEEK_API_KEY

# 可选
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ 不要将密钥提交到仓库，`.gitignore` 已忽略 `.env*`

## 认证流程

本项目使用 Supabase Auth，支持两种登录方式：

### 邮箱密码登录

```
用户 → sign-in 页面 → 输入邮箱/密码
  ↓
supabase.auth.signInWithPassword()
  ↓
成功 → Session 存储到 Cookie → 跳转 /dashboard
```

### GitHub OAuth 登录

```
用户 → 点击 "Continue with GitHub"
  ↓
supabase.auth.signInWithOAuth({ provider: 'github' })
  ↓
重定向到 GitHub 授权页面
  ↓
用户授权 → GitHub 回调到 Supabase
  ↓
Supabase 回调到 /auth/callback?code=xxx
  ↓
exchangeCodeForSession(code) 交换 Session
  ↓
成功 → 重定向到 /dashboard
```

### 路由保护

通过 `middleware.ts` 实现服务端路由保护：

- **受保护路由**：`/dashboard`、`/resume/*`、`/profile`
- **公开路由**：`/`、`/auth/*`、`/s/*`、`/api/*`
- 未登录访问受保护路由 → 重定向到 `/sign-in`
- 已登录访问登录页 → 重定向到 `/dashboard`

## Supabase 配置

### Auth 设置

1. **Site URL**: `http://localhost:3000`（生产环境改为实际域名）
2. **Redirect URLs**: 添加 `http://localhost:3000/auth/callback`

### GitHub Provider

1. 在 [GitHub OAuth Apps](https://github.com/settings/developers) 创建应用
2. **Homepage URL**: `http://localhost:3000`
3. **Authorization callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
4. 将 Client ID / Client Secret 填入 Supabase Dashboard → Authentication → Providers → GitHub

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npx vitest run       # 单元测试
npx playwright test  # 端到端测试
```

**Node 版本要求**: `>= 20.9.0`

## API 认证

API 路由使用 Bearer Token 认证：

```typescript
// 前端调用
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const response = await authenticatedFetch('/api/resumes', { method: 'GET' })
```

```typescript
// API 路由
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

## 部署

### Vercel

1. 在 Vercel 配置环境变量（与本地一致）
2. 确保 Supabase Redirect URLs 包含生产域名
3. GitHub OAuth 应用添加生产域名回调

### 注意事项

- PDF 导出使用 `@sparticuz/chromium`，兼容 Vercel Serverless
- 建议启用 Vercel 的 Edge Config 加速 Supabase 连接

## 许可证

本项目仅用于教学与演示用途，实际商用请根据自身需求调整与审计。
