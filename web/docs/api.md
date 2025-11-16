# 接口文档

## 鉴权
- `GET /dashboard`：服务端会话校验，未登录重定向到 `/sign-in`

## 简历
- `GET /api/resumes`：返回当前用户简历列表
- `POST /api/resumes`：创建简历（title、template、color_theme 可选）
- `GET /api/resumes/{id}`：返回 `resume_content`
- `PATCH /api/resumes/{id}`：更新 `resume_content` 与简历元数据
- `DELETE /api/resumes/{id}`：删除简历（级联删除内容）

## AI
- `POST /api/ai/analyze`：请求体 `{ resumeContent, resumeId }`，返回结构化分析 JSON
- `POST /api/ai/jd-match`：请求体 `{ resumeContent, jdText, resumeId }`，返回匹配度与建议 JSON

## 分享
- `POST /api/share`：请求体 `{ resume_id, permission, password? }`，设置分享并返回 `share_uuid`
- `GET /api/share/{uuid}`：读取分享内容；密码模式需 `?password=` 或头部 `x-password`

## 统计
- `POST /api/stats`：请求体 `{ type, resume_id }`，累加统计（pdf_download、share_view）