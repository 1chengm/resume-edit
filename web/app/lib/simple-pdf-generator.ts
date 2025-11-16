import html2pdf from 'html2pdf.js'

export async function generateSimplePDF(element: HTMLElement, filename: string = 'document.pdf'): Promise<void> {
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  await html2pdf().from(element).set(opt).save()
}

export async function generateSimplePDFBlob(element: HTMLElement): Promise<Blob> {
  const opt = {
    margin: 10,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  return await html2pdf().from(element).set(opt).outputPdf('blob')
}