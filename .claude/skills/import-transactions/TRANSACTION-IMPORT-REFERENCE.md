# Transaction Import Reference Guide

This document captures learned patterns, vendor mappings, and preferences for importing transactions into Joot.

## User Profile

- **User ID**: `a1c3caff-a5de-4898-be7d-ab4b76247ae6`
- **Primary Currencies**: USD (display), THB (local Thailand)
- **Location**: Chiang Mai, Thailand (with US connections)

---

## Payment Methods

| Payment Method | ID | Currency | Notes |
|----------------|-----|----------|-------|
| Chase Sapphire Reserve | `43937623-48b3-45ea-a59c-7ee9c4a4020b` | USD | Primary credit card |
| Kasikorn Bank (K PLUS) | `0aaeb6c8-6052-47c9-b377-bc27d3231d4f` | THB | Thai bank account, bill payments & transfers |

### Currency Rules
- **Chase credit card**: Always USD, even for Thai merchants
- **Kasikorn bank transfers**: Always THB
- **Grab/Lazada receipts**: May show THB but charged to Chase in USD (use credit card amount)

---

## Vendor Mappings

### Credit Card Statement → Vendor

| Statement Text | Vendor Name | Vendor ID | Category |
|----------------|-------------|-----------|----------|
| `WWW.GRAB.COM` | GrabFood / Grab Taxi | See below | Food / Transport |
| `HTTPS://WWW.VIRGINACTIVE` | Virgin Active | `49641ab2-072e-464e-b377-82f199a5d397` | Gym |
| `MJT-CPN` | Muji | `9e3cc4c7-aa1b-4fbf-9a55-3e17354784fe` | Shopping |
| `B2S-CPN` | B2S | `854a3101-8fd5-48c5-b87e-7750fc23d67a` | Shopping |
| `TOPS-CHIANGMAI` / `TOPS-CHOTANA` | Tops | `334123a8-7017-4aaf-97d3-f28ae9b5eba6` | Groceries |
| `Comcast` / `XFINITY` | Xfinity | `d6d6b230-a268-4ffa-88b8-e8098f86b06c` | Internet |
| `iPhone Citizens Loan` | Citizen's Bank | `9a1f871e-8458-4627-aabc-36e3724e94b8` | Phone Payment |
| `CLAUDE/AI SUBSCRIPTION` | Anthropic | `423cf0cc-b570-4d1a-98fd-f60cecc221d3` | Software |
| `Jetbrains Americas` | JetBrains | `ecce979c-a9d8-44ef-8188-e74cd2918db2` | Software |
| `WWW.2C2P.COM*LAZADA` | Lazada | `797cb44e-b583-482d-841f-0e0b80af2705` | Shopping |

### Grab Categorization Rules

Grab charges need to be categorized by service type:

| Vendor | ID | Rule |
|--------|-----|------|
| GrabFood | `6b451d8c-b8db-4475-b19b-6c3cf38b93d0` | Larger amounts (typically >$10), food delivery |
| Grab Taxi | `20af541a-173c-4f7a-9e04-e0c821f7d367` | Smaller amounts (typically <$10), rides |
| GrabMart | `58f6f707-3771-41bf-a5eb-12a0b2ef0e3b` | Grocery/convenience deliveries |

**Heuristic**:
- < $8 → Grab Taxi (Ride)
- $8-15 → Could be either, check context
- > $15 → GrabFood (Food Delivery)

### Bank Transfer Recipient → Vendor

These are Thai individuals/businesses paid via K PLUS bank transfers:

| Recipient Name | Vendor Name | Vendor ID | Typical Description |
|----------------|-------------|-----------|---------------------|
| Kittitach | Chef Fuji | `8f42f382-dd9a-49c8-8984-eea40169ec20` | Meal Plan |
| Chaiyut | Leigh's Van Driver | `24e01082-dd4f-4292-afd8-5b13c7177cc1` | Wedding Transport |
| Patcharin | At Nata Resort | `1d45930f-7a7d-4c00-a2fb-8e3fff8d1426` | Drink |
| Kunchai Cha Yen | ZigarLab | `dbdaff3f-0a4a-4bbd-8a90-76e61fa70ce5` | Vapes |
| Tang Shop | Grab Driver | `37ce0024-75dd-45f4-a3ad-3b7f0ddf1df6` | Delivery Fee |
| Supaporn Kidkla | Nidnoi | `c39ea16b-7df9-4a51-a561-d38e0ead1f59` | Coffee |
| Wassana Jamsri | All Time Pickleball | `4a5a1340-7613-479f-8d37-f5a85eae85c7` | Pickleball Tournament |
| Chayaphorn Bu | Pee Tik | `9bd673d9-d0c0-4184-99de-bcaffa7cacc4` | Massage |

### Bill Payment Companies

| Company Name | Vendor Name | Vendor ID |
|--------------|-------------|-----------|
| MK Restaurant | MK Restaurant | `f4e14e17-41c4-46bc-b19e-3fc5a25f1fb7` |
| Minimal Coffee | Minimal Coffee | `8fa29bc3-bc68-4c8d-a0ad-70c2c3d02b5d` |
| Liquor Shop | Liquor Shop | `c49f435b-18c4-4f6d-8e4b-12b9f721e20d` |

---

## Description Patterns

### Recurring Transactions

| Vendor | Description Pattern | Frequency |
|--------|---------------------|-----------|
| Virgin Active | `Semi-Monthly: Gym Membership` | 2x/month |
| Xfinity | `Monthly: Internet` | Monthly |
| Citizen's Bank | `Monthly: iPhone Payment` | Monthly |
| JetBrains | `Annual Subscription: WebStorm` | Yearly |
| Chef Fuji | `Meal Plan` | Recurring |

### Category-Based Descriptions

| Vendor Type | Default Description |
|-------------|---------------------|
| GrabFood | `Food Delivery` |
| Grab Taxi | `Ride` |
| GrabMart | `Grocery Delivery` |
| Tops | `Groceries` |
| All Time Pickleball | `Open Play` or `Drinks` or `Pickleball Tournament` |

### Special Cases

| Context | Description |
|---------|-------------|
| B2S (Central Festival) | `Gift Wrapping` |
| Muji gift purchase | `Gift for [Recipient]: [Items]` |
| Anthropic upgrade | `Upgrade: Claude Pro to MAX` |
| Lazada multi-item | List items: `Sour Patch Kids, Golf Balls, Pandora Earrings` |
| Van Driver | `Wedding Transport` |
| Resort/Bar | `Drink` or `Drinks` |
| Massage | `Massage` |
| Coffee shop | `Coffee` |

---

## Transaction Type Rules

- All purchases are `expense`
- Income transactions are rare and explicitly identified

---

## Data Source Formats

### Chase Credit Card Statement
- Screenshots from Chase app
- Shows: Date, Merchant name, Amount in USD
- Pending vs Posted sections

### K PLUS Bank Transfers
- PDF receipts: "Bill Payment Success" or "Funds Transfer Success"
- Contains: Date, Recipient name, Amount in THB, Reference number

### Grab/Lazada Receipts
- Email PDFs showing THB amounts
- Cross-reference with USD credit card charges using ~34 THB/USD rate

---

## Workflow

1. **Collect inputs**: Screenshots, PDFs, receipt emails
2. **Extract transactions**: Read dates, amounts, merchant names
3. **Map to vendors**: Use mappings above, create new vendors if needed
4. **Determine descriptions**: Apply patterns or ask for clarification
5. **Categorize Grab**: Use amount heuristics
6. **Present summary**: Show all transactions for approval before insert
7. **Insert to database**: Bulk insert with proper IDs

---

## Database Insert Template

```javascript
const transaction = {
  user_id: 'a1c3caff-a5de-4898-be7d-ab4b76247ae6',
  payment_method_id: '[payment_method_id]',
  vendor_id: '[vendor_id]',
  transaction_date: 'YYYY-MM-DD',
  amount: 0.00,
  original_currency: 'USD' | 'THB',
  transaction_type: 'expense',
  description: '[description]'
};
```

---

## Notes

- Bank transfers are common in Thailand for everyday payments
- THB receipts may correspond to USD credit card charges
- Always verify totals match source documents
- Create new vendors when a mapping doesn't exist
- Ask for description clarification when context is ambiguous
