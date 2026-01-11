/**
 * Unit tests for Lazada email parser
 */

import {
  lazadaParser,
  detectEmailType,
  stripHtml,
  extractOrderId,
  extractAmount,
  extractItemCount,
  buildDescription,
  LAZADA_SENDER_PATTERNS,
  LAZADA_SUBJECT_PATTERNS,
} from '@/lib/email/extractors/lazada';
import type { RawEmailData } from '@/lib/email/types';

// Helper to create mock email data
function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-message-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'Thank you for your order! Your Lazada order has been confirmed',
    from_address: 'order@lazada.co.th',
    from_name: 'Lazada Thailand',
    email_date: new Date('2025-11-15T14:30:00+07:00'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

describe('lazadaParser', () => {
  describe('canParse', () => {
    it('should return true for emails from order@lazada.co.th', () => {
      const email = createMockEmail({
        from_address: 'order@lazada.co.th',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from noreply@lazada.co.th', () => {
      const email = createMockEmail({
        from_address: 'noreply@lazada.co.th',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from notification@lazada.co.th', () => {
      const email = createMockEmail({
        from_address: 'notification@lazada.co.th',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from orders@lazada.co.th', () => {
      const email = createMockEmail({
        from_address: 'orders@lazada.co.th',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should handle case-insensitive sender matching', () => {
      const email = createMockEmail({
        from_address: 'ORDER@LAZADA.CO.TH',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should return true for emails with Lazada in subject and order pattern', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Your Lazada order has been confirmed',
      });
      expect(lazadaParser.canParse(email)).toBe(true);
    });

    it('should return false for unrelated emails', () => {
      const email = createMockEmail({
        from_address: 'no-reply@grab.com',
        subject: 'Your Grab E-Receipt',
      });
      expect(lazadaParser.canParse(email)).toBe(false);
    });

    it('should return false for non-Lazada order emails', () => {
      const email = createMockEmail({
        from_address: 'orders@amazon.com',
        subject: 'Your Amazon order has been confirmed',
      });
      expect(lazadaParser.canParse(email)).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract order confirmation transaction data', () => {
      const email = createMockEmail({
        text_body: `
          Lazada Thailand

          Thank you for your order!

          Your order has been confirmed.

          Order Details
          Order ID: #1234567890123

          3 items in your order:
          1. Wireless Bluetooth Earbuds - ฿599.00
          2. Phone Case - ฿299.00
          3. USB-C Cable (2 pack) - ฿199.00

          Order Total: ฿997.00

          Payment Method: Credit Card ending in 1234

          Estimated Delivery: November 18-20, 2025

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Lazada');
      expect(result.data!.amount).toBe(997);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBe('1234567890123');
      expect(result.data!.description).toContain('Online Order');
      expect(result.data!.description).toContain('3 items');
      expect(result.notes).toContain('estimated');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should extract shipped order data', () => {
      const email = createMockEmail({
        subject: 'Your Lazada order has been shipped!',
        text_body: `
          Lazada Thailand

          Your order is on the way!

          Order #9876543210987 has been shipped.

          Track your package with tracking number: TH123456789

          Items in this shipment (2 items):
          - Wireless Mouse
          - Keyboard Mat

          Order Total: ฿1,250.00

          Estimated Delivery: November 18, 2025

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Lazada');
      expect(result.data!.amount).toBe(1250);
      expect(result.data!.order_id).toBe('9876543210987');
      expect(result.data!.description).toContain('Shipped');
    });

    it('should extract delivered order data', () => {
      const email = createMockEmail({
        subject: 'Your Lazada order has been delivered',
        from_address: 'notification@lazada.co.th',
        text_body: `
          Lazada Thailand

          Your order has been delivered!

          Order #5555666677778 has been delivered.

          Delivery completed at 15:30 on November 18, 2025.

          Order Total: ฿450.00

          We hope you enjoy your purchase!

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(450);
      expect(result.data!.order_id).toBe('5555666677778');
      expect(result.data!.description).toContain('Delivered');
    });

    it('should extract payment confirmation data', () => {
      const email = createMockEmail({
        subject: 'Payment confirmed for your Lazada order',
        text_body: `
          Lazada Thailand

          Payment Confirmed!

          Your payment has been received for Order #1111222233334.

          Amount: ฿2,599.00
          Payment Method: LazWallet

          Your order is being prepared for shipment.

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(2599);
      expect(result.data!.order_id).toBe('1111222233334');
      expect(result.data!.description).toContain('Payment');
    });

    it('should extract minimal order data', () => {
      const email = createMockEmail({
        subject: 'Your Lazada order',
        from_address: 'orders@lazada.co.th',
        text_body: `
          Thank you for your order from Lazada.

          Total: THB 350.00

          Your order will be processed shortly.
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(350);
      expect(result.data!.currency).toBe('THB');
      expect(result.notes).toContain('No order ID found');
    });

    it('should handle amounts with commas', () => {
      const email = createMockEmail({
        text_body: `
          Order Total: ฿12,500.00

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.amount).toBe(12500);
    });

    it('should handle THB prefix format', () => {
      const email = createMockEmail({
        text_body: `
          Amount: THB 899.00

          Thank you for shopping with Lazada!
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.amount).toBe(899);
    });

    it('should extract from HTML body when text is empty', () => {
      const email = createMockEmail({
        text_body: '',
        html_body: `
          <!DOCTYPE html>
          <html>
          <body>
            <h1>Lazada Thailand</h1>
            <h2>Your order has been confirmed!</h2>
            <p>Order #8888999900001</p>
            <table>
              <tr><td>Item 1</td><td>฿500.00</td></tr>
              <tr><td>Item 2</td><td>฿300.00</td></tr>
              <tr class="total"><td>Order Total</td><td>฿800.00</td></tr>
            </table>
          </body>
          </html>
        `,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.amount).toBe(800);
      expect(result.data!.order_id).toBe('8888999900001');
    });

    it('should use email date for transaction date', () => {
      const testDate = new Date('2025-11-25T14:00:00+07:00');
      const email = createMockEmail({
        email_date: testDate,
        text_body: 'Order Total: ฿150.00',
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date).toEqual(testDate);
    });

    it('should fail gracefully when no amount found', () => {
      const email = createMockEmail({
        text_body: 'Thank you for shopping with Lazada!',
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No THB amount found in email');
    });

    it('should fail gracefully when no body content', () => {
      const email = createMockEmail({
        text_body: null,
        html_body: null,
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email body content available');
    });

    it('should always include estimate note in extraction result', () => {
      const email = createMockEmail({
        text_body: 'Order Total: ฿500.00',
      });

      const result = lazadaParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.notes).toContain('estimated');
    });
  });
});

describe('detectEmailType', () => {
  it('should detect order confirmation from subject', () => {
    expect(detectEmailType('Order Confirmed! Your Lazada order', '')).toBe('order_confirmation');
    expect(detectEmailType('Your order has been confirmed', '')).toBe('order_confirmation');
    expect(detectEmailType('Thank you for your order', '')).toBe('order_confirmation');
  });

  it('should detect order confirmation from body', () => {
    expect(detectEmailType('Some subject', 'Your order has been confirmed')).toBe('order_confirmation');
  });

  it('should detect shipped status', () => {
    expect(detectEmailType('Your order has been shipped', '')).toBe('shipped');
    expect(detectEmailType('Your package is on the way', '')).toBe('shipped');
  });

  it('should detect delivered status', () => {
    expect(detectEmailType('Your order has been delivered', '')).toBe('delivered');
  });

  it('should detect payment confirmation', () => {
    expect(detectEmailType('Payment confirmed', '')).toBe('payment');
    expect(detectEmailType('Payment received', '')).toBe('payment');
  });

  it('should return unknown for unrecognized emails', () => {
    expect(detectEmailType('Some random subject', 'Some random body')).toBe('unknown');
  });
});

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    const html = '<div><p>Hello <strong>World</strong></p></div>';
    const result = stripHtml(html);
    expect(result).toBe('Hello World');
  });

  it('should remove style blocks', () => {
    const html = '<style>body { color: red; }</style><p>Content</p>';
    const result = stripHtml(html);
    expect(result).toBe('Content');
  });

  it('should remove script blocks', () => {
    const html = '<script>alert("test")</script><p>Content</p>';
    const result = stripHtml(html);
    expect(result).toBe('Content');
  });

  it('should decode HTML entities', () => {
    const html = '<p>Hello&nbsp;World &amp; Friends</p>';
    const result = stripHtml(html);
    expect(result).toContain('Hello World & Friends');
  });

  it('should decode numeric HTML entities', () => {
    const html = '<p>Price: &#3647;500</p>';
    const result = stripHtml(html);
    expect(result).toContain('500');
  });

  it('should normalize whitespace', () => {
    const html = '<p>Hello    \n\n   World</p>';
    const result = stripHtml(html);
    expect(result).toBe('Hello World');
  });
});

describe('extractOrderId', () => {
  it('should extract order ID with hash prefix', () => {
    const result = extractOrderId('Order ID: #1234567890123', '');
    expect(result).toBe('1234567890123');
  });

  it('should extract order ID from Order No format', () => {
    const result = extractOrderId('Order No.: 9876543210', '');
    expect(result).toBe('9876543210');
  });

  it('should extract order ID from Order Number format', () => {
    const result = extractOrderId('Order Number: 1111222233334', '');
    expect(result).toBe('1111222233334');
  });

  it('should extract long numeric order ID with hash', () => {
    const result = extractOrderId('#5555666677778', '');
    expect(result).toBe('5555666677778');
  });

  it('should extract from subject', () => {
    const result = extractOrderId('', 'Order #9999888877776 confirmed');
    expect(result).toBe('9999888877776');
  });

  it('should return null when no order ID found', () => {
    const result = extractOrderId('Thank you for your order!', 'Lazada order');
    expect(result).toBeNull();
  });

  it('should reject very short IDs', () => {
    const result = extractOrderId('Order #12345', '');
    expect(result).toBeNull();
  });
});

describe('extractAmount', () => {
  it('should extract order total amount with ฿ symbol', () => {
    const result = extractAmount('Order Total: ฿997.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(997);
    expect(result!.confidence).toBeGreaterThanOrEqual(90);
  });

  it('should extract total with THB prefix', () => {
    const result = extractAmount('Total: THB 500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
  });

  it('should extract grand total', () => {
    const result = extractAmount('Grand Total: ฿1,500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
  });

  it('should extract amount with comma separator', () => {
    const result = extractAmount('Order Total: ฿12,500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12500);
  });

  it('should prefer order total over item prices', () => {
    const result = extractAmount('Item: ฿100.00\nShipping: ฿50.00\nOrder Total: ฿150.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150);
    expect(result!.confidence).toBeGreaterThanOrEqual(90);
  });

  it('should return largest amount when no total label', () => {
    const result = extractAmount('฿100.00 item 1\n฿250.00 item 2');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250);
    expect(result!.confidence).toBeLessThan(90);
  });

  it('should handle Baht suffix', () => {
    const result = extractAmount('Amount: 350.00 Baht');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(350);
  });

  it('should return null when no amount found', () => {
    const result = extractAmount('Thank you for shopping');
    expect(result).toBeNull();
  });

  it('should mark all amounts as estimates', () => {
    const result = extractAmount('Order Total: ฿500.00');
    expect(result).not.toBeNull();
    expect(result!.isEstimate).toBe(true);
  });
});

describe('extractItemCount', () => {
  it('should extract item count from "X items"', () => {
    const result = extractItemCount('3 items in your order');
    expect(result).toBe(3);
  });

  it('should extract item count from "X products"', () => {
    const result = extractItemCount('5 products in your order');
    expect(result).toBe(5);
  });

  it('should handle single item', () => {
    const result = extractItemCount('1 item in your cart');
    expect(result).toBe(1);
  });

  it('should return null when no item count found', () => {
    const result = extractItemCount('Your order has been confirmed');
    expect(result).toBeNull();
  });
});

describe('buildDescription', () => {
  it('should build order confirmation description with items', () => {
    const result = buildDescription('order_confirmation', '3 items in your order');
    expect(result).toBe('Online Order (3 items)');
  });

  it('should build shipped description', () => {
    const result = buildDescription('shipped', '2 items shipped');
    expect(result).toBe('Online Order (2 items) - Shipped');
  });

  it('should build delivered description', () => {
    const result = buildDescription('delivered', 'Your package');
    expect(result).toBe('Online Order - Delivered');
  });

  it('should build payment description', () => {
    const result = buildDescription('payment', 'Payment confirmed');
    expect(result).toBe('Online Order - Payment');
  });

  it('should build generic description for unknown type', () => {
    const result = buildDescription('unknown', '');
    expect(result).toBe('Online Order');
  });

  it('should handle single item without pluralization note', () => {
    const result = buildDescription('order_confirmation', '1 item');
    expect(result).toBe('Online Order');
  });
});

describe('Constants', () => {
  it('should have correct sender patterns', () => {
    expect(LAZADA_SENDER_PATTERNS).toContain('order@lazada.co.th');
    expect(LAZADA_SENDER_PATTERNS).toContain('noreply@lazada.co.th');
    expect(LAZADA_SENDER_PATTERNS).toContain('notification@lazada.co.th');
    expect(LAZADA_SENDER_PATTERNS).toContain('orders@lazada.co.th');
  });

  it('should have all subject patterns', () => {
    expect(LAZADA_SUBJECT_PATTERNS).toContain('order confirmed');
    expect(LAZADA_SUBJECT_PATTERNS).toContain('order shipped');
    expect(LAZADA_SUBJECT_PATTERNS).toContain('delivered');
    expect(LAZADA_SUBJECT_PATTERNS).toContain('payment confirmed');
  });
});

describe('Integration with realistic emails', () => {
  it('should handle multi-item order with various prices', () => {
    const email = createMockEmail({
      text_body: `
        Your Lazada order has been confirmed!

        Order #7777888899990

        4 items:
        - Laptop Stand (฿1,299.00)
        - Wireless Keyboard (฿899.00)
        - USB Hub (฿349.00)
        - Monitor Light Bar (฿1,199.00)

        Order Total: ฿3,496.00

        Estimated Delivery: 3-5 business days
      `,
    });

    const result = lazadaParser.extract(email);

    expect(result.success).toBe(true);
    expect(result.data!.amount).toBe(3496);
    expect(result.data!.order_id).toBe('7777888899990');
  });

  it('should handle partial shipment notification', () => {
    const email = createMockEmail({
      subject: 'Part of your Lazada order has been shipped',
      text_body: `
        Your order is on the way!

        Order #4444555566667 - Shipment 1 of 2

        This shipment contains:
        - Item A (1 item)
        - Item B (1 item)

        Shipment Total: ฿750.00

        Note: Additional items from your order will be shipped separately.
      `,
    });

    const result = lazadaParser.extract(email);

    expect(result.success).toBe(true);
    expect(result.data!.amount).toBe(750);
    expect(result.data!.order_id).toBe('4444555566667');
  });
});
