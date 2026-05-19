'use client';

import { useState } from 'react';
import { C } from '@/lib/colors';

export function GetallenLijnInteractief({ data, submitted, disabled, onPlacementsChange }) {
  const {
    lijn_min = 0,
    lijn_max = 20,
    stap = 2,
    te_plaatsen = [],
    gegeven_getallen = [],
  } = data || {};

  const range = Math.max(1, lijn_max - lijn_min);
  const pct = (pos) => `${((pos - lijn_min) / range) * 100}%`;

  const [placements, setPlacements] = useState({});
  const [bank, setBank] = useState(() => [...te_plaatsen].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState(null);

  // Build tick list, cap at 60 to avoid visual clutter
  const rawTicks = [];
  for (let p = lijn_min; p <= lijn_max; p += Math.max(1, stap)) rawTicks.push(p);
  if (rawTicks[rawTicks.length - 1] !== lijn_max) rawTicks.push(lijn_max);
  const ticks = rawTicks.length > 60
    ? rawTicks.filter((_, i) => i % Math.ceil(rawTicks.length / 40) === 0 || rawTicks[i] === lijn_max)
    : rawTicks;

  function bankClick(num) {
    if (submitted || disabled) return;
    setSelected(prev => (prev === num ? null : num));
  }

  function slotClick(pos) {
    if (submitted || disabled) return;
    const prev = placements[pos];

    if (selected !== null) {
      const newPlacements = { ...placements, [pos]: selected };
      const newBank = bank.filter(n => n !== selected);
      if (prev !== undefined) newBank.push(prev);
      setPlacements(newPlacements);
      setBank(newBank);
      setSelected(null);
      onPlacementsChange?.(newPlacements);
    } else if (prev !== undefined) {
      const { [pos]: _, ...rest } = placements;
      setPlacements(rest);
      setBank(b => [...b, prev]);
      setSelected(prev);
      onPlacementsChange?.(rest);
    }
  }

  const allCorrect = te_plaatsen.length > 0 && te_plaatsen.every(pos => placements[pos] === pos);

  // Layout constants (px)
  const LINE_Y   = 72;
  const SLOT_TOP = 14;
  const SLOT_H   = 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Getallenlijn ── */}
      <div style={{ paddingLeft: 28, paddingRight: 28 }}>
        <div style={{ position: 'relative', height: 116 }}>

          {/* Horizontal rule */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: LINE_Y, height: 3,
            background: C.text, borderRadius: 2,
          }} />

          {/* Left arrow */}
          <div style={{
            position: 'absolute', left: -10, top: LINE_Y - 5,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: `11px solid ${C.text}`,
          }} />

          {/* Right arrow */}
          <div style={{
            position: 'absolute', right: -10, top: LINE_Y - 5,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: `11px solid ${C.text}`,
          }} />

          {/* Ticks + labels */}
          {ticks.map(p => {
            const isLabeled = gegeven_getallen.includes(p) || p === lijn_min || p === lijn_max;
            const tickH = isLabeled ? 20 : 10;
            return (
              <div key={`t${p}`} style={{
                position: 'absolute',
                left: pct(p),
                transform: 'translateX(-50%)',
                top: LINE_Y - tickH / 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{ width: 2, height: tickH, background: C.text }} />
                {isLabeled && (
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: C.text,
                    marginTop: 5, whiteSpace: 'nowrap',
                  }}>
                    {p}
                  </div>
                )}
              </div>
            );
          })}

          {/* Slots for te_plaatsen */}
          {te_plaatsen.map(pos => {
            const placed   = placements[pos];
            const isRight  = submitted && placed === pos;
            const isWrong  = submitted && placed !== undefined && placed !== pos;
            const isEmpty  = placed === undefined;
            const canDrop  = selected !== null && !submitted && !disabled;

            return (
              <div
                key={`s${pos}`}
                onClick={() => slotClick(pos)}
                title={!submitted && !disabled ? `Positie ${pos}` : undefined}
                style={{
                  position: 'absolute',
                  left: pct(pos),
                  transform: 'translateX(-50%)',
                  top: SLOT_TOP,
                  width: 46, height: SLOT_H,
                  borderRadius: 8,
                  border: `2.5px ${isEmpty && !submitted ? 'dashed' : 'solid'} ${
                    isRight  ? C.green  :
                    isWrong  ? C.red    :
                    canDrop  ? C.purple :
                    placed !== undefined ? C.purple :
                    C.border
                  }`,
                  background: isRight ? C.greenLight : isWrong ? C.redLight
                    : placed !== undefined ? C.purpleLight : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                  color: isRight ? C.green : isWrong ? C.red
                    : placed !== undefined ? C.purple : C.textLight,
                  cursor: submitted || disabled ? 'default' : 'pointer',
                  zIndex: 2,
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: canDrop ? `0 0 0 3px ${C.purple}33` : 'none',
                }}
              >
                {placed !== undefined ? placed : '?'}
              </div>
            );
          })}

          {/* Connector lines: slot → tick */}
          {te_plaatsen.map(pos => (
            <div key={`c${pos}`} style={{
              position: 'absolute',
              left: pct(pos),
              transform: 'translateX(-50%)',
              top: SLOT_TOP + SLOT_H,
              width: 2,
              height: LINE_Y - (SLOT_TOP + SLOT_H) - 4,
              background: C.border,
            }} />
          ))}

          {/* Error hints (correct answer) after submit */}
          {submitted && te_plaatsen.map(pos => {
            const placed = placements[pos];
            if (placed === pos) return null;
            return (
              <div key={`h${pos}`} style={{
                position: 'absolute',
                left: pct(pos),
                transform: 'translateX(-50%)',
                top: 0,
                fontSize: 10, fontWeight: 700, color: C.red, whiteSpace: 'nowrap', zIndex: 3,
              }}>
                = {pos}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tegelbank ── */}
      {bank.length > 0 && !submitted && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 10 }}>
            Klik een getal, dan klik op de juiste plek op de lijn:
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {bank.map((num, i) => (
              <button
                key={`b${num}-${i}`}
                type="button"
                onClick={() => bankClick(num)}
                style={{
                  width: 56, height: 48,
                  borderRadius: 10,
                  border: `2.5px solid ${selected === num ? C.purple : C.border}`,
                  background: selected === num ? C.purpleLight : '#fff',
                  color: selected === num ? C.purple : C.text,
                  fontSize: 18, fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  transform: selected === num ? 'scale(1.1) translateY(-3px)' : 'none',
                  boxShadow: selected === num
                    ? `0 4px 14px ${C.purple}44`
                    : '0 1px 4px rgba(0,0,0,0.09)',
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Geselecteerde tegel hint */}
      {selected !== null && !submitted && !disabled && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.purple,
          background: C.purpleLight, borderRadius: 8,
          padding: '8px 14px', border: `1px solid ${C.border}`,
        }}>
          Getal <strong>{selected}</strong> geselecteerd — klik op een vakje op de getallenlijn om het te plaatsen
        </div>
      )}

      {/* Ingediend-feedback */}
      {submitted && (
        <div style={{
          background: allCorrect ? C.greenLight : C.redLight,
          border: `2px solid ${allCorrect ? C.green : C.red}`,
          borderRadius: 10, padding: '12px 16px',
          fontSize: 14, fontWeight: 800, textAlign: 'center',
          color: allCorrect ? C.green : C.red,
        }}>
          {allCorrect
            ? '✓ Alle getallen staan op de juiste plek!'
            : '✗ Niet helemaal goed. Kijk bij de rode vakjes voor het juiste getal.'}
        </div>
      )}
    </div>
  );
}
