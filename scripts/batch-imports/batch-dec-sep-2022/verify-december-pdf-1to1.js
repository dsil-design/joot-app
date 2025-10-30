require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// December 2022 PDF Transactions (manually extracted from page 35)
// Expense Tracker transactions
const pdfExpenseTransactions = [
  // Dec 1
  { date: '2022-12-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
  { date: '2022-12-01', desc: 'This Month\'s Rent, Storage, Internet, PECO (Conshy)', merchant: 'Jordan', amount: 887.00, currency: 'USD' },
  { date: '2022-12-01', desc: 'This Month\'s Rent', merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 138.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Gym', merchant: 'O2 Gym', amount: 60.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Lunch: Alchemy Vegan', merchant: 'Foodpanda', amount: 215.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Haircut', merchant: 'The Cutler', amount: 550.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Dinner', merchant: 'Galare Thong', amount: 170.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Drinks', merchant: 'Home Bar', amount: 355.00, currency: 'THB' },
  { date: '2022-12-01', desc: 'Drinks', merchant: 'Lollipop', amount: 1700.00, currency: 'THB' },
  // Dec 2
  { date: '2022-12-02', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 138.00, currency: 'THB' },
  { date: '2022-12-02', desc: 'Dinner: Salad Farm', merchant: 'Foodpanda', amount: 306.00, currency: 'THB' },
  // Dec 3
  { date: '2022-12-03', desc: 'Breakfast', merchant: 'Highlands', amount: 359.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Greens Fee', merchant: 'Highlands', amount: 1700.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Caddy tip', merchant: 'Highlands', amount: 400.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Drinks', merchant: 'Highlands', amount: 580.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Lunch and Drinks', merchant: 'Highlands', amount: 573.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Dinner', merchant: 'Pucinella da Stefano', amount: 640.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Drinks', merchant: 'Small World', amount: 1600.00, currency: 'THB' },
  { date: '2022-12-03', desc: 'Drinks', merchant: 'Lollipop', amount: 4000.00, currency: 'THB' },
  // Dec 4
  { date: '2022-12-04', desc: 'Dinner', merchant: 'Happy Munich', amount: 1294.00, currency: 'THB' },
  { date: '2022-12-04', desc: 'Drinks', merchant: 'Ae\'s Place', amount: 240.00, currency: 'THB' },
  { date: '2022-12-04', desc: 'Drinks', merchant: 'Lollipop', amount: 2000.00, currency: 'THB' },
  { date: '2022-12-04', desc: 'Snack: McDonald\'s', merchant: 'Foodpanda', amount: 371.00, currency: 'THB' },
  { date: '2022-12-04', desc: 'Pool Winnings', merchant: 'Cash', amount: -120.00, currency: 'THB', type: 'income' },
  { date: '2022-12-04', desc: 'Ride', merchant: 'Grab', amount: 2.37, currency: 'USD' },
  // Dec 5
  { date: '2022-12-05', desc: 'Coffee', merchant: 'Artisan Cafe', amount: 80.00, currency: 'THB' },
  { date: '2022-12-05', desc: 'ATM Fee', merchant: 'Bangkok Bank', amount: 220.00, currency: 'THB' },
  { date: '2022-12-05', desc: 'Monthly Cleaning Fee', merchant: 'Bliss', amount: 2568.00, currency: 'THB' },
  { date: '2022-12-05', desc: 'Coffee', merchant: 'Artisan Cafe', amount: 80.00, currency: 'THB' },
  { date: '2022-12-05', desc: 'Dinner: Dragonbox Tuk', merchant: 'Bangkok Bank Account', amount: 478.00, currency: 'THB' },
  { date: '2022-12-05', desc: 'ATM Fee', merchant: 'Bangkok Bank', amount: 220.00, currency: 'THB' },
  // Dec 6
  { date: '2022-12-06', desc: 'Gym', merchant: 'O2 Gym', amount: 60.00, currency: 'THB' },
  { date: '2022-12-06', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 212.10, currency: 'THB' },
  { date: '2022-12-06', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 600.00, currency: 'THB' },
  { date: '2022-12-06', desc: 'Electricity & Water', merchant: 'Galare Thong', amount: 2027.00, currency: 'THB' },
  { date: '2022-12-06', desc: 'Laundry', merchant: 'Galare Thong', amount: 231.00, currency: 'THB' },
  { date: '2022-12-06', desc: 'Drinks', merchant: 'Home Bar', amount: 500.00, currency: 'THB' },
  // Dec 7
  { date: '2022-12-07', desc: 'Oil Change', merchant: 'Piston Shop', amount: 650.00, currency: 'THB' },
  { date: '2022-12-07', desc: 'Vape', merchant: 'Zigarlab', amount: 320.00, currency: 'THB' },
  { date: '2022-12-07', desc: 'Delivery', merchant: 'Grab', amount: 50.00, currency: 'THB' },
  { date: '2022-12-07', desc: 'Lunch: Going Up Cafe', merchant: 'Grab', amount: 174.00, currency: 'THB' },
  { date: '2022-12-07', desc: 'Taxi to Condo', merchant: 'Grab', amount: 2.26, currency: 'USD' },
  { date: '2022-12-07', desc: 'Taxi to Piston', merchant: 'Grab', amount: 2.26, currency: 'USD' },
  { date: '2022-12-07', desc: 'Dinner', merchant: 'Sara', amount: 450.00, currency: 'THB' },
  // Dec 8
  { date: '2022-12-08', desc: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 6.35, currency: 'USD' },
  { date: '2022-12-08', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 174.00, currency: 'THB' },
  { date: '2022-12-08', desc: 'Gas', merchant: 'PT', amount: 160.00, currency: 'THB' },
  { date: '2022-12-08', desc: 'Haircut', merchant: 'The Cutler', amount: 550.00, currency: 'THB' },
  { date: '2022-12-08', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 279.00, currency: 'THB' },
  { date: '2022-12-08', desc: 'Drinks', merchant: 'Home Bar', amount: 230.00, currency: 'THB' },
  { date: '2022-12-08', desc: 'Drinks', merchant: 'Lollipop', amount: 2500.00, currency: 'THB' },
  // Dec 9
  { date: '2022-12-09', desc: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 5.33, currency: 'USD' },
  { date: '2022-12-09', desc: 'Taxi to Airport', merchant: 'Grab', amount: 8.58, currency: 'USD' },
  { date: '2022-12-09', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 10.13, currency: 'USD' },
  { date: '2022-12-09', desc: 'Vape', merchant: 'Street', amount: 350.00, currency: 'THB' },
  { date: '2022-12-09', desc: 'Dinner with Celia', merchant: 'Limoncella', amount: 1300.00, currency: 'THB' },
  { date: '2022-12-09', desc: 'Train Tickets', merchant: 'BTS', amount: 52.00, currency: 'THB' },
  { date: '2022-12-09', desc: 'Drinks', merchant: 'Red Sky Bar', amount: 788.00, currency: 'THB' },
  { date: '2022-12-09', desc: 'Cruise Insurance', merchant: 'NCL', amount: 70.00, currency: 'USD' },
  { date: '2022-12-09', desc: 'Subscription: Tinder', merchant: 'Apple', amount: 26.49, currency: 'USD' },
  // Dec 10
  { date: '2022-12-10', desc: 'Greens Fee', merchant: 'Krung Kavee', amount: 2150.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Drinks', merchant: 'Krung Kavee', amount: 1380.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Caddy tip', merchant: 'Krung Kavee', amount: 400.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Taxi', merchant: 'Taxi', amount: 2300.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Kitty', merchant: 'Bangkok Scramblers', amount: 500.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Dinner', merchant: 'Fitzgeralds', amount: 690.00, currency: 'THB' },
  { date: '2022-12-10', desc: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD' },
  { date: '2022-12-10', desc: 'Transfer Fee', merchant: 'Wise', amount: 4.38, currency: 'USD' },
  { date: '2022-12-10', desc: 'Transfer Fee', merchant: 'Wise', amount: 31.70, currency: 'THB' },
  // Dec 11
  { date: '2022-12-11', desc: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD' },
  { date: '2022-12-11', desc: 'Train Ticket', merchant: 'BTS', amount: 26.00, currency: 'THB' },
  { date: '2022-12-11', desc: 'Train Ticket', merchant: 'BTS', amount: 23.00, currency: 'THB' },
  { date: '2022-12-11', desc: 'Medicine', merchant: 'Pharmacy', amount: 220.00, currency: 'THB' },
  { date: '2022-12-11', desc: 'Lunch', merchant: 'Dawin Cafe', amount: 341.00, currency: 'THB' },
  { date: '2022-12-11', desc: 'Water', merchant: '7-Eleven', amount: 60.00, currency: 'THB' },
  { date: '2022-12-11', desc: 'Dinner', merchant: 'Vesuvius', amount: 480.00, currency: 'THB' },
  // Dec 12
  { date: '2022-12-12', desc: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD' },
  { date: '2022-12-12', desc: 'Train Ticket', merchant: 'BTS', amount: 23.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Breakfast', merchant: 'Breakfast Story', amount: 468.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Train Ticket', merchant: 'BTS', amount: 23.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Coffee', merchant: 'Citylight Cafe', amount: 200.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Drinks', merchant: 'Hillary', amount: 700.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Dinner', merchant: 'Hooters', amount: 562.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Drink', merchant: 'Bangkockney Pub', amount: 120.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Drink', merchant: 'Nana Plaza', amount: 150.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Drinks', merchant: 'Nana Plaza', amount: 292.53, currency: 'USD' },
  { date: '2022-12-12', desc: 'Weed', merchant: 'Street', amount: 100.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Water', merchant: '7-Eleven', amount: 74.00, currency: 'THB' },
  { date: '2022-12-12', desc: 'Friend', merchant: 'Bangkok Bank Account', amount: 3000.00, currency: 'THB' },
  // Dec 13
  { date: '2022-12-13', desc: 'Lunch', merchant: 'Dawin Cafe', amount: 385.00, currency: 'THB' },
  { date: '2022-12-13', desc: 'Flight Tickets', merchant: 'United', amount: 40.97, currency: 'USD' },
  { date: '2022-12-13', desc: 'Coffee', merchant: 'Citylight Cafe', amount: 200.00, currency: 'THB' },
  { date: '2022-12-13', desc: 'Cell Phone', merchant: 'AIS', amount: 12.31, currency: 'USD' },
  { date: '2022-12-13', desc: 'Dinner', merchant: 'Lennepur BigBull', amount: 470.00, currency: 'THB' },
  { date: '2022-12-13', desc: 'Taxi to Airport', merchant: 'Grab', amount: 16.31, currency: 'USD' },
  { date: '2022-12-13', desc: 'Semi-Annual: Auto Insurance', merchant: 'Travelers', amount: 143.00, currency: 'USD' },
  // Dec 15
  { date: '2022-12-15', desc: 'Groceries', merchant: 'Giant', amount: 176.29, currency: 'USD' },
  { date: '2022-12-15', desc: 'iPad Charging Cable', merchant: 'Amazon', amount: 13.77, currency: 'USD' },
  // Dec 16
  { date: '2022-12-16', desc: 'Gift for Dad: Airtags', merchant: 'Apple', amount: 104.94, currency: 'USD' },
  { date: '2022-12-16', desc: 'Gifts for Austin and Dad: Dash Cam, Airtag cases', merchant: 'Amazon', amount: 138.52, currency: 'USD' },
  { date: '2022-12-16', desc: 'Gift for Austin: Dash Cam SD Card', merchant: 'Amazon', amount: 31.79, currency: 'USD' },
  // Dec 17
  { date: '2022-12-17', desc: 'Gin', merchant: 'Fine Wine & Good Spirits', amount: 26.49, currency: 'USD' },
  { date: '2022-12-17', desc: 'Groceries', merchant: 'Giant', amount: 30.42, currency: 'USD' },
  { date: '2022-12-17', desc: 'Annual Subscription: Nintendo Online', merchant: 'Nintendo', amount: 33.70, currency: 'USD' },
  { date: '2022-12-17', desc: 'Upgrade: Nintendo Online', merchant: 'Nintendo', amount: 21.19, currency: 'USD' },
  { date: '2022-12-17', desc: 'Flights: PHL - BKK', merchant: 'United', amount: 1220.10, currency: 'USD' },
  { date: '2022-12-17', desc: 'Gift for Mom: Dock Charger', merchant: 'Amazon', amount: 31.47, currency: 'USD' },
  // Dec 18
  { date: '2022-12-18', desc: 'Poker Winnings', merchant: 'Friends', amount: -89.00, currency: 'USD', type: 'income' },
  { date: '2022-12-18', desc: 'Groceries', merchant: 'Giant', amount: 18.39, currency: 'USD' },
  // Dec 19
  { date: '2022-12-19', desc: 'Cheesesteaks', merchant: 'Ryan', amount: 14.32, currency: 'USD' },
  { date: '2022-12-19', desc: 'Pizza & Wings', merchant: 'Jordan', amount: 15.00, currency: 'USD' },
  // Dec 20
  { date: '2022-12-20', desc: 'Sun Screen, Kindle Case', merchant: 'Amazon', amount: 33.16, currency: 'USD' },
  { date: '2022-12-20', desc: 'Kindle Paperwhite', merchant: 'BestBuy', amount: 116.59, currency: 'USD' },
  { date: '2022-12-20', desc: 'Gas', merchant: 'Wawa', amount: 45.60, currency: 'USD' },
  // Dec 21
  { date: '2022-12-21', desc: 'Ad-free Kindle Version', merchant: 'Amazon', amount: 21.20, currency: 'USD' },
  { date: '2022-12-21', desc: 'Dentist Copay', merchant: 'Plymouth Meeting Family Dental', amount: 30.00, currency: 'USD' },
  { date: '2022-12-21', desc: 'Haricut', merchant: 'Tough Nickel', amount: 55.00, currency: 'USD' },
  { date: '2022-12-21', desc: 'Groceries', merchant: 'Giant', amount: 16.55, currency: 'USD' },
  { date: '2022-12-21', desc: 'Lunch w/ Gina & Patrick', merchant: 'La Patrona', amount: 18.19, currency: 'USD' },
  // Dec 22
  { date: '2022-12-22', desc: 'Train Card Reload', merchant: 'SEPTA', amount: 20.00, currency: 'USD' },
  { date: '2022-12-22', desc: 'Train Card Reload', merchant: 'SEPTA', amount: 20.00, currency: 'USD' },
  { date: '2022-12-22', desc: 'Movie: Jingle All the Way', merchant: 'Amazon', amount: 4.23, currency: 'USD' },
  { date: '2022-12-22', desc: 'Electric Toothbrushes', merchant: 'Costco', amount: 74.98, currency: 'USD' },
  { date: '2022-12-22', desc: 'Luggage', merchant: 'American Airlines', amount: 60.00, currency: 'USD' },
  // Dec 23
  { date: '2022-12-23', desc: 'Gift for Austin: RCT Classic for iPad', merchant: 'Apple', amount: 6.35, currency: 'USD' },
  { date: '2022-12-23', desc: 'Reimbursement: Jingle All the Way', merchant: 'Jordan', amount: -4.00, currency: 'USD', type: 'income' },
  // Dec 24
  { date: '2022-12-24', desc: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD' },
  // Dec 25
  { date: '2022-12-25', desc: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD' },
  // Dec 29
  { date: '2022-12-29', desc: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD' },
  { date: '2022-12-29', desc: 'Luggage', merchant: 'American Airlines', amount: 60.00, currency: 'USD' },
  // Dec 30
  { date: '2022-12-30', desc: 'Lunch (w/ Austin)', merchant: 'MCO', amount: 25.54, currency: 'USD' },
  { date: '2022-12-30', desc: 'Transfer Fee', merchant: 'Wise', amount: 4.41, currency: 'USD' },
  { date: '2022-12-30', desc: 'Transfer Fee', merchant: 'Wise', amount: 31.70, currency: 'THB' },
  { date: '2022-12-30', desc: 'Groceries', merchant: 'Giant', amount: 77.75, currency: 'USD' },
  { date: '2022-12-30', desc: 'Dinner w/ Jordan', merchant: 'Jordan', amount: 27.54, currency: 'USD' },
  { date: '2022-12-30', desc: 'Cruise Bill', merchant: 'NCL', amount: 602.20, currency: 'USD' },
  { date: '2022-12-30', desc: 'Water', merchant: '30th St. Station', amount: 2.99, currency: 'USD' },
  // Dec 31
  { date: '2022-12-31', desc: 'Ginger Ale', merchant: 'Giant', amount: 4.23, currency: 'USD' },
  { date: '2022-12-31', desc: 'Drinks', merchant: 'Giant', amount: 27.38, currency: 'USD' },
  { date: '2022-12-31', desc: 'Lunch for Austin', merchant: 'Wawa', amount: 11.96, currency: 'USD' },
  { date: '2022-12-31', desc: 'Dinner', merchant: 'Philly Cheesesteaks', amount: 11.87, currency: 'USD' },
  { date: '2022-12-31', desc: 'Cargo Shorts, Ear Plugs, Weight Gloves, Watch Bands, Socks, Underwear', merchant: 'Amazon', amount: 227.52, currency: 'USD' },
];

// Gross Income transactions
const pdfIncomeTransactions = [
  { date: '2022-12-05', desc: 'Freelance Income - September', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-12-05', desc: 'Freelance Income - November', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-12-14', desc: 'Paycheck', merchant: 'e2open', amount: 2978.94, currency: 'USD', type: 'income' },
  { date: '2022-12-20', desc: 'Freelance Income - December', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-12-17', desc: 'Travel Credit Reimbursement', merchant: 'Chase', amount: 300.00, currency: 'USD', type: 'income' },
  { date: '2022-12-20', desc: 'Freelance Income - October', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-12-21', desc: 'Christmas Gift', merchant: 'Grandma', amount: 500.00, currency: 'USD', type: 'income' },
  { date: '2022-12-25', desc: 'Christmas Gift', merchant: 'Mom & Dad', amount: 100.00, currency: 'USD', type: 'income' },
  { date: '2022-12-29', desc: 'Paycheck', merchant: 'e2open', amount: 2972.44, currency: 'USD', type: 'income' },
  { date: '2022-12-30', desc: 'Casino Winnings', merchant: 'Norwegian Prima', amount: 400.00, currency: 'USD', type: 'income' },
  { date: '2022-12-30', desc: 'Cruise Reimbursement', merchant: 'Dad', amount: 400.00, currency: 'USD', type: 'income' },
];

// Savings transactions
const pdfSavingsTransactions = [
  { date: '2022-12-31', desc: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
];

// Combine all PDF transactions
const allPdfTransactions = [...pdfExpenseTransactions, ...pdfIncomeTransactions, ...pdfSavingsTransactions];

console.log(`Total PDF transactions extracted: ${allPdfTransactions.length}`);
console.log(`  Expense Tracker: ${pdfExpenseTransactions.length}`);
console.log(`  Gross Income: ${pdfIncomeTransactions.length}`);
console.log(`  Savings: ${pdfSavingsTransactions.length}\n`);

async function verifyPdfToDb() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('DECEMBER 2022: PDF → DATABASE VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: v2.0 - Transaction-level matching (PDF as source)\n');

  console.log(`PDF Source: ${allPdfTransactions.length} transactions\n`);

  // Get all database transactions for December 2022
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-12-01')
    .lte('transaction_date', '2022-12-31')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  if (allPdfTransactions.length !== dbTransactions.length) {
    console.log(`⚠️  COUNT MISMATCH: PDF has ${allPdfTransactions.length}, DB has ${dbTransactions.length}\n`);
  }

  // Match each PDF transaction to a database transaction
  let matchedCount = 0;
  let unmatchedPdf = [];
  const matchedDBIds = new Set();

  allPdfTransactions.forEach((pdfTxn, idx) => {
    // Find matching DB transaction
    const match = dbTransactions.find(dbTxn => {
      // Already matched
      if (matchedDBIds.has(dbTxn.id)) return false;

      // Date must match
      if (dbTxn.transaction_date !== pdfTxn.date) return false;

      // Amount must match (within 0.01 for floating point)
      if (Math.abs(dbTxn.amount - Math.abs(pdfTxn.amount)) > 0.01) return false;

      // Currency must match
      if (dbTxn.original_currency !== pdfTxn.currency) return false;

      // Transaction type (expense vs income) - handle negative amounts
      const expectedType = pdfTxn.type || (pdfTxn.amount < 0 ? 'income' : 'expense');
      if (dbTxn.transaction_type !== expectedType) return false;

      return true;
    });

    if (match) {
      matchedCount++;
      matchedDBIds.add(match.id);
    } else {
      unmatchedPdf.push({
        index: idx + 1,
        date: pdfTxn.date,
        description: pdfTxn.desc,
        merchant: pdfTxn.merchant,
        amount: pdfTxn.amount,
        currency: pdfTxn.currency
      });
    }
  });

  // Find unmatched DB transactions
  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${allPdfTransactions.length} (${(matchedCount/allPdfTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPdf.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedPdf.length > 0) {
    console.log('❌ UNMATCHED PDF TRANSACTIONS (missing from DB):');
    unmatchedPdf.slice(0, 10).forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.merchant} | ${txn.amount} ${txn.currency}`);
    });
    if (unmatchedPdf.length > 10) {
      console.log(`  ... and ${unmatchedPdf.length - 10} more`);
    }
    console.log();
  }

  if (unmatchedDB.length > 0) {
    console.log('❌ UNMATCHED DATABASE TRANSACTIONS (not in PDF):');
    unmatchedDB.slice(0, 10).forEach(txn => {
      console.log(`  ${txn.transaction_date} | ${txn.description} | ${txn.amount} ${txn.original_currency}`);
    });
    if (unmatchedDB.length > 10) {
      console.log(`  ... and ${unmatchedDB.length - 10} more`);
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  if (matchedCount === allPdfTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT 1:1 MATCH (PDF → DATABASE)');
    console.log(`All ${matchedCount} PDF transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
  } else if (matchedCount === allPdfTransactions.length && unmatchedDB.length > 0) {
    console.log('\n⚠️  ALL PDF TRANSACTIONS MATCHED');
    console.log(`But ${unmatchedDB.length} extra transactions found in database`);
    console.log('These may be manual additions or duplicate imports');
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  } else {
    console.log('\n❌ INCOMPLETE MATCH');
    console.log(`${unmatchedPdf.length} PDF transactions missing from database`);
    console.log(`${unmatchedDB.length} database transactions not in PDF`);
    console.log('\nSTATUS: ❌ FAILED - REQUIRES INVESTIGATION');
  }

  console.log('\nNOTE: PDF aggregate totals (GRAND TOTAL) were NOT verified.');
  console.log('      Transaction-level matching is the verification standard.');
}

verifyPdfToDb().catch(console.error);
