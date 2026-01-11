/**
 * Email Parsers Index
 *
 * Exports all available email parsers for transaction extraction.
 * New parsers should be added here and registered in the extraction service.
 */

export { grabParser } from './grab';
export { boltParser } from './bolt';
export { bangkokBankParser } from './bangkok-bank';

// Future parsers (P1-014 to P1-015):
// export { kasikornParser } from './kasikorn';
// export { lazadaParser } from './lazada';
