// ── Voortgang per oefening (localStorage) ─────────────────────────────
//
// Slaat per oefening op: correctStreak, incorrectStreak, level, totalAttempts.
// Level: 'easy' of 'hard'.
// Regels:
//   - 3x achter elkaar goed op easy → door naar hard
//   - 2x achter elkaar fout op hard → terug naar easy
//   - Goed antwoord reset incorrectStreak, fout reset correctStreak
//
// Alle functies zijn puur (ontvangen/retourneren data) behalve
// save/load die localStorage aanraken. Dat maakt ze testbaar.

const STORAGE_KEY = 'eduurcycle-progress';

// ── Lezen / schrijven localStorage ────────────────────────────────────

export function loadAllProgress() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveAllProgress(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Per oefening ──────────────────────────────────────────────────────

const DEFAULT_PROGRESS = {
  correctStreak: 0,
  incorrectStreak: 0,
  level: 'easy',
  totalAttempts: 0,
  totalCorrect: 0,
  lastAttempt: null,
};

export function getProgress(exerciseId) {
  const all = loadAllProgress();
  return { ...DEFAULT_PROGRESS, ...(all[exerciseId] || {}) };
}

// Verwerk een poging. Geeft het nieuwe progress-object terug
// plus een optioneel 'levelChange' veld ('up' | 'down' | null).
export function recordAttempt(exerciseId, correct) {
  const all = loadAllProgress();
  const prev = { ...DEFAULT_PROGRESS, ...(all[exerciseId] || {}) };

  const next = {
    ...prev,
    totalAttempts: prev.totalAttempts + 1,
    totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    lastAttempt: new Date().toISOString(),
  };

  let levelChange = null;

  if (correct) {
    next.correctStreak = prev.correctStreak + 1;
    next.incorrectStreak = 0;

    // 3x goed op easy → door naar hard
    if (next.level === 'easy' && next.correctStreak >= 3) {
      next.level = 'hard';
      next.correctStreak = 0;
      levelChange = 'up';
    }
  } else {
    next.incorrectStreak = prev.incorrectStreak + 1;
    next.correctStreak = 0;

    // 2x fout op hard → terug naar easy
    if (next.level === 'hard' && next.incorrectStreak >= 2) {
      next.level = 'easy';
      next.incorrectStreak = 0;
      levelChange = 'down';
    }
  }

  all[exerciseId] = next;
  saveAllProgress(all);

  return { progress: next, levelChange };
}

// Pure versie van recordAttempt (zonder localStorage) voor unit tests.
export function computeNextProgress(prev, correct) {
  const next = {
    ...prev,
    totalAttempts: prev.totalAttempts + 1,
    totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    lastAttempt: 'test',
  };

  let levelChange = null;

  if (correct) {
    next.correctStreak = prev.correctStreak + 1;
    next.incorrectStreak = 0;

    if (next.level === 'easy' && next.correctStreak >= 3) {
      next.level = 'hard';
      next.correctStreak = 0;
      levelChange = 'up';
    }
  } else {
    next.incorrectStreak = prev.incorrectStreak + 1;
    next.correctStreak = 0;

    if (next.level === 'hard' && next.incorrectStreak >= 2) {
      next.level = 'easy';
      next.incorrectStreak = 0;
      levelChange = 'down';
    }
  }

  return { progress: next, levelChange };
}

export function resetProgress(exerciseId) {
  const all = loadAllProgress();
  delete all[exerciseId];
  saveAllProgress(all);
}
