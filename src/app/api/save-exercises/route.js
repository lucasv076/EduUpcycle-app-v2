import { NextResponse } from 'next/server';
import { saveExercises, isConfigured } from '@/lib/supabase';

export async function POST(request) {
  // Geen Supabase geconfigureerd → fallback (geen harde fout)
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'NO_SUPABASE', message: 'Supabase niet geconfigureerd — gebruik JSON export.' },
      { status: 200 }
    );
  }

  try {
    const { exercises } = await request.json();

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'NO_EXERCISES', message: 'Geen oefeningen meegegeven.' },
        { status: 400 }
      );
    }

    const saved = await saveExercises(exercises);
    return NextResponse.json({ saved, count: saved.length });

  } catch (err) {
    console.error('[save-exercises]', err);
    return NextResponse.json(
      { error: 'SAVE_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
