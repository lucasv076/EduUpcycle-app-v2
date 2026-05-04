-- ── Voeg blokkenbouwsel-optie kolommen toe ──────────────────────────
-- Deze kolommen zijn nodig voor de UI die meerkeuze-opties toont

-- Stap 1: Voeg de kolommen toe (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'block_option_a_grid'
  ) THEN
    ALTER TABLE exercises ADD COLUMN block_option_a_grid JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'block_option_b_grid'
  ) THEN
    ALTER TABLE exercises ADD COLUMN block_option_b_grid JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'block_correct_option'
  ) THEN
    ALTER TABLE exercises ADD COLUMN block_correct_option TEXT;
  END IF;
END $$;

-- Stap 2: Initialiseer kolommen voor bestaande blokkenbouwsel-rijen
UPDATE exercises
SET
  source_file_type = COALESCE(source_file_type, 'pdf_tabel'),
  block_plan_grid = COALESCE(block_plan_grid, block_goal_grid),
  block_option_a_grid = COALESCE(block_option_a_grid, block_goal_grid),
  block_option_b_grid = COALESCE(block_option_b_grid, block_plan_grid, block_goal_grid),
  block_correct_option = COALESCE(block_correct_option, 'A')
WHERE question_type = 'blokken_bouwsel'
  AND (block_option_a_grid IS NULL OR block_option_b_grid IS NULL OR block_correct_option IS NULL);

-- Stap 3: Werk de CHECK-constraint bij (verwijder eerst de oude)
ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_blokken_payload_chk;

-- Stap 4: Voeg de nieuwe CHECK-constraint toe
ALTER TABLE exercises
  ADD CONSTRAINT exercises_blokken_payload_chk
  CHECK (
    question_type <> 'blokken_bouwsel'
    OR (
      source_file_type IS NOT NULL
      AND block_goal_grid IS NOT NULL
      AND block_plan_grid IS NOT NULL
      AND block_option_a_grid IS NOT NULL
      AND block_option_b_grid IS NOT NULL
      AND block_correct_option IN ('A', 'B')
      AND is_valid_block_grid(block_goal_grid, block_max_height)
      AND is_valid_block_grid(block_plan_grid, block_max_height)
      AND is_valid_block_grid(block_option_a_grid, block_max_height)
      AND is_valid_block_grid(block_option_b_grid, block_max_height)
      AND (
        block_answer_grid IS NULL
        OR is_valid_block_grid(block_answer_grid, block_max_height)
      )
    )
  );
