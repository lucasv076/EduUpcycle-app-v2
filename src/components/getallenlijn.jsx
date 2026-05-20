'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [dragOverBank, setDragOverBank] = useState(false);

  // Resync bank when te_plaatsen values change (fresh randomization arrives after mount)
  const prevKeyRef = useRef(te_plaatsen.join(','));
  useEffect(() => {
    const key = te_plaatsen.join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    setBank([...te_plaatsen].sort(() => Math.random() - 0.5));
    setPlacements({});
    setSelected(null);
    onPlacementsChange?.({});
  }, [te_plaatsen.join(',')]);

  // Build tick list, cap at 60 to avoid visual clutter
  const rawTicks = [];
  for (let p = lijn_min; p <= lijn_max; p += Math.max(1, stap)) rawTicks.push(p);
  if (rawTicks[rawTicks.length - 1] !== lijn_max) rawTicks.push(lijn_max);
  const ticks = rawTicks.length > 60
    ? rawTicks.filter((_, i) => i % Math.ceil(rawTicks.length / 40) === 0 || rawTicks[i] === lijn_max)
    : rawTicks;

  // ── helpers ──────────────────────────────────────────────────────────

  function applyPlacement(pos, num, prevAtPos, fromBank, fromSlotPos) {
    const newPlacements = { ...placements, [pos]: num };
    let newBank = [...bank];

    if (fromBank) {
      newBank = newBank.filter(n => n !== num);
      if (prevAtPos !== undefined) newBank.push(prevAtPos);
    } else {
      // Dragged from another slot
      delete newPlacements[fromSlotPos];
      if (prevAtPos !== undefined) newPlacements[fromSlotPos] = prevAtPos;
    }

    setPlacements(newPlacements);
    setBank(newBank);
    setSelected(null);
    onPlacementsChange?.(newPlacements);
  }

  function returnToBank(pos) {
    const num = placements[pos];
    if (num === undefined) return;
    const { [pos]: _, ...rest } = placements;
    setPlacements(rest);
    setBank(b => [...b, num]);
    setSelected(null);
    onPlacementsChange?.(rest);
  }

  // ── click interaction ─────────────────────────────────────────────────

  function bankClick(num) {
    if (submitted || disabled) return;
    setSelected(prev => (prev === num ? null : num));
  }

  function slotClick(pos) {
    if (submitted || disabled) return;
    const prev = placements[pos];

    if (selected !== null) {
      applyPlacement(pos, selected, prev, bank.includes(selected), null);
    } else if (prev !== undefined) {
      // Remove from slot → back to bank, auto-select it
      const { [pos]: _, ...rest } = placements;
      setPlacements(rest);
      setBank(b => [...b, prev]);
      setSelected(prev);
      onPlacementsChange?.(rest);
    }
  }

  // ── drag interaction ──────────────────────────────────────────────────

  function onBankDragStart(e, num) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('num', String(num));
    e.dataTransfer.setData('from', 'bank');
  }

  function onSlotDragStart(e, pos, num) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('num', String(num));
    e.dataTransfer.setData('from', String(pos));
  }

  function onSlotDrop(e, toPos) {
    e.preventDefault();
    if (submitted || disabled) return;
    setDragOverSlot(null);

    const num = Number(e.dataTransfer.getData('num'));
    const fromStr = e.dataTransfer.getData('from');
    const fromBank = fromStr === 'bank';
    const fromSlotPos = fromBank ? null : Number(fromStr);

    if (fromBank) {
      applyPlacement(toPos, num, placements[toPos], true, null);
    } else {
      if (fromSlotPos === toPos) return;
      applyPlacement(toPos, num, placements[toPos], false, fromSlotPos);
    }
  }

  function onBankAreaDrop(e) {
    e.preventDefault();
    if (submitted || disabled) return;
    setDragOverBank(false);

    const fromStr = e.dataTransfer.getData('from');
    if (fromStr === 'bank') return;

    returnToBank(Number(fromStr));
  }

  // ── correctness ───────────────────────────────────────────────────────

  const allPlaced = te_plaatsen.length > 0 && te_plaatsen.every(pos => placements[pos] !== undefined);

  // Layout constants (px)
  const LINE_Y   = 80;
  const SLOT_TOP = 16;
  const SLOT_H   = 42;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Getallenlijn ── */}
      <div style={{ paddingLeft: 28, paddingRight: 28 }}>
        <div style={{ position: 'relative', height: 124 }}>

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
            const tickH = isLabeled ? 22 : 11;
            return (
              <div key={`t${p}`} style={{
                position: 'absolute',
                left: pct(p),
                transform: 'translateX(-50%)',
                top: LINE_Y - tickH / 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
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
              pointerEvents: 'none',
            }} />
          ))}

          {/* Slots */}
          {te_plaatsen.map(pos => {
            const placed   = placements[pos];
            const isRight  = submitted && placed === pos;
            const isWrong  = submitted && placed !== undefined && placed !== pos;
            const isEmpty  = placed === undefined;
            const isDragTarget = dragOverSlot === pos && !submitted && !disabled;
            const isClickTarget = selected !== null && !submitted && !disabled;

            const borderColor = isRight ? C.green
              : isWrong ? C.red
              : isDragTarget ? C.orange
              : placed !== undefined ? C.purple
              : isClickTarget ? C.purple
              : C.border;

            const bg = isRight ? C.greenLight
              : isWrong ? C.redLight
              : isDragTarget ? '#FFF3E0'
              : placed !== undefined ? C.purpleLight
              : '#fff';

            return (
              <div
                key={`s${pos}`}
                onClick={() => slotClick(pos)}
                onDrop={(e) => onSlotDrop(e, pos)}
                onDragOver={(e) => { e.preventDefault(); if (!submitted && !disabled) setDragOverSlot(pos); }}
                onDragLeave={() => setDragOverSlot(null)}
                title={!submitted && !disabled ? `Positie ${pos}` : undefined}
                style={{
                  position: 'absolute',
                  left: pct(pos),
                  transform: 'translateX(-50%)',
                  top: SLOT_TOP,
                  width: 46, height: SLOT_H,
                  borderRadius: 8,
                  border: `2.5px ${isEmpty && !submitted ? 'dashed' : 'solid'} ${borderColor}`,
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800,
                  color: isRight ? C.green : isWrong ? C.red
                    : placed !== undefined ? C.purple : C.textLight,
                  cursor: submitted || disabled ? 'default' : 'pointer',
                  zIndex: 2,
                  transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
                  boxShadow: isDragTarget
                    ? `0 0 0 3px ${C.orange}55`
                    : isClickTarget && isEmpty
                      ? `0 0 0 3px ${C.purple}33`
                      : 'none',
                }}
              >
                {placed !== undefined ? (
                  <div
                    draggable={!submitted && !disabled}
                    onDragStart={(e) => { e.stopPropagation(); onSlotDragStart(e, pos, placed); }}
                    style={{ cursor: submitted || disabled ? 'default' : 'grab', userSelect: 'none', fontSize: 15, fontWeight: 800 }}
                  >
                    {placed}
                  </div>
                ) : '?'}
              </div>
            );
          })}

          {/* Error hints (correct answer) after submit */}
          {submitted && te_plaatsen.map(pos => {
            const placed = placements[pos];
            if (placed === pos) return null;
            return (
              <div key={`h${pos}`} style={{
                position: 'absolute',
                left: pct(pos),
                transform: 'translateX(-50%)',
                top: 2,
                fontSize: 10, fontWeight: 700, color: C.red, whiteSpace: 'nowrap', zIndex: 3,
                pointerEvents: 'none',
              }}>
                ✓{pos}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tegelbank ── */}
      {!submitted && (
        <div
          onDrop={onBankAreaDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOverBank(true); }}
          onDragLeave={() => setDragOverBank(false)}
          style={{
            minHeight: 64,
            borderRadius: 10,
            border: `2px dashed ${dragOverBank ? C.orange : C.border}`,
            background: dragOverBank ? '#FFF3E0' : 'transparent',
            padding: '10px 12px',
            transition: 'border-color 0.12s, background 0.12s',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 10 }}>
            {bank.length > 0
              ? 'Sleep een getal naar de juiste plek — of klik een getal, dan een vakje:'
              : 'Alle getallen zijn geplaatst — sleep er een terug om te wijzigen'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {bank.map((num, i) => (
              <div
                key={`b${num}-${i}`}
                draggable={!disabled}
                onDragStart={(e) => onBankDragStart(e, num)}
                onClick={() => bankClick(num)}
                style={{
                  width: 56, height: 48,
                  borderRadius: 10,
                  border: `2.5px solid ${selected === num ? C.purple : C.border}`,
                  background: selected === num ? C.purpleLight : '#fff',
                  color: selected === num ? C.purple : C.text,
                  fontSize: 18, fontWeight: 800,
                  cursor: 'grab',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                  transform: selected === num ? 'scale(1.1) translateY(-3px)' : 'none',
                  boxShadow: selected === num
                    ? `0 4px 14px ${C.purple}44`
                    : '0 1px 4px rgba(0,0,0,0.09)',
                  userSelect: 'none',
                }}
              >
                {num}
              </div>
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
    </div>
  );
}
