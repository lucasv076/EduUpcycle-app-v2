import { getSubmissionsByExercise } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const sessionId = searchParams.get('sessionId');

    if (!exerciseId || !sessionId) {
      return Response.json(
        { error: 'Ontbrekende exerciseId of sessionId' },
        { status: 400 }
      );
    }

    const submissions = await getSubmissionsByExercise(exerciseId, sessionId);

    return Response.json({
      submissions: submissions || [],
    });
  } catch (err) {
    console.error('Get submissions error:', err);
    return Response.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
