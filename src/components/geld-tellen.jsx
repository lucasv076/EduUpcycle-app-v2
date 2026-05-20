'use client';

import { C } from '@/lib/colors';

// Euro briefje kleuren (gebaseerd op echte eurobiljet-kleuren)
const BRIEFJE = {
  5:   { bg: '#A8A898', stripe: '#78786A', text: '#2C2C1A', hi: 'rgba(255,255,255,0.1)' },
  10:  { bg: '#CC3E22', stripe: '#9A2C12', text: '#FFFFFF', hi: 'rgba(255,200,180,0.12)' },
  20:  { bg: '#2B5EA8', stripe: '#1A3E80', text: '#FFFFFF', hi: 'rgba(160,200,255,0.12)' },
  50:  { bg: '#D47018', stripe: '#A05010', text: '#FFFFFF', hi: 'rgba(255,210,140,0.12)' },
  100: { bg: '#3A8040', stripe: '#286030', text: '#FFFFFF', hi: 'rgba(160,240,180,0.12)' },
  200: { bg: '#C89808', stripe: '#987008', text: '#FFFFFF', hi: 'rgba(255,240,120,0.12)' },
  500: { bg: '#5E2E80', stripe: '#401A60', text: '#FFFFFF', hi: 'rgba(200,160,255,0.12)' },
};

// Euro munt stijlen
const MUNT = {
  0.01: { fill: '#C47830', r: 15, textColor: '#7A4810' },
  0.02: { fill: '#C47830', r: 17, textColor: '#7A4810' },
  0.05: { fill: '#C47830', r: 19, textColor: '#7A4810' },
  0.10: { fill: '#D4AC17', r: 16, textColor: '#3A2800' },
  0.20: { fill: '#D4AC17', r: 18, textColor: '#3A2800' },
  0.50: { fill: '#D4AC17', r: 21, textColor: '#3A2800' },
  1:    { fill: '#C0C0B8', ring: '#D4AC17', r: 23, textColor: '#3A2800' },
  2:    { fill: '#D4AC17', ring: '#C0C0B8', r: 25, textColor: '#3A2800' },
};

function EuroBriefje({ waarde }) {
  const d = BRIEFJE[waarde];
  if (!d) return null;
  const W = 118, H = 60;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.25))', display: 'block', flexShrink: 0 }}>
      <rect width={W} height={H} rx={4} fill={d.bg} />
      {/* Linkse streep */}
      <rect width={22} height={H} rx={4} fill={d.stripe} />
      <rect x={18} width={5} height={H} fill={d.stripe} />
      {/* Glans */}
      <rect width={W} height={H} rx={4} fill={d.hi} />
      {/* € in streep */}
      <text x={11} y={36} fontSize={14} fontWeight={900} fill={d.text}
        textAnchor="middle" fontFamily="Georgia,serif">€</text>
      {/* Bedrag groot */}
      <text x={70} y={39} fontSize={24} fontWeight={900} fill={d.text}
        textAnchor="middle" fontFamily="'Courier New',monospace">{waarde}</text>
      {/* Kleine hoek-labels */}
      <text x={28} y={13} fontSize={9} fill={d.text} opacity={0.6}>{waarde}</text>
      <text x={113} y={55} fontSize={9} fill={d.text} opacity={0.6} textAnchor="end">{waarde}</text>
      {/* Decoratieve boog (simpele poort-motief) */}
      <path d={`M 23,${H * 0.3} Q 60,${H * 0.03} 97,${H * 0.3}`}
        fill="none" stroke={d.text} strokeWidth={0.8} opacity={0.2} />
      <path d={`M 23,${H * 0.48} Q 60,${H * 0.21} 97,${H * 0.48}`}
        fill="none" stroke={d.text} strokeWidth={0.8} opacity={0.14} />
    </svg>
  );
}

function EuroMunt({ waarde }) {
  const d = MUNT[waarde] || MUNT[1];
  const { r, fill, ring, textColor } = d;
  const size = r * 2 + 8;
  const cx = r + 4;
  const label = waarde >= 1 ? `€${waarde}` : `${Math.round(waarde * 100)}ct`;
  const fSize = r >= 22 ? 10 : r >= 18 ? 9 : 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))', display: 'block', flexShrink: 0 }}>
      {ring ? (
        <>
          <circle cx={cx} cy={cx} r={r} fill={ring} />
          <circle cx={cx} cy={cx} r={r - 5} fill={fill} />
          <circle cx={cx} cy={cx} r={r - 5} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={0.8} />
        </>
      ) : (
        <circle cx={cx} cy={cx} r={r} fill={fill} />
      )}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={1.5} />
      {/* Glans */}
      <ellipse cx={cx - r * 0.22} cy={cx - r * 0.22} rx={r * 0.32} ry={r * 0.2}
        fill="rgba(255,255,255,0.3)" transform={`rotate(-35,${cx},${cx})`} />
      <text x={cx} y={cx} dy="0.36em" fontSize={fSize} fontWeight={900}
        fill={textColor} textAnchor="middle" fontFamily="monospace">{label}</text>
    </svg>
  );
}

function ItemGroep({ item }) {
  const MAX_SHOW = 3;
  const showAll = item.aantal <= MAX_SHOW;
  const isBriefje = item.soort === 'briefje';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isBriefje ? 8 : 5, alignItems: 'center', justifyContent: 'center' }}>
        {showAll
          ? Array.from({ length: item.aantal }, (_, i) => (
              isBriefje
                ? <EuroBriefje key={i} waarde={item.waarde} />
                : <EuroMunt key={i} waarde={item.waarde} />
            ))
          : (
            <>
              {isBriefje
                ? <EuroBriefje waarde={item.waarde} />
                : <EuroMunt waarde={item.waarde} />
              }
              <span style={{
                fontSize: 18, fontWeight: 900, color: C.purple,
                background: C.purpleLight, borderRadius: 8,
                padding: isBriefje ? '8px 12px' : '5px 9px',
                lineHeight: 1,
              }}>
                × {item.aantal}
              </span>
            </>
          )
        }
      </div>
    </div>
  );
}

export function GeldTellenInteractief({ data, submitted, value, onAnswerChange, isCorrect }) {
  if (!data?.items?.length) return null;

  const { modus = 'tellen', items, totaal, prijs, geld_vraag_type = 'invul' } = data;
  const briefjes = items.filter(i => i.soort === 'briefje' && i.waarde > 0 && i.aantal > 0);
  const munten   = items.filter(i => i.soort === 'munt'    && i.waarde > 0 && i.aantal > 0);

  const formatEuro = (n) => `€ ${Number(n).toFixed(2).replace('.', ',')}`;
  const borderColor = submitted
    ? (isCorrect ? C.green : isCorrect === false ? C.red : C.border)
    : C.purple;
  const inputBg = submitted
    ? (isCorrect ? C.greenLight : isCorrect === false ? C.redLight : C.white)
    : C.white;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Wisselgeld: toon prijslabel EERST (boven het betaalgeld) */}
      {modus === 'wisselgeld' && prijs != null && (
        <div style={{
          background: '#FFFBEA',
          border: `1.5px solid ${C.yellow}`,
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>🏷️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5500', textTransform: 'uppercase', marginBottom: 2 }}>
              Prijs
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontFamily: 'monospace' }}>
              {formatEuro(prijs)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#7A5500', fontWeight: 500, maxWidth: 160, lineHeight: 1.4 }}>
            Je betaalt met het geld hieronder. Hoeveel wisselgeld krijg je terug?
          </div>
        </div>
      )}

      {/* Geld-weergave paneel */}
      <div style={{
        background: 'linear-gradient(135deg, #F5F0FB 0%, #ECE8F4 100%)',
        border: `1.5px solid ${C.border}`,
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {modus === 'wisselgeld' && (
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            💳 Je betaalt met
          </div>
        )}
        {briefjes.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, color: C.textLight,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
            }}>
              💵 Briefjes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
              {briefjes.map((item, i) => <ItemGroep key={i} item={item} />)}
            </div>
          </div>
        )}

        {munten.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, color: C.textLight,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
            }}>
              🪙 Munten
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
              {munten.map((item, i) => <ItemGroep key={i} item={item} />)}
            </div>
          </div>
        )}
      </div>

      {/* Vraaggedeelte: invul / meerkeuze / goed_fout */}
      {geld_vraag_type === 'meerkeuze' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, color: C.textMid, fontWeight: 600 }}>
            {modus === 'wisselgeld' ? '💰 Hoeveel wisselgeld krijg je?' : '💶 Wat is het totaalbedrag?'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(data.opties || []).map((optie, i) => {
              const isSelected     = String(value) === String(i);
              const isCorrectOpt   = submitted && i === data.correct_optie;
              const isWrongSel     = submitted && isSelected && i !== data.correct_optie;
              return (
                <button key={i} type="button" disabled={submitted}
                  onClick={() => !submitted && onAnswerChange(String(i))}
                  style={{
                    padding: '12px 8px', borderRadius: 10,
                    fontSize: 18, fontWeight: 800, fontFamily: 'monospace',
                    border: `2px solid ${isCorrectOpt ? C.green : isWrongSel ? C.red : isSelected ? C.purple : C.border}`,
                    background: isCorrectOpt ? C.greenLight : isWrongSel ? C.redLight : isSelected ? C.purpleLight : C.white,
                    color: isCorrectOpt ? C.green : isWrongSel ? C.red : isSelected ? C.purple : C.text,
                    cursor: submitted ? 'default' : 'pointer',
                  }}>
                  {formatEuro(optie)}
                </button>
              );
            })}
          </div>
          {submitted && isCorrect === true && (
            <div style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>✓ Helemaal goed!</div>
          )}
        </div>

      ) : geld_vraag_type === 'goed_fout' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, color: C.textMid, fontWeight: 600 }}>
            {modus === 'wisselgeld' ? '💰 Klopt dit wisselgeld?' : '💶 Klopt dit totaalbedrag?'}
          </label>
          <div style={{
            background: C.bg, border: `2px solid ${C.border}`,
            borderRadius: 12, padding: '14px 20px',
            textAlign: 'center', fontSize: 28, fontWeight: 900,
            fontFamily: 'monospace', color: C.text, marginBottom: 4,
          }}>
            {formatEuro(data.getoond_bedrag ?? totaal)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Goed', 'Fout'].map(opt => {
              const isSelected = value === opt;
              const isThisCorrect = (opt === 'Goed') === data.klopt;
              return (
                <button key={opt} type="button" disabled={submitted}
                  onClick={() => !submitted && onAnswerChange(opt)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    fontSize: 15, fontWeight: 700,
                    border: `2px solid ${submitted && isThisCorrect ? C.green : submitted && isSelected && !isThisCorrect ? C.red : isSelected ? C.purple : C.border}`,
                    background: submitted && isThisCorrect ? C.greenLight : submitted && isSelected && !isThisCorrect ? C.redLight : isSelected ? C.purpleLight : C.white,
                    color: C.text, cursor: submitted ? 'default' : 'pointer',
                  }}>
                  {opt === 'Goed' ? '✓ Goed' : '✗ Fout'}
                </button>
              );
            })}
          </div>
          {submitted && isCorrect === false && (
            <div style={{ fontSize: 13, color: C.red, fontWeight: 700, marginTop: 2 }}>
              → Het juiste antwoord is: {data.klopt ? 'Goed' : 'Fout'} ({formatEuro(totaal)})
            </div>
          )}
          {submitted && isCorrect === true && (
            <div style={{ fontSize: 14, color: C.green, fontWeight: 700, marginTop: 2 }}>✓ Helemaal goed!</div>
          )}
        </div>

      ) : (
        /* invul (standaard) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, color: C.textMid, fontWeight: 600 }}>
            {modus === 'wisselgeld' ? '💰 Wisselgeld:' : '💶 Totaal bedrag:'}
          </label>
          <div style={{ display: 'flex', alignItems: 'stretch', maxWidth: 200 }}>
            <div style={{
              background: submitted ? inputBg : C.bg,
              border: `2px solid ${borderColor}`, borderRight: 'none',
              borderRadius: '10px 0 0 10px', padding: '10px 12px',
              fontSize: 18, fontWeight: 800, color: C.textMid,
              display: 'flex', alignItems: 'center',
            }}>€</div>
            <input type="text" inputMode="decimal"
              value={value || ''} onChange={e => !submitted && onAnswerChange(e.target.value)}
              disabled={submitted} placeholder="0,00"
              style={{
                border: `2px solid ${borderColor}`, borderLeft: 'none',
                borderRadius: '0 10px 10px 0', padding: '10px 12px',
                fontSize: 20, fontWeight: 800, width: '100%',
                color: C.text, background: inputBg, fontFamily: 'monospace', outline: 'none',
              }} />
          </div>
          {submitted && isCorrect === false && totaal != null && (
            <div style={{ fontSize: 13, color: C.red, fontWeight: 700, marginTop: 2 }}>
              → Juist antwoord: {formatEuro(totaal)}
            </div>
          )}
          {submitted && isCorrect === true && (
            <div style={{ fontSize: 14, color: C.green, fontWeight: 700, marginTop: 2 }}>✓ Helemaal goed!</div>
          )}
        </div>
      )}
    </div>
  );
}
