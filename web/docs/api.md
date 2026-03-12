# API 文档

本文档描述简历编辑器项目的所有后端 API 接口。

## 认证方式

所有 API 接口（除公开分享接口外）使用 **Bearer Token** 认证。

```http
Authorization: Bearer <supabase-access-token>
```

前端使用 `authenticatedFetch` 工具函数自动附加 Token。

---

## 简历管理

### 获取简历列表

```http
GET /api/resumes
```

获取当前用户的所有简历列表。

**响应**
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "简历标题",
      "template": "Modern",
      "color_theme": "#2b8cee",
      "share_uuid": "uuid",
      "share_permission": "public|private|password",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 创建简历

```http
POST /api/resumes
Content-Type: application/json

{
  "title": "简历标题",
  "template": "Modern|Classic|Creative",
  "color_theme": "#2b8cee"
}
```

创建新简历，自动根据模板生成示例内容。

**响应**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "简历标题",
  "template": "Modern",
  "color_theme": "#2b8cee",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 获取单份简历

```http
GET /api/resumes/:id
```

获取指定简历的完整数据（包含元数据和内容）。

**响应**
```json
{
  "id": "uuid",
  "title": "简历标题",
  "template": "Modern",
  "color_theme": "#2b8cee",
  "updated_at": "2024-01-01T00:00:00Z",
  "content_json": {
    "personal": { "full_name": "", "title": "", ... },
    "summary": "",
    "education": [],
    "experience": [],
    "projects": [],
    "skills": [],
    "certificates": []
  }
}
```

---

### 更新简历

```http
PATCH /api/resumes/:id
Content-Type: application/json

{
  "title": "新标题",
  "template": "Classic",
  "color_theme": "#ff0000",
  "content_json": { ... }
}
```

更新简历元数据或内容。更新内容时会自动保存版本历史（保留最近5个版本）。

**响应**
```json
{ "ok": true }
```

---

### 删除简历

```http
DELETE /api/resumes/:id
```

删除简历及其所有相关数据（内容、版本历史、统计数据）。

**响应**
```json
{ "ok": true }
```

---

### 上传简历 PDF

```http
POST /api/resumes/:id/pdf
Content-Type: multipart/form-data

file: <PDF文件>
```

上传简历的 PDF 文件到 Supabase Storage。

**限制**
- 文件类型：仅接受 `application/pdf`
- 文件大小：最大 10MB

**响应**
```json
{
  "ok": true,
  "path": "user_id/resume_id.pdf"
}
```

---

## AI 分析

### 简历分析

```http
POST /api/ai/analyze
Content-Type: application/json

{
  "resumeContent": { ... },
  "resumeId": "uuid",
  "forceReanalyze": false
}
```

使用 AI 分析简历内容，提供评分和改进建议。支持结果缓存，相同内容不会重复调用 AI。

**请求参数**
- `resumeContent` (必需): 简历内容对象
- `resumeId` (可选): 简历 ID，用于保存分析历史和权限校验
- `forceReanalyze` (可选): 强制重新分析，忽略缓存

**响应**
```json
{
  "overall_score": 75,
  "scores": {
    "content_completeness": 70,
    "structure": 80,
    "expression": 75
  },
  "content_completeness": {
    "missing_sections": ["项目成果"],
    "recommendations": ["添加更多量化数据"]
  },
  "structure": {
    "recommendations": ["使用更清晰的模块划分"]
  },
  "expression": {
    "rewrite_examples": ["改进前后对比示例"]
  },
  "is_cached": true,
  "cached_at": "2024-01-01T00:00:00Z",
  "cached_model": "openai"
}
```

---

### JD 匹配分析

```http
POST /api/ai/jd-match
Content-Type: application/json

{
  "resumeContent": { ... },
  "jdText": "岗位描述全文",
  "resumeId": "uuid",
  "forceRematch": false
}
```

使用 AI 对当前简历与目标 JD 做匹配评分，返回优势关键词、缺口关键词和可执行建议。支持结果缓存，相同简历内容与相同 JD 不会重复调用 AI。

**请求参数**
- `resumeContent` (必需): 简历内容对象
- `jdText` (必需): 完整岗位描述文本
- `resumeId` (可选): 简历 ID，用于权限校验与保存分析历史
- `forceRematch` (可选): 强制重新匹配，忽略缓存

**响应**
```json
{
  "match_score": 82,
  "strengths": ["React", "TypeScript", "Design System"],
  "gaps": ["A/B Testing", "SQL"],
  "recommendations": [
    "在项目经历中补充与业务增长相关的量化结果",
    "把设计系统经验写成跨团队协作成果"
  ],
  "is_cached": true,
  "cached_at": "2024-01-01T00:00:00Z",
  "cached_model": "openai"
}
```

---

## 分享管理

### 创建分享链接

```http
POST /api/share
Content-Type: application/json

{
  "resume_id": "uuid",
  "permission": "public|private|password",
  "password": "访问密码"
}
```

为简历创建公开分享链接。

**权限类型**
- `public`: 公开访问
- `private`: 仅创建者可访问
- `password`: 密码保护

**响应**
```json
{
  "share_uuid": "uuid",
  "permission": "public"
}
```

---

### 获取分享内容

```http
GET /api/share/:uuid?password=xxx
```

公开接口，无需认证。获取分享简历的完整内容。

**请求头**
- 密码保护分享可通过 `?password=xxx` 查询参数或 `X-Password` 请求头传递密码

**响应**
```json
{
  "resume": {
    "id": "uuid",
    "title": "简历标题",
    "template": "Modern",
    "color_theme": "#2b8cee",
    "share_permission": "public"
  },
  "content": {
    "resume_id": "uuid",
    "content_json": { ... }
  }
}
```

**注意**: 访问公开分享链接会自动增加浏览统计计数。

---

## 用户资料

### 获取用户资料

```http
GET /api/profile
```

获取当前用户的资料信息。资料不存在时自动创建空资料。

**响应**
```json
{
  "display_name": "用户名",
  "avatar_url": "https://..."
}
```

---

### 更新用户资料

```http
POST /api/profile
Content-Type: application/json

{
  "display_name": "新用户名"
}
```

更新用户显示名称。

**验证规则**
- 长度：2-32 字符
- 允许字符：字母、数字、空格、下划线、点、连字符

**响应**
```json
{ "ok": true }
```

---

### 上传头像

```http
POST /api/profile/avatar
Content-Type: multipart/form-data

file: <图片文件>
```

上传用户头像到 Supabase Storage。

**限制**
- 文件类型：PNG、JPG、JPEG
- 文件大小：最大 2MB

**响应**
```json
{
  "ok": true,
  "avatar_url": "https://..."
}
```

---

## 统计数据

### 记录统计

```http
POST /api/stats
Content-Type: application/json

{
  "resume_id": "uuid",
  "type": "pdf_download|share_view"
}
```

记录简历的统计数据（PDF下载次数或分享浏览次数）。

**响应**
```json
{ "ok": true }
```

---

## 错误响应

所有接口在出错时返回以下格式：

```json
{
  "error": "错误描述"
}
```

**HTTP 状态码**
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未认证（缺少或无效 Token）
- `403` - 无权限（如密码错误）
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## 数据类型

### ResumeContent

```typescript
{
  personal?: {
    full_name?: string
    email?: string
    phone?: string
    title?: string
    linkedin?: string
    portfolio?: string
  }
  summary?: string
  education?: Array<{
    school?: string
    degree?: string
    year?: string
  }>
  experience?: Array<{
    company?: string
    role?: string
    from?: string
    to?: string
    highlights?: string[]
  }>
  projects?: Array<{
    name?: string
    description?: string
    highlights?: string[]
  }>
  skills?: string[]
  certificates?: string[]
}
```

---

## 数据库表结构

### resumes
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 所属用户 |
| title | text | 简历标题 |
| template | text | 模板名称 |
| color_theme | text | 主题颜色 |
| share_uuid | uuid | 分享唯一标识 |
| share_permission | text | 分享权限 |
| share_password_hash | text | 分享密码哈希 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### resume_content
| 字段 | 类型 | 说明 |
|------|------|------|
| resume_id | uuid | 主键，关联 resumes |
| content_json | jsonb | 简历内容 |

### resume_content_versions
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| resume_id | uuid | 关联简历 |
| content_json | jsonb | 历史版本内容 |
| created_at | timestamptz | 保存时间 |

### ai_analysis_history
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| resume_id | uuid | 关联简历 |
| type | text | 分析类型 (resume/jd) |
| model | text | AI 模型 |
| input_hash | text | 输入内容哈希 |
| output_json | jsonb | 分析结果 |
| created_at | timestamptz | 分析时间 |

### resume_stats
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| resume_id | uuid | 关联简历 |
| type | text | 统计类型 |
| count | int | 计数 |
| created_at | timestamptz | 记录时间 |

### profiles
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 主键，关联 auth.users |
| display_name | text | 显示名称 |
| avatar_url | text | 头像 URL |
| created_at | timestamptz | 创建时间 |
