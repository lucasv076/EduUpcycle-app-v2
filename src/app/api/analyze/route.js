// ── API Route: /api/analyze ─────────────────────────────────────────
// Ontvangt geëxtraheerde PDF-tekst en stuurt die naar Groq API
// (OpenAI-compatible) om oefeningen te herkennen en te classificeren.

import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/ai-prompt';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'NO_API_KEY', message: 'Geen Gemini API key geconfigureerd. App draait in demo-modus.' },
      { status: 400 }
    );
  }

  try {
  
    const { pages, isScanned = false } = await request.json();
    const { pages } = await request.json();

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'NO_PAGES', message: 'Geen pagina-tekst ontvangen.' },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const useVision = pages.some(p => p.image);

    // Bouw de user-message op: vision (gescand) of tekst
    let userContent;
    if (isScanned && pages.some(p => p.image)) {
      // Vision-modus: stuur pagina-afbeeldingen naar Gemini
    if (useVision) {
      userContent = [
        { type: 'text', text: 'Analyseer de volgende werkboekpagina\'s uit een Zwijsen-werkboek. Identificeer alle oefeningen en opdrachten.' },
        { type: 'text', text: "Analyseer de volgende werkboekpagina's uit een Zwijsen-werkboek. Identificeer alle oefeningen en opdrachten." },
        ...pages.flatMap(p => [
          { type: 'text', text: `--- PAGINA ${p.page} ---` },
          { type: 'image_url', image_url: { url: p.image } },
        ]),
      ];
    } else {
      // Tekst-modus
      const MAX_CHARS_PER_PAGE = 2000;
      const combinedText = pages
        .map(p => `--- PAGINA ${p.page} ---\n${(p.text || '').slice(0, MAX_CHARS_PER_PAGE)}`)
        .join('\n\n');
      userContent = `Analyseer de volgende geëxtraheerde tekst uit een Zwijsen-werkboek PDF:\n\n${combinedText}`;
    }
      
      userContent = `Analyseer de volgende geëxtraheerde tekst uit een Zwijsen-werkboek PDF:\n\n${combinedText}`;
    }

    const requestBody = JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
      
        { role: 'user', content: userContent },
      ],
    });

    // Bij 503 (overbelast) tot 4x opnieuw proberen met oplopende wachttijd
    const retryDelays = [3000, 6000, 12000, 20000];
    let response;
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: requestBody,
      });
      if (response.status !== 503) break;
      if (attempt === retryDelays.length - 1) break;
      await new Promise(r => setTimeout(r, retryDelays[attempt]));
    }

    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      let msg = '';
      try { msg = JSON.parse(rawText)?.error?.message || ''; } catch {}
      console.error('Gemini API error:', response.status, rawText.slice(0, 300));
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'RATE_LIMIT', message: 'Gemini rate limit bereikt — even wachten.' },
          { status: 500 }
        );
      }
      const isContextError = response.status === 400 && (
        msg.includes('context') || msg.includes('token') || msg.includes('length')
      );
      return NextResponse.json(
        {
          error: isContextError ? 'CONTEXT_TOO_LONG' : 'API_ERROR',
          message: isContextError
            ? 'Tekst te lang voor AI — stuur minder pagina\'s per keer.'
            : `Gemini API fout (${response.status}): ${msg || rawText.slice(0, 120) || 'Onbekende fout'}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'NO_RESPONSE', message: 'Geen antwoord van AI ontvangen.' },
        { status: 500 }
      );
    }

    // Parse JSON uit het antwoord — probeer meerdere strategieën
    let exercises;
    try {
      let cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // Strategie 2: pak de eerste [ ... ] array uit de tekst
      if (!cleaned.startsWith('[')) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) cleaned = match[0];
      }

      exercises = JSON.parse(cleaned);

      // Zorg dat het altijd een array is
      if (!Array.isArray(exercises)) exercises = [exercises];
    } catch (e) {
      console.error('JSON parse error:', e.message, '\nRaw content:', content.slice(0, 500));
      // Val terug op lege array zodat de app niet crasht
      exercises = [];
    }

    // Voeg page-nummers toe als ze er niet zijn en geef IDs
    const enriched = exercises.map((ex, i) => ({
      ...ex,
      id: i + 1,
      page: ex.page || pages[0]?.page || 1,
      status: null,
    }));

    return NextResponse.json({ exercises: enriched, mode: 'ai' });

  } catch (error) {
    console.error('Analyze route error:', error);
    return NextResponse.json(
      { error: 'INTERNAL', message: error.message },
      { status: 500 }
    );
  }
}
