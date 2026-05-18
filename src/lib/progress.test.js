import { describe, it, expect } from 'vitest';
import { computeNextProgress } from './progress.js';

const fresh = () => ({
  correctStreak: 0,
  incorrectStreak: 0,
  level: 'easy',
  totalAttempts: 0,
  totalCorrect: 0,
  lastAttempt: null,
});

// Helper: simuleer N pogingen achter elkaar
function simulate(startProgress, attempts) {
  let p = { ...startProgress };
  let lastChange = null;
  for (const correct of attempts) {
    const result = computeNextProgress(p, correct);
    p = result.progress;
    if (result.levelChange) lastChange = result.levelChange;
  }
  return { progress: p, lastLevelChange: lastChange };
}

// ── Basis: streaks bijhouden ──────────────────────────────────────────

describe('correctStreak en incorrectStreak', () => {
  it('telt correctStreak op bij goed antwoord', () => {
    const r = computeNextProgress(fresh(), true);
    expect(r.progress.correctStreak).toBe(1);
    expect(r.progress.incorrectStreak).toBe(0);
  });

  it('telt incorrectStreak op bij fout antwoord', () => {
    const r = computeNextProgress(fresh(), false);
    expect(r.progress.incorrectStreak).toBe(1);
    expect(r.progress.correctStreak).toBe(0);
  });

  it('reset correctStreak bij fout', () => {
    const p = { ...fresh(), correctStreak: 2 };
    const r = computeNextProgress(p, false);
    expect(r.progress.correctStreak).toBe(0);
    expect(r.progress.incorrectStreak).toBe(1);
  });

  it('reset incorrectStreak bij goed', () => {
    const p = { ...fresh(), incorrectStreak: 1 };
    const r = computeNextProgress(p, true);
    expect(r.progress.incorrectStreak).toBe(0);
    expect(r.progress.correctStreak).toBe(1);
  });
});

// ── Level transitions ─────────────────────────────────────────────────

describe('3x goed op easy → level up naar hard', () => {
  it('gaat niet omhoog na 2x goed', () => {
    const { progress } = simulate(fresh(), [true, true]);
    expect(progress.level).toBe('easy');
    expect(progress.correctStreak).toBe(2);
  });

  it('gaat omhoog na 3x goed', () => {
    const { progress, lastLevelChange } = simulate(fresh(), [true, true, true]);
    expect(progress.level).toBe('hard');
    expect(lastLevelChange).toBe('up');
    expect(progress.correctStreak).toBe(0); // reset na level change
  });

  it('3x goed met een fout ertussen telt niet', () => {
    const { progress } = simulate(fresh(), [true, true, false, true, true]);
    expect(progress.level).toBe('easy');
    expect(progress.correctStreak).toBe(2);
  });

  it('3x goed na een fout tussendoor (reset + opnieuw 3x)', () => {
    const { progress, lastLevelChange } = simulate(fresh(), [true, false, true, true, true]);
    expect(progress.level).toBe('hard');
    expect(lastLevelChange).toBe('up');
  });
});

describe('2x fout op hard → level down naar easy', () => {
  const hardStart = () => ({ ...fresh(), level: 'hard' });

  it('gaat niet omlaag na 1x fout', () => {
    const { progress } = simulate(hardStart(), [false]);
    expect(progress.level).toBe('hard');
    expect(progress.incorrectStreak).toBe(1);
  });

  it('gaat omlaag na 2x fout', () => {
    const { progress, lastLevelChange } = simulate(hardStart(), [false, false]);
    expect(progress.level).toBe('easy');
    expect(lastLevelChange).toBe('down');
    expect(progress.incorrectStreak).toBe(0); // reset na level change
  });

  it('2x fout met een goed ertussen telt niet', () => {
    const { progress } = simulate(hardStart(), [false, true, false]);
    expect(progress.level).toBe('hard');
    expect(progress.incorrectStreak).toBe(1);
  });
});

describe('2x fout op easy → blijft easy (geen level -1)', () => {
  it('blijft easy bij 2x fout', () => {
    const { progress } = simulate(fresh(), [false, false]);
    expect(progress.level).toBe('easy');
  });

  it('blijft easy bij 5x fout', () => {
    const { progress } = simulate(fresh(), [false, false, false, false, false]);
    expect(progress.level).toBe('easy');
  });
});

describe('3x goed op hard → blijft hard (geen level +2)', () => {
  const hardStart = () => ({ ...fresh(), level: 'hard' });

  it('blijft hard bij 3x goed', () => {
    const { progress } = simulate(hardStart(), [true, true, true]);
    expect(progress.level).toBe('hard');
  });
});

// ── Totalen ───────────────────────────────────────────────────────────

describe('totalAttempts en totalCorrect', () => {
  it('telt totalen correct', () => {
    const { progress } = simulate(fresh(), [true, false, true, true]);
    expect(progress.totalAttempts).toBe(4);
    expect(progress.totalCorrect).toBe(3);
  });
});

// ── Heen en weer ──────────────────────────────────────────────────────

describe('level wisselt heen en weer', () => {
  it('easy → hard → easy → hard', () => {
    // 3x goed → hard, 2x fout → easy, 3x goed → hard
    const { progress } = simulate(fresh(), [
      true, true, true,    // → hard
      false, false,        // → easy
      true, true, true,    // → hard
    ]);
    expect(progress.level).toBe('hard');
  });
});
