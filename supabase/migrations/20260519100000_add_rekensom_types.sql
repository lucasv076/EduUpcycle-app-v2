-- ── Voeg rekensommen vraagtypen en rekensom_data toe ─────────────────
-- Nieuwe question_type waarden: vul_in, goed_fout, vermenigvuldig_tabel
-- Nieuw JSONB-veld: rekensom_data (structuurdata voor interactieve rekenvragen)

-- 1. Voeg rekensom_data kolom toe
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'exercises' AND column_name = 'rekensom_data'
	) THEN
		ALTER TABLE exercises ADD COLUMN rekensom_data JSONB;
	END IF;
END $$;

-- 2. Vervang de question_type CHECK-constraint zodat nieuwe typen toegestaan zijn
DO $$
BEGIN
	-- Verwijder de oude constraint (staat alleen standaard + blokken_bouwsel toe)
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
			'vermenigvuldig_tabel'
		));
END $$;

-- 3. Index op question_type is er al — geen actie nodig
