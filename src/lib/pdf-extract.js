// ── Client-side PDF extractie met pdf.js ─────────────────────────────
// Extraheert tekst per pagina EN rendert elke pagina als afbeelding.

let pdfjsLib = null;

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Loading chunk .* failed|ChunkLoadError/i.test(message);
}

async function loadPdfJsModule() {
  try {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (mod?.GlobalWorkerOptions && mod?.getDocument) return mod;
  } catch {}

  try {
    const mod = await import('pdfjs-dist/build/pdf.mjs');
    if (mod?.GlobalWorkerOptions && mod?.getDocument) return mod;
  } catch {}

  try {
    const mod = await import('pdfjs-dist');
    if (mod?.GlobalWorkerOptions && mod?.getDocument) return mod;
  } catch {}

  throw new Error('PDF_JS_LOAD_FAILED');
}

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  try {
    pdfjsLib = await loadPdfJsModule();
  } catch (firstError) {
    // Retry 1x bij chunk-load issues (bijv. stale dev chunks na HMR/restart).
    if (!isChunkLoadError(firstError)) {
      throw firstError;
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      pdfjsLib = await loadPdfJsModule();
    } catch (secondError) {
      const error = new Error('PDF_JS_LOAD_FAILED');
      error.cause = secondError;
      throw error;
    }
  }

  // Worker instellen (Vercel-compatible)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  return pdfjsLib;
}

/**
 * Extraheert tekst en renders per pagina uit een PDF-bestand.
 * @param {File} file - Het geüploade PDF-bestand
 * @returns {Promise<Array<{ page: number, text: string, imageDataUrl: string, aiImageDataUrl: string }>>}
 */
export async function extractPdfPages(file) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    let text = '';
    let imageDataUrl = null;
    let aiImageDataUrl = null;

    try {
      // ── Tekst extraheren ──
      const textContent = await page.getTextContent();
      text = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      // Fallback: laat tekst leeg zodat de pipeline door kan gaan.
      console.warn(`[pdf-extract] Tekstextractie mislukt op pagina ${i}:`, error?.message || error);
    }

    try {
      // ── Pagina als afbeelding renderen ──
      const scale = 1.5; // Balans tussen kwaliteit en performance
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Versie voor vision-analyse: hogere resolutie zodat rastergetallen leesbaar blijven.
        const maxAiWidth = 1024;
        const ratio = Math.min(1, maxAiWidth / canvas.width);
        const aiCanvas = document.createElement('canvas');
        aiCanvas.width = Math.max(1, Math.round(canvas.width * ratio));
        aiCanvas.height = Math.max(1, Math.round(canvas.height * ratio));
        const aiCtx = aiCanvas.getContext('2d');
        if (aiCtx) {
          aiCtx.drawImage(canvas, 0, 0, aiCanvas.width, aiCanvas.height);
          aiImageDataUrl = aiCanvas.toDataURL('image/jpeg', 0.82);
        }
      }
    } catch (error) {
      // Fallback: geen afbeelding voor deze pagina, maar wel doorgaan.
      console.warn(`[pdf-extract] Renderen mislukt op pagina ${i}:`, error?.message || error);
    }

    pages.push({
      page: i,
      text,
      imageDataUrl,
      aiImageDataUrl,
    });
  }

  return pages;
}
