// ── Lichtgewicht Supabase REST client (geen npm-package nodig) ────────
// Gebruikt de Supabase PostgREST API direct via fetch.
// Stel in via environment variables:
//   SUPABASE_URL       → bijv. https://abc123.supabase.co
//   SUPABASE_ANON_KEY  → je project's anon/public key

const URL_ = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL;

const KEY_ = process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isConfigured() {
  return !!(URL_ && KEY_);
}

function baseHeaders(extra = {}) {
  return {
    'apikey':        KEY_,
    'Authorization': `Bearer ${KEY_}`,
    'Content-Type':  'application/json',
    ...extra,
  };
}

// ── Oefeningen opslaan ────────────────────────────────────────────────
// Verwacht een array van exercise-objecten.
// Geeft de opgeslagen rijen terug inclusief hun Supabase UUID.
export async function saveExercises(exercises) {
  if (!isConfigured()) throw new Error('Supabase niet geconfigureerd');

  const VALID_QT = ['blokken_bouwsel', 'vul_in', 'goed_fout', 'vermenigvuldig_tabel', 'getallenlijn', 'standaard'];
  const rows = exercises.map(ex => ({
    title:       ex.title,
    original:    ex.original,
    type:        ex.type,
    confidence:  ex.confidence,
    difficulty:  ex.difficulty,
    topic:       ex.topic,
    format:      ex.format,
    note:        ex.note,
    variants:    ex.variants ?? [],   // JSONB — includes rekensom_data per variant
    rekensom_data: ex.rekensom_data ?? null,   // JSONB
    question_type: VALID_QT.includes(ex.question_type) ? ex.question_type : 'standaard',
    source_file_type:
      ex.source_file_type === 'pdf_tabel' || ex.source_file_type === 'handmatig_json'
        ? ex.source_file_type
        : null,
    block_goal_grid:
      ex.block_goal_grid
      ?? ex.doel_grid
      ?? null,
    block_answer_grid:
      ex.block_answer_grid
      ?? ex.antwoord_grid
      ?? null,
    block_plan_grid:
      ex.block_plan_grid
      ?? ex.plattegrond_grid
      ?? null,
    block_option_a_grid:
      ex.block_option_a_grid
      ?? ex.bouwsel_a_grid
      ?? null,
    block_option_b_grid:
      ex.block_option_b_grid
      ?? ex.bouwsel_b_grid
      ?? null,
    block_interaction_type:
      ['tellen', 'goedFout', 'bouwen', 'meerkeuze'].includes(ex.block_interaction_type)
        ? ex.block_interaction_type
        : null,
    block_correct_option:
      String(ex.block_correct_option || '').trim().toUpperCase() === 'B'
        ? 'B'
        : (ex.block_correct_option ? 'A' : null),
    block_max_height: Number.isFinite(Number(ex.block_max_height))
      ? Math.max(1, Math.min(20, Math.round(Number(ex.block_max_height))))
      : 5,
    source_page_image_data_url: ex.source_page_image_data_url ?? null,
    page:        ex.page,
    source_file: ex.source_file ?? null,
  }));

  // Build fallback payloads: strip unknown columns one by one if DB hasn't been migrated yet.
  const payloadVariants = [
    rows,
    rows.map(({ rekensom_data, ...rest }) => rest),
    rows.map(({ rekensom_data, block_interaction_type, ...rest }) => rest),
  ];

  for (let i = 0; i < payloadVariants.length; i += 1) {
    const res = await fetch(`${URL_}/rest/v1/exercises`, {
      method:  'POST',
      headers: baseHeaders({ 'Prefer': 'return=representation' }),
      body:    JSON.stringify(payloadVariants[i]),
    });

    if (res.ok) return res.json();

    const txt = await res.text().catch(() => res.statusText);

    if (res.status === 400 && (txt.includes('rekensom_data') || txt.includes('block_interaction_type') || txt.includes('question_type'))) continue;

    throw new Error(`Supabase save fout (${res.status}): ${txt}`);
  }
}

// ── Één oefening ophalen op UUID ──────────────────────────────────────
export async function getExerciseById(id) {
  if (!isConfigured()) throw new Error('Supabase niet geconfigureerd');

  const res = await fetch(
    `${URL_}/rest/v1/exercises?id=eq.${id}&select=*`,
    { headers: baseHeaders(), next: { revalidate: 60 } }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase get fout (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  return rows[0] ?? null;
}

// ── Alle oefeningen ophalen ───────────────────────────────────────────
export async function getAllExercises() {
  if (!isConfigured()) throw new Error('Supabase niet geconfigureerd');

  const BASE_COLS = [
    'id', 'created_at', 'title', 'original', 'type', 'question_type',
    'confidence', 'difficulty', 'topic', 'format', 'note', 'variants',
    'source_file_type', 'block_goal_grid', 'block_answer_grid',
    'block_plan_grid', 'block_is_match', 'block_max_height', 'page', 'source_file',
    'block_option_a_grid', 'block_option_b_grid', 'block_correct_option',
  ];

  // Try with new columns first, fall back gracefully if DB hasn't been migrated yet.
  for (const cols of [
    [...BASE_COLS, 'block_interaction_type', 'rekensom_data'],
    [...BASE_COLS, 'block_interaction_type'],
    BASE_COLS,
  ]) {
    const res = await fetch(
      `${URL_}/rest/v1/exercises?select=${cols.join(',')}&order=created_at.desc`,
      { headers: baseHeaders(), next: { revalidate: 0 } }
    );

    if (res.ok) return res.json();

    const txt = await res.text().catch(() => res.statusText);

    if (res.status === 400 && (txt.includes('block_interaction_type') || txt.includes('rekensom_data'))) continue;

    throw new Error(`Supabase list fout (${res.status}): ${txt}`);
  }
}

// ── Submission opslaan ────────────────────────────────────────────────
// Slaat een student-antwoord op voor een oefening
export async function saveSubmission(exerciseId, sessionId, difficultyLevel, answer, isCorrect, submittedGrid = null) {
  if (!isConfigured()) return null; // Silent fail in demo mode

  const payload = {
    exercise_id: exerciseId,
    session_id: sessionId,
    difficulty_level: difficultyLevel,
    answer: answer ?? null,
    is_correct: isCorrect ?? null,
    submitted_grid: submittedGrid ?? null,
  };

  const res = await fetch(`${URL_}/rest/v1/submissions`, {
    method: 'POST',
    headers: baseHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`Submission save fout (${res.status}):`, await res.text().catch(() => res.statusText));
    return null;
  }

  const rows = await res.json();
  return rows[0] ?? null;
}

// ── Alle submissions voor een student ophalen ──────────────────────────
export async function getSubmissionsBySession(sessionId) {
  if (!isConfigured()) return [];

  const res = await fetch(
    `${URL_}/rest/v1/submissions?session_id=eq.${sessionId}&select=*&order=created_at.desc`,
    { headers: baseHeaders(), next: { revalidate: 10 } }
  );

  if (!res.ok) {
    console.error(`Submissions fetch fout (${res.status}):`, await res.text().catch(() => res.statusText));
    return [];
  }

  return res.json();
}

// ── Submissions voor specifieke oefening ophalen ────────────────────────
export async function getSubmissionsByExercise(exerciseId, sessionId) {
  if (!isConfigured()) return [];

  const res = await fetch(
    `${URL_}/rest/v1/submissions?exercise_id=eq.${exerciseId}&session_id=eq.${sessionId}&select=*&order=created_at.desc`,
    { headers: baseHeaders(), next: { revalidate: 10 } }
  );

  if (!res.ok) {
    console.error(`Exercise submissions fetch fout (${res.status}):`, await res.text().catch(() => res.statusText));
    return [];
  }

  return res.json();
}

export { isConfigured };
