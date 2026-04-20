// ── API Route: /api/analyze ─────────────────────────────────────────
// Gebruikt de native Gemini generateContent API (niet de OAI-compat laag)
// zodat multimodale afbeeldingen betrouwbaar werken via inline_data.

import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/ai-prompt';

export const maxDuration = 60;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'NO_API_KEY', message: 'Geen Gemini API key geconfigureerd. App draait in demo-modus.' },
      { status: 400 }
    );
  }

  try {
    const { pages } = await request.json();

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'NO_PAGES', message: 'Geen pagina-tekst ontvangen.' },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Bouw de parts op: tekst + afbeeldingen per pagina
    const parts = [
      { text: "Analyseer de volgende werkboekpagina's uit een Zwijsen-werkboek en identificeer ALLE oefeningen en opdrachten. Lever het resultaat als JSON-array precies zoals beschreven." },
    ];

    for (const p of pages) {
      parts.push({ text: `--- PAGINA ${p.page} ---` });

      if (p.image && p.image.startsWith('data:')) {
        // Haal mime-type en base64-data op uit de data-URL
        const [meta, b64] = p.image.split(',');
        const mime = meta.replace('data:', '').replace(';base64', '');
        parts.push({ inline_data: { mime_type: mime, data: b64 } });
      } else if (p.text) {
        parts.push({ text: p.text.slice(0, 3000) });
      }
    }

    const requestBody = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Bij 503 tot 4x opnieuw proberen met oplopende wachttijd
    let response;
    const retryDelays = [3000, 6000, 12000, 20000];
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });
      if (response.status !== 503 || attempt === retryDelays.length) break;
      await new Promise(r => setTimeout(r, retryDelays[attempt]));
    }

    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      let msg = '';
      try { msg = JSON.parse(rawText)?.error?.message || ''; } catch {}
      console.error('Gemini API error:', response.status, rawText.slice(0, 500));

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
            ? 'Te veel pagina\'s tegelijk — stuur minder pagina\'s per keer.'
            : `Gemini API fout (${response.status}): ${msg || rawText.slice(0, 200) || 'Onbekende fout'}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    // Native API response: candidates[0].content.parts[0].text
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      const reason = data.candidates?.[0]?.finishReason || 'onbekend';
      console.error('Geen content in Gemini response:', JSON.stringify(data).slice(0, 300));
      return NextResponse.json(
        { error: 'NO_RESPONSE', message: `Geen antwoord van AI (reden: ${reason}).` },
        { status: 500 }
      );
    }

    // Parse JSON — meerdere strategieën
    let exercises;
    try {
      let cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (!cleaned.startsWith('[')) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) cleaned = match[0];
      }

      exercises = JSON.parse(cleaned);
      if (!Array.isArray(exercises)) exercises = [exercises];
    } catch (e) {
      console.error('JSON parse mislukt:', e.message, '\nRaw:', content.slice(0, 500));
      exercises = [];
    }

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
