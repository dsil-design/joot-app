#!/usr/bin/env node

/**
 * Phase 4: Comprehensive Duplicate Detection
 * Analyzes duplicates within and across all three sources
 */

const fs = require('fs');

function loadJSON(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function analyzeDuplicatesInSource(transactions, sourceName) {
  console.log(`\n🔍 Analyzing duplicates in ${sourceName}...`);

  const fingerprintMap = new Map();
  const exactDuplicates = [];
  const nearDuplicates = [];

  // Find exact duplicates (same fingerprint)
  transactions.forEach(t => {
    if (fingerprintMap.has(t.fingerprint)) {
      const existing = fingerprintMap.get(t.fingerprint);
      const existingDup = exactDuplicates.find(d => d.fingerprint === t.fingerprint);

      if (existingDup) {
        existingDup.instances.push(t);
      } else {
        exactDuplicates.push({
          fingerprint: t.fingerprint,
          instances: [existing, t],
          sample: {
            date: t.date,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            type: t.type
          }
        });
      }
    } else {
      fingerprintMap.set(t.fingerprint, t);
    }
  });

  // Find near duplicates (same date + amount, different description)
  const dateAmountMap = new Map();
  transactions.forEach(t => {
    const key = `${t.date}|${t.amount}|${t.currency}`;
    if (!dateAmountMap.has(key)) {
      dateAmountMap.set(key, []);
    }
    dateAmountMap.get(key).push(t);
  });

  dateAmountMap.forEach((group, key) => {
    if (group.length > 1) {
      // Check if descriptions are different (not exact duplicates)
      const uniqueDescs = new Set(group.map(t => t.description.toLowerCase()));
      if (uniqueDescs.size > 1) {
        nearDuplicates.push({
          key,
          count: group.length,
          instances: group,
          sample: group[0]
        });
      }
    }
  });

  console.log(`   Exact duplicates: ${exactDuplicates.length}`);
  console.log(`   Near duplicates: ${nearDuplicates.length}`);

  return { exactDuplicates, nearDuplicates };
}

function findCrossSourceDuplicates(db, csv, pdf) {
  console.log('\n🔍 Finding cross-source duplicates...');

  const dbFingerprints = new Set(db.map(t => t.fingerprint));
  const csvFingerprints = new Set(csv.map(t => t.fingerprint));
  const pdfFingerprints = new Set(pdf.map(t => t.fingerprint));

  // Count how many sources each transaction appears in
  const allFingerprints = new Set([...dbFingerprints, ...csvFingerprints, ...pdfFingerprints]);
  const crossSourceDuplicates = [];

  allFingerprints.forEach(fp => {
    const sources = [];
    let sample = null;

    if (dbFingerprints.has(fp)) {
      sources.push('database');
      sample = db.find(t => t.fingerprint === fp);
    }
    if (csvFingerprints.has(fp)) {
      sources.push('csv');
      if (!sample) sample = csv.find(t => t.fingerprint === fp);
    }
    if (pdfFingerprints.has(fp)) {
      sources.push('pdf');
      if (!sample) sample = pdf.find(t => t.fingerprint === fp);
    }

    if (sources.length > 1) {
      crossSourceDuplicates.push({
        fingerprint: fp,
        sources,
        sample: {
          date: sample.date,
          description: sample.description,
          amount: sample.amount,
          currency: sample.currency,
          type: sample.type
        }
      });
    }
  });

  console.log(`   Found ${crossSourceDuplicates.length} transactions in multiple sources`);

  return crossSourceDuplicates;
}

function generateDuplicateReport(dbDups, csvDups, pdfDups, crossDups) {
  console.log('\n📊 Generating duplicate analysis report...');

  const report = {
    summary: {
      database: {
        exactCount: dbDups.exactDuplicates.length,
        nearCount: dbDups.nearDuplicates.length,
        affectedTransactions: dbDups.exactDuplicates.reduce((sum, d) => sum + d.instances.length, 0)
      },
      csv: {
        exactCount: csvDups.exactDuplicates.length,
        nearCount: csvDups.nearDuplicates.length,
        affectedTransactions: csvDups.exactDuplicates.reduce((sum, d) => sum + d.instances.length, 0)
      },
      pdf: {
        exactCount: pdfDups.exactDuplicates.length,
        nearCount: pdfDups.nearDuplicates.length,
        affectedTransactions: pdfDups.exactDuplicates.reduce((sum, d) => sum + d.instances.length, 0)
      },
      crossSource: {
        count: crossDups.length
      }
    },
    details: {
      databaseExactDuplicates: dbDups.exactDuplicates,
      databaseNearDuplicates: dbDups.nearDuplicates,
      csvExactDuplicates: csvDups.exactDuplicates,
      csvNearDuplicates: csvDups.nearDuplicates,
      pdfExactDuplicates: pdfDups.exactDuplicates,
      pdfNearDuplicates: pdfDups.nearDuplicates,
      crossSourceDuplicates: crossDups
    },
    recommendations: []
  };

  // Generate recommendations
  if (dbDups.exactDuplicates.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      issue: `Found ${dbDups.exactDuplicates.length} exact duplicates in database`,
      action: 'Review and remove duplicate entries from database',
      affectedTransactions: dbDups.exactDuplicates.slice(0, 5).map(d => d.sample)
    });
  }

  if (csvDups.exactDuplicates.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      issue: `Found ${csvDups.exactDuplicates.length} exact duplicates in CSV`,
      action: 'Clean CSV file before re-importing',
      affectedTransactions: csvDups.exactDuplicates.slice(0, 5).map(d => d.sample)
    });
  }

  if (dbDups.nearDuplicates.length > 10) {
    report.recommendations.push({
      priority: 'MEDIUM',
      issue: `Found ${dbDups.nearDuplicates.length} near-duplicates (same date/amount, different description)`,
      action: 'Manual review recommended - these could be legitimate or data entry errors',
      examples: dbDups.nearDuplicates.slice(0, 3).map(d => d.sample)
    });
  }

  return report;
}

async function main() {
  console.log('='.repeat(80));
  console.log('PHASE 4: COMPREHENSIVE DUPLICATE DETECTION');
  console.log('='.repeat(80));

  try {
    // Load all three sources
    console.log('\n📂 Loading data from all three sources...');
    const dbData = loadJSON('verification-output/database-transactions.json');
    const csvData = loadJSON('verification-output/csv-transactions.json');
    const pdfData = loadJSON('verification-output/pdf-transactions.json');

    console.log(`   Database: ${dbData.transactions.length} transactions`);
    console.log(`   CSV: ${csvData.transactions.length} transactions`);
    console.log(`   PDF: ${pdfData.transactions.length} transactions`);

    // Analyze duplicates in each source
    const dbDups = analyzeDuplicatesInSource(dbData.transactions, 'Database');
    const csvDups = analyzeDuplicatesInSource(csvData.transactions, 'CSV');
    const pdfDups = analyzeDuplicatesInSource(pdfData.transactions, 'PDF');

    // Find cross-source duplicates
    const crossDups = findCrossSourceDuplicates(
      dbData.transactions,
      csvData.transactions,
      pdfData.transactions
    );

    // Generate report
    const report = generateDuplicateReport(dbDups, csvDups, pdfDups, crossDups);

    // Save report
    const outputPath = 'verification-output/duplicate-analysis-report.json';
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Duplicate Analysis Summary:');
    console.log(`   Database exact duplicates: ${report.summary.database.exactCount}`);
    console.log(`   CSV exact duplicates: ${report.summary.csv.exactCount}`);
    console.log(`   PDF exact duplicates: ${report.summary.pdf.exactCount}`);
    console.log(`   Cross-source matches: ${report.summary.crossSource.count}`);
    console.log('');
    console.log(`✅ Report saved to: ${outputPath}`);
    console.log('');

    if (report.recommendations.length > 0) {
      console.log('⚠️  Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`      Action: ${rec.action}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
