ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS source_page_image_data_url TEXT,
  ADD COLUMN IF NOT EXISTS block_plan_grid JSONB,
  ADD COLUMN IF NOT EXISTS block_is_match BOOLEAN;

UPDATE exercises
SET
  source_file_type = COALESCE(source_file_type, 'pdf_tabel'),
  block_plan_grid = COALESCE(block_plan_grid, block_goal_grid),
  block_is_match = COALESCE(block_is_match, true)
WHERE question_type = 'blokken_bouwsel';

ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_blokken_payload_chk;

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
