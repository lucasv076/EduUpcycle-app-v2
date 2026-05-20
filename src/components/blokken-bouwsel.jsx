'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
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

export function CubePreview({ grid }) {
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

export function PlanGridDisplay({ grid }) {
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

// ── Isometric canvas helpers (module-level pure functions) ────────────

// Larger blocks for better visibility and hit targets for young students
const ISO_BW = 68;
const ISO_BH = 38;
const ISO_BD = 22;

// Top-face color per stack level — lighter at bottom, deeper at top
const LEVEL_TOP_COLORS = ['#EAD6F5', '#D7B4E0', '#C490CC', '#B06DB8', '#9C4AA4'];
const LEVEL_LEFT_COLORS = ['#9A72A8', '#8D5F98', '#804C88', '#733978', '#662668'];
const LEVEL_RIGHT_COLORS = ['#C4A0D4', '#B988C3', '#AE70B2', '#A358A1', '#984090'];

function isoX(col, row, ox) {
  return ox + (col - row) * ISO_BW / 2;
}

function isoY(col, row, level, oy) {
  return oy + (col + row) * ISO_BH / 2 - level * ISO_BD;
}

function drawCube(ctx, col, row, level, ox, oy, hovered, removeMode) {
  const x = isoX(col, row, ox);
  const y = isoY(col, row, level, oy);
  const hw = ISO_BW / 2;
  const hh = ISO_BH / 2;
  const colorIdx = Math.min(level, LEVEL_TOP_COLORS.length - 1);

  let topColor = LEVEL_TOP_COLORS[colorIdx];
  let leftColor = LEVEL_LEFT_COLORS[colorIdx];
  let rightColor = LEVEL_RIGHT_COLORS[colorIdx];

  if (hovered) {
    topColor = removeMode ? '#FFBBBB' : '#F0E0FF';
    leftColor = removeMode ? '#CC6666' : '#A080C0';
    rightColor = removeMode ? '#DD8888' : '#C0A0DC';
  }

  // Top face
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x, y + ISO_BH); ctx.lineTo(x - hw, y + hh);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = '#5C4070'; ctx.lineWidth = 1; ctx.stroke();

  // Left face
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh); ctx.lineTo(x, y + ISO_BH);
  ctx.lineTo(x, y + ISO_BH + ISO_BD); ctx.lineTo(x - hw, y + hh + ISO_BD);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = '#5C4070'; ctx.lineWidth = 1; ctx.stroke();

  // Right face
  ctx.beginPath();
  ctx.moveTo(x + hw, y + hh); ctx.lineTo(x, y + ISO_BH);
  ctx.lineTo(x, y + ISO_BH + ISO_BD); ctx.lineTo(x + hw, y + hh + ISO_BD);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = '#5C4070'; ctx.lineWidth = 1; ctx.stroke();
}

// Solid semi-transparent 3D ghost cube — same shape as a real block, just see-through
function drawGhostCube(ctx, col, row, level, ox, oy) {
  const x = isoX(col, row, ox);
  const y = isoY(col, row, level, oy);
  const hw = ISO_BW / 2;
  const hh = ISO_BH / 2;

  // Top face — light purple, solid fill
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x, y + ISO_BH); ctx.lineTo(x - hw, y + hh);
  ctx.closePath();
  ctx.fillStyle = 'rgba(215,175,240,0.68)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,30,120,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left face — darker purple, solid fill
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh); ctx.lineTo(x, y + ISO_BH);
  ctx.lineTo(x, y + ISO_BH + ISO_BD); ctx.lineTo(x - hw, y + hh + ISO_BD);
  ctx.closePath();
  ctx.fillStyle = 'rgba(130,70,165,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,30,120,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Right face — mid purple, solid fill
  ctx.beginPath();
  ctx.moveTo(x + hw, y + hh); ctx.lineTo(x, y + ISO_BH);
  ctx.lineTo(x, y + ISO_BH + ISO_BD); ctx.lineTo(x + hw, y + hh + ISO_BD);
  ctx.closePath();
  ctx.fillStyle = 'rgba(175,110,210,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,30,120,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "+" on the top face center so students know they can add here
  ctx.save();
  ctx.font = `bold ${Math.round(ISO_BH * 0.65)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(80,20,100,0.80)';
  ctx.fillText('+', x, y + ISO_BH / 2);
  ctx.restore();
}

function drawBaseGrid(ctx, rows, cols, ox, oy) {
  // Draw back-to-front (smallest col+row first = farthest from viewer)
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push([row, col]);
    }
  }
  cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

  for (const [row, col] of cells) {
    const x = isoX(col, row, ox);
    const y = isoY(col, row, 0, oy);
    const hw = ISO_BW / 2;
    const hh = ISO_BH / 2;

    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
    ctx.lineTo(x, y + ISO_BH); ctx.lineTo(x - hw, y + hh);
    ctx.closePath();
    ctx.fillStyle = '#F2EAF8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,64,112,0.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// Height number centered on the top face of a block stack
function drawHeightLabel(ctx, col, row, height, ox, oy) {
  if (height === 0) return;
  const x = isoX(col, row, ox);
  const topLevel = height - 1;
  const y = isoY(col, row, topLevel, oy);
  const centerY = y + ISO_BH / 2;

  ctx.save();
  ctx.font = `bold ${Math.round(ISO_BH * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(60,20,80,0.80)';
  ctx.fillText(String(height), x, centerY);
  ctx.restore();
}

function renderIsometric(canvas, grid, rows, cols, hoverCell, mode, maxHeight, ox, oy) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBaseGrid(ctx, rows, cols, ox, oy);

  // Painter's algorithm: sort cells back-to-front (smallest col+row first)
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push([row, col]);
    }
  }
  cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

  for (const [row, col] of cells) {
    const h = grid[row][col];
    const isHoveredCell = hoverCell && hoverCell[0] === col && hoverCell[1] === row;
    const removeMode = mode === 'remove';

    for (let level = 0; level < h; level += 1) {
      const isTop = level === h - 1;
      drawCube(ctx, col, row, level, ox, oy, isTop && isHoveredCell, removeMode);
    }

    // Ghost preview for add mode: full 3D transparent cube
    if (isHoveredCell && mode === 'add' && h < maxHeight) {
      drawGhostCube(ctx, col, row, h, ox, oy);
    }

    // Height label on top face
    drawHeightLabel(ctx, col, row, h, ox, oy);
  }
}

function hitTest(mouseX, mouseY, rows, cols, grid, ox, oy) {
  let bestCol = null;
  let bestRow = null;
  let bestSum = -1; // highest col+row = closest to viewer wins

  const hw = ISO_BW / 2;
  const hh = ISO_BH / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const h = grid[row][col];
      const x = isoX(col, row, ox);

      // Check top face of the stack (highest priority hit zone)
      const yTop = isoY(col, row, h, oy);
      const dx = mouseX - x;
      const dy = mouseY - (yTop + hh);
      const u = dx / hw + dy / hh;
      const v = -dx / hw + dy / hh;

      if (u >= -1 && u <= 1 && v >= -1 && v <= 1) {
        // Prefer the cell closest to the viewer (largest col+row)
        const sum = col + row;
        if (sum > bestSum) {
          bestSum = sum;
          bestCol = col;
          bestRow = row;
        }
        continue;
      }

      // Also check the visible side faces (left + right) for stacked blocks
      if (h > 0) {
        const yBase = isoY(col, row, 0, oy);
        const bottom = yBase + ISO_BH + ISO_BD;

        // Rough bounding box of the entire visible stack
        if (mouseX >= x - hw && mouseX <= x + hw && mouseY >= yTop && mouseY <= bottom) {
          const sum = col + row;
          if (sum > bestSum) {
            bestSum = sum;
            bestCol = col;
            bestRow = row;
          }
        }
      }
    }
  }

  return bestCol !== null ? [bestCol, bestRow] : null;
}

// ── FloorPlanFeedback: floor plan with live per-cell color ────────────

function FloorPlanFeedback({ planGrid, builtGrid, showFeedback }) {
  const cols = planGrid[0]?.length || 0;

  return (
    <div style={{
      display: 'grid', gap: 4, width: 'fit-content',
      gridTemplateColumns: `repeat(${cols}, 52px)`,
    }}>
      {planGrid.flatMap((row, y) => row.map((cell, x) => {
        const built = builtGrid?.[y]?.[x] ?? 0;
        const correct = built === cell;
        let bg = '#FFFFFF';
        let borderColor = C.border;
        let textColor = '#5C4070';

        if (showFeedback && cell > 0) {
          bg = correct ? C.greenLight : C.redLight;
          borderColor = correct ? C.green : C.red;
          textColor = correct ? C.green : C.red;
        } else if (!showFeedback && correct && cell > 0) {
          bg = '#EDD0F5';
          borderColor = C.purple;
        }

        return (
          <div
            key={`fp-${x}-${y}`}
            style={{
              width: 52, height: 52, borderRadius: 8,
              border: `2px solid ${borderColor}`,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: textColor,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {cell || ''}
          </div>
        );
      }))}
    </div>
  );
}

// ── BlockBuilder: canvas-based isometric interactive builder ──────────

function BlockBuilder({ planGrid, maxHeight, onAnswered, disabled }) {
  const rows = planGrid?.length || 3;
  const cols = planGrid?.[0]?.length || 3;

  const CANVAS_W = 520;
  const CANVAS_H = 380;

  // Center horizontally; position origin so tallest stack + base all fit with margins
  const ox = CANVAS_W / 2 + ((rows - cols) * ISO_BW / 4);
  const oy = maxHeight * ISO_BD + 44 + ((rows - 1 + cols - 1) * ISO_BH / 4);

  const canvasRef = useRef(null);
  const [builtGrid, setBuiltGrid] = useState(
    () => Array.from({ length: rows }, () => Array(cols).fill(0))
  );
  const [hoverCell, setHoverCell] = useState(null);
  const [mode, setMode] = useState('add');
  const [hint, setHint] = useState('Klik op een vakje om een blok toe te voegen');

  // Refs so event handlers always see latest state without stale closures
  const builtRef = useRef(builtGrid);
  const modeRef = useRef(mode);
  const disabledRef = useRef(disabled);
  const onAnsweredRef = useRef(onAnswered);
  builtRef.current = builtGrid;
  modeRef.current = mode;
  disabledRef.current = disabled;
  onAnsweredRef.current = onAnswered;

  // Re-draw canvas whenever visible state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderIsometric(canvas, builtGrid, rows, cols, hoverCell, mode, maxHeight, ox, oy);
  }, [builtGrid, hoverCell, mode, maxHeight, rows, cols, ox, oy]);

  // Register event listeners once per grid configuration
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return [
        (clientX - rect.left) * (canvas.width / rect.width),
        (clientY - rect.top) * (canvas.height / rect.height),
      ];
    }

    function updateHint(cell) {
      if (!cell) {
        setHint(modeRef.current === 'add'
          ? 'Klik op een vakje om een blok toe te voegen'
          : 'Klik op een blok om het te verwijderen');
        return;
      }
      const [c, r] = cell;
      const h = builtRef.current[r][c];
      if (modeRef.current === 'add') {
        setHint(h < maxHeight
          ? `Klik om een blok toe te voegen — dit vakje heeft nu ${h} blok${h === 1 ? '' : 'ken'}`
          : `Dit vakje zit al vol! (max ${maxHeight} blokken)`);
      } else {
        setHint(h > 0
          ? `Klik om het bovenste blok te verwijderen — nu ${h} blok${h === 1 ? '' : 'ken'}`
          : 'Geen blokken om te verwijderen');
      }
    }

    function applyChange(col, row, delta) {
      setBuiltGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = Math.max(0, Math.min(maxHeight, next[row][col] + delta));
        onAnsweredRef.current?.(next);
        return next;
      });
    }

    function onMove(e) {
      if (disabledRef.current) return;
      const [mx, my] = getCanvasPos(e.clientX, e.clientY);
      const cell = hitTest(mx, my, rows, cols, builtRef.current, ox, oy);
      setHoverCell(cell);
      updateHint(cell);
    }

    function onClick(e) {
      if (disabledRef.current) return;
      const [mx, my] = getCanvasPos(e.clientX, e.clientY);
      const cell = hitTest(mx, my, rows, cols, builtRef.current, ox, oy);
      if (!cell) return;
      const [col, row] = cell;
      applyChange(col, row, modeRef.current === 'add' ? 1 : -1);
    }

    // Right-click always removes — shortcut without changing mode
    function onContextMenu(e) {
      e.preventDefault();
      if (disabledRef.current) return;
      const [mx, my] = getCanvasPos(e.clientX, e.clientY);
      const cell = hitTest(mx, my, rows, cols, builtRef.current, ox, oy);
      if (!cell) return;
      const [col, row] = cell;
      applyChange(col, row, -1);
    }

    function onLeave() {
      setHoverCell(null);
      setHint(modeRef.current === 'add'
        ? 'Klik op een vakje om een blok toe te voegen'
        : 'Klik op een blok om het te verwijderen');
    }

    function onTouch(e) {
      e.preventDefault();
      if (disabledRef.current) return;
      const t = e.touches[0];
      const [mx, my] = getCanvasPos(t.clientX, t.clientY);
      const cell = hitTest(mx, my, rows, cols, builtRef.current, ox, oy);
      if (!cell) return;
      const [col, row] = cell;
      applyChange(col, row, modeRef.current === 'add' ? 1 : -1);
    }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchstart', onTouch, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onTouch);
    };
  }, [rows, cols, maxHeight, ox, oy]);

  const isCorrect = gridsEqual(builtGrid, planGrid);

  let correctCells = 0;
  const totalCells = rows * cols;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if ((builtGrid[r]?.[c] ?? 0) === (planGrid?.[r]?.[c] ?? 0)) correctCells += 1;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Mode selector — large, kid-friendly */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { id: 'add',    emoji: '🧱', label: 'Blok toevoegen',  activeColor: C.purple, activeBg: C.purpleLight },
          { id: 'remove', emoji: '✏️', label: 'Blok weghalen',   activeColor: C.red,    activeBg: C.redLight },
        ].map(({ id, emoji, label, activeColor, activeBg }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => {
                setMode(id);
                setHint(id === 'add'
                  ? 'Klik op een vakje om een blok toe te voegen'
                  : 'Klik op een blok om het te verwijderen');
              }}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 12, fontFamily: 'inherit',
                border: `2.5px solid ${active ? activeColor : C.border}`,
                background: active ? activeBg : C.white,
                color: active ? activeColor : C.textMid,
                fontWeight: 800, fontSize: 14,
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? `0 2px 8px ${activeColor}33` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Two-column: canvas left, info right */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Isometric canvas */}
        <div style={{
          flex: '1 1 0', minWidth: 0,
          background: '#FAF6FD', border: `2px solid ${C.border}`,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(109,32,119,0.08)',
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: 'block', width: '100%', cursor: disabled ? 'default' : 'pointer' }}
          />
          <div style={{
            padding: '6px 14px 10px',
            fontSize: 12, color: C.textMid, fontStyle: 'italic',
            borderTop: `1px solid ${C.border}`, background: C.bg,
            minHeight: 32, display: 'flex', alignItems: 'center',
          }}>
            {hint}
            {!disabled && (
              <span style={{ marginLeft: 'auto', color: C.textLight, fontSize: 11 }}>
                Rechtsklik = weghalen
              </span>
            )}
          </div>
        </div>

        {/* Right column: progress + floor plan + feedback */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Progress bar */}
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, fontWeight: 700, color: C.textMid, marginBottom: 6,
            }}>
              <span>Voortgang</span>
              <span style={{
                background: correctCells === totalCells ? C.greenLight : C.purpleLight,
                color: correctCells === totalCells ? C.green : C.purple,
                padding: '2px 8px', borderRadius: 20, fontSize: 11,
              }}>
                {correctCells}/{totalCells}
              </span>
            </div>
            <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(correctCells / totalCells) * 100}%`,
                background: correctCells === totalCells
                  ? C.green
                  : `linear-gradient(90deg, ${C.purple}, ${C.pink})`,
                borderRadius: 5,
                transition: 'width 0.35s ease',
              }} />
            </div>
          </div>

          {/* Floor plan with live per-cell coloring */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 10 }}>
              Plattegrond — dit is jouw doel
            </div>
            <FloorPlanFeedback planGrid={planGrid} builtGrid={builtGrid} showFeedback={disabled} />
          </div>

          {/* Post-submit feedback */}
          {disabled && (
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: isCorrect ? C.green : C.red,
              background: isCorrect ? C.greenLight : C.redLight,
              border: `2px solid ${isCorrect ? C.green : C.red}`,
              borderRadius: 10, padding: '12px 14px',
              textAlign: 'center',
            }}>
              {isCorrect
                ? '✓ Perfect! Jouw bouwsel past precies bij de plattegrond.'
                : '✗ Nog niet helemaal goed. Vergelijk jouw getallen met de plattegrond.'}
            </div>
          )}
        </div>
      </div>
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
  showFeedback = true,
  disabled = false,
  buildMode = false,
  showPlanHint = false,
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

  // ── Build mode: canvas-based isometric builder ───────────────────────
  if (buildMode) {
    return (
      <BlockBuilder
        planGrid={shownPlan}
        maxHeight={maxHeight}
        onAnswered={onAnswered}
        disabled={disabled}
        showPlanHint={showPlanHint}
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
        {showFeedback && choice !== null && (
          <div style={{ fontSize: 12, color: choice === expectedOption ? C.green : C.red, fontWeight: 700 }}>
            {choice === expectedOption ? 'Correct gekozen.' : 'Nog niet juist. Kijk naar de getallen in de plattegrond.'}
          </div>
        )}
      </div>
    </div>
  );
}
