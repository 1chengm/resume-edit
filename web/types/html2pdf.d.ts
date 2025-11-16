declare module 'html2pdf.js' {
  export interface Html2Pdf {
    from(el: HTMLElement): Html2Pdf;
    save(filename?: string): Promise<void>;
    outputPdf(type?: 'blob'): Promise<Blob>;
  }
  export default function html2pdf(): Html2Pdf;
}