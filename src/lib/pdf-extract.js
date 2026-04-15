// ── Client-side PDF extractie met pdf.js ─────────────────────────────
// Extraheert tekst per pagina EN rendert elke pagina als afbeelding.

let pdfjsLib = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  // Worker instellen (Vercel-compatible)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/**
 * Extraheert tekst en renders per pagina uit een PDF-bestand.
 * @param {File} file - Het geüploade PDF-bestand
 * @returns {Promise<Array<{ page: number, text: string, imageDataUrl: string }>>}
 */
export async function extractPdfPages(file) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // ── Tekst extraheren ──
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // ── Pagina als afbeelding renderen ──
    const scale = 1.5; // Balans tussen kwaliteit en performance
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    pages.push({
      page: i,
      text,
      imageDataUrl,
    });
  }

  return pages;
}
