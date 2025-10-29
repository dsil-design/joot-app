/**
 * Start OCR Worker Script
 *
 * Starts the background OCR processing worker
 * This can be run separately or as part of the main application
 *
 * Usage:
 * npm run worker:ocr
 */

import { startOCRWorker } from '../src/lib/workers/ocr-worker'

// Start the worker
startOCRWorker()
