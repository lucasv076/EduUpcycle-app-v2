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

    // ── Weergave- én API-afbeelding (1.5x schaal, hoge kwaliteit voor ingescande PDFs) ──
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Gebruik dezelfde hoge kwaliteit voor de API — ingescande PDFs vereisen dit zodat
    // de AI de tekst uit de afbeelding kan lezen (geen tekstlaag beschikbaar).
    const apiImageDataUrl = imageDataUrl;

    pages.push({ page: i, text, imageDataUrl, apiImageDataUrl });
  }

  return pages;
}
