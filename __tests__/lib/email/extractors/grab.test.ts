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
      expect(result.data!.description).toContain('Hotel'); // Simplified destination
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

    it('should detect VND currency for Vietnam Grab receipts', () => {
      // Real-world scenario: user travels to Hanoi, Grab receipt is in dong.
      // Regression test for the bug where parser hardcoded currency='THB',
      // mislabeling VND receipts and breaking cross-source pairing with the
      // statement's printed foreign-amount in VND.
      const email = createMockEmail({
        text_body: `
          Your GrabFood order has been delivered!

          Your order from McDonald's (Nguyễn Văn Linh)

          Order Details
          2x Big Mac Burger Meal                ₫238,000
          Delivery Fee                          ₫26,000
          Service Fee                           ₫6,000
          Foreign card processing fee           ₫10,800
          Total                                 ₫280,800

          Payment Method: Visa •••• 0599
          Order ID: A-947IMIHGX4MNAV
        `,
      });

      const result = grabParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.amount).toBe(280800);
      expect(result.data!.currency).toBe('VND');
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

  it('should NOT misclassify GrabFood as taxi due to "grabtaxi" in HTML attributes', () => {
    // Real Grab emails contain "grabtaxi-marketing.s3.amazonaws.com" in image URLs,
    // tracking pixels, and style attributes across ALL email types
    const htmlBody = `
      <img src="https://grabtaxi-marketing.s3.amazonaws.com/header.png" />
      <a href="https://grabtaxi-marketing.s3.amazonaws.com/track?id=123">
      <div style="background-image: url(https://grabtaxi-marketing.s3.amazonaws.com/bg.png)">
      Your GrabFood order has been delivered!
      Your order from Dairy Queen
      Total ฿273.00
    `;
    const result = detectServiceType(htmlBody, 'Your Grab E-Receipt');
    expect(result.type).toBe('food');
    expect(result.vendorName).toBe('GrabFood');
  });

  it('should detect GrabTaxi from ride summary content', () => {
    const result = detectServiceType('Ride Summary\nPickup: Central\nDrop-off: Hotel', 'Your Grab E-Receipt');
    expect(result.type).toBe('taxi');
    expect(result.vendorName).toBe('Grab Taxi');
  });

  it('should default to GrabFood when no specific markers found', () => {
    // An email with grabtaxi only in URLs but no service-specific markers
    const htmlBody = `
      <img src="https://grabtaxi-marketing.s3.amazonaws.com/logo.png" />
      Thank you for your order!
      Total ฿500.00
    `;
    const result = detectServiceType(htmlBody, 'Your Grab E-Receipt');
    expect(result.type).toBe('food');
    expect(result.vendorName).toBe('Grab');
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
  it('should extract and simplify dropoff location', () => {
    const result = extractDropoffLocation('Drop-off: Nimman Road\nTime: 23:12');
    expect(result).toBe('Nimman Road');
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

  // Regression: May 2026 review queue. Each of these layouts extracted a
  // number that existed in the email but was not the amount charged, which
  // then mismatched against an unrelated transaction and left the real
  // statement row orphaned in the queue.
  describe('layouts that previously extracted the wrong figure', () => {
    it('takes Total Paid, not the pre-discount Fare, on a ride receipt', () => {
      // 23 May 2026, GrabTaxi. Chase settled ฿205; the parser returned ฿227.
      const body = [
        'Hope you enjoyed your ride! Picked up on 23 May 2026',
        'Total Paid ฿ 205',
        'Breakdown Fare ฿ 227 Platform Fee ฿ 20* Promo ฿ -48 Foreign payment fee ฿ 6*',
        'Total Paid ฿ 205 (*VAT Item)',
        'Total Amount of goods and services that subject to VAT (inclusive VAT) ฿ 26',
        'Paid by 0599 ฿ 205',
      ].join(' ');
      expect(extractAmount(body)!.amount).toBe(205);
    });

    it('reads a bare total under an "Amount (THB)" column header', () => {
      // 25 May 2026 late-delivery apology. The only ฿ figure is the goodwill
      // voucher; the order total is bare. The parser returned ฿15.
      const body = [
        "We're really sorry your order took longer than it should have.",
        "As a token of our apology, here's a ฿15 voucher for your next order.",
        'Order breakdown Merchant Wave Acai and Smoothie Status Completed',
        'Description Amount (THB)',
        '1x Coco Peanut Butter Acai Smoothie Bowl 248.00',
        '1x Coco Peanut Butter Acai Smoothie Bowl 139.00',
        'Service Fee Delivery Fee 51.00',
        'Total 410.00',
      ].join(' ');
      expect(extractAmount(body)!.amount).toBe(410);
    });

    it('recognises the GrabMart total label "ทั้งหมด"', () => {
      // 27 May 2026. No label the parser knew, so it took the largest figure —
      // the ฿533 pre-discount subtotal instead of the ฿521 charged.
      const body = [
        'ขอบคุณที่ซื้อสินค้ากับเรา! ทั้งหมด ฿ 521 สั่งซื้อด้วย GrabMart',
        'ราคาคำสั่งซื้อ ฿ 533 ค่าจัดส่ง ฿ 18 GMANSC - ฿ 30',
        'ค่าธุรกรรมต่างประเทศ (3%) 1 ฿ 15 ทั้งหมด ฿ 521',
        'รวมมูลค่าสินค้าและบริการ ที่ต้องเสียภาษีมูลค่าเพิ่ม ฿ 15',
      ].join(' ');
      expect(extractAmount(body)!.amount).toBe(521);
    });

    it('measures label-to-amount distance on visible text, not markup', () => {
      // Real bodies arrive as HTML with empty text_body. Table markup between
      // the label and its figure used to exhaust the match window, so the
      // labeled-total pass found nothing at all.
      const body =
        '<table><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
        'color:#1a1a1a;padding:12px 16px 12px 16px;border-bottom:1px solid #eeeeee">' +
        'TOTAL</td><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;' +
        'text-align:right;padding:12px 16px 12px 16px">&#3647; 41</td></tr></table>';
      const result = extractAmount(body);
      expect(result!.amount).toBe(41);
    });

    it('reads a Vietnamese receipt whose symbol follows the number', () => {
      // Grab VN prints "501280₫", not "₫501280". Matching only the prefix
      // form left this to the fallback, which picked up the "₫ 3x" of the
      // next line and reported the meal as ₫3.
      const body = [
        'Chúc bạn ngon miệng! Tổng cộng 501280₫',
        'Chi tiết Số lượng: 3x Cheese Beef Burger 147000₫ 3x Premium Chicken Mayo Burger 303000₫',
        'Tổng tạm tính 450000₫ Cước phí giao hàng 26000₫ BẠN TRẢ 501280₫',
      ].join(' ');
      const result = extractAmount(body);
      expect(result!.amount).toBe(501280);
    });

    it('treats a dot as a thousands separator in dong', () => {
      // "99.840" is ₫99,840 — not ₫99.84. VND has no minor unit.
      const body = 'Hope you enjoyed your ride! Total Paid VND 99.840 Breakdown Fare 96.000 Promo -9.000';
      const result = extractAmount(body);
      expect(result!.amount).toBe(99840);
      expect(result!.amount).not.toBe(99.84);
    });

    it('still reads a comma as a thousands separator in baht', () => {
      expect(extractAmount('Total ฿1,283')!.amount).toBe(1283);
      expect(extractAmount('Total ฿1,283.50')!.amount).toBe(1283.5);
    });

    it('extracts nothing rather than guessing on an itemised receipt with no total', () => {
      // Booking a component as if it were the total is worse than surfacing
      // the email as missing an amount.
      const body = 'Fare ฿ 227 Platform Fee ฿ 20 Promo ฿ -48';
      expect(extractAmount(body)).toBeNull();
    });
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

  // getFoodType reads getUTCHours() and adds 7 for Thai local time, so these
  // instants must be pinned to UTC. A bare 'YYYY-MM-DDTHH:MM:SS' literal is
  // parsed as *local* time and the meal boundaries then move with the machine's
  // timezone — this passed in UTC+7 and returned 'Meal' on a UTC CI runner.
  it('should return time-based type for regular restaurants', () => {
    const morning = new Date('2025-11-15T01:00:00Z'); // 08:00 in Bangkok
    const lunch = new Date('2025-11-15T05:00:00Z'); // 12:00 in Bangkok
    const dinner = new Date('2025-11-15T12:00:00Z'); // 19:00 in Bangkok

    expect(getFoodType(morning, 'Regular Restaurant')).toBe('Breakfast');
    expect(getFoodType(lunch, 'Regular Restaurant')).toBe('Lunch');
    expect(getFoodType(dinner, 'Regular Restaurant')).toBe('Dinner');
  });

  it('should fall back to "Meal" between lunch and dinner', () => {
    const afternoon = new Date('2025-11-15T09:00:00Z'); // 16:00 in Bangkok

    expect(getFoodType(afternoon, 'Regular Restaurant')).toBe('Meal');
  });
});
