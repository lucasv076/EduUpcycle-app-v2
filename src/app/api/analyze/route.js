// ── API Route: /api/analyze ─────────────────────────────────────────
// Ontvangt geëxtraheerde PDF-tekst en stuurt die naar Groq API
// (OpenAI-compatible) om oefeningen te herkennen en te classificeren.
//
// Als er geen GROQ_API_KEY is geconfigureerd, returnt de route
// een foutmelding zodat de client naar demo-modus kan switchen.

import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/ai-prompt';

function normalizeGrid(rawGrid, maxHeight = 5) {
  if (!Array.isArray(rawGrid) || rawGrid.length === 0) return null;

  const rows = rawGrid.map((row) => {
    if (!Array.isArray(row) || row.length === 0) return null;
    const mapped = row.map((cell) => {
      const value = Number(cell);
      if (!Number.isFinite(value)) return null;
      const intValue = Math.round(value);
      if (intValue < 0 || intValue > maxHeight) return null;
      return intValue;
    });

    return mapped.some((v) => v === null) ? null : mapped;
  });

  if (rows.some((r) => r === null)) return null;
  return rows;
}

function parseExercisesFromContent(content) {
  const trimmed = String(content || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fenced?.[1] || trimmed;
  const parsed = JSON.parse(jsonCandidate);

  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.exercises)) return parsed.exercises;
  return [];
}

function buildUserContentParts(pages, includeImages = true) {
  const MAX_CHARS_PER_PAGE = 1200;
  const parts = [
    {
      type: 'text',
      text: 'Analyseer de volgende pagina\'s uit een Zwijsen-werkboek. Gebruik zowel de tekst als de afbeelding om oefeningen te herkennen, inclusief blokkenbouwsels.',
    },
  ];

  pages.forEach((p) => {
    parts.push({
      type: 'text',
      text: `--- PAGINA ${p.page} (${p.fileName || 'onbekend'}) ---\n${String(p.text || '').slice(0, MAX_CHARS_PER_PAGE)}`,
    });

    if (includeImages && typeof p.aiImageDataUrl === 'string' && p.aiImageDataUrl.startsWith('data:image/')) {
      parts.push({
        type: 'image_url',
        image_url: { url: p.aiImageDataUrl },
      });
    }
  });

  return parts;
}

function normalizeExercise(exercise, index, sourcePages) {
  const sourcePage = sourcePages[index % sourcePages.length] || {};
  const questionTypeRaw = typeof exercise?.question_type === 'string'
    ? exercise.question_type
    : typeof exercise?.vraagtype === 'string'
      ? exercise.vraagtype
      : null;
  const question_type = questionTypeRaw === 'blokken_bouwsel' ? 'blokken_bouwsel' : 'standaard';

  const sourceFileTypeRaw = typeof exercise?.source_file_type === 'string'
    ? exercise.source_file_type
    : typeof exercise?.bronbestand_type === 'string'
      ? exercise.bronbestand_type
      : null;
  const parsedSourceFileType = sourceFileTypeRaw === 'pdf_tabel' || sourceFileTypeRaw === 'handmatig_json'
    ? sourceFileTypeRaw
    : null;

  const blockMaxHeightRaw = Number(
    exercise?.block_max_height
    ?? exercise?.max_height
    ?? 5
  );
  const block_max_height = Number.isFinite(blockMaxHeightRaw)
    ? Math.max(1, Math.min(20, Math.round(blockMaxHeightRaw)))
    : 5;

  const block_goal_grid = normalizeGrid(
    exercise?.block_goal_grid ?? exercise?.doel_grid,
    block_max_height
  );

  const block_answer_grid = normalizeGrid(
    exercise?.block_answer_grid ?? exercise?.antwoord_grid,
    block_max_height
  );

  const block_plan_grid = normalizeGrid(
    exercise?.block_plan_grid ?? exercise?.plattegrond_grid,
    block_max_height
  );

  const parsedBlockIsMatch = typeof exercise?.block_is_match === 'boolean'
    ? exercise.block_is_match
    : null;

  const source_file_type = question_type === 'blokken_bouwsel'
    ? (parsedSourceFileType || 'pdf_tabel')
    : parsedSourceFileType;

  const normalizedPlanGrid = question_type === 'blokken_bouwsel'
    ? (block_plan_grid || block_goal_grid)
    : block_plan_grid;

  const block_is_match = question_type === 'blokken_bouwsel'
    ? (parsedBlockIsMatch ?? true)
    : parsedBlockIsMatch;

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
      : question_type === 'blokken_bouwsel'
        ? 'Blokkenbouwsel'
      : 'Open vraag',
    question_type,
    source_file_type,
    block_goal_grid,
    block_answer_grid,
    block_plan_grid: normalizedPlanGrid,
    block_is_match,
    block_max_height,
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
      aiImageDataUrl: typeof p?.aiImageDataUrl === 'string' ? p.aiImageDataUrl : null,
    }));

    if (safePages.length === 0) {
      return NextResponse.json(
        { error: 'NO_PAGES', message: 'Geen pagina-tekst ontvangen.' },
        { status: 400 }
      );
    }

    // Groq via OpenAI-compatible endpoint
    const model = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

    const messagesWithImages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildUserContentParts(safePages, true),
      },
    ];

    const messagesTextOnly = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildUserContentParts(safePages, false),
      },
    ];

    const buildRequestBody = (messages) => JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4096,
      messages,
    });

    const hasImages = safePages.some((p) => typeof p.aiImageDataUrl === 'string' && p.aiImageDataUrl.startsWith('data:image/'));
    let requestBody = buildRequestBody(hasImages ? messagesWithImages : messagesTextOnly);
    let usedVision = hasImages;
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

    if (!response.ok && usedVision && response.status === 400) {
      const rawVisionError = await response.text().catch(() => '');
      const msg = (() => {
        try { return JSON.parse(rawVisionError)?.error?.message || ''; } catch { return ''; }
      })();
      const mayBeVisionUnsupported = /image|vision|content|multimodal/i.test(msg || rawVisionError);
      if (mayBeVisionUnsupported) {
        requestBody = buildRequestBody(messagesTextOnly);
        usedVision = false;
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: requestBody,
        });
      }
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
