'use client';

import { useState } from 'react';
import { BlokkenBouwselInteractive } from '@/components/blokken-bouwsel';
import { C } from '@/lib/colors';

// Target: student must build this
const PLAN_GRID = [
  [2, 1, 3],
  [1, 3, 2],
  [3, 2, 1],
];

export default function TestBlokken() {
  const [answer, setAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif', padding: 32 }}>
      <h1 style={{ color: C.purple, marginBottom: 6, fontSize: 22, fontWeight: 800 }}>
        Blokkenbouwsel — Canvas Test
      </h1>
      <p style={{ color: C.textMid, marginBottom: 32, fontSize: 14 }}>
        Test de isometrische canvas-builder. Bouw het bouwsel na via de plattegrond hieronder.
      </p>

      <div style={{
        maxWidth: 580, background: C.white, borderRadius: 16, padding: 28,
        border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(109,32,119,0.08)',
      }}>
        <div style={{
          fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 24,
          background: C.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`,
        }}>
          Bouw het bouwsel na: klik op de vakjes om blokken toe te voegen. Gebruik de plattegrond als gids.
        </div>

        <BlokkenBouwselInteractive
          goalGrid={PLAN_GRID}
          planGrid={PLAN_GRID}
          optionAGrid={PLAN_GRID}
          optionBGrid={null}
          correctOption="A"
          maxHeight={4}
          onAnswered={setAnswer}
          disabled={submitted}
          buildMode
          showFeedback={submitted}
        />

        <div style={{ marginTop: 20 }}>
          {!submitted ? (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              disabled={!answer}
              style={{
                background: C.purple, color: C.white, border: 'none',
                borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15,
                opacity: answer ? 1 : 0.4, cursor: answer ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              Antwoord controleren →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setAnswer(null); setSubmitted(false); }}
              style={{
                background: C.teal, color: C.white, border: 'none',
                borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Opnieuw proberen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
