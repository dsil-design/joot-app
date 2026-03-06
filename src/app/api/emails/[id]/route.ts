import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/emails/[id]
 *
 * Retrieves a single email by ID for the authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Try fetching email directly by emails.id
    const { data: email, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (email) {
      return NextResponse.json({ email });
    }

    // If not found, the id might be an email_transactions.id — look up via message_id
    if (error?.code === 'PGRST116') {
      const { data: et } = await supabase
        .from('email_transactions')
        .select('message_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (et?.message_id) {
        const { data: emailByMsgId, error: msgError } = await supabase
          .from('emails')
          .select('*')
          .eq('message_id', et.message_id)
          .eq('user_id', user.id)
          .single();

        if (emailByMsgId) {
          return NextResponse.json({ email: emailByMsgId });
        }

        if (msgError) {
          console.error('Error fetching email by message_id:', msgError);
        }
      }

      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    if (error) {
      console.error('Error fetching email:', error);
      return NextResponse.json(
        { error: 'Failed to fetch email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ email });

  } catch (error) {
    console.error('Error in email detail API:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/emails/[id]
 *
 * Deletes a single email by ID for the authenticated user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Delete email by ID (RLS ensures user can only delete their own emails)
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting email:', error);
      return NextResponse.json(
        { error: 'Failed to delete email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in email delete API:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
