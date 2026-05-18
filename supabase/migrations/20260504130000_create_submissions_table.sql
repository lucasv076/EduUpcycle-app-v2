-- ── Student submissions tracker
-- Slaat alle student antwoorden op met feedback en timing

CREATE TABLE IF NOT EXISTS submissions (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

	-- Identificatie
	exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
	session_id  TEXT NOT NULL,  -- Student identifier (kan later Auth integratie)

	-- Antwoord en feedback
	difficulty_level TEXT NOT NULL,  -- 'easy' of 'hard'
	answer      TEXT,                -- Het gegeven antwoord
	is_correct  BOOLEAN,             -- Of het antwoord correct is
	feedback    TEXT,                -- Optionele feedback

	-- Voor blokkenbouwsel specifiek
	submitted_grid JSONB             -- De gebouwde/gekozen grid

	,CONSTRAINT submissions_difficulty_level_chk
		CHECK (difficulty_level IN ('easy', 'hard'))
);

-- Index voor snelle queries per student+exercise
CREATE INDEX IF NOT EXISTS idx_submissions_session_exercise
	ON submissions(session_id, exercise_id);

-- Index voor snelle queries per student
CREATE INDEX IF NOT EXISTS idx_submissions_session
	ON submissions(session_id);

-- Index voor nieuwste submisssions eerst
CREATE INDEX IF NOT EXISTS idx_submissions_created_at_desc
	ON submissions(created_at DESC);
