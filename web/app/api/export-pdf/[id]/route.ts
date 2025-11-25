import { NextRequest, NextResponse } from 'next/server'
import { getBrowser } from '@/src/lib/puppeteer'
import { createSupabaseAdminClient } from '@/src/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const id = urlParts[urlParts.length - 1]

  if (!id) {
    return new NextResponse('Resume ID is required', { status: 400 })
  }

  const supabase = createSupabaseAdminClient();
  // Ensure the resume exists
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', id)
    .single()

  if (error || !resume) {
    console.error('Failed to fetch resume:', error?.message)
    return new NextResponse('Resume not found', { status: 404 })
  }

  const secret = process.env.RENDER_SECRET || 'internal-render-secret'
  const url = `${new URL(req.url).origin}/render/${id}?secret=${secret}`

  try {
    const browser = await getBrowser();
    const page = await browser.newPage()

    // Set viewport to A4 dimensions (approx) to ensure correct layout rendering
    await page.setViewport({ width: 794, height: 1123 })

    await page.goto(url, { waitUntil: 'networkidle0' })

    // Inject CSS to ensure single page and remove extra margins
    await page.addStyleTag({
      content: `
        @page { size: auto; margin: 0mm; }
        html, body { height: 100%; overflow: hidden; margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `
    })

    // Give the page a moment to render any final client-side JS
    await new Promise(r => setTimeout(r, 1000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      },
      preferCSSPageSize: true,
    })

    await browser.close()

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
