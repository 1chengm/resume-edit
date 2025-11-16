import { describe, it, expect } from 'vitest'
import { sanitizeResume } from '../sanitize'

describe('sanitizeResume', () => {
  it('removes name/phone/email and replaces school/company', () => {
    const input = {
      personal: { full_name: '张三', phone: '123', email: 'a@b.com' },
      education: [{ school: 'ABC大学' }],
      experience: [{ company: 'Acme Inc' }]
    }
    const out = sanitizeResume(input)
    expect(out.personal?.full_name).toBeUndefined()
    expect(out.personal?.phone).toBeUndefined()
    expect(out.personal?.email).toBeUndefined()
    expect(out.education?.[0].school).toBe('某大学')
    expect(out.experience?.[0].company).toBe('某企业')
  })
})