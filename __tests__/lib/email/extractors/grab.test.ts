/**
 * Unit tests for Grab email parser
 */

import {
  grabParser,
  detectServiceType,
  extractRestaurantName,
  extractDropoffLocation,
  extractAmount,
  extractOrderId,
  isGrabPayWallet,
  getFoodType,
} from '@/lib/email/extractors/grab';
import type { RawEmailData } from '@/lib/email/types';

// Helper to create mock email data
function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-message-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'Your Grab E-Receipt',
    from_address: 'no-reply@grab.com',
    from_name: 'Grab',
    email_date: new Date('2025-11-15T19:30:00+07:00'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

describe('grabParser', () => {
  describe('canParse', () => {
    it('should return true for emails from no-reply@grab.com', () => {
      const email = createMockEmail({
        from_address: 'no-reply@grab.com',
      });
      expect(grabParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from noreply@grab.com', () => {
      const email = createMockEmail({
        from_address: 'noreply@grab.com',
      });
      expect(grabParser.canParse(email)).toBe(true);
    });

    it('should return true for emails with Grab subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Your Grab E-Receipt',
      });
      expect(grabParser.canParse(email)).toBe(true);
    });

    it('should return true for GrabExpress subject', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Your GrabExpress Receipt',
      });
      expect(grabParser.canParse(email)).toBe(true);
    });

    it('should return false for unrelated emails', () => {
      const email = createMockEmail({
        from_address: 'orders@amazon.com',
        subject: 'Your Amazon order',
      });
      expect(grabParser.canParse(email)).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract GrabFood transaction data', () => {
      const email = createMockEmail({
        text_body: `
          Your GrabFood order has been delivered!

          Your order from Dairy Queen

          Order Details
          Blizzard (M)                           ฿99.00
          Chicken Strip Basket                   ฿149.00
          Delivery Fee                           ฿25.00
          Total                                  ฿273.00

          Payment Method: Credit Card
          Order ID: A-123456789012
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('GrabFood');
      expect(result.data!.amount).toBe(273);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBe('A-123456789012');
      expect(result.data!.description).toContain('Dairy Queen');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should extract GrabTaxi transaction data', () => {
      const email = createMockEmail({
        text_body: `
          Hope you enjoyed your ride!

          Ride Summary
          Pickup: Central Festival Chiang Mai
          Time: 23:00

          Drop-off: Nimman Hotel
          Time: 23:12

          Distance: 4.2 km

          Fare Breakdown
          Base Fare                              ฿35.00
          Distance (4.2 km)                      ฿42.00
          Total                                  ฿77.00

          Payment Method: Credit Card
          Booking ID: A-987654321098
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Grab Taxi');
      expect(result.data!.amount).toBe(77);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.description).toContain('Taxi to');
      expect(result.data!.description).toContain('Nimman Hotel');
    });

    it('should extract GrabMart transaction data', () => {
      const email = createMockEmail({
        subject: 'Your GrabMart Receipt',
        text_body: `
          Your GrabMart order has been delivered!

          Your order from 7-Eleven

          Order Details
          Snacks                                 ฿85.00
          Drinks                                 ฿45.00
          Delivery Fee                           ฿20.00
          Total                                  ฿150.00

          Payment Method: Credit Card
          Order ID: GM-567890123456
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('GrabMart');
      expect(result.data!.amount).toBe(150);
      expect(result.data!.order_id).toBe('GM-567890123456');
    });

    it('should extract GrabExpress transaction data', () => {
      const email = createMockEmail({
        subject: 'Your GrabExpress Receipt',
        text_body: `
          Your GrabExpress delivery has been completed!

          Vehicle Type: GrabExpress

          Pickup: Nimman Plaza
          Drop-off: Central Airport Plaza

          Distance: 8.5 km

          Total                                  ฿130.00

          Payment Method: Credit Card
          Booking ID: GE-135792468024
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('GrabExpress');
      expect(result.data!.amount).toBe(130);
      expect(result.data!.order_id).toBe('GE-135792468024');
    });

    it('should detect GrabPay Wallet payment', () => {
      const email = createMockEmail({
        text_body: `
          Your GrabFood order has been delivered!

          Your order from Starbucks

          Total                                  ฿220.00

          Payment Method: GrabPay Wallet
          Order ID: A-246813579135
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.notes).toContain('GrabPay Wallet');
    });

    it('should fail gracefully when no amount found', () => {
      const email = createMockEmail({
        text_body: 'Your order has been delivered!',
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No THB amount found in email');
    });

    it('should fail gracefully when no body content', () => {
      const email = createMockEmail({
        text_body: null,
        html_body: null,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email body content available');
    });
  });
});

describe('detectServiceType', () => {
  it('should detect GrabFood from body content', () => {
    const result = detectServiceType('Your GrabFood order has been delivered!', 'Your Grab E-Receipt');
    expect(result.type).toBe('food');
    expect(result.vendorName).toBe('GrabFood');
  });

  it('should detect GrabTaxi from "hope you enjoyed your ride"', () => {
    const result = detectServiceType('Hope you enjoyed your ride!', 'Your Grab E-Receipt');
    expect(result.type).toBe('taxi');
    expect(result.vendorName).toBe('Grab Taxi');
  });

  it('should detect GrabMart from subject', () => {
    const result = detectServiceType('Order delivered', 'Your GrabMart Receipt');
    expect(result.type).toBe('mart');
    expect(result.vendorName).toBe('GrabMart');
  });

  it('should detect GrabExpress from subject', () => {
    const result = detectServiceType('Delivery completed', 'Your GrabExpress Receipt');
    expect(result.type).toBe('express');
    expect(result.vendorName).toBe('GrabExpress');
  });
});

describe('extractRestaurantName', () => {
  it('should extract restaurant from "Your order from X" pattern', () => {
    const result = extractRestaurantName('Your order from Dairy Queen');
    expect(result).toBe('Dairy Queen');
  });

  it('should extract restaurant from "Order from X" pattern', () => {
    const result = extractRestaurantName('Order from KFC completed');
    expect(result).toBe('KFC completed');
  });

  it('should return null when no restaurant found', () => {
    const result = extractRestaurantName('Your order has been delivered');
    expect(result).toBeNull();
  });
});

describe('extractDropoffLocation', () => {
  it('should extract dropoff location', () => {
    const result = extractDropoffLocation('Drop-off: Nimman Hotel\nTime: 23:12');
    expect(result).toBe('Nimman Hotel');
  });

  it('should simplify to "Golf" for golf-related locations', () => {
    const result = extractDropoffLocation('Dropoff: North Hill Golf Club');
    expect(result).toBe('Golf');
  });

  it('should simplify to "Airport" for airport locations', () => {
    const result = extractDropoffLocation('Drop-off: Chiang Mai International Airport');
    expect(result).toBe('Airport');
  });

  it('should return null when no dropoff found', () => {
    const result = extractDropoffLocation('Your ride has completed');
    expect(result).toBeNull();
  });
});

describe('extractAmount', () => {
  it('should extract THB amount with ฿ symbol', () => {
    const result = extractAmount('Total: ฿273.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(273);
  });

  it('should extract THB amount with comma separator', () => {
    const result = extractAmount('Total: ฿1,500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
  });

  it('should extract THB amount with THB prefix', () => {
    const result = extractAmount('Total: THB 500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
  });

  it('should return largest amount when multiple found', () => {
    const result = extractAmount('Item: ฿100.00\nDelivery: ฿25.00\nTotal: ฿125.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(125);
  });

  it('should return null when no amount found', () => {
    const result = extractAmount('Your order has been delivered');
    expect(result).toBeNull();
  });
});

describe('extractOrderId', () => {
  it('should extract A-format order ID', () => {
    const result = extractOrderId('Order ID: A-123456789012', '');
    expect(result).toBe('A-123456789012');
  });

  it('should extract GM-format order ID', () => {
    const result = extractOrderId('Order ID: GM-567890123456', '');
    expect(result).toBe('GM-567890123456');
  });

  it('should extract GE-format order ID', () => {
    const result = extractOrderId('Booking ID: GE-135792468024', '');
    expect(result).toBe('GE-135792468024');
  });

  it('should return null when no order ID found', () => {
    const result = extractOrderId('Thank you for your order!', '');
    expect(result).toBeNull();
  });
});

describe('isGrabPayWallet', () => {
  it('should return true for GrabPay Wallet payment', () => {
    expect(isGrabPayWallet('Payment Method: GrabPay Wallet')).toBe(true);
  });

  it('should return true for GrabPay Balance', () => {
    expect(isGrabPayWallet('Paid from GrabPay Balance')).toBe(true);
  });

  it('should return false for Credit Card payment', () => {
    expect(isGrabPayWallet('Payment Method: Credit Card')).toBe(false);
  });
});

describe('getFoodType', () => {
  it('should return "Dessert" for ice cream shops regardless of time', () => {
    const morning = new Date('2025-11-15T08:00:00');
    expect(getFoodType(morning, 'Dairy Queen')).toBe('Dessert');
  });

  it('should return "Coffee" for coffee shops', () => {
    const afternoon = new Date('2025-11-15T14:00:00');
    expect(getFoodType(afternoon, 'Starbucks')).toBe('Coffee');
  });

  it('should return "Snack" for convenience stores', () => {
    const evening = new Date('2025-11-15T20:00:00');
    expect(getFoodType(evening, '7-Eleven')).toBe('Snack');
  });

  it('should return time-based type for regular restaurants', () => {
    const morning = new Date('2025-11-15T08:00:00');
    const lunch = new Date('2025-11-15T12:00:00');
    const dinner = new Date('2025-11-15T19:00:00');

    expect(getFoodType(morning, 'Regular Restaurant')).toBe('Breakfast');
    expect(getFoodType(lunch, 'Regular Restaurant')).toBe('Lunch');
    expect(getFoodType(dinner, 'Regular Restaurant')).toBe('Dinner');
  });
});
