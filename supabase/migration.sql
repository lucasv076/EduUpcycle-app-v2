-- ── EduUpcycle: database migratie ───────────────────────────────────
-- Uitvoeren in: Supabase Dashboard → SQL Editor → New query
-- Of via: Supabase CLI (supabase db push)
-- Let op: voor CLI push gebruikt Supabase files in supabase/migrations/
-- Deze SQL staat ook in: supabase/migrations/20260423175828_init_exercises_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Valideert een 2D grid met gehele getallen tussen 0 en max_height
-- Voorbeeld geldig: [[2,1,3],[0,2,1]]
CREATE OR REPLACE FUNCTION is_valid_block_grid(grid JSONB, max_height INTEGER DEFAULT 5)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    jsonb_typeof(grid) = 'array'
    AND jsonb_array_length(grid) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(grid) AS row
      WHERE jsonb_typeof(row) <> 'array'
         OR jsonb_array_length(row) = 0
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(row) AS cell
           WHERE jsonb_typeof(cell) <> 'number'
              OR (cell::text)::integer < 0
              OR (cell::text)::integer > max_height
         )
    );
$$;

-- Tabel: oefeningen (goedgekeurde AI-output)
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basis metadata
  title       TEXT        NOT NULL,
  original    TEXT,               -- Originele tekst uit de PDF
  type        TEXT,               -- Open vraag | Invulvraag | Meerkeuze | Tekenopgave | Manipulatieopdracht
  question_type TEXT      NOT NULL DEFAULT 'standaard', -- standaard | blokken_bouwsel
  confidence  INTEGER,            -- AI-vertrouwen (0-100)
  difficulty  TEXT,               -- Makkelijk | Gemiddeld | Moeilijk
  topic       TEXT,               -- Bijv. "Rekenen – Vierkanten"
  format      TEXT,               -- Aanbevolen interactief formaat
  note        TEXT,               -- AI-observatie

  -- Gegenereerde varianten (JSON-array)
  -- Structuur: [{ "level": "Makkelijker", "text": "..." }, { "level": "Moeilijker", "text": "..." }]
  variants    JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Blokkenbouwsel specifieke velden (Pilot 1 - groep 3)
  source_file_type TEXT,          -- pdf_tabel | handmatig_json
  block_goal_grid  JSONB,         -- 2D-array met doelhoogtes (doel_grid)
  block_answer_grid JSONB,        -- 2D-array met leerlingantwoord (antwoord_grid)
  block_plan_grid JSONB,          -- 2D-array van de getoonde plattegrond in de vraag
  block_is_match BOOLEAN,         -- correcte uitkomst voor goed/fout op de plattegrond
  block_max_height INTEGER NOT NULL DEFAULT 5,

  -- Herkomst
  page        INTEGER,            -- Paginanummer in de PDF
  source_file TEXT,               -- Bestandsnaam van de bron-PDF
  source_page_image_data_url TEXT -- Snapshot van de bronpagina voor leerlingweergave

  ,CONSTRAINT exercises_question_type_chk
    CHECK (question_type IN ('standaard', 'blokken_bouwsel'))

  ,CONSTRAINT exercises_source_file_type_chk
    CHECK (
      source_file_type IS NULL
      OR source_file_type IN ('pdf_tabel', 'handmatig_json')
    )

  ,CONSTRAINT exercises_confidence_chk
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100))

  ,CONSTRAINT exercises_block_max_height_chk
    CHECK (block_max_height BETWEEN 1 AND 20)

  ,CONSTRAINT exercises_blokken_payload_chk
    CHECK (
      question_type <> 'blokken_bouwsel'
      OR (
        source_file_type IS NOT NULL
        AND block_goal_grid IS NOT NULL
        AND block_plan_grid IS NOT NULL
        AND block_is_match IS NOT NULL
        AND is_valid_block_grid(block_goal_grid, block_max_height)
        AND is_valid_block_grid(block_plan_grid, block_max_height)
        AND (
          block_answer_grid IS NULL
          OR is_valid_block_grid(block_answer_grid, block_max_height)
        )
      )
    )
);

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'standaard',
  ADD COLUMN IF NOT EXISTS source_file_type TEXT,
  ADD COLUMN IF NOT EXISTS block_goal_grid JSONB,
  ADD COLUMN IF NOT EXISTS block_answer_grid JSONB,
  ADD COLUMN IF NOT EXISTS block_plan_grid JSONB,
  ADD COLUMN IF NOT EXISTS block_is_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS block_max_height INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS source_page_image_data_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_question_type_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_question_type_chk
      CHECK (question_type IN ('standaard', 'blokken_bouwsel'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_source_file_type_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_source_file_type_chk
      CHECK (
        source_file_type IS NULL
        OR source_file_type IN ('pdf_tabel', 'handmatig_json')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_confidence_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_confidence_chk
      CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_block_max_height_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_block_max_height_chk
      CHECK (block_max_height BETWEEN 1 AND 20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_blokken_payload_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_blokken_payload_chk
      CHECK (
        question_type <> 'blokken_bouwsel'
        OR (
          source_file_type IS NOT NULL
          AND block_goal_grid IS NOT NULL
          AND block_plan_grid IS NOT NULL
          AND block_is_match IS NOT NULL
          AND is_valid_block_grid(block_goal_grid, block_max_height)
          AND is_valid_block_grid(block_plan_grid, block_max_height)
          AND (
            block_answer_grid IS NULL
            OR is_valid_block_grid(block_answer_grid, block_max_height)
          )
        )
      );
  END IF;
END $$;

-- Indexes voor snelle lookups
CREATE INDEX IF NOT EXISTS exercises_created_at_idx ON exercises(created_at DESC);
CREATE INDEX IF NOT EXISTS exercises_type_idx       ON exercises(type);
CREATE INDEX IF NOT EXISTS exercises_topic_idx      ON exercises(topic);
CREATE INDEX IF NOT EXISTS exercises_question_type_idx ON exercises(question_type);
CREATE INDEX IF NOT EXISTS exercises_source_file_type_idx ON exercises(source_file_type);

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
