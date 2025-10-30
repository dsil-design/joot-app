require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF source: Budget for Import-page39.pdf
// Extracted manually from August 2022 section
// Using ONLY "Actual Spent" column with currency determined by payment method
// Bangkok Bank Account / Cash (Thailand) = THB
// Credit Card / PNC Bank Account / Venmo = USD
const pdfTransactions = [
  // Monday, August 1, 2022
  { date: '2022-08-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: "This Month's Rent, Storage, Internet, PECO (Conshy)", merchant: 'Jordan', amount: 857.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: "This Month's Rent", merchant: 'Panya (Landlord)', amount: 19000.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'breakfast; Bella goos', merchant: 'Foodpanda', amount: 7.22, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Foodpanda Pro Subscription', merchant: 'Foodpanda', amount: 228, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Lunch; street food', merchant: 'foodpanda', amount: 115, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Harmon Kardon Aura Speaker', merchant: 'Lazada', amount: 1045.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Monitor Lamp', merchant: 'Lazada', amount: 1246.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Drinks', merchant: 'Kad Manee', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Dinner drinks', merchant: 'Scorpion', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Drinks', merchant: 'Lollipop', amount: 1400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-01', description: 'Annual Subscription: United Explorer Card', merchant: 'United', amount: 95.00, currency: 'USD', type: 'expense' },

  // Tuesday, August 2, 2022
  { date: '2022-08-02', description: 'Groceries', merchant: 'FoodPanda', amount: 18.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Breakfast: Going Up Cafe', merchant: 'FoodPanda', amount: 4.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Groceries', merchant: 'Galare Thong', amount: 170.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-02', description: 'Dinner: Pulcinella de Stefano', merchant: 'Foodpanda', amount: 600.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-02', description: 'Aeron Chair', merchant: 'Chanintr Living', amount: 1313.30, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Utilities CNX (July 2022)', merchant: 'Galare Thong', amount: 358.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-02', description: 'Dell 4K USB C Monitor', merchant: 'Lazada', amount: 511.94, currency: 'USD', type: 'expense' },

  // Wednesday, August 3, 2022
  { date: '2022-08-03', description: 'Breakfast: Going Up Cafe', merchant: 'Grab', amount: 6.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Taxi to Golf', merchant: 'Grab', amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Cigs', merchant: '7-Eleven', amount: 72.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Greens Fee', merchant: 'Summit Green Valley', amount: 1120.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Caddy Tip', merchant: 'Summit Green Valley', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Drinks', merchant: 'Summit Green Valley', amount: 330.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Peco bill', merchant: 'Jordan', amount: 16.14, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Dinner', merchant: 'Radjarbar', amount: 1520.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Drinks', merchant: 'Zoom', amount: 800.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Drinks', merchant: 'Lollipop', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-03', description: 'Taxi Home', merchant: 'Grab', amount: 77.00, currency: 'THB', type: 'expense' },

  // Thursday, August 4, 2022
  { date: '2022-08-04', description: 'Laundry', merchant: 'Galare Thong', amount: 176.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-04', description: 'Lunch: Salad Concept', merchant: 'FoodPanda', amount: 10.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-04', description: 'Drinks', merchant: 'Yawk Bar', amount: 320.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-04', description: 'Drinks', merchant: 'Lollipop', amount: 4800.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-04', description: 'Snack', merchant: '7-Eleven', amount: 88.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-04', description: 'Plunger, webcam light, draino', merchant: 'Baan beyond', amount: 18.52, currency: 'USD', type: 'expense' },

  // Friday, August 5, 2022
  { date: '2022-08-05', description: 'Tickets: Jacob Collier', merchant: 'Ticket Melon', amount: 144.19, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 5.94, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Groceries', merchant: 'Foodpanda', amount: 14.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Cigs and Lighter', merchant: '7- Eleven', amount: 108.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-05', description: "Drinks", merchant: "Ae's place", amount: 240.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-05', description: 'Drinks', merchant: 'Lollipop', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-05', description: 'Dinner', merchant: 'Pucinella da Stefano', amount: 735.00, currency: 'THB', type: 'expense' },

  // Saturday, August 6, 2022
  { date: '2022-08-06', description: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 5.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Refund?', merchant: 'Lazada', amount: 3.92, currency: 'USD', type: 'income' },
  { date: '2022-08-06', description: 'Kitchen Towels, Incense Cones, Incense Stands', merchant: 'Lazada', amount: 21.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Closet Organizer', merchant: 'Lazada', amount: 22.73, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Cannabis', merchant: 'High Queen', amount: 1100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-06', description: 'Fake Plants', merchant: 'Pimarn', amount: 3590.00, currency: 'THB', type: 'expense' },

  // Sunday, August 7, 2022
  { date: '2022-08-07', description: 'Snacks/Drinks', merchant: 'Alpine', amount: 355.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Greens Fee & Caddy Tip', merchant: 'Alpine', amount: 1550.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Gas', merchant: 'PTT', amount: 260.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Lunch - Bella Goose', merchant: 'Grab', amount: 295.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Massage', merchant: 'Aloha Massage', amount: 1600.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Dinner', merchant: 'Torajiro', amount: 812.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-07', description: 'Groceries', merchant: 'Big C', amount: 37.89, currency: 'USD', type: 'expense' },

  // Monday, August 8, 2022
  { date: '2022-08-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 5.99, currency: 'USD', type: 'expense' },
  // Note: PDF shows 11 items with $0.00 amounts - these were correctly skipped during parsing
  { date: '2022-08-08', description: 'Charge 1', merchant: 'Lazada', amount: 155.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Charge 2', merchant: 'Lazada', amount: 36.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Charge 3', merchant: 'Lazada', amount: 11.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Gift for Austin: iPad Case', merchant: 'Amazon', amount: 23.40, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 13.97, currency: 'USD', type: 'expense' },

  // Tuesday, August 9, 2022
  { date: '2022-08-09', description: 'Monthly Subscription: Gym Membership', merchant: 'O2 Gym', amount: 900.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-09', description: 'Laundry', merchant: 'Galare Thong', amount: 218.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-09', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 6.28, currency: 'USD', type: 'expense' },
  { date: '2022-08-09', description: 'Groceries', merchant: 'Galare Thong', amount: 117.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-09', description: 'Dinner: Pudjar India', merchant: 'Foodpanda', amount: 10.86, currency: 'USD', type: 'expense' },

  // Wednesday, August 10, 2022
  { date: '2022-08-10', description: 'Squatty Potty', merchant: 'Lazada', amount: 3.88, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Wine Cooler', merchant: 'Lazada', amount: 236.13, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Taxi to Golf', merchant: 'Grab', amount: 155.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-10', description: 'Driving Range', merchant: 'StarDome', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-10', description: 'Drinks', merchant: 'StarDome', amount: 50.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-10', description: 'Taxi to Condo', merchant: 'Grab', amount: 149.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-10', description: 'Dinner: Salad Farm Chiang Mai', merchant: 'Foodpanda', amount: 9.47, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Dinner: KFC', merchant: 'FoodPanda', amount: 6.29, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'USB C Thunderbolt cable', merchant: 'Lazada', amount: 15.85, currency: 'USD', type: 'expense' },

  // Thursday, August 11, 2022
  { date: '2022-08-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple iTunes', amount: 16.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Lunch: Alchemy vegan', merchant: 'Foodpanda', amount: 10.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Haircut', merchant: 'Cutler', amount: 550.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Dinner: Dash', merchant: 'Tuk Driver', amount: 419.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Eye drops', merchant: 'Pharmazy', amount: 220.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Cigs and 7', merchant: 'Cash', amount: 101.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Drinks', merchant: 'Thai 1 On', amount: 230.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Drinks', merchant: 'Lollipop', amount: 1200.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Drinks', merchant: 'Wine Down', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-11', description: 'Snack', merchant: 'McDonalds', amount: 347.00, currency: 'THB', type: 'expense' },

  // Friday, August 12, 2022
  { date: '2022-08-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 21.19, currency: 'USD', type: 'expense' },
  { date: '2022-08-12', description: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 15.73, currency: 'USD', type: 'expense' },
  { date: '2022-08-12', description: 'Snack: Subway', merchant: 'Foodpanda', amount: 13.62, currency: 'USD', type: 'expense' },

  // Saturday, August 13, 2022
  { date: '2022-08-13', description: 'Selling fees', merchant: 'eBay', amount: 16.59, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Dinner', merchant: 'Happy Munich', amount: 1000.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks', merchant: 'OMG', amount: 240.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-13', description: 'Killer', merchant: 'Cash', amount: 100.00, currency: 'THB', type: 'income' },
  { date: '2022-08-13', description: 'Cigs', merchant: '7-Eleven', amount: 111.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks', merchant: 'Lollipop', amount: 1400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks', merchant: 'Small World', amount: 165.26, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Taxi to Condo', merchant: 'Taxi', amount: 120.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-13', description: 'Cell Phone Bill CNX', merchant: 'AIS', amount: 1.80, currency: 'USD', type: 'expense' },

  // Sunday, August 14, 2022
  { date: '2022-08-14', description: 'Friend', merchant: 'Cash', amount: 2000.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-14', description: 'Taxi to Bike', merchant: 'Grab', amount: 86.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-14', description: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 6.05, currency: 'USD', type: 'expense' },
  { date: '2022-08-14', description: 'Something', merchant: 'Bangkok Bank Account', amount: 130.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-14', description: 'Lunch: Butter is Better', merchant: 'Foodpanda', amount: 12.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-14', description: 'Dinner: Pucinella da Stefano', merchant: 'Foodpanda', amount: 690.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-14', description: 'Groceries', merchant: 'Galare Thong', amount: 74.00, currency: 'THB', type: 'expense' },

  // Monday, August 15, 2022
  { date: '2022-08-15', description: 'Lunch', merchant: 'Salad Concept', amount: 244.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Laundry', merchant: 'Galare Thong', amount: 210.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Coffee', merchant: 'Cafe de Sot', amount: 40.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Coffee', merchant: 'Cafe de Sot', amount: 35.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'ATM fee', merchant: 'Bangkok Bank', amount: 200.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Tickets: Formula 1 Singapore', merchant: 'F1', amount: 304.18, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Reimbursement: F1 Tickets', merchant: 'Leigh', amount: 5500.00, currency: 'THB', type: 'income' },
  { date: '2022-08-15', description: 'Groceries', merchant: 'Foodpanda', amount: 21.86, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Cannabis', merchant: 'High Queen', amount: 1800.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Gas', merchant: 'PT Station', amount: 165.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: "Dinner: El Diablo's", merchant: 'Foodpanda', amount: 375.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Groceries', merchant: 'Galare Thong', amount: 64.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-15', description: 'Mat for Wine Cooler', merchant: 'Lazada', amount: 8.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Acoustic Foam, Double Sided Tape', merchant: 'Lazada', amount: 9.59, currency: 'USD', type: 'expense' },

  // Tuesday, August 16, 2022
  { date: '2022-08-16', description: 'Passport photos', merchant: 'Photo Shop', amount: 150.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-16', description: 'Package Shipment', merchant: 'Kerry', amount: 99.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-16', description: 'Lunch', merchant: 'Salad Terrace', amount: 348.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-16', description: 'Dinner', merchant: 'Foodpanda', amount: 5.18, currency: 'USD', type: 'expense' },
  // Note: "Incense Cones and Holder" shows $0.00 - correctly skipped
  { date: '2022-08-16', description: 'Snack: Burger King', merchant: 'Foodpanda', amount: 19.14, currency: 'USD', type: 'expense' },

  // Wednesday, August 17, 2022
  { date: '2022-08-17', description: 'Lunch', merchant: 'Sushi Ichiban', amount: 220.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-17', description: 'Coffee', merchant: 'Heart Work', amount: 65.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-17', description: 'Dinner: Samurai Kitchen', merchant: 'Foodpanda', amount: 10.21, currency: 'USD', type: 'expense' },
  { date: '2022-08-17', description: 'Groceries', merchant: 'Galare Thong', amount: 132.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-17', description: 'Incense Holder, Incense Cones', merchant: 'Lazada', amount: 28.13, currency: 'USD', type: 'expense' },

  // Thursday, August 18, 2022
  { date: '2022-08-18', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 10.71, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Groceries', merchant: 'Galare Thong', amount: 181.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Express Delivery: Hillkoff Coffee', merchant: 'Grab Driver', amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Taxi to Bar', merchant: 'Tuk tuk', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Dinner', merchant: '2gether Bar', amount: 450.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Gum', merchant: '7-Eleven', amount: 10.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Drinks', merchant: 'Lollipop', amount: 930.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Drinks', merchant: 'Small World', amount: 3200.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-18', description: 'Taxi home', merchant: 'Tuk tuk', amount: 200.00, currency: 'THB', type: 'expense' },

  // Friday, August 19, 2022
  { date: '2022-08-19', description: 'Lunch: Going up Cafe', merchant: 'Foodpanda', amount: 6.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-19', description: 'Dinner: Hello Solao', merchant: 'Raymond', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-19', description: 'Drinks', merchant: 'Thai1 On', amount: 200.00, currency: 'THB', type: 'expense' },

  // Saturday, August 20, 2022
  { date: '2022-08-20', description: 'Greens Fee', merchant: 'Highlands', amount: 1400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks Snacks', merchant: 'Highlands', amount: 240.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Lunch', merchant: 'Hua Lin', amount: 240.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Caddy tip', merchant: 'Highlands', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Taxi to Dinner', merchant: 'Grab', amount: 156.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Dinner', merchant: 'Tomimaki', amount: 472.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Cigs', merchant: '7-11', amount: 216.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks & Killer', merchant: '1Way', amount: 430.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks', merchant: 'Lollipop', amount: 650.00, currency: 'THB', type: 'expense' },

  // Sunday, August 21, 2022
  { date: '2022-08-21', description: 'Drinking glasses', merchant: 'Index', amount: 88.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-21', description: "Lunch: Arno's", merchant: 'Foodpanda', amount: 9.40, currency: 'USD', type: 'expense' },
  { date: '2022-08-21', description: 'Dinner: Pucinalla da Stefano', merchant: 'Foodpanda', amount: 940.00, currency: 'THB', type: 'expense' },

  // Monday, August 22, 2022
  { date: '2022-08-22', description: 'Wine Order', merchant: 'Wine Pro', amount: 4994.76, currency: 'THB', type: 'expense' },
  { date: '2022-08-22', description: 'Internet CNX', merchant: '3BB', amount: 1606.73, currency: 'THB', type: 'expense' },
  { date: '2022-08-22', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 10.63, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Tickets: LIV Golf in BKK', merchant: 'Tixr X', amount: 89.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Reimbursement for LIV tickets', merchant: 'Leigh', amount: 1600.00, currency: 'THB', type: 'expense' }, // Note: Listed as expense in PDF but is reimbursement
  { date: '2022-08-22', description: 'Dinner: Grill of Punjab', merchant: 'Foodpanda', amount: 10.84, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Groceries', merchant: 'Galare Thong', amount: 84.00, currency: 'THB', type: 'expense' },

  // Tuesday, August 23, 2022
  { date: '2022-08-23', description: 'Breakfast: Going Up Cafe', merchant: 'Foodpanda', amount: 6.54, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Laundry', merchant: 'Galare Thong', amount: 338.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-23', description: 'Lunch: Alchemy Vegan', merchant: 'Foodpanda', amount: 9.64, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Taxi to Condo', merchant: 'Grab', amount: 75.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-23', description: '1 month subscription: Tinder Golf', merchant: 'Apple', amount: 26.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Taxi to Piston Shop', merchant: 'Grab', amount: 77.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-23', description: 'Labor: Replaced Headlights', merchant: 'Piston Shop', amount: 200.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-23', description: 'Dinner: Food4Thought', merchant: 'Foodpanda', amount: 13.08, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Snack: Burger King', merchant: 'Foodpanda', amount: 12.50, currency: 'USD', type: 'expense' },

  // Wednesday, August 24, 2022
  { date: '2022-08-24', description: 'Monthly Subscription: iCloud', merchant: 'Apple iTunes', amount: 9.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Monthly Subscription: WSJ', merchant: 'WSJ', amount: 8.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Sold: AOC Monitor', merchant: 'Facebook Marketplace', amount: 4000.00, currency: 'THB', type: 'income' },
  { date: '2022-08-24', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 10.24, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Dinner: Thai Food', merchant: 'Foodpanda', amount: 7.98, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Snack: KFC', merchant: 'Foodpanda', amount: 10.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Golf Balls: Pro V1s', merchant: 'Lazada', amount: 24.42, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Golf Balls: Srixon, Toothpaste', merchant: 'Lazada', amount: 23.07, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Set of Wine glasses', merchant: 'Lazada', amount: 30.24, currency: 'USD', type: 'expense' },

  // Thursday, August 25, 2022
  { date: '2022-08-25', description: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 15.89, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 6.20, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'ATM Fee', merchant: 'Bangkok Bank', amount: 220.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Haircut', merchant: 'The Cutler', amount: 550.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Dinner', merchant: 'Pucinella', amount: 650.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Cigs & Eyedrops', merchant: '7-Eleven', amount: 292.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Drinks', merchant: 'Lollipop', amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Boy', merchant: 'Cash', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Drinks', merchant: 'Small World', amount: 8400.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-25', description: 'Snack', merchant: '7-Eleven', amount: 94.50, currency: 'THB', type: 'expense' },

  // Friday, August 26, 2022
  { date: '2022-08-26', description: 'Lunch: Going Up Cafe', merchant: 'Foodpanda', amount: 7.70, currency: 'USD', type: 'expense' },
  { date: '2022-08-26', description: 'Dinner and Drinks', merchant: 'Kadmanee', amount: 120.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-26', description: 'Drinks', merchant: 'Lollipop', amount: 630.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-26', description: 'Drinks', merchant: 'Lollipop', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-26', description: 'Charity Snack Boy', merchant: 'Cash', amount: 100.00, currency: 'THB', type: 'expense' },

  // Saturday, August 27, 2022
  { date: '2022-08-27', description: 'Greens Fee', merchant: 'Gassan Legacy', amount: 1450.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Drinks and Food', merchant: 'Gassan Legacy', amount: 315.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Caddy holes', merchant: 'Gassan Legacy', amount: 80.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Extra 9 Holes (with Atsushi and Keiko)', merchant: 'Gassan Legacy X', amount: 1800.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Caddy Tips', merchant: 'Gassan Legacy', amount: 600.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Taxi to Dinner', merchant: 'Grab', amount: 121.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Dinner', merchant: 'SanMai Ramen', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Drinks', merchant: "Ae's Place", amount: 370.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Drinks', merchant: 'Lollipop', amount: 2000.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Taxi to Condo', merchant: 'Grab', amount: 117.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-27', description: 'Snack: McDonalds', merchant: 'Foodpanda', amount: 355.00, currency: 'THB', type: 'expense' },

  // Sunday, August 28, 2022
  { date: '2022-08-28', description: 'Dinner: Grill of Punjab', merchant: 'Foodpanda', amount: 10.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-28', description: 'Snack: KFC', merchant: 'Foodpanda', amount: 8.86, currency: 'USD', type: 'expense' },
  { date: '2022-08-28', description: 'Groceries', merchant: 'Galare Thong', amount: 76.00, currency: 'THB', type: 'expense' },

  // Monday, August 29, 2022
  { date: '2022-08-29', description: 'Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Reimbursement: Greens Fees', merchant: 'Atsushi', amount: 800.00, currency: 'THB', type: 'income' },
  { date: '2022-08-29', description: 'Lunch: Ramen', merchant: 'Bangkok Bank Account', amount: 114.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-29', description: 'Coffee', merchant: 'XYM', amount: 55.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-29', description: 'Coffee', merchant: 'Heartwork Cafe', amount: 70.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-29', description: '1 year Visa', merchant: 'Billy', amount: 55000.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-29', description: 'Groceries', merchant: 'Rimping', amount: 23.37, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Dinner: Croco Pizza', merchant: 'Foodpanda', amount: 9.58, currency: 'USD', type: 'expense' },

  // Tuesday, August 30, 2022
  { date: '2022-08-30', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 10.18, currency: 'USD', type: 'expense' },
  { date: '2022-08-30', description: 'Fans, airpods cleaning tool', merchant: 'Lazada', amount: 24.80, currency: 'USD', type: 'expense' },
  { date: '2022-08-30', description: 'Gas', merchant: 'PT', amount: 180.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-30', description: 'Kitchen ware', merchant: 'Baan discount', amount: 526.00, currency: 'THB', type: 'expense' },

  // Wednesday, August 31, 2022
  { date: '2022-08-31', description: 'Laundry', merchant: 'Galare Thong', amount: 204.00, currency: 'THB', type: 'expense' },
  { date: '2022-08-31', description: 'Lunch: Salad Concept', merchant: 'Foodpanda', amount: 9.85, currency: 'USD', type: 'expense' },

  // GROSS INCOME (from PDF Gross Income Tracker section)
  { date: '2022-08-07', description: 'Refund: Car Insurance', merchant: 'Travelers', amount: 173.00, currency: 'USD', type: 'income' },
  { date: '2022-08-15', description: 'Paycheck', merchant: 'e2open', amount: 2978.93, currency: 'USD', type: 'income' },
  { date: '2022-08-29', description: 'Freelance Income - August', merchant: 'NJDA', amount: 175.00, currency: 'USD', type: 'income' },
  { date: '2022-08-31', description: 'Paycheck', merchant: 'e2open', amount: 2972.44, currency: 'USD', type: 'income' },

  // PERSONAL SAVINGS & INVESTMENTS (PDF doesn't show dates, using month-end)
  { date: '2022-08-31', description: 'Crypto Investment', merchant: 'Coinbase', amount: 435.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-31', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
];

console.log(`\nPDF Transactions extracted: ${pdfTransactions.length}`);
console.log('NOTE: PDF shows 11+ zero-value transactions on Aug 8 that were correctly skipped during CSV parsing');
console.log('NOTE: "Reimbursement for LIV tickets" on Aug 22 shows as expense in PDF but should be income (reimbursement)');

async function verifyPDF1to1() {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

  console.log('\nAUGUST 2022: PDF→DB VERIFICATION');
  console.log('='.repeat(70));
  console.log('Protocol: PDF→DB - Transaction-level matching');
  console.log('Source: Actual Spent column only (ignoring conversion columns)\n');

  // Get all database transactions for August 2022
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select('*, vendors(name), payment_methods(name)')
    .eq('user_id', user.id)
    .gte('transaction_date', '2022-08-01')
    .lte('transaction_date', '2022-08-31')
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
  console.log('      CSV→DB was verified at 100% (226/226) - this is the authoritative chain.');
}

verifyPDF1to1().catch(console.error);
