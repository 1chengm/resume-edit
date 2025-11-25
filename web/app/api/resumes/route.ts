import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // 使用统一的服务端客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.from('resumes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}


export async function POST(req: NextRequest) {
  // 使用统一的服务端客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const title = body.title || '未命名简历'
  const template = body.template || 'Modern'
  const color_theme = body.color_theme || '#2b8cee'

  const { data, error } = await supabase.from('resumes').insert({
    user_id: user.id,
    title,
    template,
    color_theme
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mock = (() => {
    if (template === 'Classic') {
      return {
        personal: { full_name: '张三', title: '产品经理', phone: '138-0000-0000', email: 'user@example.com', linkedin: 'linkedin.com/in/user', portfolio: 'user.dev' },
        summary: '资深产品经理，擅长跨部门协作与数据驱动决策。',
        education: [{ school: '某大学', degree: 'MBA', year: '2018' }],
        experience: [{ company: '某企业', role: '产品经理', from: '2019', to: '至今', highlights: ['负责核心产品路线规划', '推动营收增长 20%'] }],
        projects: [{ name: 'SaaS 平台优化', description: '提升留存与转化', highlights: ['AB 测试优化', '用户调研与需求分析'] }],
        skills: ['产品规划', '数据分析', '项目管理'],
        certificates: ['PMP']
      }
    }
    if (template === 'Creative') {
      return {
        personal: { full_name: '李四', title: 'UI/UX 设计师', phone: '139-0000-0000', email: 'designer@example.com', linkedin: 'linkedin.com/in/designer', portfolio: 'designer.art' },
        summary: '热爱设计与用户体验，擅长高保真原型与动效设计。',
        education: [{ school: '某大学', degree: '设计学学士', year: '2017' }],
        experience: [{ company: '某企业', role: '高级设计师', from: '2020', to: '至今', highlights: ['重塑品牌视觉', '提升转化率 15%'] }],
        projects: [{ name: '移动端重设计', description: '打造统一设计系统', highlights: ['组件库规范', '动效准则'] }],
        skills: ['Figma', '动效', '设计系统'],
        certificates: ['Adobe 认证']
      }
    }
    return {
      personal: { full_name: '王五', title: '前端工程师', phone: '136-0000-0000', email: 'fe@example.com', linkedin: 'linkedin.com/in/fe', portfolio: 'fe.codes' },
      summary: '专注性能与工程化，具备丰富的前端架构经验。',
      education: [{ school: '某大学', degree: '计算机科学学士', year: '2016' }],
      experience: [{ company: '某企业', role: '高级前端工程师', from: '2019', to: '至今', highlights: ['主导性能优化，LCP < 2s', '搭建组件库与规范'] }],
      projects: [{ name: '组件库建设', description: '统一 UI 与交互', highlights: ['无障碍支持', '响应式适配'] }],
      skills: ['React', 'TypeScript', '性能优化'],
      certificates: ['前端工程实践认证']
    }
  })()

  const { error: e2 } = await supabase.from('resume_content').insert({ resume_id: data.id, content_json: mock })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json(data)
}