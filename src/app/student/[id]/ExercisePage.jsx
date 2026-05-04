'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { C } from '@/lib/colors';
import { BlokkenBouwselInteractive, gridsEqual } from '@/components/blokken-bouwsel';
import SubmissionHistory from '@/components/SubmissionHistory';

// Generate or retrieve a stable session ID
function getSessionId() {
  if (typeof window === 'undefined') return null;
  let sessionId = localStorage.getItem('eduupcycle_session_id');
  if (!sessionId) {
    sessionId = 'student_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('eduupcycle_session_id', sessionId);
  }
  return sessionId;
}

const ZwijsenLogo = () => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{ background: bg, color: 'white', fontWeight: 900, fontSize: 14,
        padding: '2px 6px', borderRadius: 3 }}>{l}</span>
    ))}
  </div>
);

export default function ExercisePage({ exercise }) {
  // phase: 'easy' → makkelijke variant
  //        'hard' → moeilijke variant
  //        'done' → klaar!
  const [phase, setPhase]         = useState('easy');
  const [answer, setAnswer]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session ID on mount
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const easyVariant = exercise.variants?.[0];
  const hardVariant = exercise.variants?.[1];
  const hasVariants = !!(easyVariant && hardVariant);
  const isBlockQuestion = exercise.question_type === 'blokken_bouwsel';
  const isBuildMode = isBlockQuestion && phase === 'hard';

  const questionText = hasVariants
    ? (phase === 'hard' ? hardVariant.text : easyVariant.text)
    : exercise.original;

  // For block exercises, track whether the answer is actually correct
  const isAnswerCorrect = submitted
    ? isBuildMode
      ? gridsEqual(answer, exercise.block_plan_grid)
      : isBlockQuestion
        ? answer === exercise.block_correct_option
        : true
    : null;

  // Save submission when answer is submitted
  useEffect(() => {
    if (submitted && sessionId && answer) {
      const submittedGrid = isBlockQuestion ? answer : null;

      fetch('/api/save-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise.id,
          sessionId,
          difficultyLevel: phase,
          answer: isBlockQuestion ? null : answer,
          isCorrect: isAnswerCorrect,
          submittedGrid,
        }),
      }).catch(err => {
        console.error('Failed to save submission:', err);
      });
    }
  }, [submitted, sessionId, answer, exercise.id, isBlockQuestion, isAnswerCorrect, phase]);

  const handleSubmit = () => setSubmitted(true);

  const handleNextLevel = () => {
    setAnswer('');
    setSubmitted(false);
    setPhase('hard');
  };

  const handleDone = () => setPhase('done');

  // ── Input op basis van vraagtype ────────────────────────────────────
  const renderInput = () => {
    if (isBlockQuestion) return (
      <BlokkenBouwselInteractive
        goalGrid={exercise.block_goal_grid}
        planGrid={exercise.block_plan_grid}
        optionAGrid={exercise.block_option_a_grid}
        optionBGrid={exercise.block_option_b_grid}
        correctOption={exercise.block_correct_option}
        maxHeight={exercise.block_max_height}
        onAnswered={(val) => setAnswer(val)}
        disabled={submitted}
        buildMode={isBuildMode}
        showFeedback={submitted}
      />
    );

    if (exercise.type === 'Invulvraag') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={submitted} placeholder="Typ hier je antwoord..."
          style={{ border: `2px solid ${submitted ? C.green : C.border}`,
            borderRadius: 10, padding: '12px 16px', fontSize: 18, maxWidth: 280,
            color: C.text, background: submitted ? C.greenLight : C.white, fontFamily: 'inherit' }} />
      </div>
    );

    if (exercise.type === 'Open vraag' || exercise.type === 'Tekenopgave'
      || exercise.type === 'Manipulatieopdracht') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
          placeholder="Schrijf je antwoord hier..." rows={5}
          style={{ border: `2px solid ${submitted ? C.green : C.border}`,
            borderRadius: 10, padding: '12px 16px', fontSize: 15, resize: 'none',
            color: C.text, fontFamily: 'inherit', maxWidth: 500 }} />
      </div>
    );

    if (exercise.type === 'Meerkeuze') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
        {['Antwoord A', 'Antwoord B', 'Antwoord C', 'Antwoord D'].map((opt, i) => (
          <button type="button" key={i} onClick={() => !submitted && setAnswer(opt)} disabled={submitted}
            style={{ textAlign: 'left', padding: '13px 18px', borderRadius: 10, fontSize: 15,
              border: `2px solid ${answer === opt ? C.purple : C.border}`,
              background: answer === opt ? C.purpleLight : C.white, color: C.text,
              fontWeight: answer === opt ? 700 : 400, cursor: submitted ? 'default' : 'pointer' }}>
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>
    );

    return null;
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
        <Link href="/" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.75)',
          fontSize: 12, textDecoration: 'none' }}>Portalen</Link>
        <Link href="/student" style={{ marginLeft: 14, color: 'rgba(255,255,255,0.75)',
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
              <button type="button" style={{ background: C.purple, color: 'white', border: 'none',
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
              <button type="button" onClick={handleSubmit} disabled={!answer}
                style={{ marginTop: 24, background: C.purple, color: 'white', border: 'none',
                  borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                  opacity: answer ? 1 : 0.4, cursor: answer ? 'pointer' : 'not-allowed' }}>
                Antwoord controleren →
              </button>
            ) : (
              <div style={{ marginTop: 24 }}>
                {/* Build mode shows its own feedback inside BlokkenBouwselInteractive */}
                {!isBuildMode && (
                  <div style={{
                    background: isAnswerCorrect === false ? C.redLight : C.greenLight,
                    borderRadius: 12, padding: '14px 18px',
                    border: `1.5px solid ${isAnswerCorrect === false ? C.red : C.green}`,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4,
                      color: isAnswerCorrect === false ? C.red : C.green }}>
                      {isAnswerCorrect === false ? '✗ Niet helemaal goed…' : '✓ Goed gedaan!'}
                    </div>
                    <div style={{ fontSize: 13, color: C.text }}>
                      {isAnswerCorrect === false
                        ? 'Kijk nog eens goed naar de plattegrond.'
                        : phase === 'easy' && hasVariants
                          ? 'Klaar voor de moeilijkere versie?'
                          : 'Je hebt de oefening afgerond!'}
                    </div>
                  </div>
                )}

                {phase === 'easy' && hasVariants && (
                  <button type="button" onClick={handleNextLevel}
                    style={{ background: `linear-gradient(135deg, ${C.pink}, #A0004A)`,
                      color: 'white', border: 'none', borderRadius: 10,
                      padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    Moeilijkere versie proberen →
                  </button>
                )}

                {phase === 'hard' && (
                  <button type="button" onClick={handleDone}
                    style={{ background: C.green, color: 'white', border: 'none',
                      borderRadius: 10, padding: '13px 32px', fontWeight: 700,
                      fontSize: 15, cursor: 'pointer', marginTop: isBuildMode ? 12 : 0 }}>
                    🎉 Afronden
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <SubmissionHistory exerciseId={exercise.id} />
      </div>
    </div>
  );
}
