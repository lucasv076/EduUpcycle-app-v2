-- ── Voeg getallenlijn vraagtype toe ────────────────────────────────────
-- question_type = 'getallenlijn'
-- Gebruikt hetzelfde rekensom_data JSONB-veld (al aanwezig).
-- Data-schema:
--   { "lijn_min": 0, "lijn_max": 20, "stap": 2,
--     "te_plaatsen": [4, 8, 14], "gegeven_getallen": [0, 10, 20] }

-- Vervang de question_type CHECK-constraint zodat getallenlijn ook is toegestaan
DO $$
BEGIN
	-- Verwijder de huidige constraint
	IF EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'exercises_question_type_chk'
	) THEN
		ALTER TABLE exercises DROP CONSTRAINT exercises_question_type_chk;
	END IF;

	-- Voeg nieuwe constraint toe met alle geldige typen
	ALTER TABLE exercises
		ADD CONSTRAINT exercises_question_type_chk
		CHECK (question_type IN (
			'standaard',
			'blokken_bouwsel',
			'vul_in',
			'goed_fout',
			'vermenigvuldig_tabel',
			'getallenlijn'
		));
END $$;
