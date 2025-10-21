#!/usr/bin/env node

/**
 * Phase 5: Cross-Reference Comparison Engine
 * Matches transactions across all three sources and identifies discrepancies
 */

const fs = require('fs');

function loadJSON(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function matchTransactions(source1, source2, source1Name, source2Name) {
  console.log(`\n🔗 Matching ${source1Name} ↔ ${source2Name}...`);

  const source1Fingerprints = new Map();
  source1.forEach(t => {
    if (!source1Fingerprints.has(t.fingerprint)) {
      source1Fingerprints.set(t.fingerprint, []);
    }
    source1Fingerprints.get(t.fingerprint).push(t);
  });

  const source2Fingerprints = new Map();
  source2.forEach(t => {
    if (!source2Fingerprints.has(t.fingerprint)) {
      source2Fingerprints.set(t.fingerprint, []);
    }
    source2Fingerprints.get(t.fingerprint).push(t);
  });

  const matched = [];
  const onlyInSource1 = [];
  const onlyInSource2 = [];

  // Find matches and items only in source1
  source1Fingerprints.forEach((transactions, fp) => {
    if (source2Fingerprints.has(fp)) {
      matched.push({
        fingerprint: fp,
        source1Count: transactions.length,
        source2Count: source2Fingerprints.get(fp).length,
        sample: transactions[0]
      });
    } else {
      onlyInSource1.push(...transactions);
    }
  });

  // Find items only in source2
  source2Fingerprints.forEach((transactions, fp) => {
    if (!source1Fingerprints.has(fp)) {
      onlyInSource2.push(...transactions);
    }
  });

  console.log(`   Matched: ${matched.length} unique transactions`);
  console.log(`   Only in ${source1Name}: ${onlyInSource1.length}`);
  console.log(`   Only in ${source2Name}: ${onlyInSource2.length}`);

  return { matched, onlyInSource1, onlyInSource2 };
}

function analyzeMonthlyDiscrepancies(db, csv, pdf) {
  console.log('\n📅 Analyzing monthly discrepancies...');

  const months = new Set([
    ...db.map(t => t.date.substring(0, 7)),
    ...csv.map(t => t.date.substring(0, 7)),
    ...pdf.map(t => t.date.substring(0, 7))
  ]);

  const monthlyComparison = [];

  Array.from(months).sort().forEach(month => {
    const dbMonth = db.filter(t => t.date.startsWith(month));
    const csvMonth = csv.filter(t => t.date.startsWith(month));
    const pdfMonth = pdf.filter(t => t.date.startsWith(month));

    const discrepancy = {
      month,
      database: dbMonth.length,
      csv: csvMonth.length,
      pdf: pdfMonth.length,
      dbCsvDiff: dbMonth.length - csvMonth.length,
      dbPdfDiff: dbMonth.length - pdfMonth.length,
      csvPdfDiff: csvMonth.length - pdfMonth.length,
      hasDiscrepancy: dbMonth.length !== csvMonth.length || dbMonth.length !== pdfMonth.length || csvMonth.length !== pdfMonth.length
    };

    if (discrepancy.hasDiscrepancy) {
      monthlyComparison.push(discrepancy);
    }
  });

  console.log(`   Months with discrepancies: ${monthlyComparison.length}`);

  return monthlyComparison;
}

function identifyMissingTransactions(db, csv, pdf) {
  console.log('\n🔍 Identifying missing transactions...');

  const dbFingerprints = new Set(db.map(t => t.fingerprint));
  const csvFingerprints = new Set(csv.map(t => t.fingerprint));
  const pdfFingerprints = new Set(pdf.map(t => t.fingerprint));

  // Transactions in CSV but not in DB (import failures)
  const inCSVNotInDB = csv.filter(t => !dbFingerprints.has(t.fingerprint));

  // Transactions in DB but not in CSV (shouldn't happen)
  const inDBNotInCSV = db.filter(t => !csvFingerprints.has(t.fingerprint));

  // Transactions in PDF but not in CSV (missing from export)
  const inPDFNotInCSV = pdf.filter(t => !csvFingerprints.has(t.fingerprint));

  // Transactions in PDF but not in DB (end-to-end missing)
  const inPDFNotInDB = pdf.filter(t => !dbFingerprints.has(t.fingerprint));

  console.log(`   In CSV but not in DB: ${inCSVNotInDB.length}`);
  console.log(`   In DB but not in CSV: ${inDBNotInCSV.length}`);
  console.log(`   In PDF but not in CSV: ${inPDFNotInCSV.length}`);
  console.log(`   In PDF but not in DB: ${inPDFNotInDB.length}`);

  return {
    inCSVNotInDB,
    inDBNotInCSV,
    inPDFNotInCSV,
    inPDFNotInDB
  };
}

function generateRecommendations(results) {
  const recommendations = [];

  if (results.missing.inCSVNotInDB.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: `${results.missing.inCSVNotInDB.length} transactions in CSV failed to import to database`,
      action: 'Re-run import script or investigate import failures',
      examples: results.missing.inCSVNotInDB.slice(0, 5).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        sourceLineNumber: t.sourceLineNumber
      }))
    });
  }

  if (results.missing.inDBNotInCSV.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: `${results.missing.inDBNotInCSV.length} transactions in database are not in CSV`,
      action: 'Investigate how these transactions got into the database',
      examples: results.missing.inDBNotInCSV.slice(0, 5).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        dbId: t.dbId
      }))
    });
  }

  if (results.missing.inPDFNotInCSV.length > 10) {
    recommendations.push({
      priority: 'HIGH',
      issue: `${results.missing.inPDFNotInCSV.length} transactions in PDFs are missing from CSV export`,
      action: 'Review PDF→CSV export process for data loss',
      examples: results.missing.inPDFNotInCSV.slice(0, 5).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        sourcePDF: t.sourcePDF
      }))
    });
  }

  if (results.monthlyDiscrepancies.length > 10) {
    const worstMonths = results.monthlyDiscrepancies
      .sort((a, b) => Math.abs(b.csvPdfDiff) - Math.abs(a.csvPdfDiff))
      .slice(0, 5);

    recommendations.push({
      priority: 'MEDIUM',
      issue: `${results.monthlyDiscrepancies.length} months have count discrepancies between sources`,
      action: 'Manual review of worst months recommended',
      worstMonths: worstMonths.map(m => ({
        month: m.month,
        dbCount: m.database,
        csvCount: m.csv,
        pdfCount: m.pdf
      }))
    });
  }

  return recommendations;
}

async function main() {
  console.log('='.repeat(80));
  console.log('PHASE 5: CROSS-REFERENCE COMPARISON ENGINE');
  console.log('='.repeat(80));

  try {
    // Load all three sources
    console.log('\n📂 Loading data from all sources...');
    const dbData = loadJSON('verification-output/database-transactions.json');
    const csvData = loadJSON('verification-output/csv-transactions.json');
    const pdfData = loadJSON('verification-output/pdf-transactions.json');

    console.log(`   Database: ${dbData.transactions.length} transactions`);
    console.log(`   CSV: ${csvData.transactions.length} transactions`);
    console.log(`   PDF: ${pdfData.transactions.length} transactions`);

    // Perform cross-reference matching
    const dbVsCsv = matchTransactions(
      dbData.transactions,
      csvData.transactions,
      'Database',
      'CSV'
    );

    const csvVsPdf = matchTransactions(
      csvData.transactions,
      pdfData.transactions,
      'CSV',
      'PDF'
    );

    const dbVsPdf = matchTransactions(
      dbData.transactions,
      pdfData.transactions,
      'Database',
      'PDF'
    );

    // Analyze monthly discrepancies
    const monthlyDiscrepancies = analyzeMonthlyDiscrepancies(
      dbData.transactions,
      csvData.transactions,
      pdfData.transactions
    );

    // Identify missing transactions
    const missing = identifyMissingTransactions(
      dbData.transactions,
      csvData.transactions,
      pdfData.transactions
    );

    // Generate results
    const results = {
      summary: {
        totalDatabase: dbData.transactions.length,
        totalCSV: csvData.transactions.length,
        totalPDF: pdfData.transactions.length,
        dbCsvMatched: dbVsCsv.matched.length,
        csvPdfMatched: csvVsPdf.matched.length,
        dbPdfMatched: dbVsPdf.matched.length,
        monthsWithDiscrepancies: monthlyDiscrepancies.length
      },
      matching: {
        databaseVsCSV: {
          matched: dbVsCsv.matched.length,
          onlyInDatabase: dbVsCsv.onlyInSource1.length,
          onlyInCSV: dbVsCsv.onlyInSource2.length
        },
        csvVsPDF: {
          matched: csvVsPdf.matched.length,
          onlyInCSV: csvVsPdf.onlyInSource1.length,
          onlyInPDF: csvVsPdf.onlyInSource2.length
        },
        databaseVsPDF: {
          matched: dbVsPdf.matched.length,
          onlyInDatabase: dbVsPdf.onlyInSource1.length,
          onlyInPDF: dbVsPdf.onlyInSource2.length
        }
      },
      monthlyDiscrepancies,
      missing,
      recommendations: []
    };

    // Generate recommendations
    results.recommendations = generateRecommendations(results);

    // Save report
    const outputPath = 'verification-output/cross-reference-report.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log('\n📊 Cross-Reference Summary:');
    console.log(`   DB ↔ CSV matched: ${results.summary.dbCsvMatched}`);
    console.log(`   CSV ↔ PDF matched: ${results.summary.csvPdfMatched}`);
    console.log(`   DB ↔ PDF matched: ${results.summary.dbPdfMatched}`);
    console.log(`   Months with discrepancies: ${results.summary.monthsWithDiscrepancies}`);
    console.log('');
    console.log(`✅ Report saved to: ${outputPath}`);
    console.log('');

    if (results.recommendations.length > 0) {
      console.log('⚠️  Recommendations:');
      results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority}] ${rec.issue}`);
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
