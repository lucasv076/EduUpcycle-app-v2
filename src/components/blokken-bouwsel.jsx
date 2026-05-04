'use client';

import { useMemo, useState } from 'react';
import { C } from '@/lib/colors';

export function clampGrid(grid, maxHeight) {
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

export function gridsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  for (let y = 0; y < left.length; y += 1) {
    const leftRow = left[y];
    const rightRow = right[y];

    if (!Array.isArray(leftRow) || !Array.isArray(rightRow)) return false;
    if (leftRow.length !== rightRow.length) return false;

    for (let x = 0; x < leftRow.length; x += 1) {
      if (leftRow[x] !== rightRow[x]) return false;
    }
  }

  return true;
}

function createAlternativeGrid(baseGrid, maxHeight) {
  const sourceGrid = Array.isArray(baseGrid) ? baseGrid : [];
  const copy = sourceGrid.map((row) => (Array.isArray(row) ? [...row] : []));

  if (copy.length === 0 || copy[0].length === 0) {
    return [[Math.min(maxHeight, 1)]];
  }

  for (let y = copy.length - 1; y >= 0; y -= 1) {
    for (let x = copy[y].length - 1; x >= 0; x -= 1) {
      const value = Number(copy[y][x]) || 0;
      if (value > 0) {
        copy[y][x] = Math.max(0, value - 1);
        return copy;
      }
    }
  }

  copy[0][0] = Math.min(maxHeight, (Number(copy[0][0]) || 0) + 1);
  return copy;
}

function buildCubeFaces(grid) {
  const cubes = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const height = grid[y][x] || 0;
      for (let z = 0; z < height; z += 1) {
        cubes.push({ x, y, z });
      }
    }
  }

  cubes.sort((left, right) => (left.x + left.y + left.z) - (right.x + right.y + right.z));

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

function CubePreview({ grid }) {
  const faces = useMemo(() => buildCubeFaces(grid), [grid]);

  return (
    <svg width="100%" viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 8, background: '#F8F6FA' }}>
      <rect x="0" y="0" width="220" height="140" fill="#F8F6FA" />
      {faces.map((face) => (
        <g key={face.key}>
          <polygon points={face.left} fill="#8D5F98" stroke="#5C4070" strokeWidth="0.8" />
          <polygon points={face.right} fill="#B988C3" stroke="#5C4070" strokeWidth="0.8" />
          <polygon points={face.top} fill="#D7B4E0" stroke="#5C4070" strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  );
}

function PlanGridDisplay({ grid }) {
  const cols = grid[0]?.length || 0;
  return (
    <div style={{
      display: 'grid', gap: 4, width: 'fit-content',
      gridTemplateColumns: `repeat(${cols}, 32px)`,
    }}>
      {grid.flatMap((row, y) => row.map((cell, x) => (
        <div
          key={`${x}-${y}`}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: cell > 0 ? '#D7B4E0' : '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#5C4070',
          }}
        >
          {cell}
        </div>
      )))}
    </div>
  );
}

// ── BlockBuilder: leerling bouwt zelf het 3D bouwsel ─────────────────
function BlockBuilder({ planGrid, maxHeight, onAnswered, disabled }) {
  const rows = planGrid?.length || 3;
  const cols = planGrid?.[0]?.length || 3;

  const [builtGrid, setBuiltGrid] = useState(
    () => Array.from({ length: rows }, () => Array(cols).fill(0))
  );

  const updateCell = (y, x, delta) => {
    if (disabled) return;
    const next = builtGrid.map((r) => [...r]);
    next[y][x] = Math.max(0, Math.min(maxHeight, next[y][x] + delta));
    setBuiltGrid(next);
    onAnswered?.(next);
  };

  const hasBlocks = builtGrid.flat().some((v) => v > 0);
  const isCorrect = gridsEqual(builtGrid, planGrid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Reference floor plan */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          Plattegrond — dit is jouw doel
        </div>
        <PlanGridDisplay grid={planGrid} />
      </div>

      {/* Interactive builder grid */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 10 }}>
          Klik <strong>+</strong> om een blok toe te voegen, <strong>−</strong> om een blok te verwijderen
        </div>
        <div style={{
          display: 'grid', gap: 8, width: 'fit-content',
          gridTemplateColumns: `repeat(${cols}, 52px)`,
        }}>
          {builtGrid.flatMap((row, y) => row.map((cell, x) => (
            <div
              key={`build-${x}-${y}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
            >
              <button
                type="button"
                onClick={() => updateCell(y, x, 1)}
                disabled={disabled || cell >= maxHeight}
                style={{
                  width: 52, height: 24, borderRadius: '6px 6px 0 0', border: 'none',
                  background: disabled || cell >= maxHeight ? '#DDD' : C.purple,
                  color: 'white', fontWeight: 800, fontSize: 16,
                  cursor: disabled || cell >= maxHeight ? 'default' : 'pointer',
                  lineHeight: 1,
                }}
              >+</button>
              <div style={{
                width: 52, height: 38,
                border: `2px solid ${cell > 0 ? '#9B59B6' : C.border}`,
                background: cell > 0 ? '#D7B4E0' : '#F8F6FA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#5C4070',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {cell}
              </div>
              <button
                type="button"
                onClick={() => updateCell(y, x, -1)}
                disabled={disabled || cell <= 0}
                style={{
                  width: 52, height: 24, borderRadius: '0 0 6px 6px', border: 'none',
                  background: disabled || cell <= 0 ? '#DDD' : C.pink,
                  color: 'white', fontWeight: 800, fontSize: 18,
                  cursor: disabled || cell <= 0 ? 'default' : 'pointer',
                  lineHeight: 1,
                }}
              >−</button>
            </div>
          )))}
        </div>
      </div>

      {/* Live 3D preview */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          Jouw bouwsel (3D voorvertoning)
        </div>
        <CubePreview grid={hasBlocks ? builtGrid : [[0]]} />
      </div>

      {/* Feedback after submit */}
      {disabled && (
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isCorrect ? C.green : C.red,
          background: isCorrect ? C.greenLight : C.redLight,
          border: `1.5px solid ${isCorrect ? C.green : C.red}`,
          borderRadius: 8, padding: '10px 14px',
        }}>
          {isCorrect
            ? '✓ Perfect! Jouw bouwsel past precies bij de plattegrond.'
            : '✗ Nog niet helemaal goed. Vergelijk jouw getallen met de plattegrond.'}
        </div>
      )}
    </div>
  );
}

function ChoiceBuild({ label, grid, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? C.purple : C.border}`,
        borderRadius: 10,
        background: selected ? C.purpleLight : C.white,
        padding: 8,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 6 }}>
        Bouwsel {label}
      </div>
      <CubePreview grid={grid} />
    </button>
  );
}

export function BlokkenBouwselInteractive({
  goalGrid,
  planGrid,
  optionAGrid,
  optionBGrid,
  correctOption,
  maxHeight = 5,
  onAnswered,
  sourceImageDataUrl,
  showSourceImage = false,
  disabled = false,
  buildMode = false,
}) {
  const normalizedGoal = useMemo(() => clampGrid(goalGrid, maxHeight), [goalGrid, maxHeight]);
  const normalizedPlan = useMemo(() => clampGrid(planGrid, maxHeight), [planGrid, maxHeight]);
  const normalizedOptionA = useMemo(() => clampGrid(optionAGrid, maxHeight), [optionAGrid, maxHeight]);
  const normalizedOptionB = useMemo(() => clampGrid(optionBGrid, maxHeight), [optionBGrid, maxHeight]);
  const [choice, setChoice] = useState(null);

  const optionA = useMemo(() => {
    if (normalizedOptionA.length > 0) return normalizedOptionA;
    if (normalizedOptionB.length > 0) return createAlternativeGrid(normalizedOptionB, maxHeight);
    return normalizedGoal;
  }, [normalizedOptionA, normalizedOptionB, normalizedGoal, maxHeight]);

  const optionB = useMemo(() => {
    if (normalizedOptionB.length > 0) {
      return gridsEqual(normalizedOptionB, optionA)
        ? createAlternativeGrid(optionA, maxHeight)
        : normalizedOptionB;
    }

    return createAlternativeGrid(optionA, maxHeight);
  }, [normalizedOptionB, optionA, maxHeight]);

  const shownPlan = normalizedPlan.length > 0 ? normalizedPlan : normalizedGoal;
  const expectedOption = correctOption === 'B' ? 'B' : 'A';

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

  // ── Build mode: leerling bouwt zelf het bouwsel ──────────────────────
  if (buildMode) {
    return (
      <BlockBuilder
        planGrid={shownPlan}
        maxHeight={maxHeight}
        onAnswered={onAnswered}
        disabled={disabled}
      />
    );
  }

  // ── Multiple choice mode ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          Kies het 3D bouwsel dat past bij de plattegrond
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ChoiceBuild
            label="A"
            grid={optionA}
            selected={choice === 'A'}
            disabled={disabled}
            onSelect={() => handleChoice('A')}
          />
          <ChoiceBuild
            label="B"
            grid={optionB}
            selected={choice === 'B'}
            disabled={disabled}
            onSelect={() => handleChoice('B')}
          />
        </div>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
          Plattegrond met getallen
        </div>
        <PlanGridDisplay grid={shownPlan} />
      </div>

      {showSourceImage && sourceImageDataUrl && (
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
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Meerkeuze: kies A of B.</div>
        {choice !== null && (
          <div style={{ fontSize: 12, color: choice === expectedOption ? C.green : C.red, fontWeight: 700 }}>
            {choice === expectedOption ? 'Correct gekozen.' : 'Nog niet juist. Kijk naar de getallen in de plattegrond.'}
          </div>
        )}
      </div>
    </div>
  );
}
