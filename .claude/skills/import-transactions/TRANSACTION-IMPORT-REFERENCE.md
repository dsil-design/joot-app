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
| Bangkok Bank (Bualuang) | *(look up during import)* | THB | Thai bank account, bill payments & transfers |

### Currency Rules
- **Chase credit card**: Always USD, even for Thai merchants
- **Kasikorn bank transfers**: Always THB
- **Bangkok Bank transfers**: Always THB
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

### Bolt Rides

| Vendor | ID | Notes |
|--------|-----|-------|
| Bolt | *(look up during import)* | Taxi/ride service, similar to Grab Taxi |

**Payment**: Bolt rides are charged to Chase (USD), like Grab. Cross-reference THB email amounts with USD credit card charges using ~34 THB/USD rate.

### K PLUS Address Book

This address book maps recipient names (as they appear in K PLUS emails) to vendors and typical descriptions. Names may appear in different formats (Thai, English, abbreviated) across different transfer types.

#### Individuals (Funds Transfer / PromptPay)

| Email Recipient Name | Vendor Name | Vendor ID | Typical Descriptions |
|---------------------|-------------|-----------|----------------------|
| Kittitach | Chef Fuji | `8f42f382-dd9a-49c8-8984-eea40169ec20` | Meal Plan |
| Chaiyut | Leigh's Van Driver | `24e01082-dd4f-4292-afd8-5b13c7177cc1` | Wedding Transport |
| Patcharin | At Nata Resort | `1d45930f-7a7d-4c00-a2fb-8e3fff8d1426` | Drink |
| Tang Shop | Grab Driver | `fda28045-cd65-49bf-9ba4-0f333ccfec89` | Delivery Fee |
| Wassana Jamsri | All Time Pickleball | `4a5a1340-7613-479f-8d37-f5a85eae85c7` | Pickleball Tournament |
| MS. SUPAPORN KIDKLA, Supaporn Kidkla, น.ส. สุภาภรณ์ คิดกล้า | Nidnoi | `504c68c7-9a78-4e84-aa35-255918fdc5bb` | Coffee |
| CHAYAPHORN BU, Chayaphorn Bu, นางสาว ชยภร บัวเสน | Pee Tik | `9bd673d9-d0c0-4184-99de-bcaffa7cacc4` | Massage |

#### Companies (Bill Payment)

| Email Company Name | Vendor Name | Vendor ID | Typical Descriptions |
|-------------------|-------------|-----------|----------------------|
| Kunchai cha yen | Zigarlab | `f22be1ef-2cec-4c8c-9978-d6316147a51d` | Vapes |
| MK Restaurant | MK Restaurant | `47a9df0f-7813-44a8-8849-d9119a957057` | (ask user) |
| Minimal Coffee | Minimal Coffee | `8d4f8c89-0329-49ea-bccb-d88d70a74efc` | Coffee |
| Liquor Shop | Liquor Shop | `c49f435b-18c4-4f6d-8e4b-12b9f721e20d` | (ask user) |

### Bangkok Bank (Bualuang) Address Book

This address book maps recipient names from Bangkok Bank (Bualuang mBanking) emails to vendors. Similar to K PLUS, recipients may appear in Thai or English across different transfer types.

**Skip Rules**: Self-transfers (e.g., to own bank accounts or own wallets) should be skipped - these are internal fund movements, not expenses.

#### Individuals (PromptPay to Mobile)

| Email Recipient Name | Vendor Name | Vendor ID | Typical Descriptions |
|---------------------|-------------|-----------|----------------------|
| 004xx-xxx-xxx-9197 | Chef Fuji | `8f42f382-dd9a-49c8-8984-eea40169ec20` | Meal Plan |
| SUPAPORN KID | Nidnoi | `504c68c7-9a78-4e84-aa35-255918fdc5bb` | Coffee |

#### Individuals (Funds Transfer)

| Email Recipient Name | Vendor Name | Vendor ID | Typical Descriptions |
|---------------------|-------------|-----------|----------------------|
| บจ. บลิส คลีน แอนด์ แคร์ | Bliss Clean Care | `2056927d-a36a-4328-b878-e59f3d3ff8fd` | Monthly: Cleaning Service |

#### Companies (Payments / Bill Payment)

| Email Company Name | Vendor Name | Vendor ID | Typical Descriptions |
|-------------------|-------------|-----------|----------------------|
| บริษัท ม่อนพญาพรหม จำกัด | Highlands | `308791b3-c439-44a8-848a-2511539ea105` | Golf |
| บริษัท เฮลธ์ลิ้งค์ จำกัด | Alpine Golf Club | `a07811f5-de1a-49d1-8ec5-352137551174` | Golf |
| NA VANA | Vanaa | `d6ee061e-e861-451d-bcc7-4edb384552f8` | Drinks |
| M SPORT COMPLEX | MSport | `a7ac24a7-7966-4a07-8ac2-a63b69ca5cff` | Sports/Recreation |
| SCB มณี SHOP (ALL TIME PICKLEBALL) | All Time Pickleball | `4a5a1340-7613-479f-8d37-f5a85eae85c7` | Pickleball |
| คุณชายชาเย็น | Zigarlab | `f22be1ef-2cec-4c8c-9978-d6316147a51d` | Vapes |
| ร้านถุงเงิน (นอร์ธฮิลล์ กอล์ฟ คลับ) | North Hill | `4df2d271-cc02-4c9b-92e7-cb9d665795f5` | Golf |
| Janjira Photo | Janjira Photo | `08ab6daf-e47c-4756-96ee-4c09ccd7876d` | Photography |

---

## Recurring Transaction Patterns

This section documents known recurring transactions. Use this for:
1. **Import consistency** - Apply the same description to recurring charges
2. **Amount validation** - Flag charges that deviate significantly from expected amounts
3. **Duplicate detection** - If a monthly charge appears twice in one month, flag for review

### Monthly Subscriptions & Bills

| Vendor | Vendor ID | Amount | Currency | Day | Description | Tags |
|--------|-----------|--------|----------|-----|-------------|------|
| Citizen's Bank | `9a1f871e-8458-4627-aabc-36e3724e94b8` | ~$54 | USD | ~12th | `Monthly: iPhone Payment` | |
| Google | `ad9b6643-bab9-4193-a994-9d16ac589a11` | ~$6 | USD | 1st | `Monthly Subscription: Google One` | |
| Paramount+ | `857417d8-a222-4190-9ad9-551f742d2045` | ~$13 | USD | ~8th | `Monthly Subscription: Paramount+` | |
| T-Mobile | `b40e3647-05db-4c76-886e-efc598ebb7bd` | ~$73 | USD | ~29th | `Monthly: Phone Bill` | |
| Netflix | `6f71ab35-32fa-4001-b628-255133fdbebc` | ~$25 | USD | ~12th | `Monthly Subscription: Netflix` | |
| Ring | `783f2a04-0442-41e4-a097-f8b7763c8611` | ~$11 | USD | ~13th | `Monthly Subscription: Ring` | |
| Landlord | `2640141c-85e5-4a3b-abcf-835dff8bb347` | ~฿35,000 | THB | 1st-5th | `Monthly: Rent` | |
| Bliss Clean Care | `2056927d-a36a-4328-b878-e59f3d3ff8fd` | ~฿2,958 | THB | ~6th | `Monthly: Cleaning Service` | |
| Notion | `6608603e-4b5c-4a74-b865-36cba1f726e0` | ~$14 | USD | ~26th | `Monthly Subscription: Notion` | |
| Xfinity | `d6d6b230-a268-4ffa-88b8-e8098f86b06c` | ~$68 | USD | ~19th | `Monthly: Internet` | Florida House |
| FPL | `78e3a8cd-2f7d-4c85-8036-8101d1efbe17` | ~$57 | USD | ~17th | `Monthly: Electric` | Florida House |
| TECO | `299ac3fe-dd9c-4271-8ea9-1c7e58c906be` | ~$45 | USD | ~13th | `Monthly: Electric` | Florida House |
| Englewood Water | `1557b854-242a-4d15-9705-9b0d758f152c` | ~$58 | USD | ~9th | `Monthly: Water` | Florida House |

**Notes:**
- BLISS amount varies slightly based on weeks in month and if supplies were purchased
- Florida House utilities (Xfinity, FPL, TECO, Englewood Water) should all have "Florida House" tag

### Weekly & Bi-Weekly Patterns

| Vendor | Vendor ID | Amount | Currency | Frequency | Day | Description |
|--------|-----------|--------|----------|-----------|-----|-------------|
| Chef Fuji | `8f42f382-dd9a-49c8-8984-eea40169ec20` | ~฿1,093 | THB | Weekly | Saturday | `Meal Plan` |
| Virgin Active | `49641ab2-072e-464e-b377-82f199a5d397` | ~$28 | USD | Bi-weekly | Thursday | `Semi-Monthly: Gym Membership` |

### Annual & Periodic Subscriptions

| Vendor | Vendor ID | Amount | Currency | Month | Description |
|--------|-----------|--------|----------|-------|-------------|
| Grammarly | `39bba7a7-95f0-47e9-9b0c-3ba4ac0a74d4` | ~$153 | USD | June | `Annual Subscription: Grammarly` |
| MyTello | *(create when encountered)* | ~$52 | USD | March | `Annual Subscription: MyTello` |
| All U Need Pest Control | `8f687f7f-d1c0-4a55-b165-18656a5d9a0c` | ~$110 | USD | Quarterly | `Quarterly: Pest Control` |
| GoDaddy | `45466bb6-8691-4e9b-a908-7ed965d9a741` | ~$61 | USD | September | `Annual: Domain Renewal` |
| JetBrains | `ecce979c-a9d8-44ef-8188-e74cd2918db2` | varies | USD | Yearly | `Annual Subscription: WebStorm` |

### Income Patterns

| Vendor | Vendor ID | Amount | Currency | Frequency | Day | Description | Payment Method |
|--------|-----------|--------|----------|-----------|-----|-------------|----------------|
| DigiCo | `3b65e56e-9898-44a8-851f-77990b87e80d` | ~฿176,273 | THB | Monthly | 30th | `Monthly Salary` | Kasikorn Bank |
| DSIL Design | `03781fe6-c4d0-47f3-b41f-e8b372ec14c2` | ~$3,373 | USD | Irregular | - | `Invoice Payment` | |
| Nidnoi | `504c68c7-9a78-4e84-aa35-255918fdc5bb` | varies | THB | Frequent | - | `Reimbursement` | |
| NJDA | `d4768e71-3040-4968-9c52-ae2647cf5e54` | ~$216 | USD | Irregular | - | *(ask user)* | |

**Notes:**
- DigiCo may also appear as "Tungsten Automation" - same employer
- Nidnoi reimbursements are girlfriend paying back shared expenses (highly variable amounts)

### Inactive/Historical Patterns (for reference)

These patterns are no longer active but may help identify old transactions:

| Vendor | Amount | Currency | Frequency | Status | Notes |
|--------|--------|----------|-----------|--------|-------|
| Pol | ~฿23,542 | THB | Monthly | Ended Dec 2024 | Previous condo rent |
| TTCM | ~$14 | USD | Weekly (Tue) | Ended | Weekly massage, vendor changed |
| e2open | ~$3,080 | USD | Bi-weekly | Ended Oct 2024 | Previous employer payroll |
| Rover | ~$3,801 | USD | Bi-weekly | Ended May 2025 | Previous employer payroll |
| CBS | ~$13 | USD | Monthly | Renamed | Now Paramount+ |
| Skype | ~$52 | USD | Annual | Renamed | Now MyTello |

---

## Description Patterns

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
- Email receipts from `KPLUS@kasikornbank.com`
- Contains: Date, Recipient name, Amount in THB, Transaction number
- Bilingual format (Thai + English) - use English section for parsing

### Bangkok Bank (Bualuang) Transfers
- Email receipts from `BualuangmBanking@bangkokbank.com`
- Contains: Date, Recipient name, Amount in THB, Reference number
- Base64-encoded HTML, bilingual format
- Skip self-transfers (to own accounts)

### Grab/Lazada Receipts
- Email PDFs showing THB amounts
- Cross-reference with USD credit card charges using ~34 THB/USD rate

### Grab Email Receipt Patterns

Grab sends different email formats for each service type. Use these patterns to identify the service:

| Email Subject | Body Indicator | Service Type | Vendor |
|---------------|----------------|--------------|--------|
| `Your Grab E-Receipt` | Contains "GrabFood" | Food delivery | GrabFood |
| `Your Grab E-Receipt` | Contains "GrabMart" | Shopping/groceries | GrabMart |
| `Your Grab E-Receipt` | Contains "Hope you enjoyed your ride!" | Taxi/ride | Grab Taxi |
| `Your GrabExpress Receipt` | Vehicle type: GrabExpress/GrabAssistant | Delivery service | GrabExpress |

#### GrabFood Description Format
**Pattern**: `[Food Type]: [Restaurant Name]`

Food type is inferred from BOTH time of day AND restaurant type:

| Restaurant Type | Food Type | Examples |
|-----------------|-----------|----------|
| Ice cream, dessert shops | Dessert | Dairy Queen, Swensen's |
| Cafés, coffee shops | Coffee | Starbucks, Ristr8to |
| Light fare, snack shops | Snack | 7-Eleven, convenience stores |
| Regular restaurants | Time-based | See below |

**Time-based food types (for regular restaurants):**
- Morning (before 11am): Breakfast
- Midday (11am-3pm): Lunch
- Evening (after 5pm): Dinner

**Example**: Dairy Queen at 8:40 PM → "Dessert: Dairy Queen" (restaurant type overrides time)

#### GrabMart Description Format
**Pattern**: `Groceries - [Store Name]`

**Example**: Order from 7-Eleven → "Groceries - 7-Eleven"

#### GrabTaxi Description Format
**Pattern**: `Taxi to [Destination]`

Common destinations: Home, Hotel, Bar, Airport, Mall

**Example**: Ride to a hotel → "Taxi to Hotel"

#### GrabExpress/GrabAssistant Description Format
**Pattern**: `Delivery: [Purpose]`

Purpose may be unclear from receipt - ask user or leave blank if unknown.

**Example**: Package delivery → "Delivery: Package pickup"

#### Key Email Fields to Extract
- **Date**: From email header (Date field in +0700 timezone)
- **Amount (THB)**: From receipt body (for cross-referencing with USD charge)
- **Order/Booking ID**: For notes/reference (format: A-XXXXXXXXXXXX)
- **Restaurant/Store Name**: For GrabFood/GrabMart descriptions

### K PLUS Email Receipt Patterns

K PLUS (Kasikorn Bank) sends email confirmations for transfers and payments. All emails:
- Come from `KPLUS@kasikornbank.com`
- Are bilingual (Thai section first, then English)
- Use +0700 timezone
- Include transaction reference numbers

#### Email Type Identification

| Subject Line | Transfer Type | Recipient Field |
|--------------|---------------|-----------------|
| `Result of Bill Payment (Success)` | Bill payment to merchant/company | Company Name |
| `Result of Funds Transfer (Success)` | Bank-to-bank transfer | Account Name |
| `Result of PromptPay Funds Transfer (Success)` | PromptPay transfer | Received Name |

#### Key Fields to Extract (from English section)

**Bill Payment:**
```
Transaction Date: DD/MM/YYYY  HH:MM:SS
Transaction Number: XXXXXXXXXXXXXXXXXXXXXX
Company Name: [Recipient - use for vendor lookup]
Amount (THB): X,XXX.XX
```

**Funds Transfer:**
```
Transaction Date: DD/MM/YYYY  HH:MM:SS
Transaction Number: XXXXXXXXXXXXXXXXXXXXXX
To Bank: [Bank name]
To Account: XXX-X-XXXXX-X
Account Name: [Recipient - use for vendor lookup]
Amount (THB): X,XXX.XX
```

**PromptPay Transfer:**
```
Transaction Date: DD/MM/YYYY  HH:MM:SS
Transaction Number: XXXXXXXXXXXXXXXXXXXXXX
To PromptPay ID: XXX-XXX-XXXX
Received Name: [Recipient - use for vendor lookup]
Amount (THB): X,XXX.XX
```

#### Parsing Notes
- Date format is `DD/MM/YYYY` (not US format) - convert to `YYYY-MM-DD`
- Recipient names may appear in UPPERCASE, Title Case, or Thai script
- Look up recipient in K PLUS Address Book for vendor mapping
- All K PLUS transactions use payment method: Kasikorn Bank (K PLUS)
- Currency is always THB

### Bolt Email Receipt Patterns

Bolt sends HTML ride receipts after each trip. Like Grab, these show THB amounts but are charged to Chase in USD.

#### Email Identification

| Field | Pattern |
|-------|---------|
| Subject | `Your Bolt ride on [Day of Week]` (e.g., "Your Bolt ride on Saturday") |
| From | `Bolt Thailand <bangkok@bolt.eu>` (via Apple Private Relay) |
| Content-Type | HTML (text/html) |

#### Key Fields to Extract

The email body contains (in quoted-printable HTML):

| Field | Location/Format |
|-------|-----------------|
| **Total Amount** | `฿XXX.XX` (Thai Baht symbol encoded as `=E0=B8=BF`) |
| **Ride Date** | In header, e.g., "Saturday, 29 November 2025" |
| **Pickup Location** | After "Pickup:" label, includes address + time (HH:MM) |
| **Dropoff Location** | After "Dropoff:" label, includes address + time (HH:MM) |

#### Description Format
**Pattern**: `Taxi to [Destination]`

Destination is derived from the dropoff location. Use simplified/recognizable names:

| Dropoff Contains | Description |
|------------------|-------------|
| "Golf" | `Taxi to Golf` |
| "Airport" | `Taxi to Airport` |
| "Central" / "Mall" | `Taxi to Mall` |
| Home address | `Taxi to Home` |
| Hotel name | `Taxi to Hotel` |

#### Parsing Notes
- Date in email header is UTC - the ride date in the body is local Thailand time
- Amount in THB needs to be matched to USD credit card charge
- Cross-reference using ~34 THB/USD rate (same as Grab)
- Payment method: Chase Sapphire Reserve (USD)
- Vendor: Bolt

### Bangkok Bank (Bualuang mBanking) Email Receipt Patterns

Bangkok Bank sends email confirmations for transfers and payments via Bualuang mBanking app. All emails:
- Come from `BualuangmBanking@bangkokbank.com`
- Are bilingual (Thai subject line / English in body)
- Are base64-encoded HTML
- Use +0700 timezone
- Include transaction reference numbers

#### Email Type Identification

| Subject Line (Thai / English) | Transfer Type | Skip? |
|-------------------------------|---------------|-------|
| `ยืนยันการชำระเงิน / Payments confirmation` | Bill payment to merchant/company | No |
| `ยืนยันรายการโอนเงินไปยังหมายเลขโทรศัพท์มือถือโดยพร้อมเพย์ / Confirmation of funds transfer to Mobile Phone Number by PromptPay` | PromptPay to mobile number | No |
| `ยืนยันการโอนเงิน / Funds transfer confirmation` | Bank-to-bank transfer | Check* |
| `ยืนยันการเติมเงินพร้อมเพย์ / PromptPay Top Up Confirmation` | Top-up (e.g., to e-wallet) | Check* |

*Check: Skip if transfer is to own account/wallet (personal fund movement)

#### Key Fields to Extract (from decoded HTML body)

**Payments (Bill Payment):**
```
Date and Time: DD/MM/YYYY HH:MM:SS
Company/Merchant: [Recipient - use for vendor lookup]
Amount: X,XXX.XX Baht
Reference No.: XXXXXXXXXXXXXXXXXXXXXXXXX
```

**PromptPay to Mobile:**
```
Date and Time: DD/MM/YYYY HH:MM:SS
Beneficiary Name: [Recipient - use for vendor lookup]
Amount: X,XXX.XX Baht
Reference No.: XXXXXXXXXXXXXXXXXXXXXXXXX
```

**Funds Transfer:**
```
Date and Time: DD/MM/YYYY HH:MM:SS
To Account Name: [Recipient - check if self or other]
To Account Number: XXX-X-XXXXX-X
To Bank: [Bank name]
Amount: X,XXX.XX Baht
Reference No.: XXXXXXXXXXXXXXXXXXXXXXXXX
```

#### Parsing Notes
- Date format is `DD/MM/YYYY` (not US format) - convert to `YYYY-MM-DD`
- HTML content is base64-encoded - decode before parsing
- Look up recipient in Bangkok Bank Address Book for vendor mapping
- All Bangkok Bank transactions use payment method: Bangkok Bank (Bualuang)
- Currency is always THB
- Skip self-transfers (to own accounts or own wallets)

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
