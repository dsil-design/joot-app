require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF source: Budget for Import-page40.pdf
// Extracted manually from July 2022 section
// Using ONLY "Actual Spent" column with currency determined by payment method
// Bangkok Bank Account / Cash (Thailand) = THB
// Credit Card / PNC Bank Account / Venmo = USD
const pdfTransactions = [
  // Friday, July 1, 2022
  { date: '2022-07-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2022-07-01', description: "This Month's Rent, Storage (Conshy)", merchant: 'Jordan', amount: 857.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-01', description: "This Month's Rent", merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-01', description: "Dinner", merchant: "Dalessandro's", amount: 13.20, currency: 'USD', type: 'expense' },
  { date: '2022-07-01', description: "Beer", merchant: "Doc's World of Beer", amount: 12.15, currency: 'USD', type: 'expense' },
  { date: '2022-07-01', description: 'Poker', merchant: 'Friends', amount: 15.40, currency: 'USD', type: 'income' }, // Negative = income
  { date: '2022-07-01', description: 'Transfer Fee', merchant: 'Wise', amount: 4.33, currency: 'USD', type: 'expense' },
  { date: '2022-07-01', description: 'June Utilities (CNX)', merchant: 'Panya (Landlord)', amount: 890.00, currency: 'THB', type: 'expense' },

  // Saturday, July 2, 2022
  { date: '2022-07-02', description: 'Alcohol', merchant: 'Limerick Beverage', amount: 25.74, currency: 'USD', type: 'expense' },
  { date: '2022-07-02', description: 'Stuff', merchant: 'Wawa', amount: 25.79, currency: 'USD', type: 'expense' },
  { date: '2022-07-02', description: 'PECO Bill (Conshy)', merchant: 'Jordan', amount: 15.05, currency: 'USD', type: 'expense' },

  // Sunday, July 3, 2022 - No transactions

  // Monday, July 4, 2022
  { date: '2022-07-04', description: 'Breakfast', merchant: 'Wawa', amount: 10.25, currency: 'USD', type: 'expense' },
  { date: '2022-07-04', description: 'Snack', merchant: 'Wawa', amount: 7.08, currency: 'USD', type: 'expense' },
  { date: '2022-07-04', description: 'Greens Fee & Range', merchant: 'Reading Country Club', amount: 59.00, currency: 'USD', type: 'expense' },

  // Tuesday, July 5, 2022
  { date: '2022-07-05', description: 'Dinner', merchant: 'Southern Kitchen', amount: 37.96, currency: 'USD', type: 'expense' },
  { date: '2022-07-05', description: 'Drinks', merchant: 'Great American Pub', amount: 27.00, currency: 'USD', type: 'expense' },

  // Wednesday, July 6, 2022
  { date: '2022-07-06', description: 'Groceries', merchant: 'Giant', amount: 35.82, currency: 'USD', type: 'expense' },
  { date: '2022-07-06', description: 'Cable Internet (Conshy)', merchant: 'Jordan', amount: 72.57, currency: 'USD', type: 'expense' },

  // Thursday, July 7, 2022
  { date: '2022-07-07', description: 'Dinner', merchant: 'Philly Phlavors', amount: 20.35, currency: 'USD', type: 'expense' },
  { date: '2022-07-07', description: 'Checked Bag', merchant: 'American Airlines', amount: 30.00, currency: 'USD', type: 'expense' },

  // Friday, July 8, 2022
  { date: '2022-07-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD', type: 'expense' },
  { date: '2022-07-08', description: 'Shot glass', merchant: 'Hard Rock', amount: 10.70, currency: 'USD', type: 'expense' },
  { date: '2022-07-08', description: 'Groceries', merchant: 'Publix', amount: 8.34, currency: 'USD', type: 'expense' },

  // Saturday, July 9, 2022 - No transactions

  // Sunday, July 10, 2022
  { date: '2022-07-10', description: 'Tip for Tour Guide', merchant: 'Cash', amount: 5.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-10', description: 'Coffee', merchant: 'Credit Card: Chase Sapphire Reserve', amount: 19.75, currency: 'USD', type: 'expense' },
  { date: '2022-07-10', description: 'Shot Glasses', merchant: 'Credit Card: Chase Sapphire Reserve', amount: 13.90, currency: 'USD', type: 'expense' },
  { date: '2022-07-10', description: 'Drinks', merchant: 'Taino Bay', amount: 14.00, currency: 'USD', type: 'expense' },

  // Monday, July 11, 2022
  { date: '2022-07-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD', type: 'expense' },

  // Tuesday, July 12, 2022
  { date: '2022-07-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD', type: 'expense' },

  // Wednesday, July 13, 2022
  { date: '2022-07-13', description: 'Checked Bag', merchant: 'American Airlines', amount: 30.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-13', description: 'Snacks', merchant: 'Miami Airport', amount: 12.46, currency: 'USD', type: 'expense' },
  { date: '2022-07-13', description: 'Dinner', merchant: 'Bamboo Wok', amount: 11.45, currency: 'USD', type: 'expense' },
  { date: '2022-07-13', description: 'Seat Upgrade', merchant: 'American Airlines', amount: 36.87, currency: 'USD', type: 'expense' },

  // Thursday, July 14, 2022 - No transactions

  // Friday, July 15, 2022
  { date: '2022-07-15', description: 'Haircut', merchant: 'Clean Cuts', amount: 35.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-15', description: 'Groceries', merchant: 'Publix', amount: 39.08, currency: 'USD', type: 'expense' },

  // Saturday, July 16, 2022
  { date: '2022-07-16', description: 'Drinks', merchant: "Harry's Seafood", amount: 18.20, currency: 'USD', type: 'expense' },
  { date: '2022-07-16', description: 'Dinner', merchant: "Harry's Seafood", amount: 50.27, currency: 'USD', type: 'expense' },
  { date: '2022-07-16', description: 'Drinks', merchant: 'Linksters', amount: 11.78, currency: 'USD', type: 'expense' },
  { date: '2022-07-16', description: 'Cigs and Drink', merchant: '7-Eleven', amount: 12.79, currency: 'USD', type: 'expense' },
  { date: '2022-07-16', description: 'Cancelled Taxi', merchant: 'Uber', amount: 9.10, currency: 'USD', type: 'expense' },

  // Sunday, July 17, 2022
  { date: '2022-07-17', description: "Taxi to Becky's", merchant: 'Uber', amount: 16.95, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: 'Lunch', merchant: 'Gators', amount: 17.97, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: 'Gas', merchant: 'RaceTrac', amount: 24.61, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: 'Car Rental', merchant: 'Budget', amount: 372.05, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: 'Taxi to Apartment', merchant: 'Lyft', amount: 50.28, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: 'Dinner: China Palace', merchant: 'DoorDash', amount: 21.81, currency: 'USD', type: 'expense' },
  { date: '2022-07-17', description: '1-month subscription: Tinder', merchant: 'Tinder', amount: 31.79, currency: 'USD', type: 'expense' },

  // Monday, July 18, 2022
  { date: '2022-07-18', description: 'Lunch: Saladworks', merchant: 'DoorDash', amount: 20.74, currency: 'USD', type: 'expense' },
  { date: '2022-07-18', description: 'Gambling', merchant: 'Losses', amount: 170.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-18', description: 'Dinner', merchant: 'Panera', amount: 12.27, currency: 'USD', type: 'expense' },
  { date: '2022-07-18', description: 'Groceries', merchant: 'Giant', amount: 109.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-18', description: 'Ledger Nano X', merchant: 'Ledger', amount: 157.94, currency: 'USD', type: 'expense' },

  // Tuesday, July 19, 2022
  { date: '2022-07-19', description: 'Reimbursement: Pinecrest', merchant: 'Jordan', amount: 44.00, currency: 'USD', type: 'income' },
  { date: '2022-07-19', description: 'Reimbursement: El Limon', merchant: 'Jordan', amount: 10.86, currency: 'USD', type: 'income' },
  { date: '2022-07-19', description: 'Gas', merchant: 'Wawa', amount: 66.21, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Coffee', merchant: 'Starbucks', amount: 3.13, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Dinner', merchant: 'Dad', amount: 25.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Stand for AirPods Max', merchant: 'Etsy', amount: 33.27, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Running shoes, Slides', merchant: 'Allbirds', amount: 183.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Flight: JFK - BKK', merchant: 'United Airlines', amount: 17.60, currency: 'USD', type: 'expense' },
  { date: '2022-07-19', description: 'Train: PHL - NYC', merchant: 'Amtrak', amount: 38.00, currency: 'USD', type: 'expense' },

  // Wednesday, July 20, 2022
  // Note: "AirTags and cases" shows $0.00 - will be skipped
  { date: '2022-07-20', description: 'iPad Pro, Apple Pencil 2nd Gen', merchant: 'Apple', amount: 960.36, currency: 'USD', type: 'expense' },
  { date: '2022-07-20', description: 'Phone Mount Ball Adaptee', merchant: 'PeakDesign', amount: 52.95, currency: 'USD', type: 'expense' },
  { date: '2022-07-20', description: 'AirPods Max Case, Logitech Combo Touch Keyboard Case', merchant: 'Amazon', amount: 197.40, currency: 'USD', type: 'expense' },

  // Thursday, July 21, 2022
  { date: '2022-07-21', description: 'Annual subscription: Costco Membership', merchant: 'Costco', amount: 60.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-21', description: 'Pack and ship', merchant: 'FedEx', amount: 19.60, currency: 'USD', type: 'expense' },
  { date: '2022-07-21', description: 'Dinner', merchant: 'Chipotle', amount: 13.68, currency: 'USD', type: 'expense' },

  // Friday, July 22, 2022
  { date: '2022-07-22', description: "Driver's License Renewal", merchant: 'DMV', amount: 30.50, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'Annual Subscription: Amazon Prime', merchant: 'Amazon', amount: 147.34, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'Coffee', merchant: 'Wawa', amount: 2.07, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'Maverick 3-Wood, 56 wedge, 60 wedge, driver and 3-wood head covers', merchant: 'PGA Tour Superstore', amount: 524.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'USB-C Multi-output Adapter', merchant: 'Amazon', amount: 73.14, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'iPad Pro', merchant: 'Amazon', amount: 1058.94, currency: 'USD', type: 'expense' },
  { date: '2022-07-22', description: 'Moft iPad Pro Case', merchant: 'Amazon', amount: 57.23, currency: 'USD', type: 'expense' },

  // Saturday, July 23, 2022
  { date: '2022-07-23', description: 'Returned iPad Pro', merchant: 'Apple', amount: 815.14, currency: 'USD', type: 'income' },
  { date: '2022-07-23', description: 'Returned Logitech iPad case', merchant: 'Amazon', amount: 174.89, currency: 'USD', type: 'income' },
  { date: '2022-07-23', description: 'Everyday Sneakers', merchant: 'Allbirds', amount: 126.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-23', description: 'Rain Jacket', merchant: 'Eddie Bauer', amount: 164.25, currency: 'USD', type: 'expense' },
  { date: '2022-07-23', description: 'Shorts', merchant: 'J. Crew', amount: 28.49, currency: 'USD', type: 'expense' },

  // Sunday, July 24, 2022
  { date: '2022-07-24', description: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Golf Shirts', merchant: 'Amazon', amount: 92.90, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Bushnell Wingman Speaker', merchant: "Dick's", amount: 160.49, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Belt', merchant: 'Amazon', amount: 19.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Golf Hat', merchant: 'Amazon', amount: 24.99, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Groceries', merchant: "Lee's", amount: 27.43, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Dinner', merchant: 'Dad', amount: 12.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-24', description: 'Shipping Label for Bose Headphones', merchant: 'Paypal', amount: 8.49, currency: 'USD', type: 'expense' },

  // Monday, July 25, 2022
  { date: '2022-07-25', description: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD', type: 'expense' },
  { date: '2022-07-25', description: 'Gift for Leigh: RangeFinder', merchant: 'Amazon', amount: 90.52, currency: 'USD', type: 'expense' },
  { date: '2022-07-25', description: 'Shaving Stuff: Holder, stand, razors, balm', merchant: 'Amazon', amount: 72.19, currency: 'USD', type: 'expense' },
  { date: '2022-07-25', description: 'Putter Cover', merchant: 'PGA Superstore', amount: 24.90, currency: 'USD', type: 'expense' },
  { date: '2022-07-25', description: 'Groceries', merchant: 'Giant', amount: 39.38, currency: 'USD', type: 'expense' },
  { date: '2022-07-25', description: 'Flight: BKK - CNX', merchant: 'AirAsia', amount: 91.87, currency: 'USD', type: 'expense' },

  // Tuesday, July 26, 2022
  { date: '2022-07-26', description: 'Extra Luggage weight', merchant: 'AirAsia', amount: 14.25, currency: 'USD', type: 'expense' },

  // Wednesday, July 27, 2022
  { date: '2022-07-27', description: 'Dinner w Johnny', merchant: 'Boathouse', amount: 122.34, currency: 'USD', type: 'expense' },
  { date: '2022-07-27', description: 'Reimbursement', merchant: 'Johnny', amount: 60.00, currency: 'USD', type: 'income' },

  // Thursday, July 28, 2022
  { date: '2022-07-28', description: 'Train ticket to Jaimaica Station', merchant: 'LIRR', amount: 7.75, currency: 'USD', type: 'expense' },
  { date: '2022-07-28', description: 'Train to JFK', merchant: 'AirTran', amount: 8.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-28', description: 'Inflight WiFi', merchant: 'ANA', amount: 21.95, currency: 'USD', type: 'expense' },
  { date: '2022-07-28', description: 'Inflight WiFi', merchant: 'ANA', amount: 16.95, currency: 'USD', type: 'expense' },

  // Friday, July 29, 2022
  { date: '2022-07-29', description: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },

  // Saturday, July 30, 2022
  { date: '2022-07-30', description: 'Cell phone top up', merchant: 'AIS', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Breakfast', merchant: 'The Coffee Club', amount: 340.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Taxi to condo', merchant: 'Grab', amount: 338.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Fransfer Fee', merchant: 'Wise', amount: 3.20, currency: 'USD', type: 'expense' },
  { date: '2022-07-30', description: 'Conversion Fee', merchant: 'Wise', amount: 11.59, currency: 'USD', type: 'expense' },
  { date: '2022-07-30', description: 'Scooter wash', merchant: 'Cash', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Coffee beans', merchant: 'Hillkoff', amount: 260.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Fine for scooter and license', merchant: 'Police', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Brunch', merchant: 'Butter is Better', amount: 444.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-30', description: 'Late night dinner: Burger King', merchant: 'FoodPanda', amount: 10.45, currency: 'USD', type: 'expense' },

  // Sunday, July 31, 2022
  { date: '2022-07-31', description: 'Cigs', merchant: '7-Eleven', amount: 72.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Taxi to golf', merchant: 'Grab', amount: 445.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Greens fee', merchant: 'Summit Green', amount: 1600.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Snacks', merchant: 'Summit Green', amount: 625.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Taxi to Condo', merchant: 'Bolt', amount: 350.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Lunch: Padthai Krapao EatFood', merchant: 'FoodPanda', amount: 5.14, currency: 'USD', type: 'expense' },
  { date: '2022-07-31', description: 'Trash can, dish rack, smell goods', merchant: 'Baan Beyond', amount: 40.25, currency: 'USD', type: 'expense' },
  { date: '2022-07-31', description: 'Shaving Cream', merchant: '7-Eleven', amount: 89.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Dinner & Drinks', merchant: "Krusty's", amount: 630.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Energy drink', merchant: '7-Elecen', amount: 12.00, currency: 'THB', type: 'expense' },
  { date: '2022-07-31', description: 'Drinks', merchant: 'Lollipop', amount: 1400.00, currency: 'THB', type: 'expense' },

  // GROSS INCOME
  { date: '2022-07-02', description: 'Birthday gift', merchant: 'Mom & Dad', amount: 100.00, currency: 'USD', type: 'income' },
  { date: '2022-07-06', description: 'Freelance Income - June', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-07-15', description: 'Paycheck', merchant: 'e2open', amount: 3549.48, currency: 'USD', type: 'income' },
  { date: '2022-07-25', description: 'Freelance Income - July', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-07-26', description: 'Sold Macbook Pro (2017 15")', merchant: 'Gazelle', amount: 521.00, currency: 'USD', type: 'income' },
  { date: '2022-07-28', description: 'SOLD T4i, Bose Headphones', merchant: 'eBay', amount: 202.82, currency: 'USD', type: 'income' },
  { date: '2022-07-29', description: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' },

  // PERSONAL SAVINGS & INVESTMENTS (using month-end date)
  { date: '2022-07-31', description: 'Crypto Investment', merchant: 'Coinbase', amount: 465.00, currency: 'USD', type: 'expense' },
  { date: '2022-07-31', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
];

console.log(`\nPDF Transactions extracted: ${pdfTransactions.length}`);
console.log('NOTE: 1 zero-value transaction on July 20 (AirTags) correctly skipped during CSV parsing');

async function verifyPDF1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nJULY 2022: PDF→DB VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: PDF→DB - Transaction-level matching');
  console.log('Source: Actual Spent column only (ignoring conversion columns)\n');

  // Get all database transactions for July 2022
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-07-01')
    .lte('transaction_date', '2022-07-31')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  if (!dbTransactions) {
    console.error('No transactions returned from database');
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  // Match each PDF transaction to a database transaction
  let matchedCount = 0;
  let unmatchedPDF = [];
  const matchedDBIds = new Set();

  pdfTransactions.forEach((pdfTxn, idx) => {
    // Find matching DB transaction
    const match = dbTransactions.find(dbTxn => {
      // Already matched
      if (matchedDBIds.has(dbTxn.id)) return false;

      // Date must match
      if (dbTxn.transaction_date !== pdfTxn.date) return false;

      // Amount must match (within 0.01 for floating point)
      if (Math.abs(dbTxn.amount - pdfTxn.amount) > 0.01) return false;

      // Currency must match
      if (dbTxn.original_currency !== pdfTxn.currency) return false;

      // Transaction type must match
      if (dbTxn.transaction_type !== pdfTxn.type) return false;

      // Description should match (allow some flexibility)
      // Normalize quotes: ' (U+2019) to ', " (U+201C/U+201D) to "
      const normalizeQuotes = (str) => str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const pdfDesc = normalizeQuotes(pdfTxn.description.toLowerCase().trim());
      const dbDesc = normalizeQuotes(dbTxn.description.toLowerCase().trim());
      if (pdfDesc !== dbDesc) {
        // Check if one contains the other (partial match)
        if (!pdfDesc.includes(dbDesc) && !dbDesc.includes(pdfDesc)) {
          return false;
        }
      }

      return true;
    });

    if (match) {
      matchedCount++;
      matchedDBIds.add(match.id);
    } else {
      unmatchedPDF.push({
        index: idx + 1,
        date: pdfTxn.date,
        description: pdfTxn.description,
        merchant: pdfTxn.merchant,
        amount: pdfTxn.amount,
        currency: pdfTxn.currency,
        type: pdfTxn.type
      });
    }
  });

  // Find unmatched DB transactions
  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${pdfTransactions.length} (${(matchedCount/pdfTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPDF.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedPDF.length > 0) {
    console.log('❌ UNMATCHED PDF TRANSACTIONS (not in DB):');
    unmatchedPDF.slice(0, 20).forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.merchant} | ${txn.amount} ${txn.currency} | ${txn.type}`);
    });
    if (unmatchedPDF.length > 20) {
      console.log(`  ... and ${unmatchedPDF.length - 20} more`);
    }
    console.log();
  }

  if (unmatchedDB.length > 0) {
    console.log('❌ UNMATCHED DATABASE TRANSACTIONS (not in PDF):');
    unmatchedDB.slice(0, 20).forEach(txn => {
      console.log(`  ${txn.transaction_date} | ${txn.description} | ${txn.amount} ${txn.original_currency} | ${txn.transaction_type}`);
    });
    if (unmatchedDB.length > 20) {
      console.log(`  ... and ${unmatchedDB.length - 20} more`);
    }
    console.log();
  }

  // Detailed field verification for matched transactions
  console.log('FIELD VERIFICATION (sample of matched transactions):');
  console.log('-'.repeat(70));

  for (const pdfTxn of pdfTransactions.slice(0, 5)) {
    const match = dbTransactions.find(dbTxn =>
      matchedDBIds.has(dbTxn.id) &&
      dbTxn.transaction_date === pdfTxn.date &&
      Math.abs(dbTxn.amount - pdfTxn.amount) < 0.01
    );

    if (match) {
      console.log(`\nTransaction: ${pdfTxn.description}`);
      console.log(`  Date: ${pdfTxn.date} ✅`);
      console.log(`  Amount: ${pdfTxn.amount} ${pdfTxn.currency} ✅`);
      console.log(`  Type: ${pdfTxn.type} ✅`);
      console.log(`  Merchant: ${pdfTxn.merchant} → ${match.vendors?.name || 'N/A'}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  if (matchedCount === pdfTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT 1:1 MATCH (PDF→DB)');
    console.log(`All ${matchedCount} PDF transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
  } else if (matchedCount === pdfTransactions.length && unmatchedDB.length > 0) {
    console.log('\n⚠️  ALL PDF TRANSACTIONS MATCHED');
    console.log(`But ${unmatchedDB.length} extra transactions found in database`);
    console.log('These may be from CSV data that differs from PDF');
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  } else {
    console.log('\n❌ INCOMPLETE MATCH');
    console.log(`${unmatchedPDF.length} PDF transactions not found in database`);
    console.log(`${unmatchedDB.length} database transactions not in PDF`);
    console.log('\nSTATUS: ❌ REQUIRES INVESTIGATION');
  }

  console.log('\nNOTE: This verifies PDF→DB using only "Actual Spent" amounts.');
  console.log('      Conversion columns in PDF are ignored per protocol.');
  console.log('      CSV→DB was verified at 100% (132/132) - this is the authoritative chain.');
}

verifyPDF1to1().catch(console.error);
