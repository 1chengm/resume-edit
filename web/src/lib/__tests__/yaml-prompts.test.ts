import { describe, it, expect } from 'vitest'
import { getPrompt } from '../yaml-prompts'

describe('yaml prompts', () => {
  it('loads resume analysis prompt', () => {
    const p = getPrompt('ai_resume_analysis_prompt')
    expect(p).toContain('简历分析')
  })
})