import { saveSubmission } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      exerciseId,
      sessionId,
      difficultyLevel,
      answer,
      isCorrect,
      submittedGrid,
    } = body;

    // Validatie
    if (!exerciseId || !sessionId || !difficultyLevel) {
      return Response.json(
        { error: 'Ontbrekende vereiste velden' },
        { status: 400 }
      );
    }

    if (!['easy', 'hard'].includes(difficultyLevel)) {
      return Response.json(
        { error: 'Invalid difficulty_level' },
        { status: 400 }
      );
    }

    // Opslaan
    const submission = await saveSubmission(
      exerciseId,
      sessionId,
      difficultyLevel,
      answer,
      isCorrect,
      submittedGrid
    );

    return Response.json({
      success: true,
      submission,
    });
  } catch (err) {
    console.error('Submission error:', err);
    return Response.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
