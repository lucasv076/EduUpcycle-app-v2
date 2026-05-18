'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { C } from '@/lib/colors';
import { checkAnswer } from '@/lib/answer-validation';

const ZwijsenLogo = () => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{ background: bg, color: 'white', fontWeight: 900, fontSize: 14,
        padding: '2px 6px', borderRadius: 3 }}>{l}</span>
    ))}
  </div>
);

export default function ExercisePage({ exercise }) {
  const [phase, setPhase]         = useState('easy');
  const [answer, setAnswer]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const easyVariant = exercise.variants?.[0];
  const hardVariant = exercise.variants?.[1];
  const hasVariants = !!(easyVariant && hardVariant);

  const currentVariant = phase === 'hard' ? hardVariant : easyVariant;
  const questionText   = hasVariants ? currentVariant?.text : exercise.original;
  const correctAnswer  = currentVariant?.answer || '';
  const explanation    = currentVariant?.explanation || '';
  const options        = currentVariant?.options || [];

  const isCorrect = submitted ? checkAnswer(answer, correctAnswer, exercise.type) : null;

  const handleSubmit = () => setSubmitted(true);

  const handleNextLevel = () => {
    setAnswer('');
    setSubmitted(false);
    setPhase('hard');
  };

  const handleRetry = () => {
    setAnswer('');
    setSubmitted(false);
  };

  const handleDone = () => setPhase('done');

  // Auto-advance naar moeilijker bij goed antwoord (na 2s)
  useEffect(() => {
    if (submitted && isCorrect === true && phase === 'easy' && hasVariants) {
      const t = setTimeout(handleNextLevel, 2000);
      return () => clearTimeout(t);
    }
  }, [submitted, isCorrect, phase, hasVariants]);

  // ── Input op basis van vraagtype ──────────────────────────────────────
  const renderInput = () => {
    if (exercise.type === 'Meerkeuze') {
      const displayOptions = options.length >= 2 ? options : ['Optie A', 'Optie B', 'Optie C', 'Optie D'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
          {displayOptions.map((opt, i) => {
            const isSelected = answer === opt;
            const isRight    = submitted && opt === correctAnswer;
            const isWrong    = submitted && isSelected && opt !== correctAnswer;
            return (
              <button key={i} onClick={() => !submitted && setAnswer(opt)} disabled={submitted}
                style={{ textAlign: 'left', padding: '13px 18px', borderRadius: 10, fontSize: 15,
                  border: `2px solid ${isRight ? C.green : isWrong ? '#E53935' : isSelected ? C.purple : C.border}`,
                  background: isRight ? C.greenLight : isWrong ? '#FFEBEE' : isSelected ? C.purpleLight : C.white,
                  color: C.text, fontWeight: isSelected ? 700 : 400,
                  cursor: submitted ? 'default' : 'pointer' }}>
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (exercise.type === 'Invulvraag') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={submitted} placeholder="Typ hier je antwoord..."
          onKeyDown={e => e.key === 'Enter' && answer && !submitted && handleSubmit()}
          style={{ border: `2px solid ${
            submitted ? (isCorrect === false ? '#E53935' : C.green) : C.border
          }`, borderRadius: 10, padding: '12px 16px', fontSize: 18, maxWidth: 280,
            color: C.text,
            background: submitted ? (isCorrect === false ? '#FFEBEE' : C.greenLight) : C.white,
            fontFamily: 'inherit' }} />
      </div>
    );

    // Open vraag / Tekenopgave / Manipulatieopdracht
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
          placeholder="Schrijf je antwoord hier..." rows={5}
          style={{ border: `2px solid ${submitted ? C.green : C.border}`,
            borderRadius: 10, padding: '12px 16px', fontSize: 15, resize: 'none',
            color: C.text, fontFamily: 'inherit', maxWidth: 500 }} />
      </div>
    );
  };

  // ── Feedback na inleveren ─────────────────────────────────────────────
  const renderFeedback = () => {
    if (isCorrect === true) {
      return (
        <div style={{ background: C.greenLight, borderRadius: 12, padding: '14px 18px',
          border: `1.5px solid ${C.green}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: C.green, fontSize: 15, marginBottom: explanation ? 4 : 0 }}>
            ✓ Goed gedaan!
          </div>
          {explanation && <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{explanation}</div>}
          <div style={{ fontSize: 12, color: C.textMid, fontStyle: 'italic' }}>
            {phase === 'easy' && hasVariants ? 'Door naar moeilijker…' : 'Je hebt de oefening afgerond!'}
          </div>
        </div>
      );
    }

    if (isCorrect === false) {
      return (
        <div style={{ background: '#FFEBEE', borderRadius: 12, padding: '14px 18px',
          border: '1.5px solid #E53935', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: '#C62828', fontSize: 15, marginBottom: 6 }}>✗ Niet helemaal…</div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: explanation ? 8 : 0 }}>
            Het goede antwoord is: <strong style={{ color: '#2E7D32' }}>{correctAnswer}</strong>
          </div>
          {explanation && (
            <div style={{ fontSize: 13, color: C.text, background: 'white',
              borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${C.purple}` }}>
              💡 {explanation}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ background: C.greenLight, borderRadius: 12, padding: '14px 18px',
        border: `1.5px solid ${C.green}`, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: C.green, fontSize: 15, marginBottom: 4 }}>✓ Ingeleverd!</div>
        {correctAnswer && correctAnswer !== 'n.v.t.' && (
          <div style={{ fontSize: 13, color: C.text, marginBottom: explanation ? 4 : 0 }}>
            Voorbeeldantwoord: <strong>{correctAnswer}</strong>
          </div>
        )}
        {explanation && <div style={{ fontSize: 13, color: C.text }}>💡 {explanation}</div>}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
        color: 'white', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <ZwijsenLogo />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>Oefeningen</span>
        <Link href="/student" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.75)',
          fontSize: 12, textDecoration: 'none' }}>← Terug naar overzicht</Link>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Topic badge */}
        <div style={{ background: C.yellow, display: 'inline-block', padding: '5px 14px',
          borderRadius: 8, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 16 }}>
          Pagina {exercise.page} &middot; {exercise.topic}
        </div>

        {/* Titel */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 20, lineHeight: 1.3 }}>
          {exercise.title}
        </h1>

        {/* Niveau-indicator */}
        {hasVariants && phase !== 'done' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <div style={{
              background: phase === 'easy' ? C.greenLight : '#f0f0f0',
              color: phase === 'easy' ? C.green : C.textLight,
              border: `1.5px solid ${phase === 'easy' ? C.green : '#ddd'}`,
              borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
            }}>① Makkelijker</div>
            <div style={{
              background: phase === 'hard' ? C.pinkLight : '#f0f0f0',
              color: phase === 'hard' ? C.pink : C.textLight,
              border: `1.5px solid ${phase === 'hard' ? C.pink : '#ddd'}`,
              borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
            }}>② Moeilijker</div>
          </div>
        )}

        {/* ── Klaar-scherm ── */}
        {phase === 'done' ? (
          <div style={{ background: C.white, borderRadius: 16, padding: 40,
            textAlign: 'center', border: `1px solid ${C.border}`,
            boxShadow: '0 4px 24px rgba(109,32,119,0.08)' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 10 }}>
              Super gedaan!
            </div>
            <div style={{ fontSize: 15, color: C.textMid, marginBottom: 28 }}>
              Je hebt beide niveaus afgerond!
            </div>
            <Link href="/student">
              <button style={{ background: C.purple, color: 'white', border: 'none',
                borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                cursor: 'pointer' }}>
                Nog een oefening →
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 16, padding: 28,
            border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(109,32,119,0.08)' }}>

            {/* Vraagstekst */}
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 24,
              lineHeight: 1.7, background: C.bg, borderRadius: 10, padding: '16px 18px',
              border: `1px solid ${C.border}` }}>
              {questionText}
            </div>

            {/* Invoerveld */}
            {renderInput()}

            {/* Submit / feedback */}
            {!submitted ? (
              <button onClick={handleSubmit} disabled={!answer}
                style={{ marginTop: 24, background: C.purple, color: 'white', border: 'none',
                  borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                  opacity: answer ? 1 : 0.4, cursor: answer ? 'pointer' : 'not-allowed' }}>
                Antwoord controleren →
              </button>
            ) : (
              <div style={{ marginTop: 24 }}>
                {renderFeedback()}

                {isCorrect === false && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={handleRetry}
                      style={{ background: C.purple, color: 'white', border: 'none',
                        borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      ↻ Opnieuw proberen
                    </button>
                    {phase === 'easy' && hasVariants && (
                      <button onClick={handleNextLevel}
                        style={{ background: 'white', color: C.textMid, border: `1.5px solid ${C.border}`,
                          borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        Toch verder →
                      </button>
                    )}
                    {phase === 'hard' && (
                      <button onClick={handleDone}
                        style={{ background: 'white', color: C.textMid, border: `1.5px solid ${C.border}`,
                          borderRadius: 10, padding: '13px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        Toch afronden →
                      </button>
                    )}
                  </div>
                )}

                {isCorrect !== false && phase === 'easy' && hasVariants && (
                  <button onClick={handleNextLevel}
                    style={{ background: `linear-gradient(135deg, ${C.pink}, #A0004A)`,
                      color: 'white', border: 'none', borderRadius: 10,
                      padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    Moeilijkere versie proberen →
                  </button>
                )}

                {isCorrect !== false && phase === 'hard' && (
                  <button onClick={handleDone}
                    style={{ background: C.green, color: 'white', border: 'none',
                      borderRadius: 10, padding: '13px 32px', fontWeight: 700,
                      fontSize: 15, cursor: 'pointer' }}>
                    🎉 Afronden
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
