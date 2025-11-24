import { NextRequest, NextResponse } from 'next/server'
import { getBrowser } from '@/src/lib/puppeteer'
import { createSupabaseAdminClient } from '@/src/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const urlParts = req.nextUrl.pathname.split('/')
  const id = urlParts[urlParts.length - 1]

  if (!id) {
    return new NextResponse('Resume ID is required', { status: 400 })
  }

  const supabase = createSupabaseAdminClient();
  // Ensure the resume exists and get its share_uuid for the public URL
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('share_uuid')
    .eq('id', id)
    .single()

  if (error || !resume || !resume.share_uuid) {
    console.error('Failed to fetch resume or resume is not shared:', error?.message)
    return new NextResponse('Resume not found or sharing not enabled', { status: 404 })
  }

  const url = `${new URL(req.url).origin}/s/${resume.share_uuid}`

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
      scale: 0.9 // Scale down slightly to ensure content fits without clipping
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
