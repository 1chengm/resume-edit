import html2pdf from 'html2pdf.js'

export async function generateSimplePDF(element: HTMLElement, filename: string = 'document.pdf'): Promise<void> {
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      ignoreElements: (el: Element) => {
        const cls = (el as HTMLElement).classList
        return cls?.contains('material-symbols-outlined')
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  await html2pdf().from(element).set(opt).save()
}

export async function generateSimplePDFBlob(element: HTMLElement): Promise<Blob> {
  const opt = {
    margin: 10,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      ignoreElements: (el: Element) => {
        const cls = (el as HTMLElement).classList
        return cls?.contains('material-symbols-outlined')
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  return await html2pdf().from(element).set(opt).outputPdf('blob')
}

function sanitizeColor(c?: string): string {
  if (!c) return '#000000'
  const m = c.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  return m ? c : '#000000'
}

export async function generateResumePDFFromData(content: any, meta: any, opts?: { filename?: string }) {
  const title = (meta?.title as string) || '未命名简历'
  const theme = sanitizeColor(meta?.color_theme as string)
  const toLines = (a: any) => Array.isArray(a) ? a : []
  const toStr = (s: any) => (typeof s === 'string' ? s : '')

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#000000;background:#ffffff;margin:0;padding:20px}
    .page{width:210mm;min-height:297mm;margin:0 auto;background:#ffffff;padding:20mm;box-sizing:border-box}
    h1{font-size:28px;font-weight:700;margin:0 0 6px 0;color:${theme}}
    h2{font-size:18px;font-weight:700;margin:16px 0 8px 0;border-bottom:2px solid ${theme};padding-bottom:6px}
    .muted{color:#444444}
    .row{display:flex;justify-content:space-between;align-items:center}
    .list{margin:6px 0 0 18px;padding:0}
    .list li{margin:4px 0}
    .chip{display:inline-block;background:#eeeeee;color:#333333;font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;margin:2px}
    .section{margin-top:14px}
  </style></head><body>
    <div class="page">
      <header style="border-bottom:2px solid ${theme};padding-bottom:10px;margin-bottom:12px">
        <h1>${toStr(content?.personal?.full_name) || '姓名'}</h1>
        <div class="muted">${toStr(content?.personal?.title) || '职称'}</div>
        <div class="muted" style="margin-top:6px">${[toStr(content?.personal?.phone), toStr(content?.personal?.email), toStr(content?.personal?.linkedin), toStr(content?.personal?.portfolio)].filter(Boolean).join(' · ')}</div>
      </header>
      <section class="section">
        <h2>职业概述</h2>
        <div style="font-size:14px;line-height:1.6;white-space:pre-line">${toStr(content?.summary) || '在此填写个人简介。'}</div>
      </section>
      ${toLines(content?.education).length ? `<section class="section"><h2>教育经历</h2>
        ${toLines(content?.education).map((e:any)=>`<div style="margin:6px 0"><div class="row"><div style="font-weight:600">${toStr(e?.degree)}</div><div class="muted">${toStr(e?.year)}</div></div><div style="font-style:italic">${toStr(e?.school)}</div></div>`).join('')}
      </section>`:''}
      ${toLines(content?.experience).length ? `<section class="section"><h2>工作经历</h2>
        ${toLines(content?.experience).map((e:any)=>`<div style="margin:8px 0"><div class="row"><div style="font-weight:600">${toStr(e?.role)}</div><div class="muted">${toStr(e?.from)} - ${toStr(e?.to)}</div></div><div style="font-style:italic">${toStr(e?.company)}</div>${toLines(e?.highlights).length?`<ul class="list">${toLines(e?.highlights).map((h:string)=>`<li>${toStr(h)}</li>`).join('')}</ul>`:''}</div>`).join('')}
      </section>`:''}
      ${toLines(content?.projects).length ? `<section class="section"><h2>项目经验</h2>
        ${toLines(content?.projects).map((p:any)=>`<div style="margin:8px 0"><div style="font-weight:600">${toStr(p?.name)}</div><div style="font-style:italic">${toStr(p?.description)}</div>${toLines(p?.highlights).length?`<ul class="list">${toLines(p?.highlights).map((h:string)=>`<li>${toStr(h)}</li>`).join('')}</ul>`:''}</div>`).join('')}
      </section>`:''}
      ${toLines(content?.skills).length ? `<section class="section"><h2>技能</h2>
        <div>${toLines(content?.skills).map((s:string)=>`<span class="chip">${toStr(s)}</span>`).join('')}</div>
      </section>`:''}
      ${toLines(content?.certificates).length ? `<section class="section"><h2>证书</h2>
        <div>${toLines(content?.certificates).map((c:string)=>`<span class="chip">${toStr(c)}</span>`).join('')}</div>
      </section>`:''}
    </div>
  </body></html>`

  const opt = {
    margin: 10,
    filename: opts?.filename || `${title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  await html2pdf().from(html).set(opt).save()
}

export async function generateResumePDFBlobFromData(content: any, meta: any): Promise<Blob> {
  const theme = sanitizeColor(meta?.color_theme as string)
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:0;padding:20px}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:20mm;box-sizing:border-box}h1{font-size:28px;font-weight:700;margin:0 0 6px 0}h2{font-size:18px;font-weight:700;margin:16px 0 8px 0;border-bottom:2px solid ${theme};padding-bottom:6px}.muted{color:#444}.row{display:flex;justify-content:space-between;align-items:center}.list{margin:6px 0 0 18px;padding:0}.list li{margin:4px 0}.chip{display:inline-block;background:#eee;color:#333;font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;margin:2px}.section{margin-top:14px}</style></head><body><div class="page"></div></body></html>`
  const opt = { margin: 10, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }
  return await html2pdf().from(html).set(opt).outputPdf('blob')
}