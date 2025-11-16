import type { ResumeContent } from '@/types/resume'

const SCHOOL_PLACEHOLDER = '某大学'
const COMPANY_PLACEHOLDER = '某企业'

export function sanitizeResume(content: ResumeContent): ResumeContent {
  const cloned = JSON.parse(JSON.stringify(content))

  function removeSensitive(obj: unknown) {
    if (!obj || typeof obj !== 'object') return
    const rec = obj as Record<string, unknown>
    for (const key of Object.keys(rec)) {
      const v = rec[key]
      const lower = key.toLowerCase()

      if (['name', 'full_name', 'realname'].includes(lower)) {
        delete rec[key]
        continue
      }
      if (['phone', 'mobile', 'tel', 'email'].includes(lower)) {
        delete rec[key]
        continue
      }
      if (lower.includes('school')) {
        if (typeof v === 'string') rec[key] = SCHOOL_PLACEHOLDER
      }
      if (lower.includes('company') || lower.includes('employer') || lower.includes('organization')) {
        if (typeof v === 'string') rec[key] = COMPANY_PLACEHOLDER
      }

      if (Array.isArray(v)) (v as unknown[]).forEach(removeSensitive)
      else if (typeof v === 'object' && v) removeSensitive(v)
    }
  }

  removeSensitive(cloned)
  return cloned
}