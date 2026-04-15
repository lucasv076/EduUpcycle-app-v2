-- ── EduUpcycle: database migratie ───────────────────────────────────
-- Uitvoeren in: Supabase Dashboard → SQL Editor → New query
-- Of via: Supabase CLI (supabase db push)

-- Tabel: oefeningen (goedgekeurde AI-output)
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basis metadata
  title       TEXT        NOT NULL,
  original    TEXT,               -- Originele tekst uit de PDF
  type        TEXT,               -- Open vraag | Invulvraag | Meerkeuze | Tekenopgave | Manipulatieopdracht
  confidence  INTEGER,            -- AI-vertrouwen (0-100)
  difficulty  TEXT,               -- Makkelijk | Gemiddeld | Moeilijk
  topic       TEXT,               -- Bijv. "Rekenen – Vierkanten"
  format      TEXT,               -- Aanbevolen interactief formaat
  note        TEXT,               -- AI-observatie

  -- Gegenereerde varianten (JSON-array)
  -- Structuur: [{ "level": "Makkelijker", "text": "..." }, { "level": "Moeilijker", "text": "..." }]
  variants    JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Herkomst
  page        INTEGER,            -- Paginanummer in de PDF
  source_file TEXT                -- Bestandsnaam van de bron-PDF
);

-- Indexes voor snelle lookups
CREATE INDEX IF NOT EXISTS exercises_created_at_idx ON exercises(created_at DESC);
CREATE INDEX IF NOT EXISTS exercises_type_idx       ON exercises(type);
CREATE INDEX IF NOT EXISTS exercises_topic_idx      ON exercises(topic);

-- Row Level Security (RLS) — aanzetten voor productie
-- Standaard: vrij leesbaar (voor de student), schrijven via service key
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policy: iedereen mag oefeningen lezen (student-pagina)
CREATE POLICY "Iedereen mag oefeningen lezen"
  ON exercises FOR SELECT
  USING (true);

-- Policy: alleen ingelogde editors mogen schrijven
-- (pas aan als je Supabase Auth gebruikt)
CREATE POLICY "Alleen service-key mag oefeningen aanmaken"
  ON exercises FOR INSERT
  WITH CHECK (true);  -- Tijdelijk open; vervang door: (auth.role() = 'service_role')

-- Voorbeeldquery om te testen:
-- SELECT id, title, type, difficulty FROM exercises ORDER BY created_at DESC LIMIT 10;
