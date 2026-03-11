# 项目下一步操作清单

> 更新时间：2026-03-10
> 基于鉴权优化审计与 PDF 导出方案变更

---

## 一、鉴权模块（安全修复）

### 🔴 P0 - 必须修复

#### 1. 修复 `app/api/stats/route.ts` 资源归属校验缺失

**问题**：当前接口接受客户端传来的 `resume_id`，但未校验该简历是否属于当前用户。

**当前代码**（line 17-26）：
```typescript
const { data } = await supabase.from('resume_stats').select('id,count')
  .eq('resume_id', resume_id)  // 直接使用客户端传来的 ID
  .eq('type', type).single()
```

**修复方案**：
```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = body.type
  const resume_id = body.resume_id
  if (!type || !resume_id) {
    return NextResponse.json({ error: 'Missing type or resume_id' }, { status: 400 })
  }

  // 新增：校验资源归属
  const { data: resume } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', resume_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  // 原有统计逻辑...
}
```

---

### 🟡 P2 - 可选优化

#### 2. 提取统一鉴权封装（减少重复模板代码）

**背景**：多个 API 路由重复以下代码：
```typescript
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**方案**：创建 `lib/auth/require-user.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase: null as any,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return { user, supabase, response: null }
}

// 使用示例
export async function GET() {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response

  // 继续业务逻辑...
}
```

#### 3. 清理 ESLint 警告

当前鉴权相关文件的警告：
- `app/api/ai/analyze/route.ts:3` - 导入的 `z` 未使用
- `app/api/profile/route.ts:11` - `req` 参数未使用
- `app/api/resumes/route.ts:4` - `req` 参数未使用

---

## 二、PDF 导出模块（技术债务清理）

### 🔴 P1 - 清理无头浏览器相关代码

> 背景：已切换为原生浏览器 API (`window.print()`) 打印 PDF，不再需要 Puppeteer/Chromium。

#### 1. 删除文件

| 文件路径 | 说明 |
|---------|------|
| `src/lib/puppeteer.ts` | Puppeteer/Chromium 浏览器启动逻辑 |
| `app/api/export-pdf/[id]/route.ts` | 服务端 PDF 生成 API |
| `app/api/export-html-as-pdf/route.ts` | HTML 转 PDF API |
| `lib/simple-pdf-generator.ts` | 废弃的客户端 PDF 生成（返回 placeholder） |

#### 2. 卸载依赖

```bash
npm uninstall puppeteer puppeteer-core @sparticuz/chromium
```

#### 3. 修改配置

**`next.config.ts`**：
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 删除以下配置
  // serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
};

export default nextConfig;
```

#### 4. 更新业务代码

**`app/resume/[id]/export-share/page.tsx`**：

当前 `generatePDF()` 函数调用服务端 API，需要改为原生打印：

```typescript
// 替换原有的 generatePDF 函数
async function generatePDF() {
  const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
  if (!id) {
    alert('无法生成 PDF：缺少简历 ID')
    return
  }

  setGeneratingPDF(true)
  try {
    // 方式1：简单打印
    window.print()

    // 方式2：如需自定义文件名，可通过 iframe 或动态创建打印窗口
    // const printWindow = window.open('', '_blank')
    // printWindow?.document.write(...)
    // printWindow?.print()

    // 记录统计
    await authenticatedFetch('/api/stats', {
      method: 'POST',
      body: JSON.stringify({ type: 'pdf_download', resume_id: id })
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    alert('生成 PDF 失败，请重试')
  } finally {
    setGeneratingPDF(false)
  }
}
```

**CSS 打印样式**（`app/globals.css`）：
```css
@media print {
  /* 隐藏不需要打印的元素 */
  .no-print {
    display: none !important;
  }

  /* 确保背景色打印 */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 页面设置 */
  @page {
    size: A4;
    margin: 10mm;
  }
}
```

#### 5. 可选：移除环境变量

如果 `RENDER_SECRET` 仅用于 PDF 导出鉴权，现在可以移除：

```bash
# .env 文件中删除
RENDER_SECRET=xxx
```

**注意**：如果 `app/render/[id]/page.tsx` 仍用于其他用途（如分享预览），保留该变量。

---

## 三、可选：移除 Playwright（如不再使用）

如不再进行 E2E 测试，可一并清理：

```bash
npm uninstall @playwright/test
rm playwright.config.ts
rm -rf tests/e2e/
```

---

## 四、执行优先级建议

```
优先级 任务                                预估工作量
─────────────────────────────────────────────────────────
P0     修复 stats 路由资源归属校验           10 分钟
P1     删除 PDF 相关文件和依赖               15 分钟
P1     更新 export-share 页面使用原生打印     30 分钟
P2     提取 requireApiUser 统一封装          20 分钟
P2     清理 ESLint 警告                      5 分钟
P2     移除 Playwright（如不需要）           5 分钟
```

---

## 五、验证清单

- [ ] `app/api/stats/route.ts` 已添加资源归属校验
- [ ] `npm run build` 成功无报错
- [ ] PDF 导出功能正常工作（使用浏览器原生打印）
- [ ] 其他功能（分享、编辑、分析）不受影响
- [ ] 环境变量清理后重启服务验证

---

## 参考文档

- [鉴权优化审计](./auth-optimization-audit.md)
