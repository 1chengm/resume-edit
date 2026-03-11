import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

type Prompts = {
  ai_system_prompts: Record<string, { description: string; content: string }>
}

let cached: Prompts | null = null

export function loadPrompts(): Prompts {
  if (cached) return cached
  const file = path.join(process.cwd(), 'prompts', 'system-prompts.yaml')
  const raw = fs.readFileSync(file, 'utf-8')
  cached = YAML.parse(raw)
  return cached!
}

export function getPrompt(key: string): string {
  const p = loadPrompts()
  const item = p.ai_system_prompts[key]
  if (!item) throw new Error(`Prompt not found: ${key}`)
  return item.content
}