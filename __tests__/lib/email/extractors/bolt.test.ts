/**
 * Unit tests for Bolt email parser
 */

import {
  boltParser,
  extractDestination,
  extractPickup,
  extractAmount,
  extractTripId,
  extractDayFromSubject,
  buildDescription,
  simplifyDestination,
  BOLT_VENDOR_ID,
} from '@/lib/email/extractors/bolt';
import type { RawEmailData } from '@/lib/email/types';

// Helper to create mock email data
function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-message-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'Your Bolt ride on Saturday',
    from_address: 'bangkok@bolt.eu',
    from_name: 'Bolt Thailand',
    email_date: new Date('2025-11-22T18:30:00+07:00'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

describe('boltParser', () => {
  describe('canParse', () => {
    it('should return true for emails from bangkok@bolt.eu', () => {
      const email = createMockEmail({
        from_address: 'bangkok@bolt.eu',
      });
      expect(boltParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from bolt@bolt.eu', () => {
      const email = createMockEmail({
        from_address: 'bolt@bolt.eu',
      });
      expect(boltParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from noreply@bolt.eu', () => {
      const email = createMockEmail({
        from_address: 'noreply@bolt.eu',
      });
      expect(boltParser.canParse(email)).toBe(true);
    });

    it('should return true for emails with Bolt subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Your Bolt ride on Friday',
      });
      expect(boltParser.canParse(email)).toBe(true);
    });

    it('should return true for Bolt ride receipt subject', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Bolt ride receipt - November 22',
      });
      expect(boltParser.canParse(email)).toBe(true);
    });

    it('should return false for unrelated emails', () => {
      const email = createMockEmail({
        from_address: 'no-reply@grab.com',
        subject: 'Your Grab E-Receipt',
      });
      expect(boltParser.canParse(email)).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract Bolt ride transaction data from text body', () => {
      const email = createMockEmail({
        text_body: `
          Bolt
          Your ride on Saturday, November 22

          Ride Summary
          Pick-up: Central Festival Chiang Mai
          Drop-off: Nimman Hotel
          Distance: 5.8 km
          Duration: 25 min

          Fare Breakdown
          Base Fare                              ฿29.00
          Distance (5.8 km)                      ฿46.40
          Time (25 min)                          ฿25.00
          Total                                  ฿100.40

          Payment Method: Credit Card
          Trip ID: BOLT-12345-XYZ
        `,
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Bolt');
      expect(result.data!.amount).toBe(100.4);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBe('BOLT-12345-XYZ');
      expect(result.data!.vendor_id).toBe(BOLT_VENDOR_ID);
      expect(result.data!.description).toContain('Saturday');
      expect(result.data!.description).toContain('Nimman Hotel');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should extract airport destination ride', () => {
      const email = createMockEmail({
        subject: 'Your Bolt ride on Tuesday',
        text_body: `
          Bolt
          Your ride on Tuesday, November 19

          Ride Summary
          Pick-up: Home Residence
          Drop-off: Chiang Mai International Airport
          Distance: 15.2 km

          Fare Breakdown
          Base Fare                              ฿29.00
          Distance (15.2 km)                     ฿121.60
          Time (35 min)                          ฿35.00
          Airport Surcharge                      ฿50.00
          Total                                  ฿235.60

          Payment Method: Credit Card
          Trip ID: BOLT-98765-ABC
        `,
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(235.6);
      expect(result.data!.order_id).toBe('BOLT-98765-ABC');
      expect(result.data!.description).toContain('Airport');
      expect(result.data!.description).toContain('Tuesday');
    });

    it('should extract from HTML body when text is empty', () => {
      const email = createMockEmail({
        subject: 'Your Bolt ride on Friday',
        text_body: '',
        html_body: `
          <!DOCTYPE html>
          <html>
          <body>
            <h1>Bolt</h1>
            <h2>Your ride on Friday, November 21</h2>

            <div class="ride-summary">
              <p>Pick-up: Central World</p>
              <p>Drop-off: Maya Shopping Mall</p>
              <p>Distance: 3.5 km</p>
            </div>

            <div class="fare-breakdown">
              <p>Base Fare: ฿29.00</p>
              <p>Distance: ฿28.00</p>
              <p>Time: ฿15.00</p>
              <p class="total">Total: ฿72.00</p>
            </div>

            <p>Trip ID: BOLT-55555-QRS</p>
          </body>
          </html>
        `,
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(72);
      expect(result.data!.order_id).toBe('BOLT-55555-QRS');
      expect(result.data!.description).toContain('Mall');
    });

    it('should extract minimal ride data without trip ID', () => {
      const email = createMockEmail({
        subject: 'Your Bolt ride on Wednesday',
        text_body: `
          Bolt Ride Receipt

          Total: ฿58.00

          Payment: Credit Card

          Thank you for riding with Bolt!
        `,
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(58);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBeNull();
      expect(result.notes).toContain('No trip ID found');
      expect(result.data!.description).toContain('Wednesday');
    });

    it('should use email date for transaction date', () => {
      const testDate = new Date('2025-11-25T14:00:00+07:00');
      const email = createMockEmail({
        email_date: testDate,
        text_body: 'Total: ฿150.00',
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date).toEqual(testDate);
    });

    it('should fail gracefully when no amount found', () => {
      const email = createMockEmail({
        text_body: 'Thank you for riding with Bolt!',
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No THB amount found in email');
    });

    it('should fail gracefully when no body content', () => {
      const email = createMockEmail({
        text_body: null,
        html_body: null,
      });

      const result = boltParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email body content available');
    });
  });
});

describe('extractDestination', () => {
  it('should extract drop-off location with hyphen', () => {
    const result = extractDestination('Drop-off: Nimman Hotel\nTime: 18:25');
    expect(result).toBe('Nimman Hotel');
  });

  it('should extract dropoff location without hyphen', () => {
    const result = extractDestination('Dropoff: Central Plaza');
    expect(result).toBe('Central Plaza');
  });

  it('should extract destination keyword location', () => {
    const result = extractDestination('Destination: Airport');
    expect(result).toBe('Airport');
  });

  it('should simplify to "Airport" for airport locations', () => {
    const result = extractDestination('Drop-off: Chiang Mai International Airport');
    expect(result).toBe('Airport');
  });

  it('should simplify to "Mall" for mall locations', () => {
    const result = extractDestination('Drop-off: Central Festival Chiang Mai');
    expect(result).toBe('Mall');
  });

  it('should simplify to "Hotel" for hotel locations', () => {
    const result = extractDestination('Drop-off: Le Meridien Hotel');
    expect(result).toBe('Hotel');
  });

  it('should return null when no destination found', () => {
    const result = extractDestination('Your ride has completed');
    expect(result).toBeNull();
  });
});

describe('extractPickup', () => {
  it('should extract pick-up location with hyphen', () => {
    const result = extractPickup('Pick-up: Home Residence\nTime: 06:00');
    expect(result).toBe('Home Residence');
  });

  it('should extract pickup location without hyphen', () => {
    const result = extractPickup('Pickup: Office Building');
    expect(result).toBe('Office Building');
  });

  it('should extract from keyword pattern', () => {
    const result = extractPickup('From: Central World\nTime: 14:00');
    expect(result).toBe('Central World');
  });

  it('should return null when no pickup found', () => {
    const result = extractPickup('Your ride is on the way');
    expect(result).toBeNull();
  });
});

describe('extractAmount', () => {
  it('should extract THB amount with ฿ symbol', () => {
    const result = extractAmount('Total: ฿100.40');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100.4);
  });

  it('should extract THB amount with comma separator', () => {
    const result = extractAmount('Total: ฿1,500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
  });

  it('should extract THB amount with THB prefix', () => {
    const result = extractAmount('Total: THB 235.60');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(235.6);
  });

  it('should prioritize Total labeled amount', () => {
    const result = extractAmount('Base: ฿29.00\nDistance: ฿46.00\nTotal: ฿75.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(75);
    expect(result!.confidence).toBe(95);
  });

  it('should return largest amount when no Total label', () => {
    const result = extractAmount('฿29.00 base fare\n฿46.00 distance');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(46);
    expect(result!.confidence).toBe(80);
  });

  it('should return null when no amount found', () => {
    const result = extractAmount('Thank you for riding');
    expect(result).toBeNull();
  });

  it('should handle HTML entity for THB symbol', () => {
    const result = extractAmount('Total: &#3647;200.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200);
  });
});

describe('extractTripId', () => {
  it('should extract BOLT-format trip ID', () => {
    const result = extractTripId('Trip ID: BOLT-12345-XYZ', '');
    expect(result).toBe('BOLT-12345-XYZ');
  });

  it('should extract ride ID format', () => {
    const result = extractTripId('Ride ID: ABC123456', '');
    expect(result).toBe('ABC123456');
  });

  it('should extract booking ID format', () => {
    const result = extractTripId('Booking ID: BK-987654', '');
    expect(result).toBe('BK-987654');
  });

  it('should extract reference format', () => {
    const result = extractTripId('Reference: REF12345678', '');
    expect(result).toBe('REF12345678');
  });

  it('should return null when no trip ID found', () => {
    const result = extractTripId('Thank you for your ride!', '');
    expect(result).toBeNull();
  });

  it('should filter out very short IDs', () => {
    const result = extractTripId('Trip ID: AB', '');
    expect(result).toBeNull();
  });
});

describe('extractDayFromSubject', () => {
  it('should extract Saturday', () => {
    const result = extractDayFromSubject('Your Bolt ride on Saturday');
    expect(result).toBe('Saturday');
  });

  it('should extract Tuesday', () => {
    const result = extractDayFromSubject('Your Bolt ride on Tuesday');
    expect(result).toBe('Tuesday');
  });

  it('should handle case insensitivity', () => {
    const result = extractDayFromSubject('YOUR BOLT RIDE ON FRIDAY');
    expect(result).toBe('Friday');
  });

  it('should return null when no day found', () => {
    const result = extractDayFromSubject('Bolt ride receipt');
    expect(result).toBeNull();
  });
});

describe('buildDescription', () => {
  it('should build description with day and destination', () => {
    const result = buildDescription(
      'Drop-off: Nimman Hotel',
      'Your Bolt ride on Saturday'
    );
    expect(result).toBe('Saturday Ride to Nimman Hotel');
  });

  it('should build description with destination only', () => {
    const result = buildDescription(
      'Drop-off: Airport',
      'Bolt ride receipt'
    );
    expect(result).toBe('Ride to Airport');
  });

  it('should build description with day only', () => {
    const result = buildDescription(
      'Your ride has completed',
      'Your Bolt ride on Monday'
    );
    expect(result).toBe('Monday Ride');
  });

  it('should return "Ride" when no details available', () => {
    const result = buildDescription(
      'Thank you for riding',
      'Bolt receipt'
    );
    expect(result).toBe('Ride');
  });
});

describe('simplifyDestination', () => {
  it('should simplify airport', () => {
    expect(simplifyDestination('Chiang Mai International Airport')).toBe('Airport');
  });

  it('should simplify golf', () => {
    expect(simplifyDestination('North Hill Golf Club')).toBe('Golf');
  });

  it('should simplify mall/central', () => {
    expect(simplifyDestination('Central Festival Chiang Mai')).toBe('Mall');
  });

  it('should simplify hotel', () => {
    expect(simplifyDestination('Le Meridien Chiang Mai Hotel')).toBe('Hotel');
  });

  it('should simplify hospital', () => {
    expect(simplifyDestination('Bangkok Hospital Chiang Mai')).toBe('Hospital');
  });

  it('should simplify station/terminal', () => {
    expect(simplifyDestination('Chiang Mai Bus Terminal')).toBe('Station');
  });

  it('should truncate long unrecognized locations', () => {
    const longLocation = 'Some Very Long Address That Is More Than Thirty Characters Long';
    const result = simplifyDestination(longLocation);
    expect(result.length).toBeLessThanOrEqual(33); // 30 chars + "..."
  });

  it('should handle location with comma', () => {
    const result = simplifyDestination('Nimman Road, Soi 5');
    expect(result).toBe('Nimman Road');
  });
});
