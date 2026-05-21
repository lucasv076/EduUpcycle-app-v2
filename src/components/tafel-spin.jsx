'use client';

import { C } from '@/lib/colors';

const SPIN_SIZE = 380;
const CX = 190;
const CY = 190;
const MONKEY_R = 42;
const SPOKE_R = 130;
const BOX_W = 88;
const BOX_H = 60;

function radialPos(i, n) {
  const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
  return {
    x: CX + SPOKE_R * Math.cos(angle),
    y: CY + SPOKE_R * Math.sin(angle),
    angle,
  };
}

function SpokeLines({ vragen, submitted, mathAnswers, tvt }) {
  const n = vragen.length;
  return (
    <svg width={SPIN_SIZE} height={SPIN_SIZE}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {vragen.map((v, i) => {
        const { x, y, angle } = radialPos(i, n);
        const x1 = CX + (MONKEY_R + 2) * Math.cos(angle);
        const y1 = CY + (MONKEY_R + 2) * Math.sin(angle);
        const edgeDist = Math.min(
          Math.abs(Math.cos(angle)) > 1e-6 ? BOX_W / 2 / Math.abs(Math.cos(angle)) : 9999,
          Math.abs(Math.sin(angle)) > 1e-6 ? BOX_H / 2 / Math.abs(Math.sin(angle)) : 9999,
        );
        const x2 = x - (edgeDist + 6) * Math.cos(angle);
        const y2 = y - (edgeDist + 6) * Math.sin(angle);
        const isRight = submitted
          ? tvt === 'meerkeuze'
            ? parseInt(mathAnswers[i]) === v.correct_optie_index
            : Number(mathAnswers[i] ?? '') === v.antwoord
          : null;
        const stroke = submitted ? (isRight ? C.green : C.red) : C.border;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={stroke} strokeWidth={2} strokeDasharray="5 3" />;
      })}
    </svg>
  );
}

export function TafelSpinInteractief({ data, submitted, mathAnswers, onAnswerChange }) {
  if (!data?.vragen?.length) return null;

  const { tafel, vragen, tafel_vraag_type: tvt = 'invul' } = data;
  const n = vragen.length;

  const keerCount = vragen.filter(v => v.bewerking === 'keren').length;
  const centerLabel = keerCount > n / 2 ? `× ${tafel}` : keerCount === 0 ? `÷ ${tafel}` : `${tafel}`;

  // ── Meerkeuze: vertical list with monkey header ───────────────────────────
  if (tvt === 'meerkeuze') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: `linear-gradient(135deg, ${C.purpleLight}, ${C.bg})`,
          border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(109,32,119,0.35)',
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>🐒</span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'white', fontFamily: 'monospace', marginTop: 1 }}>
              {centerLabel}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tafel van {tafel}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textMid, marginTop: 2 }}>
              Kies het goede antwoord!
            </div>
          </div>
        </div>

        {vragen.map((vraag, i) => {
          const chosen = mathAnswers[i];
          return (
            <div key={i} style={{
              background: C.bg, border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 800, color: C.text, marginBottom: 10 }}>
                {vraag.tekst.replace('___', '?')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(vraag.opties || []).map((opt, j) => {
                  const isSelected = String(chosen) === String(j);
                  const isCorrectOpt = submitted && j === vraag.correct_optie_index;
                  const isWrongSel = submitted && isSelected && j !== vraag.correct_optie_index;
                  return (
                    <button key={j} type="button" disabled={submitted}
                      onClick={() => !submitted && onAnswerChange(i, String(j))}
                      style={{
                        padding: '10px 8px', borderRadius: 8,
                        fontSize: 16, fontWeight: 800, fontFamily: 'monospace',
                        border: `2px solid ${isCorrectOpt ? C.green : isWrongSel ? C.red : isSelected ? C.purple : C.border}`,
                        background: isCorrectOpt ? C.greenLight : isWrongSel ? C.redLight : isSelected ? C.purpleLight : C.white,
                        color: isCorrectOpt ? C.green : isWrongSel ? C.red : isSelected ? C.purple : C.text,
                        cursor: submitted ? 'default' : 'pointer',
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Invul: radial spider / spin diagram ───────────────────────────────────
  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <div style={{ position: 'relative', width: SPIN_SIZE, height: SPIN_SIZE }}>

        <SpokeLines vragen={vragen} submitted={submitted} mathAnswers={mathAnswers} tvt={tvt} />

        {/* Monkey center */}
        <div style={{
          position: 'absolute',
          left: CX - MONKEY_R, top: CY - MONKEY_R,
          width: MONKEY_R * 2, height: MONKEY_R * 2,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(109,32,119,0.45)',
          zIndex: 2,
        }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>🐒</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'white', fontFamily: 'monospace', marginTop: 1 }}>
            {centerLabel}
          </span>
        </div>

        {/* Question boxes */}
        {vragen.map((vraag, i) => {
          const { x, y } = radialPos(i, n);
          const userVal = mathAnswers[i] ?? '';
          const isRight = submitted ? Number(userVal) === vraag.antwoord : null;
          const parts = vraag.tekst.split('___');

          return (
            <div key={i} style={{
              position: 'absolute',
              left: x - BOX_W / 2, top: y - BOX_H / 2,
              width: BOX_W, height: BOX_H,
              background: submitted ? (isRight ? C.greenLight : C.redLight) : C.white,
              border: `2px solid ${submitted ? (isRight ? C.green : C.red) : C.border}`,
              borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '4px 5px', gap: 3,
              zIndex: 2,
              boxShadow: '0 2px 6px rgba(109,32,119,0.1)',
            }}>
              <span style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 800,
                color: C.text, lineHeight: 1, whiteSpace: 'nowrap',
              }}>
                {parts[0]?.trim()}
              </span>
              <input
                type="number"
                value={userVal}
                onChange={e => !submitted && onAnswerChange(i, e.target.value)}
                disabled={submitted}
                placeholder="?"
                style={{
                  width: 44, fontSize: 14, fontWeight: 800, textAlign: 'center',
                  border: `2px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
                  borderRadius: 6, padding: '2px 1px',
                  fontFamily: 'monospace', color: C.text,
                  background: 'transparent', outline: 'none',
                }}
              />
              {submitted && !isRight && (
                <span style={{ fontSize: 9, color: C.red, fontWeight: 700, lineHeight: 1 }}>
                  → {vraag.antwoord}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
