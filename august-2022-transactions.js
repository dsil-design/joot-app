const pdfTransactions = [
  // August 1, 2022
  { date: '2022-08-01', description: 'Work Email', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: "This Month's Rent, Storage, Internet, PECO (Conshy)", amount: 857.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: "This Month's Rent", amount: 0.52, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'breakfast; Bella goos', amount: 7.22, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Foodpanda Pro Subscription', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Harmon Kardon Aura Speaker', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Monitor Lamp', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Drinks Kad Manee', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Dinner drinks Scorpion', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Drinks Lollipop', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-01', description: 'Annual Subscription: United Explorer Card', amount: 95.00, currency: 'USD', type: 'expense' },

  // August 2, 2022
  { date: '2022-08-02', description: 'Groceries', amount: 18.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Breakfast: Going Up Cafe', amount: 4.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Dinner: Pulcinella de Stefano', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Aeron Chair', amount: 1313.30, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Utilities CNX (July 2022)', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-02', description: 'Dell 4K USB C Monitor', amount: 511.94, currency: 'USD', type: 'expense' },

  // August 3, 2022
  { date: '2022-08-03', description: 'Breakfast: Going Up Cafe', amount: 6.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Taxi to Golf', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Greens Fee Summit Green Valley', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Caddy Tip Summit Green Valley', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Drinks Summit Green Valley', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Peco bill Jordan', amount: 16.14, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Dinner Radjarbar', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-03', description: 'Drinks Zoom', amount: 0.02, currency: 'USD', type: 'expense' },

  // August 4, 2022
  { date: '2022-08-04', description: 'Lunch: Salad Concept', amount: 10.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-04', description: 'Drinks Yawk Bar', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-04', description: 'Drinks Lollipop', amount: 0.13, currency: 'USD', type: 'expense' },
  { date: '2022-08-04', description: 'Plunger, webcam light, draino', amount: 18.52, currency: 'USD', type: 'expense' },

  // August 5, 2022
  { date: '2022-08-05', description: 'Tickets: Jacob Collier', amount: 144.19, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Lunch: Going Up Cafe', amount: 5.94, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Groceries', amount: 14.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: "Drinks Ae's place", amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Drinks Lollipop', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-05', description: 'Dinner Pucinella da Stefano', amount: 0.02, currency: 'USD', type: 'expense' },

  // August 6, 2022
  { date: '2022-08-06', description: 'Breakfast: Going Up Cafe', amount: 5.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Refund? Lazada', amount: 3.92, currency: 'USD', type: 'income' },
  { date: '2022-08-06', description: 'Kitchen Towels, Incense Cones, Incense Stands', amount: 21.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Closet Organizer', amount: 22.73, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Cannabis High Queen', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-06', description: 'Fake Plants Pimarn', amount: 0.10, currency: 'USD', type: 'expense' },

  // August 7, 2022
  { date: '2022-08-07', description: 'Snacks/Drinks Alpine', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Greens Fee & Caddy Tip Alpine', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Gas PTT', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Lunch - Bella Goose', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Massage Aloha Massage', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Dinner Torajiro', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Groceries Big C', amount: 37.89, currency: 'USD', type: 'expense' },
  { date: '2022-08-07', description: 'Refund: Car Insurance', amount: 173.00, currency: 'USD', type: 'income' },

  // August 8, 2022
  { date: '2022-08-08', description: 'Monthly Subscription: Paramount+', amount: 5.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Charge 1 Lazada', amount: 155.76, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Charge 2 Lazada', amount: 36.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Charge 3 Lazada', amount: 11.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Gift for Austin: iPad Case', amount: 23.40, currency: 'USD', type: 'expense' },
  { date: '2022-08-08', description: 'Dinner: Food4Thought', amount: 13.97, currency: 'USD', type: 'expense' },

  // August 9, 2022
  { date: '2022-08-09', description: 'Monthly Subscription: Gym Membership', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-09', description: 'Laundry Galare Thong', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-09', description: 'Lunch: Salad Concept', amount: 6.28, currency: 'USD', type: 'expense' },
  { date: '2022-08-09', description: 'Dinner: Pudjar India', amount: 10.86, currency: 'USD', type: 'expense' },

  // August 10, 2022
  { date: '2022-08-10', description: 'Squatty Potty', amount: 3.88, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Wine Cooler', amount: 236.13, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Dinner: Salad Farm Chiang Mai', amount: 9.47, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'Dinner: KFC', amount: 6.29, currency: 'USD', type: 'expense' },
  { date: '2022-08-10', description: 'USB C Thunderbolt cable', amount: 15.85, currency: 'USD', type: 'expense' },

  // August 11, 2022
  { date: '2022-08-11', description: 'Monthly Subscription: YouTube Premium', amount: 16.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Lunch: Alchemy vegan', amount: 10.95, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Haircut Cutler', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Dinner: Dash Tuk Driver', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Eye drops Pharmazy', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Drinks Thai 1 On', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Drinks Lollipop', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-11', description: 'Snack McDonalds', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 12, 2022
  { date: '2022-08-12', description: 'Monthly Subscription: Netflix', amount: 21.19, currency: 'USD', type: 'expense' },
  { date: '2022-08-12', description: 'Dinner: Food4Thought', amount: 15.73, currency: 'USD', type: 'expense' },
  { date: '2022-08-12', description: 'Snack: Subway', amount: 13.62, currency: 'USD', type: 'expense' },

  // August 13, 2022
  { date: '2022-08-13', description: 'Selling fees eBay', amount: 16.59, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Dinner Happy Munich', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks OMG', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks Lollipop', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Drinks Small World', amount: 165.26, currency: 'USD', type: 'expense' },
  { date: '2022-08-13', description: 'Cell Phone Bill CNX AIS', amount: 1.80, currency: 'USD', type: 'expense' },

  // August 14, 2022
  { date: '2022-08-14', description: 'Friend', amount: 0.06, currency: 'USD', type: 'expense' },
  { date: '2022-08-14', description: 'Breakfast: Going Up Cafe', amount: 6.05, currency: 'USD', type: 'expense' },
  { date: '2022-08-14', description: 'Lunch: Butter is Better', amount: 12.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-14', description: 'Dinner: Pucinella da Stefano', amount: 0.02, currency: 'USD', type: 'expense' },

  // August 15, 2022
  { date: '2022-08-15', description: 'Lunch Salad Concept', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Laundry Galare Thong', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'ATM fee Bangkok Bank', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Tickets: Formula 1 Singapore', amount: 304.18, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Reimbursement: F1 Tickets', amount: 0.15, currency: 'USD', type: 'income' },
  { date: '2022-08-15', description: 'Groceries', amount: 21.86, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Cannabis High Queen', amount: 0.05, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Dinner: El Diablo\'s', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Mat for Wine Cooler', amount: 8.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Acoustic Foam, Double Sided Tape', amount: 9.59, currency: 'USD', type: 'expense' },
  { date: '2022-08-15', description: 'Paycheck', amount: 2978.93, currency: 'USD', type: 'income' },

  // August 16, 2022
  { date: '2022-08-16', description: 'Lunch Salad Terrace', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-16', description: 'Dinner', amount: 5.18, currency: 'USD', type: 'expense' },
  { date: '2022-08-16', description: 'Snack: Burger King', amount: 19.14, currency: 'USD', type: 'expense' },

  // August 17, 2022
  { date: '2022-08-17', description: 'Lunch Sushi Ichiban', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-17', description: 'Dinner: Samurai Kitchen', amount: 10.21, currency: 'USD', type: 'expense' },
  { date: '2022-08-17', description: 'Incense Holder, Incense Cones', amount: 28.13, currency: 'USD', type: 'expense' },

  // August 18, 2022
  { date: '2022-08-18', description: 'Lunch: Salad Concept', amount: 10.71, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Express Delivery: Hillkoff Coffee', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Taxi to Bar Tuk tuk', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Dinner 2gether Bar', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Drinks Lollipop', amount: 0.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Drinks Small World', amount: 0.09, currency: 'USD', type: 'expense' },
  { date: '2022-08-18', description: 'Taxi home Tuk tuk', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 19, 2022
  { date: '2022-08-19', description: 'Lunch: Going up Cafe', amount: 6.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-19', description: 'Dinner: Hello Solao Raymond', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-19', description: 'Drinks Thai1 On', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 20, 2022
  { date: '2022-08-20', description: 'Greens Fee Highlands', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks Snacks Highlands', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Lunch Hua Lin', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Caddy tip Highlands', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Dinner Tomimaki', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Cigs 7-11', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks & Killer 1Way', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Drinks Lollipop', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-20', description: 'Snack: McDonalds', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 21, 2022
  { date: '2022-08-21', description: 'Lunch: Arno\'s', amount: 9.40, currency: 'USD', type: 'expense' },
  { date: '2022-08-21', description: 'Dinner: Pucinalla da Stefano', amount: 0.03, currency: 'USD', type: 'expense' },

  // August 22, 2022
  { date: '2022-08-22', description: 'Wine Order Wine Pro', amount: 0.14, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Internet CNX 3BB', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Lunch: Salad Concept', amount: 10.63, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Tickets: LIV Golf in BKK', amount: 89.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-22', description: 'Reimbursement for LIV tickets', amount: 0.04, currency: 'USD', type: 'income' },
  { date: '2022-08-22', description: 'Dinner: Grill of Punjab', amount: 10.84, currency: 'USD', type: 'expense' },

  // August 23, 2022
  { date: '2022-08-23', description: 'Breakfast: Going Up Cafe', amount: 6.54, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Laundry Galare Thong', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Lunch: Alchemy Vegan', amount: 9.64, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: '1 month subscription: Tinder Golf', amount: 26.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Labor: Replaced Headlights', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Dinner: Food4Thought', amount: 13.08, currency: 'USD', type: 'expense' },
  { date: '2022-08-23', description: 'Snack: Burger King', amount: 12.50, currency: 'USD', type: 'expense' },

  // August 24, 2022
  { date: '2022-08-24', description: 'Monthly Subscription: iCloud', amount: 9.99, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Monthly Subscription: WSJ', amount: 8.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Sold: AOC Monitor', amount: 0.11, currency: 'USD', type: 'income' },
  { date: '2022-08-24', description: 'Lunch: Salad Concept', amount: 10.24, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Dinner: Thai Food', amount: 7.98, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Snack: KFC', amount: 10.03, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Golf Balls: Pro V1s', amount: 24.42, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Golf Balls: Srixon, Toothpaste', amount: 23.07, currency: 'USD', type: 'expense' },
  { date: '2022-08-24', description: 'Set of Wine glasses', amount: 30.24, currency: 'USD', type: 'expense' },

  // August 25, 2022
  { date: '2022-08-25', description: 'Monthly Subscription: HBO NOW', amount: 15.89, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Lunch: Going Up Cafe', amount: 6.20, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'ATM Fee Bangkok Bank', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Haircut The Cutler', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Dinner Pucinella', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Cigs & Eyedrops 7-Eleven', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Drinks Lollipop', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-25', description: 'Drinks Small World', amount: 0.23, currency: 'USD', type: 'expense' },

  // August 26, 2022
  { date: '2022-08-26', description: 'Lunch: Going Up Cafe', amount: 7.70, currency: 'USD', type: 'expense' },
  { date: '2022-08-26', description: 'Drinks Lollipop', amount: 0.02, currency: 'USD', type: 'expense' },

  // August 27, 2022
  { date: '2022-08-27', description: 'Greens Fee Gassan Legacy', amount: 0.04, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Drinks and Food Gassan Legacy', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Extra 9 Holes (with Atsushi and Keiko)', amount: 0.05, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Caddy Tips Gassan Legacy', amount: 0.02, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Dinner SanMai Ramen', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: "Drinks Ae's Place", amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Drinks Lollipop', amount: 0.06, currency: 'USD', type: 'expense' },
  { date: '2022-08-27', description: 'Snack: McDonalds', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 28, 2022
  { date: '2022-08-28', description: 'Dinner: Grill of Punjab', amount: 10.49, currency: 'USD', type: 'expense' },
  { date: '2022-08-28', description: 'Snack: KFC', amount: 8.86, currency: 'USD', type: 'expense' },

  // August 29, 2022
  { date: '2022-08-29', description: 'Cell Phone T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Reimbursement: Greens Fees Atsushi', amount: 0.02, currency: 'USD', type: 'income' },
  { date: '2022-08-29', description: '1 year Visa Billy', amount: 1.52, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Groceries Rimping', amount: 23.37, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Dinner: Croco Pizza', amount: 9.58, currency: 'USD', type: 'expense' },
  { date: '2022-08-29', description: 'Freelance Income - August', amount: 175.00, currency: 'USD', type: 'income' },

  // August 30, 2022
  { date: '2022-08-30', description: 'Lunch: Salad Concept', amount: 10.18, currency: 'USD', type: 'expense' },
  { date: '2022-08-30', description: 'Fans, airpods cleaning tool', amount: 24.80, currency: 'USD', type: 'expense' },
  { date: '2022-08-30', description: 'Kitchen ware Baan discount', amount: 0.01, currency: 'USD', type: 'expense' },

  // August 31, 2022
  { date: '2022-08-31', description: 'Laundry Galare Thong', amount: 0.01, currency: 'USD', type: 'expense' },
  { date: '2022-08-31', description: 'Lunch: Salad Concept', amount: 9.85, currency: 'USD', type: 'expense' },
  { date: '2022-08-31', description: 'Paycheck', amount: 2972.44, currency: 'USD', type: 'income' },

  // Personal Savings & Investments (dates not specified in PDF, using generic placeholder)
  { date: '2022-08-31', description: 'Crypto Investment', amount: 435.00, currency: 'USD', type: 'expense' },
  { date: '2022-08-31', description: 'Emergency Savings', amount: 341.67, currency: 'USD', type: 'expense' },
];

// Summary Statistics
const summary = {
  totalTransactions: pdfTransactions.length,
  totalExpenses: pdfTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  totalIncome: pdfTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
  netBalance: pdfTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
              pdfTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
};

console.log(`Total Transactions: ${summary.totalTransactions}`);
console.log(`Total Expenses: $${summary.totalExpenses.toFixed(2)}`);
console.log(`Total Income: $${summary.totalIncome.toFixed(2)}`);
console.log(`Net Balance: $${summary.netBalance.toFixed(2)}`);
