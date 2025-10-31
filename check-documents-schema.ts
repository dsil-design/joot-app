/**
 * Check Documents Table Schema
 *
 * Queries the actual schema of the documents table to see what columns exist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwjmgjqongcrsamprvjr.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns';

async function checkSchema() {
  console.log('🔍 Checking documents table schema...\n');

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Get table structure via information_schema
  const { Client } = require('pg');

  // Try different connection strings
  const connectionStrings = [
    `postgresql://postgres.uwjmgjqongcrsamprvjr:NkWsbieKWodIMkjF@db.uwjmgjqongcrsamprvjr.supabase.co:5432/postgres`,
    `postgresql://postgres:NkWsbieKWodIMkjF@db.uwjmgjqongcrsamprvjr.supabase.co:5432/postgres`,
  ];

  for (const connStr of connectionStrings) {
    try {
      console.log('Trying connection...');
      const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      await client.connect();
      console.log('✅ Connected!\n');

      const result = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
        ORDER BY ordinal_position;
      `);

      console.log('📋 Documents table columns:');
      console.log('Column Name                | Type          | Nullable | Default');
      console.log('---------------------------|---------------|----------|------------------');

      result.rows.forEach(row => {
        const name = row.column_name.padEnd(26);
        const type = row.data_type.padEnd(13);
        const nullable = row.is_nullable.padEnd(8);
        const def = (row.column_default || '').substring(0, 18);
        console.log(`${name} | ${type} | ${nullable} | ${def}`);
      });

      await client.end();
      return;

    } catch (error: any) {
      console.log(`❌ Connection failed: ${error.message}\n`);
    }
  }

  console.log('⚠️  Could not connect to database directly.');
  console.log('Trying alternative method...\n');

  // Try to infer from an actual query error
  const testDoc = {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    file_name: 'test.pdf',
    file_type: 'pdf',
    file_size_bytes: 1000,
    mime_type: 'application/pdf',
    storage_path: 'test/path.pdf',
    processing_status: 'pending'
  };

  const { error } = await supabase
    .from('documents')
    .insert(testDoc);

  if (error) {
    console.log('Insert error details:');
    console.log(JSON.stringify(error, null, 2));

    if (error.message.includes('null value') && error.details) {
      console.log('\n📋 From error, the table appears to have these columns:');
      // Parse column names from the error details
      const match = error.details.match(/\((.*?)\)/);
      if (match) {
        const columns = match[1].split(', ');
        columns.forEach((col, i) => {
          console.log(`${i + 1}. ${col}`);
        });
      }
    }
  }
}

checkSchema();
