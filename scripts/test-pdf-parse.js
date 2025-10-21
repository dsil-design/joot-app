#!/usr/bin/env node

/**
 * Test script - Examine PDF structure
 * Reads page1.pdf (October 2025) to understand the format
 */

const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testPDF() {
  try {
    const pdfPath = 'csv_imports/Master Reference PDFs/Budget for Import-page1.pdf';
    const dataBuffer = fs.readFileSync(pdfPath);

    const parser = new PDFParse({ data: dataBuffer });

    const result = await parser.getText();

    console.log('PDF Metadata:');
    console.log(`  Pages: ${result.numPages}`);
    console.log(`  Text length: ${result.text.length} characters\n`);

    console.log('First 2000 characters of extracted text:');
    console.log('='.repeat(80));
    console.log(result.text.substring(0, 2000));
    console.log('='.repeat(80));

    console.log('\nLast 1000 characters:');
    console.log('='.repeat(80));
    console.log(result.text.substring(result.text.length - 1000));
    console.log('='.repeat(80));

    await parser.destroy();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPDF();
