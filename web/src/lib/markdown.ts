function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function transformInline(s: string) {
  const esc = escapeHtml(s)
  const bold = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const italic = bold.replace(/\*(.+?)\*/g, '<em>$1</em>')
  const img = italic.replace(/!\[(.*?)\]\((https?:[^)\s]+)\)/g, '<img src="$2" alt="$1" />')
  const link = img.replace(/\[(.*?)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
  return link
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^##\s+/.test(line)) { out.push(`<h2>${transformInline(line.replace(/^##\s+/, ''))}</h2>`); i++; continue }
    if (/^#\s+/.test(line)) { out.push(`<h1>${transformInline(line.replace(/^#\s+/, ''))}</h1>`); i++; continue }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(`<li>${transformInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`); i++ }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    if (/^-\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^-\s+/.test(lines[i])) { items.push(`<li>${transformInline(lines[i].replace(/^-\s+/, ''))}</li>`); i++ }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    if (line.trim().length === 0) { i++; continue }
    out.push(`<p>${transformInline(line)}</p>`)
    i++
  }
  return out.join('')
}