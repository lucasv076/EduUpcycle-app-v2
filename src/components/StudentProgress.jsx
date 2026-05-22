'use client';

import { useEffect, useState } from 'react';
import { loadAllProgress } from '@/lib/progress';
import { C } from '@/lib/colors';

// Toont een samenvattend voortgangsbadge op de overzichtspagina.
// Aggregeert over alle oefeningen in localStorage.
export default function StudentProgress() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const all = loadAllProgress();
    const entries = Object.values(all).filter(p => p && p.totalAttempts > 0);
    if (entries.length === 0) return;

    const totalAttempts = entries.reduce((s, p) => s + (p.totalAttempts || 0), 0);
    const totalCorrect  = entries.reduce((s, p) => s + (p.totalCorrect || 0), 0);
    const exerciseCount = entries.length;

    setStats({ totalAttempts, totalCorrect, exerciseCount });
  }, []);

  if (!stats) return null;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
      <div style={{
        background: C.purple + '14',
        border: `1.5px solid ${C.purple}`,
        borderRadius: 99, padding: '4px 12px',
        fontSize: 11, fontWeight: 700, color: C.purple,
      }}>
        📊 {stats.totalCorrect}/{stats.totalAttempts} goed
      </div>
      <span style={{ fontSize: 11, color: C.textLight }}>
        {stats.exerciseCount} oefening{stats.exerciseCount !== 1 ? 'en' : ''} geprobeerd
      </span>
    </div>
  );
}
