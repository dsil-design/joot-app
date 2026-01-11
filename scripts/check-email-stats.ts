import { createServiceRoleClient } from '../src/lib/supabase/server';

async function main() {
  const supabase = createServiceRoleClient();
  const folder = 'Personal/Bills and Receipts';

  // Get count and UID range
  const { count } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('folder', folder);

  console.log(`Total emails in folder '${folder}': ${count}`);

  // Get min/max UID
  const { data: minRow } = await supabase
    .from('emails')
    .select('uid')
    .eq('folder', folder)
    .order('uid', { ascending: true })
    .limit(1)
    .single();

  const { data: maxRow } = await supabase
    .from('emails')
    .select('uid')
    .eq('folder', folder)
    .order('uid', { ascending: false })
    .limit(1)
    .single();

  console.log(`UID range: ${minRow?.uid} - ${maxRow?.uid}`);

  // Get date range
  const { data: oldestRow } = await supabase
    .from('emails')
    .select('date, subject')
    .eq('folder', folder)
    .order('date', { ascending: true, nullsFirst: false })
    .limit(1)
    .single();

  const { data: newestRow } = await supabase
    .from('emails')
    .select('date, subject')
    .eq('folder', folder)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nOldest email: ${oldestRow?.date}`);
  console.log(`  Subject: ${oldestRow?.subject}`);
  console.log(`\nNewest email: ${newestRow?.date}`);
  console.log(`  Subject: ${newestRow?.subject}`);
}

main().catch(console.error);
