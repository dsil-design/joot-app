import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/ai-journal/insights/[id]
 *
 * Update an insight's status (dismiss or mark as implemented).
 *
 * Body:
 * - action: 'dismiss' | 'implement' | 'reactivate'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (!['dismiss', 'implement', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: dismiss, implement, or reactivate' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'dismiss':
        updateData.status = 'dismissed';
        updateData.dismissed_at = new Date().toISOString();
        break;
      case 'implement':
        updateData.status = 'implemented';
        updateData.implemented_at = new Date().toISOString();
        break;
      case 'reactivate':
        updateData.status = 'active';
        updateData.dismissed_at = null;
        updateData.implemented_at = null;
        break;
    }

    const { data, error } = await supabase
      .from('ai_insights')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insight:', error);
      return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ insight: data });
  } catch (error) {
    console.error('Error in insight update API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
