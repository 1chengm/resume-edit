import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle0' })

    // Give the page a moment to render any final client-side JS
    await new Promise(r => setTimeout(r, 1000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })

    await browser.close()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume.pdf"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}
