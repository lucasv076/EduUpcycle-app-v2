// ── API Route: /api/analyze ─────────────────────────────────────────
// Gebruikt de native Gemini generateContent API (niet de OAI-compat laag)
// zodat multimodale afbeeldingen betrouwbaar werken via inline_data.

import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/ai-prompt';

function generateFallbackBlockGrids(maxH) {
  const cap = Math.min(maxH, 3);
  const rows = 3;
  const cols = 3;

  const goalGrid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * (cap + 1)))
  );
  if (goalGrid.flat().every(v => v === 0)) goalGrid[1][1] = 1;

  // Wrong option: identical copy with exactly one cell changed
  const wrongGrid = goalGrid.map(r => [...r]);
  let changed = false;
  for (let y = 0; y < rows && !changed; y++) {
    for (let x = 0; x < cols && !changed; x++) {
      if (wrongGrid[y][x] > 0) {
        wrongGrid[y][x] = wrongGrid[y][x] < cap ? wrongGrid[y][x] + 1 : wrongGrid[y][x] - 1;
        changed = true;
      }
    }
  }

  const correctOption = Math.random() < 0.5 ? 'A' : 'B';
  return {
    optionA: correctOption === 'A' ? goalGrid : wrongGrid,
    optionB: correctOption === 'B' ? goalGrid : wrongGrid,
    correctOption,
    planGrid: goalGrid,
  };
}

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

  const block_option_a_grid = normalizeGrid(
    exercise?.block_option_a_grid ?? exercise?.bouwsel_a_grid,
    block_max_height
  );

  const block_option_b_grid = normalizeGrid(
    exercise?.block_option_b_grid ?? exercise?.bouwsel_b_grid,
    block_max_height
  );

  const parsedCorrectOption = typeof exercise?.block_correct_option === 'string'
    ? exercise.block_correct_option.trim().toUpperCase()
    : null;

  const blockInteractionTypeRaw = typeof exercise?.block_interaction_type === 'string'
    ? exercise.block_interaction_type.trim().toLowerCase()
    : null;
  const VALID_INTERACTION_TYPES = ['tellen', 'goedFout', 'bouwen', 'meerkeuze'];
  const block_interaction_type = question_type === 'blokken_bouwsel'
    ? (VALID_INTERACTION_TYPES.includes(blockInteractionTypeRaw) ? blockInteractionTypeRaw : 'goedFout')
    : null;

  const source_file_type = question_type === 'blokken_bouwsel'
    ? (parsedSourceFileType || 'pdf_tabel')
    : parsedSourceFileType;

  const block_correct_option = question_type === 'blokken_bouwsel'
    ? (parsedCorrectOption === 'B' ? 'B' : 'A')
    : null;

  // The plan shown to the student MUST match the correct option exactly.
  // AI generates these independently so we enforce the invariant here.
  const correctGrid = question_type === 'blokken_bouwsel'
    ? (block_correct_option === 'B' ? block_option_b_grid : block_option_a_grid)
    : null;

  // Plan/goal grid: use the correct option's grid so they always match.
  // Fall back to AI-supplied plan/goal only if we have no option grids at all.
  const normalizedPlanGrid = question_type === 'blokken_bouwsel'
    ? (correctGrid || block_plan_grid || block_goal_grid)
    : block_plan_grid;

  const normalizedGoalGrid = question_type === 'blokken_bouwsel'
    ? (correctGrid || block_goal_grid || block_plan_grid)
    : block_goal_grid;

  // If AI didn't supply option grids, generate fallback grids so the exercise is usable.
  let finalOptionA = block_option_a_grid;
  let finalOptionB = block_option_b_grid;
  let finalCorrectOption = block_correct_option;
  let finalPlanGrid = normalizedPlanGrid;
  let finalGoalGrid = normalizedGoalGrid;
  let block_auto_generated = false;

  if (question_type === 'blokken_bouwsel' && (!finalOptionA || !finalOptionB)) {
    const fallback = generateFallbackBlockGrids(block_max_height);
    finalOptionA = fallback.optionA;
    finalOptionB = fallback.optionB;
    finalCorrectOption = fallback.correctOption;
    finalPlanGrid = fallback.planGrid;
    finalGoalGrid = fallback.planGrid;
    block_auto_generated = true;
  }

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
    block_interaction_type,
    source_file_type,
    block_goal_grid: finalGoalGrid,
    block_answer_grid,
    block_plan_grid: finalPlanGrid,
    block_option_a_grid: finalOptionA,
    block_option_b_grid: finalOptionB,
    block_correct_option: finalCorrectOption,
    block_auto_generated,
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

const GRID_EXTRACT_PROMPT = `Je ziet een bovenaanzicht (plattegrond) van een blokkenbouwsel: een raster met getallen.
Lees de getallen cel voor cel: rij voor rij, van links naar rechts, van boven naar beneden.
Elk getal is het aantal blokken op die positie (0 = leeg vakje).

Geef als antwoord uitsluitend dit JSON-object:
{ "grid": [[rij1cel1, rij1cel2, ...], [rij2cel1, ...], ...] }

Geen uitleg, geen extra tekst.`;

async function extractGridFromPage(exercise, safePages, apiKey, model) {
  const sourcePage = safePages.find(p => p.page === exercise.page) || safePages[0];
  if (!sourcePage?.aiImageDataUrl) return null;

  const messages = [
    { role: 'system', content: GRID_EXTRACT_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Pagina ${sourcePage.page} — lees het blokkenbouwsel-raster uit de afbeelding.` },
        { type: 'image_url', image_url: { url: sourcePage.aiImageDataUrl } },
      ],
    },
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const rawGrid = parsed?.grid;
    const grid = normalizeGrid(rawGrid, exercise.block_max_height ?? 5);
    if (!grid) return null;

    // Bouw opties op basis van het echte grid
    const wrongGrid = grid.map(r => [...r]);
    let changed = false;
    outer: for (let y = 0; y < wrongGrid.length; y++) {
      for (let x = 0; x < wrongGrid[y].length; x++) {
        const v = wrongGrid[y][x];
        const cap = exercise.block_max_height ?? 5;
        if (v > 0) {
          wrongGrid[y][x] = v < cap ? v + 1 : v - 1;
          changed = true;
          break outer;
        }
      }
    }
    if (!changed && wrongGrid.length > 0 && wrongGrid[0].length > 0) {
      wrongGrid[0][0] = 1;
    }

    const correctOption = Math.random() < 0.5 ? 'A' : 'B';
    return {
      block_plan_grid: grid,
      block_goal_grid: grid,
      block_option_a_grid: correctOption === 'A' ? grid : wrongGrid,
      block_option_b_grid: correctOption === 'B' ? grid : wrongGrid,
      block_correct_option: correctOption,
    };
  } catch {
    return null;
  }
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
      response_format: { type: 'json_object' },
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
      exercises = parseExercisesFromContent(content);
    } catch (e) {
      console.error('JSON parse mislukt:', e.message, '\nRaw:', content.slice(0, 500));
      exercises = [];
    }

    if (!Array.isArray(exercises)) {
      return NextResponse.json(
        { error: 'PARSE_ERROR', message: 'AI-antwoord bevat geen geldige oefeningenlijst.' },
        { status: 500 }
      );
    }

    const enriched = exercises.map((ex, i) => normalizeExercise(ex, i, safePages));

    // Tweede pass: voor blokkenbouwsels met auto-gegenereerde grids, probeer grid alsnog te lezen.
    const autoGenerated = enriched.filter(ex => ex.block_auto_generated);
    if (autoGenerated.length > 0) {
      const gridResults = await Promise.all(
        autoGenerated.map(ex => extractGridFromPage(ex, safePages, apiKey, model))
      );
      gridResults.forEach((extracted, i) => {
        if (!extracted) return;
        const ex = autoGenerated[i];
        const idx = enriched.indexOf(ex);
        if (idx === -1) return;
        enriched[idx] = { ...ex, ...extracted, block_auto_generated: false };
      });
    }

    return NextResponse.json({ exercises: enriched, mode: 'ai' });

  } catch (error) {
    console.error('Analyze route error:', error);
    return NextResponse.json(
      { error: 'INTERNAL', message: error.message },
      { status: 500 }
    );
  }
}
