'use client';

import { useMemo, useState } from 'react';
import { C } from '@/lib/colors';

function clampGrid(grid, maxHeight) {
  if (!Array.isArray(grid)) return [];
  return grid.map((row) => (
    Array.isArray(row)
      ? row.map((cell) => {
          const value = Number(cell);
          if (!Number.isFinite(value)) return 0;
          return Math.max(0, Math.min(maxHeight, Math.round(value)));
        })
      : []
  ));
}

function buildCubeFaces(grid) {
  const cubes = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const h = grid[y][x] || 0;
      for (let z = 0; z < h; z++) cubes.push({ x, y, z });
    }
  }

  cubes.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));

  const sx = 18;
  const sy = 10;
  const sh = 12;
  const cx = 160;
  const cy = 86;

  return cubes.map((cube, idx) => {
    const px = (cube.x - cube.y) * sx + cx;
    const py = (cube.x + cube.y) * sy + cy - cube.z * sh;

    const top = `${px},${py - sh} ${px + sx},${py - sh + sy} ${px},${py - sh + sy * 2} ${px - sx},${py - sh + sy}`;
    const left = `${px - sx},${py - sh + sy} ${px},${py - sh + sy * 2} ${px},${py + sy * 2} ${px - sx},${py + sy}`;
    const right = `${px + sx},${py - sh + sy} ${px},${py - sh + sy * 2} ${px},${py + sy * 2} ${px + sx},${py + sy}`;

    return {
      key: `${cube.x}-${cube.y}-${cube.z}-${idx}`,
      top,
      left,
      right,
    };
  });
}

export function BlokkenBouwselInteractive({
  goalGrid,
  planGrid,
  isMatchExpected,
  maxHeight = 5,
  sourceImageDataUrl,
  onAnswered,
  disabled = false,
}) {
  const normalizedGoal = useMemo(() => clampGrid(goalGrid, maxHeight), [goalGrid, maxHeight]);
  const shownPlan = useMemo(() => clampGrid(planGrid, maxHeight), [planGrid, maxHeight]);
  const hasExpectedAnswer = typeof isMatchExpected === 'boolean';

  const cubeFaces = useMemo(() => buildCubeFaces(normalizedGoal), [normalizedGoal]);
  const [choice, setChoice] = useState(null);

  const handleChoice = (value) => {
    if (disabled) return;
    setChoice(value);
    onAnswered?.(value);
  };

  if (!Array.isArray(normalizedGoal) || normalizedGoal.length === 0) {
    return (
      <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: 12, fontSize: 13 }}>
        Geen blokkenbouwsel-data gevonden voor deze oefening.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          3D bouwsel
        </div>
        <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 8, background: '#F8F6FA' }}>
          <rect x="0" y="0" width="320" height="180" fill="#F8F6FA" />
          {cubeFaces.map((face) => (
            <g key={face.key}>
              <polygon points={face.left} fill="#8D5F98" stroke="#5C4070" strokeWidth="0.8" />
              <polygon points={face.right} fill="#B988C3" stroke="#5C4070" strokeWidth="0.8" />
              <polygon points={face.top} fill="#D7B4E0" stroke="#5C4070" strokeWidth="0.8" />
            </g>
          ))}
        </svg>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          Plattegrond (zonder getallen)
        </div>
        <div style={{ display: 'grid', gap: 4, width: 'fit-content', gridTemplateColumns: `repeat(${shownPlan[0]?.length || 0}, 28px)` }}>
          {shownPlan.length > 0 && shownPlan.flatMap((row, y) => row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: cell > 0 ? '#D7B4E0' : '#FFFFFF',
              }}
            />
          ))) }
          {shownPlan.length === 0 && (
            <div style={{ fontSize: 12, color: C.textMid }}>
              Geen AI-plattegrond beschikbaar.
            </div>
          )}
        </div>
      </div>

      {sourceImageDataUrl && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
            Bron uit PDF
          </div>
          <img
            src={sourceImageDataUrl}
            alt="Bronpagina uit werkboek"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: `1px solid ${C.border}` }}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Past de plattegrond bij het 3D bouwsel?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleChoice(true)}
            disabled={disabled}
            style={{
              border: `2px solid ${choice === true ? C.green : C.border}`,
              background: choice === true ? C.greenLight : C.white,
              color: C.text,
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            Goed
          </button>
          <button
            onClick={() => handleChoice(false)}
            disabled={disabled}
            style={{
              border: `2px solid ${choice === false ? C.red : C.border}`,
              background: choice === false ? C.redLight : C.white,
              color: C.text,
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            Fout
          </button>
        </div>
        {choice !== null && hasExpectedAnswer && (
          <div style={{ fontSize: 12, color: choice === isMatchExpected ? C.green : C.red, fontWeight: 700 }}>
            {choice === isMatchExpected ? 'Correct gekozen.' : 'Nog niet juist. Kijk nog eens naar bovenaanzicht en hoogte.'}
          </div>
        )}
      </div>
    </div>
  );
}
