#!/usr/bin/env node

/**
 * Phase 6: Master Verification Orchestrator & Report Generator
 * Coordinates all verification phases and generates comprehensive HTML report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = 'verification-output';
const REPORT_PATH = path.join(OUTPUT_DIR, 'master-verification-report.html');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function checkFileExists(filepath) {
  return fs.existsSync(filepath);
}

function loadJSON(filepath) {
  if (!checkFileExists(filepath)) {
    throw new Error(`Required file not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function waitForFile(filepath, timeoutMs = 300000) {
  console.log(`⏳ Waiting for ${filepath}...`);
  const startTime = Date.now();

  while (!checkFileExists(filepath)) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${filepath}`);
    }
    // Wait 2 seconds between checks
    execSync('sleep 2');
  }

  console.log(`✅ Found ${filepath}`);
}

function executePhase(scriptPath, phaseName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Executing ${phaseName}...`);
  console.log('='.repeat(80));

  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`✅ ${phaseName} completed\n`);
  } catch (error) {
    console.error(`❌ ${phaseName} failed: ${error.message}`);
    throw error;
  }
}

function formatNumber(num) {
  return num.toLocaleString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function generateHTMLReport(dbData, csvData, pdfData, duplicates, crossRef) {
  const now = new Date().toISOString();

  // Calculate summary statistics
  const summary = {
    database: {
      total: dbData.transactions.length,
      duplicates: dbData.summary.duplicateCount,
      byType: dbData.summary.byType,
      byCurrency: dbData.summary.byCurrency,
      months: Object.keys(dbData.summary.byMonth).length
    },
    csv: {
      total: csvData.transactions.length,
      duplicates: csvData.summary.duplicateCount,
      byType: csvData.summary.byType,
      byCurrency: csvData.summary.byCurrency,
      bySection: csvData.summary.bySection,
      months: Object.keys(csvData.summary.byMonth).length
    },
    pdf: {
      total: pdfData.transactions.length,
      duplicates: pdfData.summary.duplicateCount,
      byType: pdfData.summary.byType,
      byCurrency: pdfData.summary.byCurrency,
      months: Object.keys(pdfData.summary.byMonth).length,
      pdfFiles: pdfData.metadata.pdfCount
    },
    crossRef: {
      dbCsvMatched: crossRef.summary.dbCsvMatched,
      csvPdfMatched: crossRef.summary.csvPdfMatched,
      dbPdfMatched: crossRef.summary.dbPdfMatched,
      monthsWithDiscrepancies: crossRef.summary.monthsWithDiscrepancies
    }
  };

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Master Verification Report - ${formatDate(now)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    h2 {
      color: #333;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    h3 {
      color: #555;
      margin: 20px 0 10px 0;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .section {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #4CAF50;
    }
    .card.warning { border-left-color: #ff9800; }
    .card.error { border-left-color: #f44336; }
    .card.info { border-left-color: #2196F3; }
    .card-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .card-value {
      font-size: 2em;
      font-weight: 700;
      color: #1a1a1a;
      margin: 10px 0;
    }
    .card-subtitle {
      color: #666;
      font-size: 0.85em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 0.9em;
    }
    th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
    }
    tr:hover { background: #fafafa; }
    .status-ok { color: #4CAF50; font-weight: 600; }
    .status-warn { color: #ff9800; font-weight: 600; }
    .status-error { color: #f44336; font-weight: 600; }
    .recommendation {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .recommendation.critical {
      background: #f8d7da;
      border-left-color: #dc3545;
    }
    .recommendation.high {
      background: #fff3cd;
      border-left-color: #ff9800;
    }
    .priority {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .priority.critical { background: #dc3545; color: white; }
    .priority.high { background: #ff9800; color: white; }
    .priority.medium { background: #ffc107; color: #333; }
    .code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .example-list {
      margin: 10px 0 10px 20px;
      font-size: 0.9em;
    }
    .summary-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .summary-stat {
      text-align: center;
    }
    .summary-stat-value {
      font-size: 2.5em;
      font-weight: 700;
      margin: 10px 0;
    }
    .summary-stat-label {
      opacity: 0.9;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Master Verification Report</h1>
      <div class="meta">
        Generated: ${formatDate(now)}<br>
        Analysis Period: ${Object.keys(dbData.summary.byMonth).sort()[0]} to ${Object.keys(dbData.summary.byMonth).sort().slice(-1)[0]}
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="summary-box">
      <h2 style="color: white; border: none; margin: 0 0 20px 0;">Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-stat">
          <div class="summary-stat-label">Database Transactions</div>
          <div class="summary-stat-value">${formatNumber(summary.database.total)}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">CSV Transactions</div>
          <div class="summary-stat-value">${formatNumber(summary.csv.total)}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">PDF Transactions</div>
          <div class="summary-stat-value">${formatNumber(summary.pdf.total)}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">DB ↔ CSV Match</div>
          <div class="summary-stat-value">${formatNumber(summary.crossRef.dbCsvMatched)}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Total Duplicates Found</div>
          <div class="summary-stat-value">${formatNumber(duplicates.summary.database.exactCount + duplicates.summary.csv.exactCount + duplicates.summary.pdf.exactCount)}</div>
        </div>
      </div>
    </div>

    <!-- Critical Findings -->
    <div class="section">
      <h2>⚠️ Critical Findings</h2>
      <div class="grid">`;

  // Database duplicates
  if (summary.database.duplicates > 0) {
    html += `
        <div class="card error">
          <div class="card-title">Database Duplicates</div>
          <div class="card-value">${formatNumber(summary.database.duplicates)}</div>
          <div class="card-subtitle">Exact duplicate fingerprints found</div>
        </div>`;
  }

  // CSV duplicates
  if (summary.csv.duplicates > 0) {
    html += `
        <div class="card warning">
          <div class="card-title">CSV Duplicates</div>
          <div class="card-value">${formatNumber(summary.csv.duplicates)}</div>
          <div class="card-subtitle">Duplicates in source CSV file</div>
        </div>`;
  }

  // PDF duplicates
  if (summary.pdf.duplicates > 0) {
    html += `
        <div class="card warning">
          <div class="card-title">PDF Duplicates</div>
          <div class="card-value">${formatNumber(summary.pdf.duplicates)}</div>
          <div class="card-subtitle">Duplicates in source PDF files</div>
        </div>`;
  }

  // Missing transactions
  const missingInDB = crossRef.missing.inCSVNotInDB.length;
  const missingInCSV = crossRef.missing.inDBNotInCSV.length;
  const missingPDFInDB = crossRef.missing.inPDFNotInDB.length;

  if (missingInDB > 0) {
    html += `
        <div class="card error">
          <div class="card-title">Failed Imports</div>
          <div class="card-value">${formatNumber(missingInDB)}</div>
          <div class="card-subtitle">CSV transactions not in database</div>
        </div>`;
  }

  if (missingPDFInDB > 0) {
    html += `
        <div class="card error">
          <div class="card-title">Missing from DB</div>
          <div class="card-value">${formatNumber(missingPDFInDB)}</div>
          <div class="card-subtitle">PDF transactions not in database</div>
        </div>`;
  }

  html += `
      </div>
    </div>

    <!-- Source Comparison -->
    <div class="section">
      <h2>📊 Source Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Database</th>
            <th>CSV File</th>
            <th>PDF Files</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Transactions</strong></td>
            <td>${formatNumber(summary.database.total)}</td>
            <td>${formatNumber(summary.csv.total)}</td>
            <td>${formatNumber(summary.pdf.total)}</td>
            <td>${summary.database.total === summary.csv.total && summary.csv.total === summary.pdf.total ? '<span class="status-ok">✓ Match</span>' : '<span class="status-error">✗ Mismatch</span>'}</td>
          </tr>
          <tr>
            <td><strong>Unique Months</strong></td>
            <td>${summary.database.months}</td>
            <td>${summary.csv.months}</td>
            <td>${summary.pdf.months}</td>
            <td>${summary.database.months === summary.csv.months && summary.csv.months === summary.pdf.months ? '<span class="status-ok">✓ Match</span>' : '<span class="status-warn">⚠ Differs</span>'}</td>
          </tr>
          <tr>
            <td><strong>Duplicates</strong></td>
            <td>${formatNumber(summary.database.duplicates)}</td>
            <td>${formatNumber(summary.csv.duplicates)}</td>
            <td>${formatNumber(summary.pdf.duplicates)}</td>
            <td>${summary.database.duplicates === 0 && summary.csv.duplicates === 0 && summary.pdf.duplicates === 0 ? '<span class="status-ok">✓ None</span>' : '<span class="status-error">✗ Found</span>'}</td>
          </tr>
          <tr>
            <td><strong>Expenses</strong></td>
            <td>${formatNumber(summary.database.byType.expense || 0)}</td>
            <td>${formatNumber(summary.csv.byType.expense || 0)}</td>
            <td>${formatNumber(summary.pdf.byType.expense || 0)}</td>
            <td>-</td>
          </tr>
          <tr>
            <td><strong>Income</strong></td>
            <td>${formatNumber(summary.database.byType.income || 0)}</td>
            <td>${formatNumber(summary.csv.byType.income || 0)}</td>
            <td>${formatNumber(summary.pdf.byType.income || 0)}</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cross-Reference Matching -->
    <div class="section">
      <h2>🔗 Cross-Reference Matching</h2>
      <div class="grid">
        <div class="card info">
          <div class="card-title">DB ↔ CSV</div>
          <div class="card-value">${formatNumber(summary.crossRef.dbCsvMatched)}</div>
          <div class="card-subtitle">Matched transactions</div>
          <div style="margin-top: 10px; font-size: 0.85em;">
            Only in DB: ${formatNumber(crossRef.matching.databaseVsCSV.onlyInDatabase)}<br>
            Only in CSV: ${formatNumber(crossRef.matching.databaseVsCSV.onlyInCSV)}
          </div>
        </div>
        <div class="card info">
          <div class="card-title">CSV ↔ PDF</div>
          <div class="card-value">${formatNumber(summary.crossRef.csvPdfMatched)}</div>
          <div class="card-subtitle">Matched transactions</div>
          <div style="margin-top: 10px; font-size: 0.85em;">
            Only in CSV: ${formatNumber(crossRef.matching.csvVsPDF.onlyInCSV)}<br>
            Only in PDF: ${formatNumber(crossRef.matching.csvVsPDF.onlyInPDF)}
          </div>
        </div>
        <div class="card info">
          <div class="card-title">DB ↔ PDF</div>
          <div class="card-value">${formatNumber(summary.crossRef.dbPdfMatched)}</div>
          <div class="card-subtitle">Matched transactions</div>
          <div style="margin-top: 10px; font-size: 0.85em;">
            Only in DB: ${formatNumber(crossRef.matching.databaseVsPDF.onlyInDatabase)}<br>
            Only in PDF: ${formatNumber(crossRef.matching.databaseVsPDF.onlyInPDF)}
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="section">
      <h2>💡 Recommendations</h2>`;

  if (crossRef.recommendations.length === 0 && duplicates.recommendations.length === 0) {
    html += `<p class="status-ok" style="padding: 20px; text-align: center; font-size: 1.2em;">✓ No issues found - all sources match perfectly!</p>`;
  } else {
    // Combine all recommendations
    const allRecs = [...crossRef.recommendations, ...duplicates.recommendations];

    allRecs.forEach((rec, i) => {
      const priorityClass = rec.priority.toLowerCase();
      html += `
      <div class="recommendation ${priorityClass}">
        <div style="margin-bottom: 10px;">
          <span class="priority ${priorityClass}">${rec.priority}</span>
        </div>
        <div style="font-weight: 600; margin-bottom: 8px;">${rec.issue}</div>
        <div style="color: #555; margin-bottom: 10px;"><strong>Action:</strong> ${rec.action}</div>`;

      if (rec.examples && rec.examples.length > 0) {
        html += `<div style="margin-top: 10px;"><strong>Examples:</strong></div><ul class="example-list">`;
        rec.examples.slice(0, 3).forEach(ex => {
          html += `<li>${ex.date} - ${ex.description} - ${ex.amount} ${ex.currency}</li>`;
        });
        html += `</ul>`;
      }

      if (rec.affectedTransactions && rec.affectedTransactions.length > 0) {
        html += `<div style="margin-top: 10px;"><strong>Sample Transactions:</strong></div><ul class="example-list">`;
        rec.affectedTransactions.slice(0, 3).forEach(t => {
          html += `<li>${t.date} - ${t.description} - ${t.amount} ${t.currency}</li>`;
        });
        html += `</ul>`;
      }

      html += `</div>`;
    });
  }

  html += `
    </div>

    <!-- Monthly Discrepancies -->`;

  if (crossRef.monthlyDiscrepancies.length > 0) {
    html += `
    <div class="section">
      <h2>📅 Monthly Discrepancies</h2>
      <p style="margin-bottom: 15px;">Found ${formatNumber(crossRef.monthlyDiscrepancies.length)} months with count differences between sources.</p>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Database</th>
            <th>CSV</th>
            <th>PDF</th>
            <th>DB-CSV Diff</th>
            <th>DB-PDF Diff</th>
            <th>CSV-PDF Diff</th>
          </tr>
        </thead>
        <tbody>`;

    crossRef.monthlyDiscrepancies.slice(0, 20).forEach(month => {
      html += `
          <tr>
            <td><strong>${month.month}</strong></td>
            <td>${formatNumber(month.database)}</td>
            <td>${formatNumber(month.csv)}</td>
            <td>${formatNumber(month.pdf)}</td>
            <td>${month.dbCsvDiff > 0 ? '+' : ''}${month.dbCsvDiff}</td>
            <td>${month.dbPdfDiff > 0 ? '+' : ''}${month.dbPdfDiff}</td>
            <td>${month.csvPdfDiff > 0 ? '+' : ''}${month.csvPdfDiff}</td>
          </tr>`;
    });

    html += `
        </tbody>
      </table>
    </div>`;
  }

  // Duplicate Details
  html += `
    <div class="section">
      <h2>🔍 Duplicate Analysis</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title">Database</div>
          <div class="card-subtitle">
            Exact: ${formatNumber(duplicates.summary.database.exactCount)}<br>
            Near: ${formatNumber(duplicates.summary.database.nearCount)}<br>
            Affected transactions: ${formatNumber(duplicates.summary.database.affectedTransactions)}
          </div>
        </div>
        <div class="card">
          <div class="card-title">CSV</div>
          <div class="card-subtitle">
            Exact: ${formatNumber(duplicates.summary.csv.exactCount)}<br>
            Near: ${formatNumber(duplicates.summary.csv.nearCount)}<br>
            Affected transactions: ${formatNumber(duplicates.summary.csv.affectedTransactions)}
          </div>
        </div>
        <div class="card">
          <div class="card-title">PDF</div>
          <div class="card-subtitle">
            Exact: ${formatNumber(duplicates.summary.pdf.exactCount)}<br>
            Near: ${formatNumber(duplicates.summary.pdf.nearCount)}<br>
            Affected transactions: ${formatNumber(duplicates.summary.pdf.affectedTransactions)}
          </div>
        </div>
      </div>
    </div>

    <!-- Files & Data -->
    <div class="section">
      <h2>📁 Data Sources</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Location</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Database</strong></td>
            <td><span class="code">verification-output/database-transactions.json</span></td>
            <td>Supabase production database export</td>
          </tr>
          <tr>
            <td><strong>CSV</strong></td>
            <td><span class="code">verification-output/csv-transactions.json</span></td>
            <td>Parsed from csv_imports/fullImport_20251017.csv</td>
          </tr>
          <tr>
            <td><strong>PDFs</strong></td>
            <td><span class="code">verification-output/pdf-transactions.json</span></td>
            <td>${summary.pdf.pdfFiles} PDF files from csv_imports/Master Reference PDFs/</td>
          </tr>
          <tr>
            <td><strong>Duplicates</strong></td>
            <td><span class="code">verification-output/duplicate-analysis-report.json</span></td>
            <td>Comprehensive duplicate analysis</td>
          </tr>
          <tr>
            <td><strong>Cross-Reference</strong></td>
            <td><span class="code">verification-output/cross-reference-report.json</span></td>
            <td>3-way matching analysis</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section" style="text-align: center; color: #666; padding: 20px;">
      <p>Report generated by Master Verification System v1.0</p>
      <p style="margin-top: 10px; font-size: 0.9em;">All detailed data available in JSON format in <span class="code">verification-output/</span></p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

async function main() {
  console.log('='.repeat(80));
  console.log('PHASE 6: MASTER VERIFICATION ORCHESTRATOR');
  console.log('='.repeat(80));
  console.log('');

  try {
    ensureOutputDir();

    // Check if we need to run earlier phases
    const phase1Output = path.join(OUTPUT_DIR, 'database-transactions.json');
    const phase2Output = path.join(OUTPUT_DIR, 'csv-transactions.json');
    const phase3Output = path.join(OUTPUT_DIR, 'pdf-transactions.json');
    const phase4Output = path.join(OUTPUT_DIR, 'duplicate-analysis-report.json');
    const phase5Output = path.join(OUTPUT_DIR, 'cross-reference-report.json');

    // Wait for Phase 3 (PDF extraction) if not complete
    if (!checkFileExists(phase3Output)) {
      console.log('⏳ Phase 3 (PDF extraction) not complete yet...');
      waitForFile(phase3Output, 600000); // Wait up to 10 minutes
    }

    // Execute Phase 4 if not done
    if (!checkFileExists(phase4Output)) {
      executePhase('scripts/4-duplicate-detector.js', 'Phase 4: Duplicate Detection');
    } else {
      console.log('✓ Phase 4 already completed\n');
    }

    // Execute Phase 5 if not done
    if (!checkFileExists(phase5Output)) {
      executePhase('scripts/5-cross-reference-engine.js', 'Phase 5: Cross-Reference Analysis');
    } else {
      console.log('✓ Phase 5 already completed\n');
    }

    // Load all results
    console.log('\n📂 Loading all verification results...\n');
    const dbData = loadJSON(phase1Output);
    const csvData = loadJSON(phase2Output);
    const pdfData = loadJSON(phase3Output);
    const duplicates = loadJSON(phase4Output);
    const crossRef = loadJSON(phase5Output);

    console.log('✅ All data loaded successfully\n');

    // Generate comprehensive HTML report
    console.log('📊 Generating comprehensive HTML report...\n');
    const htmlReport = generateHTMLReport(dbData, csvData, pdfData, duplicates, crossRef);
    fs.writeFileSync(REPORT_PATH, htmlReport);

    // Generate executive summary JSON
    const executiveSummary = {
      generatedAt: new Date().toISOString(),
      overview: {
        databaseTransactions: dbData.transactions.length,
        csvTransactions: csvData.transactions.length,
        pdfTransactions: pdfData.transactions.length,
        pdfFileCount: pdfData.metadata.pdfCount,
        analysisMonths: Object.keys(dbData.summary.byMonth).length
      },
      duplicates: {
        database: {
          exact: duplicates.summary.database.exactCount,
          near: duplicates.summary.database.nearCount,
          affected: duplicates.summary.database.affectedTransactions
        },
        csv: {
          exact: duplicates.summary.csv.exactCount,
          near: duplicates.summary.csv.nearCount,
          affected: duplicates.summary.csv.affectedTransactions
        },
        pdf: {
          exact: duplicates.summary.pdf.exactCount,
          near: duplicates.summary.pdf.nearCount,
          affected: duplicates.summary.pdf.affectedTransactions
        }
      },
      matching: {
        dbCsvMatched: crossRef.summary.dbCsvMatched,
        csvPdfMatched: crossRef.summary.csvPdfMatched,
        dbPdfMatched: crossRef.summary.dbPdfMatched,
        onlyInDatabase: crossRef.matching.databaseVsCSV.onlyInDatabase,
        onlyInCSV: crossRef.matching.databaseVsCSV.onlyInCSV,
        csvNotInDB: crossRef.missing.inCSVNotInDB.length,
        pdfNotInDB: crossRef.missing.inPDFNotInDB.length
      },
      monthlyDiscrepancies: crossRef.summary.monthsWithDiscrepancies,
      recommendations: [
        ...crossRef.recommendations,
        ...duplicates.recommendations
      ],
      criticalIssues: [
        ...crossRef.recommendations.filter(r => r.priority === 'CRITICAL'),
        ...duplicates.recommendations.filter(r => r.priority === 'CRITICAL')
      ],
      status: crossRef.recommendations.length === 0 && duplicates.recommendations.length === 0 ? 'CLEAN' : 'ISSUES_FOUND'
    };

    const summaryPath = path.join(OUTPUT_DIR, 'executive-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(executiveSummary, null, 2));

    // Print final summary
    console.log('='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log('');
    console.log('📊 Final Results:');
    console.log(`   Database: ${formatNumber(dbData.transactions.length)} transactions`);
    console.log(`   CSV: ${formatNumber(csvData.transactions.length)} transactions`);
    console.log(`   PDF: ${formatNumber(pdfData.transactions.length)} transactions`);
    console.log('');
    console.log(`   DB ↔ CSV matched: ${formatNumber(crossRef.summary.dbCsvMatched)}`);
    console.log(`   CSV ↔ PDF matched: ${formatNumber(crossRef.summary.csvPdfMatched)}`);
    console.log(`   DB ↔ PDF matched: ${formatNumber(crossRef.summary.dbPdfMatched)}`);
    console.log('');
    console.log(`   Total duplicates: ${formatNumber(duplicates.summary.database.exactCount + duplicates.summary.csv.exactCount + duplicates.summary.pdf.exactCount)}`);
    console.log(`   Months with discrepancies: ${formatNumber(crossRef.summary.monthsWithDiscrepancies)}`);
    console.log('');
    console.log('📁 Reports Generated:');
    console.log(`   HTML Report: ${REPORT_PATH}`);
    console.log(`   Executive Summary: ${summaryPath}`);
    console.log('');

    if (executiveSummary.criticalIssues.length > 0) {
      console.log('⚠️  CRITICAL ISSUES FOUND:');
      executiveSummary.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.issue}`);
      });
      console.log('');
    } else if (executiveSummary.recommendations.length > 0) {
      console.log('⚠️  Issues found (see HTML report for details)');
      console.log('');
    } else {
      console.log('✅ No issues found - all sources match perfectly!');
      console.log('');
    }

    console.log('✅ Master verification completed successfully!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
