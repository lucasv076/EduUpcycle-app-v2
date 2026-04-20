// ── API Route: /api/analyze ─────────────────────────────────────────
// Ontvangt geëxtraheerde PDF-tekst en stuurt die naar Groq API
// (OpenAI-compatible) om oefeningen te herkennen en te classificeren.
//
// Als er geen GROQ_API_KEY is geconfigureerd, returnt de route
// een foutmelding zodat de client naar demo-modus kan switchen.

import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/ai-prompt';

function parseExercisesFromContent(content) {
  const trimmed = String(content || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fenced?.[1] || trimmed;
  const parsed = JSON.parse(jsonCandidate);

  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.exercises)) return parsed.exercises;
  return [];
}

function normalizeExercise(exercise, index, sourcePages) {
  const sourcePage = sourcePages[index % sourcePages.length] || {};
  const title = typeof exercise?.title === 'string' && exercise.title.trim().length > 0
    ? exercise.title.trim()
    : `Oefening ${index + 1}`;
  const original = typeof exercise?.original === 'string'
    ? exercise.original.trim()
    : typeof exercise?.content === 'string'
      ? exercise.content.trim()
      : '';
  const confidenceRaw = Number(exercise?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
    : 70;

  const variants = Array.isArray(exercise?.variants)
    ? exercise.variants
        .filter(v => v && typeof v.text === 'string' && v.text.trim().length > 0)
        .slice(0, 2)
        .map((v, i) => ({
          level: typeof v.level === 'string' && v.level.trim().length > 0
            ? v.level.trim()
            : (i === 0 ? 'Makkelijker' : 'Moeilijker'),
          text: v.text.trim(),
        }))
    : [];

  return {
    ...exercise,
    id: index + 1,
    page: Number.isFinite(Number(exercise?.page)) ? Number(exercise.page) : (sourcePage.page || 1),
    fileName: typeof exercise?.fileName === 'string' && exercise.fileName.trim().length > 0
      ? exercise.fileName
      : (sourcePage.fileName || ''),
    title,
    original,
    type: typeof exercise?.type === 'string' && exercise.type.trim().length > 0
      ? exercise.type.trim()
      : 'Open vraag',
    confidence,
    difficulty: typeof exercise?.difficulty === 'string' && exercise.difficulty.trim().length > 0
      ? exercise.difficulty.trim()
      : 'Gemiddeld',
    topic: typeof exercise?.topic === 'string' && exercise.topic.trim().length > 0
      ? exercise.topic.trim()
      : 'Onbekend onderwerp',
    format: typeof exercise?.format === 'string' && exercise.format.trim().length > 0
      ? exercise.format.trim()
      : 'Open antwoordvak',
    note: typeof exercise?.note === 'string' ? exercise.note : '',
    variants,
    status: null,
  };
}

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'NO_API_KEY', message: 'Geen AI API key geconfigureerd. App draait in demo-modus.' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    const safePages = pages.map((p, index) => ({
      page: Number.isFinite(Number(p?.page)) ? Number(p.page) : index + 1,
      text: typeof p?.text === 'string' ? p.text : '',
      fileName: typeof p?.fileName === 'string' ? p.fileName : '',
    }));

    if (safePages.length === 0) {
      return NextResponse.json(
        { error: 'NO_PAGES', message: 'Geen pagina-tekst ontvangen.' },
        { status: 400 }
      );
    }

    // Combineer alle pagina-teksten met paginanummers
    const MAX_CHARS_PER_PAGE = 1200;
    const combinedText = safePages
      .map(p => `--- PAGINA ${p.page} ---\n${p.text.slice(0, MAX_CHARS_PER_PAGE)}`)
      .join('\n\n');

    // Groq via OpenAI-compatible endpoint
    const model = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

       const requestBody = JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyseer de volgende geëxtraheerde tekst uit een Zwijsen-werkboek PDF:\n\n${combinedText}`,
        },
      ],
    });
  // Bij 503 (overbelast) één keer opnieuw proberen na korte wachttijd
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: requestBody,
      });
      if (response.status !== 503) break;
    }
    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      let msg = '';
      try { msg = JSON.parse(rawText)?.error?.message || ''; } catch {}
      console.error('Groq API error:', response.status, rawText.slice(0, 300));
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'RATE_LIMIT', message: 'Groq rate limit bereikt — even wachten.' },
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
            : `Groq API fout (${response.status}): ${msg || rawText.slice(0, 120) || 'Onbekende fout'}`,
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

    // Parse JSON uit het antwoord (strip eventuele markdown code blocks)
    let exercises;
    try {
      exercises = parseExercisesFromContent(content);
    } catch (e) {
      console.error('JSON parse error:', e.message, '\nRaw content:', content);
      return NextResponse.json(
        { error: 'PARSE_ERROR', message: 'AI-antwoord kon niet worden geparsed als JSON.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(exercises)) {
      return NextResponse.json(
        { error: 'PARSE_ERROR', message: 'AI-antwoord bevat geen geldige oefeningenlijst.' },
        { status: 500 }
      );
    }

    const enriched = exercises.map((ex, i) => normalizeExercise(ex, i, safePages));

    return NextResponse.json({ exercises: enriched, mode: 'ai' });

  } catch (error) {
    console.error('Analyze route error:', error);
    return NextResponse.json(
      { error: 'INTERNAL', message: error.message },
      { status: 500 }
    );
  }
}
