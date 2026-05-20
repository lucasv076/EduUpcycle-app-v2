-- ── Voeg geld_tellen vraagtype toe ──────────────────────────────────────
-- question_type = 'geld_tellen'
-- Gebruikt hetzelfde rekensom_data JSONB-veld (al aanwezig).
-- Data-schema:
--   {
--     "modus": "tellen" | "wisselgeld",
--     "items": [
--       { "soort": "briefje" | "munt", "waarde": <getal>, "aantal": <int> }
--     ],
--     "totaal": <decimaal>,       -- altijd: het antwoord dat de leerling moet invullen
--     "prijs":  <decimaal|null>   -- alleen bij modus "wisselgeld": de artikelprijs
--   }
--
-- Geldige briefjewaarden:  5, 10, 20, 50, 100, 200, 500
-- Geldige muntwaarden:     0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1, 2

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_question_type_chk'
  ) THEN
    ALTER TABLE exercises DROP CONSTRAINT exercises_question_type_chk;
  END IF;

  ALTER TABLE exercises
    ADD CONSTRAINT exercises_question_type_chk
    CHECK (question_type IN (
      'standaard',
      'blokken_bouwsel',
      'vul_in',
      'goed_fout',
      'vermenigvuldig_tabel',
      'getallenlijn',
      'geld_tellen'
    ));
END $$;
