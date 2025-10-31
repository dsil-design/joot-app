require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * DECEMBER 2021: FULL PDF→DATABASE VERIFICATION
 *
 * This script performs a comprehensive 1:1 verification of ALL transactions
 * from the PDF (page 47) against the database.
 *
 * Source: Budget for Import-page47.pdf
 * Total Transactions Expected: 144 (expense tracker + income + savings)
 */

// All transactions extracted from PDF page 47
const pdfTransactions = [
  // December 1, 2021
  { date: '2021-12-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-01', desc: "This Month's (CNX)", merchant: 'Jatu (Landlord)', amount: 19500.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-01', desc: 'CNX Utilities', merchant: 'Jatu (Landlord)', amount: 1022.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-01', desc: 'Cleaning Bill', merchant: 'Bliss', amount: 2568.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-01', desc: "This Month's Rent (Conshy)", merchant: 'Jordan', amount: 850.00, currency: 'USD', type: 'expense', payment: 'PNC Bank Account' },

  // December 2, 2021
  { date: '2021-12-02', desc: 'Haircut', merchant: 'Tough Nickel', amount: 45.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-02', desc: 'Train to Philly', merchant: 'SEPTA', amount: 7.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-02', desc: 'Subway to Spring Garden', merchant: 'SEPTA', amount: 2.50, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-02', desc: 'Bowling w/ Kaitlin', merchant: 'North Bowl', amount: 50.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-02', desc: 'Taxi to Apartment', merchant: 'Lyft', amount: 43.99, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 3, 2021
  { date: '2021-12-03', desc: 'Coffee', merchant: 'Wawa', amount: 1.86, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-03', desc: 'Reimbursement: Austin', merchant: 'Dad', amount: 20.00, currency: 'USD', type: 'income', payment: 'Cash' }, // Negative in PDF, converted to income
  { date: '2021-12-03', desc: 'Arcade', merchant: "Arnold's", amount: 50.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-03', desc: 'Dinner', merchant: 'Philly Cheesesteaks', amount: 63.95, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-03', desc: 'Reimbursement: Dinner', merchant: 'Laura', amount: 23.00, currency: 'USD', type: 'income', payment: 'Venmo' },
  { date: '2021-12-03', desc: 'Reimbursement: Dinner', merchant: 'Becky', amount: 16.00, currency: 'USD', type: 'income', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 4, 2021
  { date: '2021-12-04', desc: 'Drinks/Snacks', merchant: "TJ's", amount: 47.64, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-04', desc: 'Taxi to Apartment', merchant: 'Lyft', amount: 31.79, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-04', desc: 'Bar Tip', merchant: 'Downingtown Country Club', amount: 20.00, currency: 'USD', type: 'expense', payment: 'Cash' },

  // December 5, 2021
  { date: '2021-12-05', desc: 'Lunch: Primo Hoagies', merchant: 'DoorDash', amount: 21.24, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-05', desc: 'Dinner: Fingers Wings & Other Things', merchant: 'DoorDash', amount: 23.26, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 6, 2021
  { date: '2021-12-06', desc: 'Groceries', merchant: 'Giant', amount: 73.20, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-06', desc: 'Lunch', merchant: 'Wawa', amount: 7.25, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 7, 2021
  { date: '2021-12-07', desc: 'New Septa Card', merchant: 'SEPTA', amount: 14.95, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-07', desc: 'SEPTA Fare', merchant: 'SEPTA', amount: 5.25, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-07', desc: 'Logitech StreamCam (including partial refund)', merchant: 'Amazon', amount: 130.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 8, 2021
  { date: '2021-12-08', desc: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-08', desc: 'Grey T-Shirts', merchant: 'Asket', amount: 283.50, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 10, 2021
  { date: '2021-12-10', desc: 'Golf Reservation (Craig & Jordan)', merchant: 'Supreme Golf X', amount: 167.06, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-10', desc: 'Poker Loss', merchant: 'Craig', amount: 13.20, currency: 'USD', type: 'expense', payment: 'Venmo' },

  // December 11, 2021
  { date: '2021-12-11', desc: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-11', desc: 'Dinner (w/ Jordan): Chiangmai', merchant: 'DoorDash', amount: 55.47, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-11', desc: 'Driving Range (Craig/Jordan)', merchant: 'Wyncote', amount: 10.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-11', desc: 'Lunch/Snacks (w/ Jordan)', merchant: 'Wyncote', amount: 15.00, currency: 'USD', type: 'expense', payment: 'Cash' },
  { date: '2021-12-11', desc: 'Cannabis', merchant: 'Apothecarium', amount: 120.00, currency: 'USD', type: 'expense', payment: 'Cash' },

  // December 12, 2021
  { date: '2021-12-12', desc: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 19.07, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Gas', merchant: 'Costco', amount: 49.58, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Groceries', merchant: 'Giant', amount: 44.38, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Groceries', merchant: 'Giant', amount: 6.99, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Groceries', merchant: 'Target', amount: 31.78, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Tequila & Cointreau', merchant: 'Wine & Spirits', amount: 46.62, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Groceries', merchant: "Lee's Produce", amount: 30.61, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-12', desc: 'Switch Online Plus', merchant: 'Nintendo', amount: 37.94, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 13, 2021
  { date: '2021-12-13', desc: 'Flights: JFK - SIN - CNX', merchant: 'SmartFares / Singapore Airlines', amount: 1168.41, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-13', desc: 'Dinner: Lovebird', merchant: 'DoorDash', amount: 23.65, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 14, 2021
  { date: '2021-12-14', desc: 'Train: Philly to NYC', merchant: 'Amtrak', amount: 67.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-14', desc: 'Conshy Cable', merchant: 'Jordan', amount: 69.68, currency: 'USD', type: 'expense', payment: 'Venmo' },
  { date: '2021-12-14', desc: 'Hotel Reservation', merchant: 'Riverside House Hotel', amount: 4500.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-14', desc: 'Vax Card Sleeve, Cards, Shoe bags, Towel', merchant: 'Amazon', amount: 42.31, currency: 'USD', type: 'expense', payment: 'Cash' },

  // December 15, 2021
  { date: '2021-12-15', desc: 'Insurance & Thai Pass Service', merchant: 'Robert Jackson', amount: 5700.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-15', desc: 'Insurance & Thai Pass Service', merchant: 'Robert Jackson', amount: 5000.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-15', desc: 'Transfer Fee', merchant: 'Wise', amount: 32.89, currency: 'THB', type: 'expense', payment: 'Wise' },
  { date: '2021-12-15', desc: 'Transfer Fee', merchant: 'Wise', amount: 3.47, currency: 'USD', type: 'expense', payment: 'PNC Bank Account' },
  { date: '2021-12-15', desc: 'Paycheck', merchant: 'E2Open', amount: 2772.27, currency: 'USD', type: 'income', payment: 'Direct Deposit' },

  // December 16, 2021
  { date: '2021-12-16', desc: 'Cell Phone / Internet', merchant: 'AIS', amount: 1495.86, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-16', desc: 'Cell phone / Internet', merchant: 'AIS', amount: 469.84, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // December 17, 2021
  { date: '2021-12-17', desc: 'Groceries', merchant: 'Giant', amount: 12.99, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 18, 2021
  { date: '2021-12-18', desc: 'Groceries', merchant: 'Giant', amount: 17.51, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-18', desc: 'Skype Credit', merchant: 'Apple', amount: 10.59, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-18', desc: 'Refund for Webcam', merchant: 'Amazon', amount: 63.06, currency: 'USD', type: 'income', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-18', desc: 'Cannabis', merchant: 'Apothecarium', amount: 130.00, currency: 'USD', type: 'expense', payment: 'Cash' },

  // December 19, 2021
  { date: '2021-12-19', desc: 'Coffee', merchant: 'Jordan', amount: 7.70, currency: 'USD', type: 'expense', payment: 'Venmo' },
  { date: '2021-12-19', desc: 'Dinner', merchant: 'Jordan', amount: 19.00, currency: 'USD', type: 'expense', payment: 'Venmo' },
  { date: '2021-12-19', desc: 'Lunch', merchant: "Jersey Mike's", amount: 12.72, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-19', desc: 'Subway to Jamaica', merchant: 'MTA', amount: 7.75, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-19', desc: 'AirTrain to JFK', merchant: 'MTA', amount: 7.75, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 22, 2021
  { date: '2021-12-22', desc: 'Taxi to House', merchant: 'Grab', amount: 101.00, currency: 'THB', type: 'expense', payment: '' },
  { date: '2021-12-22', desc: 'Aeropress & Coffee', merchant: 'Hillkoff', amount: 1620.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Coffee switch', merchant: 'Hillkoff', amount: 100.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-22', desc: 'Taxi to Jatus', merchant: 'Grab', amount: 127.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Bike mirror', merchant: 'Nat motor', amount: 562.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Dry Cleaning', merchant: 'Jordan', amount: 14.64, currency: 'USD', type: 'expense', payment: 'Venmo' },
  { date: '2021-12-22', desc: 'Lunch: Alchemy Vegan', merchant: 'Grab', amount: 305.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Logitech MX Keys and Vertical Mouse', merchant: 'Lazada', amount: 6553.41, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Dinner: Radjarbar', merchant: 'Grab', amount: 380.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-22', desc: 'Reimbursement: Golf and Bud', merchant: 'Jordan', amount: 119.00, currency: 'USD', type: 'income', payment: 'Venmo' },
  { date: '2021-12-22', desc: 'Monthly Subscription: Tinder', merchant: 'Apple', amount: 26.49, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },

  // December 23, 2021
  { date: '2021-12-23', desc: 'Photocopies', merchant: 'Copy Shop', amount: 4.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Wing 41 Sticker Applications', merchant: 'Wing 41', amount: 210.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Lunch: Bella Goose', merchant: 'Grab', amount: 305.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-23', desc: 'Dinner & Drinks', merchant: 'Winstons', amount: 334.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Cigs', merchant: '7-Eleven', amount: 87.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Drinks', merchant: 'Small World', amount: 2470.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-23', desc: 'Drinks', merchant: 'Starlight', amount: 480.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Drinks', merchant: 'Badaboom', amount: 220.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Snacks', merchant: '7-Eleven', amount: 92.50, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-23', desc: 'Drinks', merchant: 'Wine Down', amount: 160.00, currency: 'THB', type: 'expense', payment: 'Cash' },

  // December 24, 2021
  { date: '2021-12-24', desc: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-24', desc: 'Lunch', merchant: 'Grab', amount: 300.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-24', desc: 'Greeting Card', merchant: 'B2S', amount: 15.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Coffee', merchant: 'Coffee Station', amount: 45.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-24', desc: 'Batteries', merchant: 'Lazada', amount: 223.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-24', desc: 'Haircut', merchant: 'Cutler', amount: 500.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Gift to House Keeper', merchant: 'Khun Sa', amount: 2000.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Gas', merchant: 'PT', amount: 130.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Cigs', merchant: '7-Eleven', amount: 157.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Drinks', merchant: '1Way', amount: 270.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Drinks', merchant: 'Winstons', amount: 1000.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-24', desc: 'Drinks', merchant: 'Starlight', amount: 640.00, currency: 'THB', type: 'expense', payment: 'Cash' },

  // December 25, 2021
  { date: '2021-12-25', desc: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-25', desc: "Lunch: Arno's", merchant: 'Grab', amount: 438.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-25', desc: 'Drinks', merchant: '7-Eleven', amount: 138.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-25', desc: 'Taxi to Liquor Store', merchant: 'Grab', amount: 68.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-25', desc: 'Wine', merchant: 'Sadamnern', amount: 1140.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-25', desc: "Taxi to Leigh's", merchant: 'Grab', amount: 200.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-25', desc: 'Taxi Home', merchant: 'Grab', amount: 200.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // December 26, 2021
  { date: '2021-12-26', desc: 'Driving Range', merchant: 'Pimantip', amount: 35.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-26', desc: 'Drinks Snacks', merchant: 'Pimantip', amount: 300.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-26', desc: 'Greens Fee', merchant: 'Pimantip', amount: 800.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-26', desc: 'Dinner: Food4thought', merchant: 'Tuk', amount: 330.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-26', desc: 'Snack: McDonalds', merchant: 'Grab', amount: 302.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // December 27, 2021
  { date: '2021-12-27', desc: 'Lunch: Bella Goose', merchant: 'Grab', amount: 265.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-27', desc: 'Weed', merchant: 'Tom', amount: 3000.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-27', desc: 'Scooter Battery', merchant: 'Scooter Repair Shop', amount: 700.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-27', desc: 'Jigger, pour spouts, sauce bottle', merchant: 'Jasco', amount: 271.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-27', desc: 'Dinner and Drinks', merchant: "Winston's", amount: 1080.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-27', desc: 'Snacks', merchant: '7-Eleven', amount: 91.00, currency: 'THB', type: 'expense', payment: 'Cash' },

  // December 28, 2021
  { date: '2021-12-28', desc: 'Lunch w/ Aom', merchant: 'Pad Thai', amount: 55.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-28', desc: 'Coffee', merchant: 'Gateway', amount: 110.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-28', desc: 'Dinner: Food4thought', merchant: 'Tuk', amount: 410.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-28', desc: 'Dessert: Cheviot Cheeva', merchant: 'Grab', amount: 325.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // December 29, 2021
  { date: '2021-12-29', desc: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense', payment: 'Credit Card: Chase Sapphire Reserve' },
  { date: '2021-12-29', desc: 'Monthly Gym Membership', merchant: 'O2 Gym', amount: 900.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-29', desc: 'Lunch: Dash', merchant: 'Tuk', amount: 380.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-29', desc: 'Dinner', merchant: 'Samurai Kitchen', amount: 142.31, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-29', desc: 'Ice Cream', merchant: '7-Eleven', amount: 55.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-29', desc: 'Bar products', merchant: 'Lazada', amount: 2962.83, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-29', desc: 'Whet stone', merchant: 'Lazada', amount: 403.25, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-29', desc: 'Spider Strainer', merchant: 'Lazada', amount: 106.81, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // December 30, 2021
  { date: '2021-12-30', desc: 'Dinner', merchant: 'Pulcinella da Stefano', amount: 730.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-30', desc: 'Cigs', merchant: '7-Eleven', amount: 200.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-30', desc: 'Drinks', merchant: 'Bar', amount: 330.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-30', desc: 'Snacks', merchant: '7-Eleven', amount: 92.50, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-30', desc: 'Drinks', merchant: "Winston's", amount: 490.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-30', desc: 'Drinks', merchant: 'Small World', amount: 650.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-30', desc: 'No-show fee', merchant: 'Grab', amount: 50.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-30', desc: 'Paycheck', merchant: 'E2Open', amount: 2772.29, currency: 'USD', type: 'income', payment: 'Direct Deposit' },

  // December 31, 2021
  { date: '2021-12-31', desc: 'Food', merchant: 'Aom', amount: 300.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-31', desc: 'Snacks', merchant: '7-Eleven', amount: 90.00, currency: 'THB', type: 'expense', payment: 'Cash' },
  { date: '2021-12-31', desc: 'Groceries: Tesco', merchant: 'Grab', amount: 697.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-31', desc: 'Taxi for Aom', merchant: 'Grab', amount: 54.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },
  { date: '2021-12-31', desc: 'Dinner & Drinks', merchant: 'The Yard', amount: 790.00, currency: 'THB', type: 'expense', payment: 'Bangkok Bank Account' },

  // Savings (end of month)
  { date: '2021-12-31', desc: 'Monthly IRA Contribution', merchant: 'Vanguard', amount: 83.33, currency: 'USD', type: 'expense', payment: 'PNC Bank Account' },
  { date: '2021-12-31', desc: 'Emergency Savings', merchant: 'Vanguard', amount: 716.67, currency: 'USD', type: 'expense', payment: 'PNC Bank Account' },
];

console.log('PDF Source: Budget for Import-page47.pdf');
console.log(`Total PDF Transactions: ${pdfTransactions.length}\n`);

async function verifyPDFtoDatabase() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('DECEMBER 2021: FULL PDF→DATABASE VERIFICATION');
  console.log('='.repeat(70));
  console.log('Source: Budget for Import-page47.pdf (complete extraction)\n');

  // Get all database transactions for December 2021
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2021-12-01')
    .lte('transaction_date', '2021-12-31')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  // Match each PDF transaction to database
  let matchedCount = 0;
  let unmatchedPDF = [];
  const matchedDBIds = new Set();

  pdfTransactions.forEach((pdfTxn, idx) => {
    const match = dbTransactions.find(dbTxn => {
      if (matchedDBIds.has(dbTxn.id)) return false;
      if (dbTxn.transaction_date !== pdfTxn.date) return false;
      if (Math.abs(dbTxn.amount - pdfTxn.amount) > 0.01) return false;
      if (dbTxn.original_currency !== pdfTxn.currency) return false;
      if (dbTxn.transaction_type !== pdfTxn.type) return false;

      // Description match (flexible)
      const pdfDesc = pdfTxn.desc.toLowerCase().trim();
      const dbDesc = dbTxn.description.toLowerCase().trim();
      if (pdfDesc !== dbDesc) {
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
        description: pdfTxn.desc,
        amount: pdfTxn.amount,
        currency: pdfTxn.currency,
        type: pdfTxn.type
      });
    }
  });

  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${pdfTransactions.length} (${(matchedCount/pdfTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPDF.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedPDF.length > 0) {
    console.log('❌ UNMATCHED PDF TRANSACTIONS (missing from DB):');
    unmatchedPDF.forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.amount} ${txn.currency} | ${txn.type}`);
    });
    console.log();
  }

  if (unmatchedDB.length > 0) {
    console.log('❌ UNMATCHED DATABASE TRANSACTIONS (not in PDF):');
    unmatchedDB.forEach(txn => {
      console.log(`  ${txn.transaction_date} | ${txn.description} | ${txn.amount} ${txn.original_currency}`);
    });
    console.log();
  }

  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  if (matchedCount === pdfTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT PDF→DATABASE MATCH');
    console.log(`All ${matchedCount} PDF transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
    console.log('\nThis confirms the complete PDF→CSV→Database chain is intact.');
  } else {
    console.log('\n⚠️  PARTIAL MATCH');
    console.log(`${unmatchedPDF.length} PDF transactions not found in database`);
    console.log(`${unmatchedDB.length} database transactions not in PDF`);
    console.log('\nSTATUS: ⚠️  NEEDS REVIEW');
  }
}

verifyPDFtoDatabase().catch(console.error);
