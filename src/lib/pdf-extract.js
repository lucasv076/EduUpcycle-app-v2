// ── Client-side PDF extractie met pdf.js ─────────────────────────────
// Extraheert tekst per pagina EN rendert elke pagina als afbeelding.

let pdfjsLib = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  return pdfjsLib;
}

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

    // ── Weergaveafbeelding (1.5x schaal) ──
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // ── Kleinere versie voor API-aanroepen (0.7x schaal) ──
    const apiViewport = page.getViewport({ scale: 0.7 });
    const apiCanvas = document.createElement('canvas');
    apiCanvas.width = apiViewport.width;
    apiCanvas.height = apiViewport.height;
    await page.render({ canvasContext: apiCanvas.getContext('2d'), viewport: apiViewport }).promise;
    const apiImageDataUrl = apiCanvas.toDataURL('image/jpeg', 0.65);

    pages.push({ page: i, text, imageDataUrl, apiImageDataUrl });
  }

  return pages;
}
