require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// November 2022 PDF Transactions (manually extracted from page 36)
// Expense Tracker transactions
const pdfExpenseTransactions = [
  // Nov 1
  { date: '2022-11-01', desc: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD' },
  { date: '2022-11-01', desc: 'Annual Subscription: Chase Sapphire Reserve', merchant: 'Chase', amount: 550.00, currency: 'USD' },
  { date: '2022-11-01', desc: 'This Month\'s Rent, Storage, Internet, PECO (Conshy)', merchant: 'Jordan', amount: 887.00, currency: 'USD' },
  { date: '2022-11-01', desc: 'This Month\'s Rent', merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB' },
  { date: '2022-11-01', desc: 'Monthly Cleaning', merchant: 'BLISS', amount: 2568.00, currency: 'THB' },
  { date: '2022-11-01', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 313.00, currency: 'THB' },
  { date: '2022-11-01', desc: 'Dinner: Salad Farm', merchant: 'Foodpanda', amount: 171.00, currency: 'THB' },
  { date: '2022-11-01', desc: 'Drinks', merchant: 'Lollipop', amount: 3800.00, currency: 'THB' },
  // Nov 2
  { date: '2022-11-02', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 174.00, currency: 'THB' },
  { date: '2022-11-02', desc: 'Dinner: El Diablo\'s', merchant: 'Foodpanda', amount: 240.00, currency: 'THB' },
  { date: '2022-11-02', desc: 'Snack: KFC', merchant: 'Foodpanda', amount: 247.00, currency: 'THB' },
  // Nov 3
  { date: '2022-11-03', desc: 'Deodorant, Mattress topper, Bedding set', merchant: 'Lazada', amount: 62.27, currency: 'USD' },
  { date: '2022-11-03', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 174.00, currency: 'THB' },
  { date: '2022-11-03', desc: 'Vapes', merchant: 'Zigar', amount: 1042.00, currency: 'THB' },
  { date: '2022-11-03', desc: 'Haircut', merchant: 'The Cutler', amount: 550.00, currency: 'THB' },
  { date: '2022-11-03', desc: 'Dinner: Dragonbox Tuk', merchant: 'Bangkok Bank Account', amount: 700.00, currency: 'THB' },
  // Nov 4
  { date: '2022-11-04', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 174.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Drinks', merchant: 'North Hill', amount: 365.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Driving range', merchant: 'North Hill', amount: 75.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Caddy tip', merchant: 'North Hill', amount: 300.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Greens Fee', merchant: 'North Hill', amount: 47.75, currency: 'USD' },
  { date: '2022-11-04', desc: 'Dinner and drinks', merchant: 'Deejai Garden', amount: 170.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Drinks', merchant: '1Way Bar', amount: 160.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Drinks', merchant: 'Zoom bar', amount: 230.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Drinks', merchant: 'Small world', amount: 1200.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Drinks', merchant: 'Lollipop', amount: 540.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Red Bull & Cigs', merchant: '7-Eleven', amount: 92.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Snack: McDonalds', merchant: 'Foodpanda', amount: 496.00, currency: 'THB' },
  { date: '2022-11-04', desc: 'Killer', merchant: 'Lollipop', amount: 20.00, currency: 'THB' },
  // Nov 5
  { date: '2022-11-05', desc: 'Drinks', merchant: 'MoRoom', amount: 250.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Lunch: Food4Thought', merchant: 'Foodpanda', amount: 348.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Dinner and drinks', merchant: '2gether bar', amount: 560.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Cannabis', merchant: 'Tom', amount: 500.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Drinks', merchant: 'Lollipop', amount: 400.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Drinks', merchant: 'Jackie Bar', amount: 400.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Drinks', merchant: 'Wine Down', amount: 100.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Food', merchant: 'McDonalds', amount: 338.00, currency: 'THB' },
  { date: '2022-11-05', desc: 'Groceries', merchant: '7-Eleven', amount: 224.00, currency: 'THB' },
  // Nov 6
  { date: '2022-11-06', desc: 'Lunch: Donut Cafe CNX', merchant: 'Grab', amount: 9.90, currency: 'USD' },
  { date: '2022-11-06', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 400.00, currency: 'THB' },
  // Nov 7
  { date: '2022-11-07', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 174.00, currency: 'THB' },
  { date: '2022-11-07', desc: 'Gas', merchant: 'PTT', amount: 300.00, currency: 'THB' },
  { date: '2022-11-07', desc: 'Greens fee', merchant: 'North Hill', amount: 42.70, currency: 'USD' },
  { date: '2022-11-07', desc: 'Drinks', merchant: 'North Hill', amount: 320.00, currency: 'THB' },
  { date: '2022-11-07', desc: 'Caddy tip', merchant: 'North Hill', amount: 300.00, currency: 'THB' },
  { date: '2022-11-07', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 614.00, currency: 'THB' },
  // Nov 8
  { date: '2022-11-08', desc: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD' },
  { date: '2022-11-08', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 188.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Coffee', merchant: 'Underbridge', amount: 60.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Bike Wash', merchant: 'Boom Car Wash', amount: 190.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 261.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Laundry', merchant: 'Galare Thong', amount: 259.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Dinner: Salad Farm Chiang Mai', merchant: 'Foodpanda', amount: 172.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Drinks', merchant: '1Way Bar', amount: 160.00, currency: 'THB' },
  { date: '2022-11-08', desc: 'Drinks', merchant: 'Lollipop', amount: 600.00, currency: 'THB' },
  // Nov 9
  { date: '2022-11-09', desc: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 196.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Coffee', merchant: 'Old Town Coffee', amount: 50.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Drinks & Snacks', merchant: '7-Eleven', amount: 120.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Drinks', merchant: 'Shop', amount: 631.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Lanterns Loy Krathong', merchant: 'Cash', amount: 220.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Hotel room', merchant: 'Cash', amount: 800.00, currency: 'THB' },
  { date: '2022-11-09', desc: 'Golf Shirt', merchant: 'Martin', amount: 550.00, currency: 'THB' },
  // Nov 10
  { date: '2022-11-10', desc: 'Coffee', merchant: 'Bangkok Bank Account', amount: 40.00, currency: 'THB' },
  { date: '2022-11-10', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 173.00, currency: 'THB' },
  { date: '2022-11-10', desc: 'Dinner & Drinks', merchant: 'Krusty', amount: 600.00, currency: 'THB' },
  { date: '2022-11-10', desc: 'Drinks', merchant: 'Lollipop', amount: 350.00, currency: 'THB' },
  { date: '2022-11-10', desc: 'Drinks', merchant: 'Small World', amount: 2150.00, currency: 'THB' },
  // Nov 11
  { date: '2022-11-11', desc: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD' },
  { date: '2022-11-11', desc: 'Lunch: Donut Cafe CNX', merchant: 'Grab', amount: 10.71, currency: 'USD' },
  { date: '2022-11-11', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 617.00, currency: 'THB' },
  { date: '2022-11-11', desc: 'Friend', merchant: 'Bangkok Bank Account', amount: 2000.00, currency: 'THB' },
  { date: '2022-11-11', desc: 'Drinks and Pool', merchant: 'Jammer\'s', amount: 240.00, currency: 'THB' },
  { date: '2022-11-11', desc: 'Drink', merchant: 'Country road', amount: 105.00, currency: 'THB' },
  { date: '2022-11-11', desc: 'Drink', merchant: 'Zoom bar', amount: 100.00, currency: 'THB' },
  { date: '2022-11-11', desc: 'Drinks', merchant: 'Lollipop', amount: 700.00, currency: 'THB' },
  // Nov 12
  { date: '2022-11-12', desc: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD' },
  { date: '2022-11-12', desc: 'Vapes', merchant: 'Zigar', amount: 500.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Vape Delivery', merchant: 'Grab', amount: 45.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 188.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Dinner: Salad Concept', merchant: 'Foodpanda', amount: 242.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Drink', merchant: '1Way Bar', amount: 80.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Drinks', merchant: 'You & I Bar', amount: 320.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Pool', merchant: 'You & I Bar', amount: 60.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Drinks', merchant: 'Lollipop', amount: 2600.00, currency: 'THB' },
  { date: '2022-11-12', desc: 'Snack: McDonalds', merchant: 'Foodpanda', amount: 376.00, currency: 'THB' },
  // Nov 13
  { date: '2022-11-13', desc: 'Dinner: Grill of Punjab', merchant: 'Foodpanda', amount: 354.00, currency: 'THB' },
  { date: '2022-11-13', desc: 'Cell Phone', merchant: 'AIS', amount: 16.11, currency: 'USD' },
  { date: '2022-11-13', desc: 'Dinner: Kiwi Smash', merchant: 'Foodpanda', amount: 456.00, currency: 'THB' },
  // Nov 14
  { date: '2022-11-14', desc: 'Lunch', merchant: 'Gravity', amount: 190.00, currency: 'THB' },
  { date: '2022-11-14', desc: 'Coffee', merchant: 'Artisan', amount: 160.00, currency: 'THB' },
  { date: '2022-11-14', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 614.00, currency: 'THB' },
  // Nov 15
  { date: '2022-11-15', desc: 'Breakfast', merchant: 'Blue Diamond Club', amount: 189.00, currency: 'THB' },
  { date: '2022-11-15', desc: 'Test & Medicine', merchant: 'Clinic', amount: 78.52, currency: 'USD' },
  { date: '2022-11-15', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 608.00, currency: 'THB' },
  // Nov 16
  { date: '2022-11-16', desc: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 5.50, currency: 'USD' },
  { date: '2022-11-16', desc: 'Gas', merchant: 'PTT', amount: 175.00, currency: 'THB' },
  { date: '2022-11-16', desc: 'Lunch: Alchemy Vegan', merchant: 'Foodpanda', amount: 319.00, currency: 'THB' },
  { date: '2022-11-16', desc: 'Utilities', merchant: 'Galare Thong', amount: 1909.00, currency: 'THB' },
  { date: '2022-11-16', desc: 'Laundry', merchant: 'Galare Thong', amount: 296.00, currency: 'THB' },
  { date: '2022-11-16', desc: 'Dinner: Salad Rolls Ban No 9-5', merchant: 'Foodpanda', amount: 235.00, currency: 'THB' },
  { date: '2022-11-16', desc: 'Groceries', merchant: 'Foodpanda', amount: 646.80, currency: 'THB' },
  // Nov 17
  { date: '2022-11-17', desc: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 3.85, currency: 'USD' },
  { date: '2022-11-17', desc: 'Box', merchant: 'Kerry Express', amount: 5.00, currency: 'THB' },
  { date: '2022-11-17', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 173.00, currency: 'THB' },
  { date: '2022-11-17', desc: 'Hair cut', merchant: 'The Cutler', amount: 400.00, currency: 'THB' },
  { date: '2022-11-17', desc: 'Cards', merchant: 'Friends', amount: 1200.00, currency: 'THB' },
  { date: '2022-11-17', desc: 'Drinks', merchant: 'Home Bar', amount: 660.00, currency: 'THB' },
  // Nov 18
  { date: '2022-11-18', desc: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 5.22, currency: 'USD' },
  { date: '2022-11-18', desc: 'Taxi to Airport', merchant: 'Grab', amount: 8.41, currency: 'USD' },
  { date: '2022-11-18', desc: 'MTR Tickets', merchant: 'MTR', amount: 35.00, currency: 'THB' },
  { date: '2022-11-18', desc: 'Vapes', merchant: 'Street', amount: 750.00, currency: 'THB' },
  { date: '2022-11-18', desc: 'Taxi to Danny\'s', merchant: 'Grab', amount: 100.00, currency: 'THB' },
  { date: '2022-11-18', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 200.00, currency: 'THB' },
  { date: '2022-11-18', desc: 'Dinner', merchant: 'Irish Bar', amount: 655.00, currency: 'THB' },
  { date: '2022-11-18', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 4.66, currency: 'USD' },
  // Nov 19
  { date: '2022-11-19', desc: 'Greens Fee', merchant: 'BKK Scramblers', amount: 1850.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Prizes', merchant: 'BKK Scramblers', amount: 500.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Food and drink', merchant: 'Rachakram', amount: 375.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Taxi to Hotel', merchant: 'Taxi', amount: 1200.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Caddy Tip', merchant: 'Rachakram', amount: 400.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Dinner', merchant: 'Sportsman', amount: 13.90, currency: 'USD' },
  { date: '2022-11-19', desc: 'Drinks', merchant: 'BKK', amount: 370.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Drinks', merchant: 'BKK', amount: 520.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Drinks', merchant: 'BKK', amount: 380.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Drinks', merchant: 'BKK', amount: 600.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Beers at Bar', merchant: 'Bar', amount: 400.00, currency: 'THB' },
  { date: '2022-11-19', desc: 'Massage', merchant: 'BKK', amount: 5000.00, currency: 'THB' },
  // Nov 20
  { date: '2022-11-20', desc: 'Lunch', merchant: 'Hooters', amount: 327.21, currency: 'THB' },
  { date: '2022-11-20', desc: 'Taxi to Restaurant', merchant: 'Grab', amount: 9.16, currency: 'USD' },
  { date: '2022-11-20', desc: 'Dinner and drinks', merchant: 'Bangkok Bank Account', amount: 1800.00, currency: 'THB' },
  { date: '2022-11-20', desc: 'Taxi to Hotel', merchant: 'Grab', amount: 6.31, currency: 'USD' },
  // Nov 21
  { date: '2022-11-21', desc: 'Gym', merchant: '24Seven Fitness', amount: 13.99, currency: 'USD' },
  { date: '2022-11-21', desc: 'Water', merchant: '24Seven Fitness', amount: 10.00, currency: 'THB' },
  { date: '2022-11-21', desc: 'Fee', merchant: 'Wise', amount: 0.52, currency: 'USD' },
  { date: '2022-11-21', desc: 'Fee', merchant: 'Wise', amount: 3.38, currency: 'USD' },
  { date: '2022-11-21', desc: 'Taxi to Concert', merchant: 'Grab', amount: 6.50, currency: 'USD' },
  { date: '2022-11-21', desc: 'Dinner', merchant: 'MoonStar Studio', amount: 85.00, currency: 'THB' },
  { date: '2022-11-21', desc: 'Taxi to Hotel', merchant: 'Taxi', amount: 500.00, currency: 'THB' },
  // Nov 22
  { date: '2022-11-22', desc: 'Breakfast with Leigh', merchant: 'Ibis', amount: 395.00, currency: 'THB' },
  { date: '2022-11-22', desc: 'Lunch from Monday', merchant: 'Ibis', amount: 370.00, currency: 'THB' },
  { date: '2022-11-22', desc: 'Coffee', merchant: 'Ibis', amount: 70.00, currency: 'THB' },
  { date: '2022-11-22', desc: 'Taxi to Airport', merchant: 'Grab', amount: 16.93, currency: 'USD' },
  { date: '2022-11-22', desc: 'Highway Toll', merchant: 'Grab', amount: 2.15, currency: 'USD' },
  { date: '2022-11-22', desc: 'Taxi to Condo', merchant: 'Grab', amount: 8.08, currency: 'USD' },
  { date: '2022-11-22', desc: 'Internet', merchant: '3BB', amount: 41.88, currency: 'USD' },
  { date: '2022-11-22', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 591.00, currency: 'THB' },
  { date: '2022-11-22', desc: 'Laundry', merchant: 'Galare Thong', amount: 280.00, currency: 'THB' },
  // Nov 23
  { date: '2022-11-23', desc: 'Gym', merchant: 'O2 Gym', amount: 60.00, currency: 'THB' },
  { date: '2022-11-23', desc: 'Lunch: Alchemy Vegan', merchant: 'Foodpanda', amount: 319.00, currency: 'THB' },
  { date: '2022-11-23', desc: 'Groceries', merchant: 'Foodpanda', amount: 554.10, currency: 'THB' },
  { date: '2022-11-23', desc: 'Massage Reimbursement', merchant: 'Leigh', amount: -2500.00, currency: 'THB', type: 'income' },
  { date: '2022-11-23', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 617.00, currency: 'THB' },
  { date: '2022-11-23', desc: 'Drinks', merchant: 'Home Bar', amount: 400.00, currency: 'THB' },
  { date: '2022-11-23', desc: 'Drinks', merchant: 'Small World', amount: 2190.00, currency: 'THB' },
  // Nov 24
  { date: '2022-11-24', desc: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD' },
  { date: '2022-11-24', desc: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD' },
  { date: '2022-11-24', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 188.00, currency: 'THB' },
  { date: '2022-11-24', desc: 'Greens Fee', merchant: 'SGV', amount: 1500.00, currency: 'THB' },
  { date: '2022-11-24', desc: 'Caddy tip', merchant: 'SGV', amount: 300.00, currency: 'THB' },
  { date: '2022-11-24', desc: 'Drinks', merchant: 'SGV', amount: 780.00, currency: 'THB' },
  { date: '2022-11-24', desc: 'Winnings', merchant: 'Friends', amount: -500.00, currency: 'THB', type: 'income' },
  { date: '2022-11-24', desc: 'Drinks', merchant: '7-Eleven', amount: 1600.00, currency: 'THB' },
  // Nov 25
  { date: '2022-11-25', desc: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD' },
  { date: '2022-11-25', desc: 'Laundry', merchant: 'Galare Thong', amount: 146.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 188.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Greens Fee', merchant: 'Alpine', amount: 50.66, currency: 'USD' },
  { date: '2022-11-25', desc: 'Drinks', merchant: 'Alpine', amount: 460.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Caddy Tip', merchant: 'Alpine', amount: 400.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Match Play, Dinner Payback', merchant: 'Anthony Sawyer', amount: 600.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Beers', merchant: 'Street Shop', amount: 450.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Vapes', merchant: 'CNX Vapes', amount: 181.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Taxi to Town', merchant: 'Driver', amount: 300.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Drinks', merchant: 'Home Bar', amount: 260.00, currency: 'THB' },
  { date: '2022-11-25', desc: 'Drinks', merchant: 'Lollipop', amount: 1400.00, currency: 'THB' },
  // Nov 26
  { date: '2022-11-26', desc: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 252.00, currency: 'THB' },
  { date: '2022-11-26', desc: 'Drinks', merchant: 'Home Bar', amount: 545.00, currency: 'THB' },
  { date: '2022-11-26', desc: 'Drinks and Food', merchant: '2gether bar', amount: 490.00, currency: 'THB' },
  { date: '2022-11-26', desc: 'Drinks', merchant: 'Lollipop', amount: 3200.00, currency: 'THB' },
  // Nov 27
  { date: '2022-11-27', desc: 'Lunch: The Donut Cafe', merchant: 'Grab', amount: 10.44, currency: 'USD' },
  { date: '2022-11-27', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 601.00, currency: 'THB' },
  // Nov 28
  { date: '2022-11-28', desc: 'Dinner: Grill of Punjab', merchant: 'Foodpanda', amount: 274.00, currency: 'THB' },
  { date: '2022-11-28', desc: 'Flights to US', merchant: 'United Airlines', amount: 55.48, currency: 'USD' },
  // Nov 29
  { date: '2022-11-29', desc: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD' },
  { date: '2022-11-29', desc: 'Gym', merchant: 'O2 Gym', amount: 60.00, currency: 'THB' },
  { date: '2022-11-29', desc: 'Lunch: Alchemy Vegan', merchant: 'Foodpanda', amount: 319.00, currency: 'THB' },
  { date: '2022-11-29', desc: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 319.00, currency: 'THB' },
  // Nov 30
  { date: '2022-11-30', desc: 'Vapes', merchant: 'Zigar', amount: 500.00, currency: 'THB' },
  { date: '2022-11-30', desc: 'Delivery', merchant: 'Grab', amount: 50.00, currency: 'THB' },
  { date: '2022-11-30', desc: 'Laundry', merchant: 'Galare Thong', amount: 190.00, currency: 'THB' },
  { date: '2022-11-30', desc: 'Lunch: Salad Concept', merchant: 'Grab', amount: 405.00, currency: 'THB' },
  { date: '2022-11-30', desc: 'Coffee Beans', merchant: 'Hillkoff', amount: 179.60, currency: 'THB' },
  { date: '2022-11-30', desc: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 614.00, currency: 'THB' },
  { date: '2022-11-30', desc: 'Styptic pen, Golf Balls, Face wipes, Wet mat', merchant: 'Lazada', amount: 37.81, currency: 'USD' },
  { date: '2022-11-30', desc: 'Flight to BKK', merchant: 'AirAsia', amount: 87.65, currency: 'USD' },
  { date: '2022-11-30', desc: 'Hotel room', merchant: 'hotels.com', amount: 153.53, currency: 'USD' },
];

// Gross Income transactions
const pdfIncomeTransactions = [
  { date: '2022-11-15', desc: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' },
  { date: '2022-11-30', desc: 'Paycheck', merchant: 'e2open', amount: 2972.43, currency: 'USD', type: 'income' },
];

// Combine all PDF transactions
const allPdfTransactions = [...pdfExpenseTransactions, ...pdfIncomeTransactions];

console.log(`Total PDF transactions extracted: ${allPdfTransactions.length}`);
console.log(`  Expense Tracker: ${pdfExpenseTransactions.length}`);
console.log(`  Gross Income: ${pdfIncomeTransactions.length}\n`);

async function verifyPdfToDb() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('NOVEMBER 2022: PDF → DATABASE VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: v2.0 - Transaction-level matching (PDF as source)\n');

  console.log(`PDF Source: ${allPdfTransactions.length} transactions\n`);

  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-11-01')
    .lte('transaction_date', '2022-11-30')
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Database: ${dbTransactions.length} transactions\n`);

  if (allPdfTransactions.length !== dbTransactions.length) {
    console.log(`⚠️  COUNT MISMATCH: PDF has ${allPdfTransactions.length}, DB has ${dbTransactions.length}\n`);
  }

  let matchedCount = 0;
  let unmatchedPdf = [];
  const matchedDBIds = new Set();

  allPdfTransactions.forEach((pdfTxn, idx) => {
    const match = dbTransactions.find(dbTxn => {
      if (matchedDBIds.has(dbTxn.id)) return false;
      if (dbTxn.transaction_date !== pdfTxn.date) return false;
      if (Math.abs(dbTxn.amount - Math.abs(pdfTxn.amount)) > 0.01) return false;
      if (dbTxn.original_currency !== pdfTxn.currency) return false;

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

  const unmatchedDB = dbTransactions.filter(dbTxn => !matchedDBIds.has(dbTxn.id));

  console.log('MATCHING RESULTS:');
  console.log('-'.repeat(70));
  console.log(`Matched: ${matchedCount}/${allPdfTransactions.length} (${(matchedCount/allPdfTransactions.length*100).toFixed(1)}%)`);
  console.log(`Unmatched PDF transactions: ${unmatchedPdf.length}`);
  console.log(`Unmatched DB transactions: ${unmatchedDB.length}`);
  console.log();

  if (unmatchedPdf.length > 0) {
    console.log('❌ UNMATCHED PDF TRANSACTIONS (missing from DB):');
    unmatchedPdf.forEach(txn => {
      console.log(`  #${txn.index}: ${txn.date} | ${txn.description} | ${txn.merchant} | ${txn.amount} ${txn.currency}`);
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

  if (matchedCount === allPdfTransactions.length && unmatchedDB.length === 0) {
    console.log('\n✅ PERFECT 1:1 MATCH (PDF → DATABASE)');
    console.log(`All ${matchedCount} PDF transactions found in database`);
    console.log('No extra transactions in database');
    console.log('\nSTATUS: ✅ VERIFIED');
  } else if (matchedCount === allPdfTransactions.length && unmatchedDB.length > 0) {
    console.log('\n⚠️  ALL PDF TRANSACTIONS MATCHED');
    console.log(`But ${unmatchedDB.length} extra transactions found in database`);
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
