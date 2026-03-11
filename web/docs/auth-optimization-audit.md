# 鉴权模块冗余与优化审计（基于 `$vercel-react-best-practices`）

更新时间：2026-03-10

## 执行状态（本轮）

- 已完成阶段 A（安全修复）：
  - `app/api/resumes/[id]/route.ts` 增加资源归属校验。
  - `app/api/share/route.ts` 增加资源归属校验与权限值校验。
  - `app/api/export-pdf/[id]/route.ts` 改为用户态校验，不再直接走 admin 导出。
  - `app/render/[id]/page.tsx` 去掉默认弱口令 secret，强制 `RENDER_SECRET`。
- 已完成阶段 B 关键项（入口收敛）：
  - `lib/*` 作为鉴权实现单入口。
  - `src/lib/*` 改为函数封装转调（兼容层），不再使用 re-export。
  - 项目内部调用已统一到 `@/lib/...`。
  - 删除未使用组件：`components/auth-provider.tsx`、`components/auth/session-check.tsx`。

## 1) 结论摘要

当前项目鉴权层的主要问题不是“功能不可用”，而是“实现分散 + 重复入口 + 部分权限校验缺失”。

高优先级结论：

- 存在**重复/混用入口**：`lib/*` 与 `src/lib/*` 在鉴权工具上并行，导致调用路径不统一。
- 存在**未使用鉴权代码**：`components/auth/session-check.tsx` 未被引用；`useAuth` 也未被消费。
- 存在**权限校验漏洞**（比冗余更严重）：
  - `app/api/resumes/[id]/route.ts` 的 `GET/PATCH/DELETE` 只校验“已登录”，未校验资源归属。
  - `app/api/share/route.ts` 更新分享配置时未限制 `user_id`。
  - `app/api/export-pdf/[id]/route.ts` 使用 admin client，且未校验当前用户是否拥有该简历。

## 2) 你提到的重复文件结论

### `authenticatedFetch` 两个文件

- `src/lib/authenticatedFetch.ts`：真实实现。
- `lib/authenticatedFetch.ts`：仅 re-export 转发。

当前属于“别名兼容层 + 实现层”关系，确实会让代码阅读和维护时产生重复感。

## 3) 发现清单（按优先级）

## P0（先改）

1. 资源归属校验缺失  
   文件：`app/api/resumes/[id]/route.ts`（行 14-19、62、66、80-81）  
   问题：按 `id` 直接查改删，未附加 `user_id = 当前用户`。

2. 分享接口缺失归属校验  
   文件：`app/api/share/route.ts`（行 31）  
   问题：`update(payload).eq('id', resume_id)` 未限制 `user_id`。

3. PDF 导出接口权限过宽  
   文件：`app/api/export-pdf/[id]/route.ts`（行 13-19）  
   问题：admin client 仅验证简历存在，不验证归属；知道 `id` 即可导出。

## P1（尽快改）

4. 鉴权入口混用（`@/lib/...` 与 `@/src/lib/...`）  
   典型文件：  
   - `app/dashboard/page.tsx`（`@/src/lib/authenticatedFetch`）  
   - `app/resume/[id]/analysis/client.tsx`（`@/lib/authenticatedFetch`）  
   - `app/(auth)/sign-in/page.tsx`（`@/src/lib/supabase/client`）  
   问题：同类能力多入口，容易产生“改一处漏一处”。

5. `AuthProvider` 与页面鉴权重复  
   文件：`components/auth-provider.tsx` + 多个页面内 `supabase.auth.getUser()`  
   问题：全局监听和页面级拉取并存，且 `useAuth` 未被业务组件使用。

6. 未使用组件  
   文件：`components/auth/session-check.tsx`  
   问题：无任何引用，属于纯冗余。

7. middleware 多余逻辑与覆盖过宽  
   文件：`middleware.ts`  
   问题：  
   - `isPublicRoute` 变量定义后未使用（行 41-47）。  
   - matcher 覆盖 `/api/*`，导致 API 也会先跑一次 `getSession()`，引入额外开销。

## P2（结构优化）

8. API 路由重复写 `createClient + getUser + 401` 模板  
   影响文件：`app/api/*` 多处。  
   建议：提取 `requireApiUser()` 或 `withApiAuth()`，统一鉴权入口与错误格式。

9. `create-resume` Server Route 未复用统一 server client  
   文件：`app/actions/create-resume/route.ts`  
   问题：手写 `createServerClient`，与 `lib/supabase/server.ts` 重复。

## 4) 建议修改方案（分阶段）

## 阶段 A（必须先做，安全修复）

目标：堵住权限漏洞。

建议改动：

- `app/api/resumes/[id]/route.ts`
  - 所有查询/更新/删除都加 `eq('user_id', user.id)`（对 `resumes` 表）。
  - 对 `resume_content` 先通过 `resumes` 校验归属，再查 `resume_content`。
- `app/api/share/route.ts`
  - 更新语句改为 `.eq('id', resume_id).eq('user_id', user.id)`。
- `app/api/export-pdf/[id]/route.ts`
  - 改用普通 server client + `getUser` 校验归属，避免直接用 admin client 对外暴露导出能力。

## 阶段 B（去冗余 + 统一入口）

目标：让鉴权调用“只有一个正确姿势”。

建议改动：

- 统一 import 入口为 `@/lib/...`（推荐）或 `@/src/lib/...`（二选一，不混用）。
- 处理 `authenticatedFetch`：
  - 方案 1（推荐）：保留 `lib/authenticatedFetch.ts` 实现，删除 `src/lib/authenticatedFetch.ts`。
  - 方案 2：保留 `src/lib/authenticatedFetch.ts`，但项目内禁止直接引用 `@/src/lib/authenticatedFetch`，只走 `@/lib/authenticatedFetch`。
- 删除未使用文件：`components/auth/session-check.tsx`。
- 若继续保留 `AuthProvider`，至少移除未用 `useAuth`；若不需要全局上下文，可移除 `AuthProvider` 并让页面完全依赖 middleware + API 401。

## 阶段 C（可维护性提升）

- 新增 `lib/auth/require-user.ts`（或 `lib/api/with-auth.ts`）统一：
  - 创建 server client
  - 获取 user
  - 返回统一 401 JSON
- `app/actions/create-resume/route.ts` 复用 `@/lib/supabase/server`，避免再次手写 cookie adapter。

## 5) 建议修改文件列表（执行清单）

高优先级（安全）：

- `app/api/resumes/[id]/route.ts`
- `app/api/share/route.ts`
- `app/api/export-pdf/[id]/route.ts`

中优先级（去冗余）：

- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `app/resume/[id]/edit/page.tsx`
- `app/resume/[id]/export-share/page.tsx`
- `app/resume/[id]/jd-match/page.tsx`
- `app/(auth)/sign-in/page.tsx`
- `components/auth-provider.tsx`
- `components/auth/session-check.tsx`
- `lib/authenticatedFetch.ts`
- `src/lib/authenticatedFetch.ts`
- `middleware.ts`
- `app/actions/create-resume/route.ts`

可选（统一封装）：

- `lib/auth/require-user.ts`（新建）
- `lib/supabase/server.ts`（如需增强统一行为）

## 6) 备注（与 Vercel Best Practices 对齐）

- `server-auth-actions`：所有 API/Server Route 的鉴权与授权应一致，避免“只鉴权不鉴权资源归属”。
- `async-parallel`：在必须读取多个资源时可并行，但要先确保权限边界正确。
- `bundle/barrel` 相关：当前 `lib` 与 `src/lib` 的双入口本质是历史兼容层，建议收敛为单入口降低维护成本。
