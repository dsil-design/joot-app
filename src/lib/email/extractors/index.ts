/**
 * Email Parsers Index
 *
 * Exports all available email parsers for transaction extraction.
 * New parsers should be added here and registered in the extraction service.
 */

export { grabParser } from './grab';
export { boltParser } from './bolt';
export { bangkokBankParser } from './bangkok-bank';
export { kasikornParser } from './kasikorn';
export { lazadaParser } from './lazada';
