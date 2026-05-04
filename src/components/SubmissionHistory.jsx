'use client';

import { useState, useEffect } from 'react';
import { C } from '@/lib/colors';

export default function SubmissionHistory({ exerciseId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Get session ID from localStorage
    const stored = typeof window !== 'undefined' 
      ? localStorage.getItem('eduupcycle_session_id')
      : null;
    setSessionId(stored);
  }, []);

  useEffect(() => {
    if (!sessionId || !exerciseId) {
      setLoading(false);
      return;
    }

    // Fetch submissions for this exercise and session
    fetch(`/api/get-submissions?exerciseId=${exerciseId}&sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch submissions:', err);
        setLoading(false);
      });
  }, [sessionId, exerciseId]);

  if (loading || submissions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.textMid, marginBottom: 16 }}>
        📋 Vorige pogingen ({submissions.length})
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {submissions.map((sub, idx) => {
          const timeAgo = formatTimeAgo(new Date(sub.created_at));
          const levelLabel = sub.difficulty_level === 'easy' ? '①' : '②';
          const statusColor = sub.is_correct ? C.green : C.red;
          const statusLabel = sub.is_correct ? '✓ Goed' : '✗ Fout';

          return (
            <div
              key={sub.id}
              style={{
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18 }}>{levelLabel}</div>
                <div>
                  <div style={{ fontSize: 13, color: C.textMid }}>
                    {timeAgo}
                  </div>
                </div>
              </div>
              <div
                style={{
                  color: statusColor,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'zojuist';
  if (minutes < 60) return `${minutes}m geleden`;
  if (hours < 24) return `${hours}u geleden`;
  if (days < 7) return `${days}d geleden`;
  
  return date.toLocaleDateString('nl-NL');
}
