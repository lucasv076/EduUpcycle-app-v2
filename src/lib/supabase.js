// ── Lichtgewicht Supabase REST client (geen npm-package nodig) ────────
// Gebruikt de Supabase PostgREST API direct via fetch.
// Stel in via environment variables:
//   SUPABASE_URL       → bijv. https://abc123.supabase.co
//   SUPABASE_ANON_KEY  → je project's anon/public key

const URL_  = process.env.SUPABASE_URL;
const KEY_  = process.env.SUPABASE_ANON_KEY;

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

  const rows = exercises.map(ex => ({
    title:       ex.title,
    original:    ex.original,
    type:        ex.type,
    confidence:  ex.confidence,
    difficulty:  ex.difficulty,
    topic:       ex.topic,
    format:      ex.format,
    note:        ex.note,
    variants:    ex.variants ?? [],   // JSONB
    page:        ex.page,
    source_file: ex.source_file ?? null,
  }));

  const res = await fetch(`${URL_}/rest/v1/exercises`, {
    method:  'POST',
    headers: baseHeaders({ 'Prefer': 'return=representation' }),
    body:    JSON.stringify(rows),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase save fout (${res.status}): ${txt}`);
  }

  return res.json(); // Array van opgeslagen rijen
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

  const res = await fetch(
    `${URL_}/rest/v1/exercises?select=*&order=created_at.desc`,
    { headers: baseHeaders(), next: { revalidate: 30 } }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase list fout (${res.status}): ${txt}`);
  }

  return res.json();
}

export { isConfigured };
