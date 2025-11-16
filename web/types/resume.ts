export type ResumeContent = {
  personal?: {
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