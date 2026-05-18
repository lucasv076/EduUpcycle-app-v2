# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run start      # Run production build
npm run db:link    # Link Supabase project (npx supabase link)
npm run db:push    # Push schema to Supabase (npx supabase db push)
```

There is no test suite.

## Environment Variables

```
GROQ_API_KEY          # Groq API key for AI exercise extraction (also accepted: GROK_API_KEY)
GROQ_MODEL            # Optional — defaults to meta-llama/llama-4-scout-17b-16e-instruct
SUPABASE_URL          # Supabase project URL (also: NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_ANON_KEY     # Supabase anon key (also: SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

Both integrations are optional: missing `GROQ_API_KEY` triggers demo mode; missing Supabase vars disables persistence and falls back to JSON export.

## Architecture

EduUpcycle converts Zwijsen educational workbook PDFs into interactive exercises. There are two distinct user roles with separate UIs.

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Server Component | Portal selector (teacher vs student) |
| `/teacher` | Client Component | Full 4-step teacher workflow |
| `/student` | Server Component | Student exercise list (reads from Supabase) |
| `/student/[id]` | Server + Client | Single exercise page |
| `/api/analyze` | API Route | PDF pages → Groq → structured exercise JSON |
| `/api/save-exercises` | API Route | Save approved exercises to Supabase |

### Teacher Flow (4-step wizard in `src/app/teacher/page.jsx`)

1. **Upload**: Teacher drops PDF files on the page.
2. **Processing**: `extractPdfPages()` (`src/lib/pdf-extract.js`) runs entirely client-side using `pdfjs-dist` with a CDN worker. It produces both full-resolution (`imageDataUrl`) and downscaled (`aiImageDataUrl`, max 640px) images per page.
3. **AI Analysis**: Pages are sent to `/api/analyze` in chunks of 4. The route calls the Groq API (OpenAI-compatible) with `SYSTEM_PROMPT` from `src/lib/ai-prompt.js`. The model returns a JSON array of exercises with type classification, difficulty, topic, two difficulty variants, and optional block-grid data. The route normalizes and validates the response via `normalizeExercise()`.
4. **Review**: Teacher approves/rejects each exercise. On completion, approved exercises are saved to Supabase via `/api/save-exercises`.

Rate-limit handling: 5 s delay between chunks, 15–20 s retry on 429, fall back to demo data after 3 failures. Vision is attempted first; on 400 the route retries with text-only.

### Student Flow

`/student` lists all exercises from Supabase. `/student/[id]` is a Server Component that fetches the exercise and strips `source_page_image_data_url` before handing off to the Client Component `ExercisePage.jsx`. Students complete an easy variant then a harder variant sequentially.

### Exercise Data Model

Each exercise has:
- Standard fields: `title`, `original`, `type`, `confidence`, `difficulty`, `topic`, `format`, `note`, `variants` (array of `{level, text}`)
- `question_type`: `"standaard"` or `"blokken_bouwsel"`
- Block fields (only for `blokken_bouwsel`): `block_goal_grid`, `block_plan_grid`, `block_option_a_grid`, `block_option_b_grid`, `block_correct_option`, `block_max_height`, `block_answer_grid` — all 2D arrays of integers representing block heights

Valid exercise types: `"Open vraag"`, `"Invulvraag"`, `"Meerkeuze"`, `"Tekenopgave"`, `"Manipulatieopdracht"`, `"Blokkenbouwsel"`.

### Key Files

- `src/lib/colors.js` — Zwijsen brand palette (`C`) and per-type color map (`TYPE_COLORS`). All UI is inline-styled using these constants; there is no CSS framework.
- `src/lib/ai-prompt.js` — `SYSTEM_PROMPT` that instructs the model. Edit this to change AI output schema or behavior.
- `src/lib/pdf-extract.js` — Client-side PDF extraction. The pdfjs worker is loaded from `cdnjs.cloudflare.com`.
- `src/lib/supabase.js` — Raw `fetch`-based Supabase REST client (no SDK). Exports `saveExercises`, `getExerciseById`, `getAllExercises`, `isConfigured`.
- `src/lib/demo-data.js` — Static fallback exercises used when no API key is present.
- `src/components/blokken-bouwsel.jsx` — Isometric SVG block renderer and multiple-choice UI for `blokken_bouwsel` exercises.

### Styling Convention

All components use inline `style` props. Colors come exclusively from `src/lib/colors.js`. There is no Tailwind, CSS modules, or global stylesheet beyond `globals.css` (resets only).
