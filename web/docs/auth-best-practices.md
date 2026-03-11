# Next.js + Supabase 鉴权最佳实践（本项目版）

> 更新时间：2026-03-10  
> 适用范围：`web`（Next.js App Router + Supabase）

---

## 1. 目标与结论

本项目鉴权应采用以下统一策略：

1. **服务端 Session（Cookie）作为唯一真相**。  
2. **页面鉴权在服务端完成**（Server Component / `proxy.ts`），避免客户端闪屏跳转。  
3. **API 鉴权统一封装**（`requireApiUser()`），禁止每个路由重复手写。  
4. **授权（资源归属）与鉴权同等重要**：不仅验证登录，还必须验证 `user_id` 归属。  
5. **单一入口**：仅使用 `@/lib/*`，不再保留 `src/lib/*` 兼容层。

---

## 2. 当前推荐架构

### 2.1 认证模型

1. 用户登录后，Supabase 在浏览器写入 session cookie。  
2. 服务端通过 `createServerClient + cookies()/headers()` 读取并验证 session。  
3. Route Handler 使用同一服务端 client 获取当前用户。  
4. 前端调用同域 `/api/*` 时默认依赖 cookie，不依赖手动 token 管理。

### 2.2 目录与职责

1. `lib/supabase/client.ts`：浏览器端 Supabase client（仅客户端交互）。  
2. `lib/supabase/server.ts`：服务端 Supabase client（读取 cookie/session）。  
3. `lib/supabase/admin.ts`：仅服务端受限场景使用（严禁直接暴露到用户请求链路）。  
4. `lib/auth/require-user.ts`：Route Handler 统一鉴权入口。  
5. `proxy.ts`：路由级粗粒度保护（仅保护页面路由，不做细业务授权）。

---

## 3. 实现规范（必须遵守）

### 3.1 页面鉴权（Server-first）

1. 受保护页面优先使用 Server Component。  
2. 页面内直接 `await createClient()` + `supabase.auth.getUser()`。  
3. 未登录直接 `redirect('/sign-in')` 或 `unauthorized()`。  
4. 禁止在客户端 `useEffect` 里先渲染再 `router.push('/sign-in')`。

示例：

```tsx
// app/dashboard/page.tsx (Server Component)
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: resumes } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)

  return <div>{/* render */}</div>
}
```

### 3.2 API 鉴权（统一封装）

所有 `app/api/**/route.ts` 统一复用：

```ts
// lib/auth/require-user.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, supabase, response: null as NextResponse<unknown> | null }
}
```

调用方式：

```ts
export async function GET() {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response

  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data ?? [] })
}
```

### 3.3 授权（资源归属）规范

1. 任何带 `id` 的查询/更新/删除都必须追加 `eq('user_id', user.id)`。  
2. 若目标表无 `user_id`（如 `resume_content`），先通过主表（`resumes`）校验归属。  
3. 任何“只校验已登录，不校验归属”的接口都视为安全漏洞。

### 3.4 `proxy.ts` 规范

1. 仅做页面访问保护与 session 刷新。  
2. matcher 仅覆盖受保护页面路径（如 `/dashboard/:path*`）。  
3. 不建议把所有 `/api/*` 都放进 matcher，避免额外开销和行为耦合。  
4. 业务授权留给 Route Handler 内部处理。

### 3.5 客户端请求规范

1. 前端调用同域 API：`fetch('/api/...')` 即可，依赖 cookie。  
2. `authenticatedFetch` 若继续保留，仅作为过渡层，不新增新依赖。  
3. 长期目标：移除显式 `Authorization: Bearer` 注入逻辑（同域场景）。

---

## 4. Next.js 最佳实践对齐点

1. **Data Patterns**：读请求优先服务端直接获取，减少前后端瀑布。  
2. **Route Handlers**：对外 API / webhook 用 Route Handler；站内表单写操作优先 Server Actions。  
3. **Error Handling**：补齐 `app/unauthorized.tsx`、`app/forbidden.tsx`，统一 401/403 体验。  
4. **Async Patterns**：统一使用异步 `cookies()` / `headers()`（项目已符合）。  
5. **File Conventions**：Next 16 使用 `proxy.ts`（项目已采用）。

---

## 5. 分阶段改造计划（建议执行顺序）

### Phase A（安全优先，P0）

1. 全量排查 `app/api/**/route.ts`，补齐资源归属校验。  
2. 禁止 admin client 直接服务用户态读取/导出。  
3. 将所有 API 鉴权统一为 `requireApiUser()`。

### Phase B（体验与性能，P1）

1. 把 `dashboard/profile/resume/*` 页面改成服务端鉴权。  
2. 移除页面内 `useEffect + getUser + router.push` 模式。  
3. 对独立数据块使用 `Promise.all` / Suspense，减少串行等待。

### Phase C（收敛与维护，P2）

1. 彻底统一 `@/lib/*` 入口。  
2. 逐步下线 `authenticatedFetch` 的 Bearer 注入。  
3. 将 UI 写操作逐步迁移到 Server Actions（保留外部 API 的 Route Handlers）。

---

## 6. 安全检查清单（上线前）

- [ ] 所有写接口都要求已登录。  
- [ ] 所有按资源 ID 操作都校验 `user_id` 归属。  
- [ ] 未登录访问受保护页面不会先渲染业务内容。  
- [ ] 没有用户态请求直接使用 `SUPABASE_SERVICE_ROLE_KEY`。  
- [ ] 401/403/404 返回语义清晰且前端可处理。  
- [ ] 日志中不打印 access token、cookie、service role key。  

---

## 7. 测试建议

### 7.1 最小回归用例

1. 未登录访问 `/dashboard` -> 跳转 `/sign-in`。  
2. A 用户访问 B 用户 `resume_id` -> 404 或 403。  
3. 已登录用户正常 CRUD 自己的简历。  
4. 登出后再次请求 `/api/resumes` -> 401。  

### 7.2 自动化建议

1. 为 `requireApiUser()` 写单元测试（已登录/未登录分支）。  
2. 为关键 API（`resumes`、`share`、`stats`）补授权测试。  
3. E2E 覆盖登录、创建、编辑、导出、登出闭环。

---

## 8. 反模式（禁止）

1. 在客户端组件中把 token 存 `localStorage` 作为主会话来源。  
2. 仅校验“已登录”，不校验“资源归属”。  
3. API 路由重复复制鉴权模板代码。  
4. 在用户态路径中直接查询 admin client。  
5. 同时维护多套 import 入口（`lib/*` 与 `src/lib/*`）。

---

## 9. 参考文件（本项目）

1. `proxy.ts`  
2. `lib/supabase/client.ts`  
3. `lib/supabase/server.ts`  
4. `lib/supabase/admin.ts`  
5. `lib/auth/require-user.ts`  
6. `app/api/**/route.ts`
