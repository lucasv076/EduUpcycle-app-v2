-- EduUpcycle: database migratie
-- Deze file wordt gebruikt door: npx supabase db push

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
	original    TEXT,
	type        TEXT,
	question_type TEXT      NOT NULL DEFAULT 'standaard',
	confidence  INTEGER,
	difficulty  TEXT,
	topic       TEXT,
	format      TEXT,
	note        TEXT,

	-- Gegenereerde varianten (JSON-array)
	variants    JSONB       NOT NULL DEFAULT '[]'::jsonb,

	-- Blokkenbouwsel specifieke velden (Pilot 1 - groep 3)
	source_file_type TEXT,
	block_goal_grid  JSONB,
	block_answer_grid JSONB,
	block_plan_grid JSONB,
	block_is_match BOOLEAN,
	block_max_height INTEGER NOT NULL DEFAULT 5,

	-- Herkomst
	page        INTEGER,
	source_file TEXT,
	source_page_image_data_url TEXT

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

-- Row Level Security (RLS)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen mag oefeningen lezen"
	ON exercises FOR SELECT
	USING (true);

CREATE POLICY "Alleen service-key mag oefeningen aanmaken"
	ON exercises FOR INSERT
	WITH CHECK (true);
