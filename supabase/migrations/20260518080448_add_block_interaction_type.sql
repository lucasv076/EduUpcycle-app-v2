-- ── Voeg block_interaction_type toe voor blokkenbouwsel-opgaven ─────

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'exercises' AND column_name = 'block_interaction_type'
	) THEN
		ALTER TABLE exercises ADD COLUMN block_interaction_type TEXT;
	END IF;
END $$;

-- Vul bestaande records met een veilige afgeleide waarde.
UPDATE exercises
SET block_interaction_type = CASE
	WHEN question_type <> 'blokken_bouwsel' THEN NULL
	WHEN block_option_a_grid IS NULL AND block_option_b_grid IS NULL THEN 'tellen'
	WHEN block_option_a_grid IS NOT NULL AND block_option_b_grid IS NULL THEN 'goedFout'
	WHEN block_option_a_grid IS NOT NULL AND block_option_b_grid IS NOT NULL THEN 'meerkeuze'
	ELSE 'goedFout'
END
WHERE question_type = 'blokken_bouwsel'
	AND block_interaction_type IS NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'exercises_block_interaction_type_chk'
	) THEN
		ALTER TABLE exercises
			ADD CONSTRAINT exercises_block_interaction_type_chk
			CHECK (
				(question_type <> 'blokken_bouwsel' AND block_interaction_type IS NULL)
				OR (
					question_type = 'blokken_bouwsel'
					AND block_interaction_type IN ('tellen', 'goedFout', 'bouwen', 'meerkeuze')
				)
			);
	END IF;
END $$;
