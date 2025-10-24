#!/usr/bin/env node

/**
 * Comprehensive June 2025 1:1 Validation
 * 
 * This script performs exhaustive bidirectional verification:
 * PDF -> DB and DB -> PDF
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Exchange rate from protocol
const EXCHANGE_RATE = 0.0307;

// Parsed JSON data
const parsedData = JSON.parse(fs.readFileSync(
  '/Users/dennis/Code Projects/joot-app/scripts/june-2025-CORRECTED.json',
  'utf-8'
));

/**
 * Main validation runner
 */
async function runValidation() {
  console.log('Starting June 2025 Comprehensive Validation...\n');

  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'dennis@dsil.design')
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }

    const userId = userData.id;
    console.log(`User ID: ${userId}\n`);

    // Fetch all June 2025 transactions from database
    const { data: dbTransactions, error: dbError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        description,
        amount,
        original_currency,
        transaction_type,
        transaction_tags (
          tags (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .gte('transaction_date', '2025-06-01')
      .lt('transaction_date', '2025-07-01')
      .order('transaction_date', { ascending: true });

    if (dbError) {
      console.error('Error fetching DB transactions:', dbError);
      return;
    }

    console.log(`Found ${dbTransactions.length} transactions in database for June 2025\n`);
    console.log(`Found ${parsedData.length} transactions in parsed JSON\n`);

    // Normalize parsed data for comparison
    const normalizedParsed = parsedData.map(tx => ({
      ...tx,
      date: tx.date,
      amount: parseFloat(tx.amount),
      currency: tx.currency.toUpperCase()
    }));

    // Task 1: PDF -> Database verification
    console.log('='.repeat(80));
    console.log('TASK 1: PDF -> Database Verification');
    console.log('='.repeat(80) + '\n');

    let pdfFoundInDb = 0;
    let pdfNotFound = [];
    let pdfMismatches = [];

    for (let i = 0; i < normalizedParsed.length; i++) {
      const pdfTx = normalizedParsed[i];
      
      // Find matching transaction in database
      const match = dbTransactions.find(dbTx => {
        const dateMatch = dbTx.transaction_date === pdfTx.date;
        const descMatch = isSimilar(dbTx.description, pdfTx.description, 0.8);
        const amountMatch = Math.abs(parseFloat(dbTx.amount) - pdfTx.amount) <= 0.10;
        const currencyMatch = dbTx.original_currency === pdfTx.currency;
        
        return dateMatch && descMatch && amountMatch && currencyMatch;
      });

      if (match) {
        pdfFoundInDb++;
      } else {
        pdfNotFound.push({
          index: i + 1,
          date: pdfTx.date,
          description: pdfTx.description,
          amount: pdfTx.amount,
          currency: pdfTx.currency
        });
      }
    }

    console.log(`PDF Transactions Found in DB: ${pdfFoundInDb}/${normalizedParsed.length} (${(pdfFoundInDb/normalizedParsed.length*100).toFixed(1)}%)`);
    console.log(`PDF Transactions NOT Found: ${pdfNotFound.length}\n`);

    if (pdfNotFound.length > 0) {
      console.log('Missing from DB:');
      pdfNotFound.forEach(tx => {
        console.log(`  ${tx.index}. ${tx.date} | ${tx.description} | ${tx.currency} ${tx.amount.toFixed(2)}`);
      });
      console.log();
    }

    // Task 2: Database -> PDF verification
    console.log('='.repeat(80));
    console.log('TASK 2: Database -> PDF Verification');
    console.log('='.repeat(80) + '\n');

    let dbFoundInPdf = 0;
    let dbNotFound = [];
    let dbMismatches = [];

    for (const dbTx of dbTransactions) {
      const tags = (dbTx.transaction_tags || []).map(tt => tt.tags.name).filter(Boolean);
      
      const match = normalizedParsed.find(pdfTx => {
        const dateMatch = pdfTx.date === dbTx.transaction_date;
        const descMatch = isSimilar(pdfTx.description, dbTx.description, 0.8);
        const amountMatch = Math.abs(pdfTx.amount - parseFloat(dbTx.amount)) <= 0.10;
        const currencyMatch = pdfTx.currency === dbTx.original_currency;
        
        return dateMatch && descMatch && amountMatch && currencyMatch;
      });

      if (match) {
        dbFoundInPdf++;
      } else {
        dbNotFound.push({
          id: dbTx.id,
          date: dbTx.transaction_date,
          description: dbTx.description,
          amount: parseFloat(dbTx.amount),
          currency: dbTx.original_currency,
          tags: tags.join(', ')
        });
      }
    }

    console.log(`DB Transactions Found in PDF: ${dbFoundInPdf}/${dbTransactions.length} (${(dbFoundInPdf/dbTransactions.length*100).toFixed(1)}%)`);
    console.log(`DB Transactions NOT Found in PDF: ${dbNotFound.length}\n`);

    if (dbNotFound.length > 0) {
      console.log('Extra in DB (not in PDF):');
      dbNotFound.forEach(tx => {
        console.log(`  ${tx.date} | ${tx.description} | ${tx.currency} ${tx.amount.toFixed(2)} | Tags: ${tx.tags || 'None'}`);
      });
      console.log();
    }

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`PDF Transactions:         ${normalizedParsed.length}`);
    console.log(`DB Transactions:          ${dbTransactions.length}`);
    console.log(`PDF->DB Match:            ${pdfFoundInDb}/${normalizedParsed.length} (${(pdfFoundInDb/normalizedParsed.length*100).toFixed(1)}%)`);
    console.log(`DB->PDF Match:            ${dbFoundInPdf}/${dbTransactions.length} (${(dbFoundInPdf/dbTransactions.length*100).toFixed(1)}%)`);
    console.log(`Total Perfect Matches:    ${Math.min(pdfFoundInDb, dbFoundInPdf)}`);
    
    const status = pdfFoundInDb === normalizedParsed.length && dbFoundInPdf === dbTransactions.length ? 'PASS' : 'FAIL';
    console.log(`\nOverall Status: ${status}\n`);

  } catch (error) {
    console.error('Error during validation:', error);
  }
}

/**
 * Calculate string similarity (simple Levenshtein-based)
 */
function isSimilar(str1, str2, threshold = 0.8) {
  if (!str1 || !str2) return false;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return true;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.includes(shorter)) return true;
  
  const editDistance = levenshtein(s1, s2);
  const maxLen = longer.length;
  const similarity = 1 - (editDistance / maxLen);
  
  return similarity >= threshold;
}

/**
 * Levenshtein distance
 */
function levenshtein(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastVal = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newVal = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newVal = Math.min(Math.min(newVal, lastVal), costs[j]) + 1;
        }
        costs[j - 1] = lastVal;
        lastVal = newVal;
      }
    }
    if (i > 0) costs[s2.length] = lastVal;
  }
  return costs[s2.length];
}

// Run it
runValidation();
