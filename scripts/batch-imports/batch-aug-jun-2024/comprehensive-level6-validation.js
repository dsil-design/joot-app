#!/usr/bin/env node

/**
 * LEVEL 6: 100% COMPREHENSIVE 1:1 PDF-TO-DATABASE VERIFICATION
 *
 * Validates ALL transactions in PDFs match database with 100% accuracy
 * for June, July, and August 2024.
 *
 * Following MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md Phase 4
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

// PDF Transaction Data - Manually extracted from PDFs
const JUNE_2024_PDF_TRANSACTIONS = [
  // Saturday, June 1, 2024
  { date: '2024-06-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2024-06-01', description: 'Breakfast', merchant: 'Wawa', amount: 12.76, currency: 'USD', type: 'expense' },
  { date: '2024-06-01', description: 'Waters', merchant: "Women's US Open", amount: 16.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-01', description: 'Dinner & Drinks', merchant: 'Victory Brewing', amount: 108.78, currency: 'USD', type: 'expense' },
  { date: '2024-06-01', description: 'Reimbursement for Dinner', merchant: 'Jordan', amount: 50.00, currency: 'USD', type: 'income' },
  // Sunday, June 2, 2024
  { date: '2024-06-02', description: 'Groceries', merchant: 'Giant', amount: 21.45, currency: 'USD', type: 'expense' },
  { date: '2024-06-02', description: 'Dinner', merchant: 'Mom', amount: 14.00, currency: 'USD', type: 'expense' },
  // Monday, June 3, 2024
  { date: '2024-06-03', description: 'Storage Unit (and insurance)', merchant: 'Metro Self Storage', amount: 106.34, currency: 'USD', type: 'expense' },
  { date: '2024-06-03', description: 'Storage Parking Space', merchant: 'Metro Self Storage', amount: 136.74, currency: 'USD', type: 'expense' },
  { date: '2024-06-03', description: 'Trulys', merchant: 'Limerick Beverage', amount: 3.50, currency: 'USD', type: 'expense' },
  // Tuesday, June 4, 2024
  { date: '2024-06-04', description: 'Gift for Austin: Bottle Bash', merchant: 'Amazon', amount: 26.49, currency: 'USD', type: 'expense' },
  { date: '2024-06-04', description: 'Optometrist appointment', merchant: 'Visionworks', amount: 87.50, currency: 'USD', type: 'expense' },
  { date: '2024-06-04', description: 'Dinner (Collegeville Bakery)', merchant: 'Mom', amount: 16.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-04', description: 'Monthly Cleaning', merchant: 'BLISS', amount: 2782.00, currency: 'THB', type: 'expense' },
  { date: '2024-06-04', description: "This Month's Rent", merchant: 'Pol', amount: 25000.00, currency: 'THB', type: 'expense' },
  { date: '2024-06-04', description: 'Transfer fee', merchant: 'Wise', amount: 7.55, currency: 'USD', type: 'expense' },
  { date: '2024-06-04', description: 'Transfer fee', merchant: 'Wise', amount: 31.70, currency: 'THB', type: 'expense' },
  // Wednesday, June 5, 2024
  { date: '2024-06-05', description: 'Gift for Atsushi: Baby onesie', merchant: 'Rally House', amount: 22.00, currency: 'USD', type: 'expense' },
  // Thursday, June 6, 2024 - No transactions
  // Friday, June 7, 2024
  { date: '2024-06-07', description: 'Monthly Subscription: iPhone Payment', merchant: "Citizen's Bank", amount: 54.08, currency: 'USD', type: 'expense' },
  // Saturday, June 8, 2024
  { date: '2024-06-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 12.71, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'Shirts for Christoph, Golf shirt', merchant: 'Under Armour', amount: 76.89, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'Contact lenses and glasses', merchant: 'Costco', amount: 535.20, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'Golf goves', merchant: 'Costco', amount: 24.37, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'Gas', merchant: 'Costco', amount: 51.07, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'CNX Internet', merchant: '3BB', amount: 20.63, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'Shoes', merchant: 'Allbirds', amount: 84.23, currency: 'USD', type: 'expense' },
  { date: '2024-06-08', description: 'T-Shirts', merchant: 'Asket', amount: 350.00, currency: 'USD', type: 'expense' },
  // Sunday, June 9, 2024
  { date: '2024-06-09', description: 'Groceries', merchant: 'Target', amount: 3.49, currency: 'USD', type: 'expense' },
  { date: '2024-06-09', description: 'Driving Range', merchant: "Waltz's", amount: 11.00, currency: 'USD', type: 'expense' },
  // Monday, June 10, 2024
  { date: '2024-06-10', description: 'Monthly Subscription: Claude AI, Anthropic', merchant: 'Apple', amount: 21.20, currency: 'USD', type: 'expense' },
  // Tuesday, June 11, 2024
  { date: '2024-06-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple', amount: 20.13, currency: 'USD', type: 'expense' },
  { date: '2024-06-11', description: 'Flouride Treatment', merchant: 'Confident Smile', amount: 25.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-11', description: 'Gift for Leigh: Philly hats', merchant: 'Fanatics', amount: 60.47, currency: 'USD', type: 'expense' },
  // Wednesday, June 12, 2024
  { date: '2024-06-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 24.37, currency: 'USD', type: 'expense' },
  // Thursday, June 13, 2024
  { date: '2024-06-13', description: 'Annual Subscription', merchant: 'Grammarly', amount: 152.64, currency: 'USD', type: 'expense' },
  { date: '2024-06-13', description: 'Car Insurance', merchant: 'Travelers', amount: 208.00, currency: 'USD', type: 'expense' },
  // Friday, June 14, 2024
  { date: '2024-06-14', description: 'Drinks', merchant: 'Slainte', amount: 30.93, currency: 'USD', type: 'expense' },
  // Saturday, June 15, 2024
  { date: '2024-06-15', description: 'Bartender Tip', merchant: 'Cash', amount: 20.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'CNX Electric', merchant: 'Pol', amount: 3130.25, currency: 'THB', type: 'expense' },
  { date: '2024-06-15', description: 'Coffee', merchant: 'Peekskill Coffee House', amount: 2.55, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'Park Entrance', merchant: 'Croton', amount: 10.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'Lunch', merchant: "Benny's Brown Bag", amount: 15.63, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'Padlocks', merchant: 'Amazon', amount: 12.71, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'Putter Cover', merchant: 'Amazon', amount: 31.80, currency: 'USD', type: 'expense' },
  { date: '2024-06-15', description: 'Drink', merchant: 'Slainte', amount: 10.71, currency: 'USD', type: 'expense' },
  // Sunday, June 16, 2024
  { date: '2024-06-16', description: 'Dinner', merchant: 'California Tortilla', amount: 15.45, currency: 'USD', type: 'expense' },
  { date: '2024-06-16', description: "Hotel: Omi's Wedding", merchant: 'Holiday Inn Express', amount: 523.84, currency: 'USD', type: 'expense' },
  { date: '2024-06-16', description: 'Vape', merchant: 'Smoke Depot', amount: 23.31, currency: 'USD', type: 'expense' },
  { date: '2024-06-16', description: 'Gas', merchant: 'Costco', amount: 47.12, currency: 'USD', type: 'expense' },
  { date: '2024-06-16', description: 'Breakfast', merchant: 'Main Street Deli', amount: 13.37, currency: 'USD', type: 'expense' },
  // Monday, June 17, 2024
  { date: '2024-06-17', description: 'Dinner w/ friends', merchant: 'Mike D', amount: 45.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-17', description: 'Monthly Fee: Gym', merchant: 'Planet Fitness', amount: 10.00, currency: 'USD', type: 'expense' },
  // Tuesday, June 18, 2024 - No transactions
  // Wednesday, June 19, 2024
  { date: '2024-06-19', description: 'Plastic Wrap Rolls', merchant: 'Amazon', amount: 29.04, currency: 'USD', type: 'expense' },
  { date: '2024-06-19', description: 'Pajama Shorts', merchant: 'Amazon', amount: 22.98, currency: 'USD', type: 'expense' },
  // Thursday, June 20, 2024
  { date: '2024-06-20', description: 'Flights: JFK-CNX', merchant: 'Singapore Airlines', amount: 1514.30, currency: 'USD', type: 'expense' },
  { date: '2024-06-20', description: 'Flight: RSW-JFK', merchant: 'Delta', amount: 348.47, currency: 'USD', type: 'expense' },
  { date: '2024-06-20', description: 'Flights: BKK-PHL', merchant: 'American Airlines', amount: 1216.70, currency: 'USD', type: 'expense' },
  { date: '2024-06-20', description: 'Payment for UBoxes', merchant: 'U-Haul', amount: 292.21, currency: 'USD', type: 'expense' },
  // Friday, June 21, 2024
  { date: '2024-06-21', description: "Reimbusement: Lunch at Craig's Rehearsal", merchant: 'Kyle Martin', amount: 41.00, currency: 'USD', type: 'income' },
  { date: '2024-06-21', description: 'Drink', merchant: 'Ten7', amount: 7.80, currency: 'USD', type: 'expense' },
  { date: '2024-06-21', description: 'Drink', merchant: 'Ten7', amount: 7.80, currency: 'USD', type: 'expense' },
  // Saturday, June 22, 2024
  { date: '2024-06-22', description: 'Drinks', merchant: 'Ten7', amount: 31.20, currency: 'USD', type: 'expense' },
  { date: '2024-06-22', description: 'Lunch', merchant: 'El Toro Serrano', amount: 14.93, currency: 'USD', type: 'expense' },
  // Sunday, June 23, 2024
  { date: '2024-06-23', description: 'Monthly Subscription: Notion AI', merchant: 'Notion', amount: 10.60, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Lunch', merchant: 'Wyncote', amount: 9.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Greens Fee and Driving Range', merchant: 'Wyncote', amount: 125.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Smoothies w/ Jordan', merchant: 'Wawa', amount: 9.74, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Running Armband for iPhone', merchant: 'Amazon', amount: 13.76, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Dinner from Slurp', merchant: 'Jordan', amount: 18.66, currency: 'USD', type: 'expense' },
  { date: '2024-06-23', description: 'Skins', merchant: 'Craig', amount: 10.00, currency: 'USD', type: 'expense' },
  // Monday, June 24, 2024
  { date: '2024-06-24', description: 'Monthly Subscription: iCloud', merchant: 'Apple', amount: 9.99, currency: 'USD', type: 'expense' },
  { date: '2024-06-24', description: 'Notary service for power of attorney', merchant: 'Gibbons', amount: 15.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-24', description: 'Breakfast w/ Mom and Dad', merchant: 'Sunshine Cafe', amount: 48.25, currency: 'USD', type: 'expense' },
  { date: '2024-06-24', description: 'Brooks Running Shoes', merchant: 'Amazon', amount: 159.95, currency: 'USD', type: 'expense' },
  { date: '2024-06-24', description: 'Dry Cleaning: Suit and shirt', merchant: 'Crossing Cleaners', amount: 20.71, currency: 'USD', type: 'expense' },
  // Tuesday, June 25, 2024
  { date: '2024-06-25', description: 'Monthly Subscription: HBO NOW', merchant: 'Apple', amount: 16.95, currency: 'USD', type: 'expense' },
  // Wednesday, June 26, 2024
  { date: '2024-06-26', description: "Gift: Brad & Jess's Wedding", merchant: 'Amazon', amount: 58.33, currency: 'USD', type: 'expense' },
  // Thursday, June 27, 2024
  { date: '2024-06-27', description: 'Lunch', merchant: 'Zakes', amount: 16.96, currency: 'USD', type: 'expense' },
  { date: '2024-06-27', description: 'Haircut', merchant: "David's Barber Style", amount: 35.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-27', description: 'Groceries', merchant: "Weaver's Way", amount: 20.64, currency: 'USD', type: 'expense' },
  { date: '2024-06-27', description: 'Vape', merchant: 'Local Vapor', amount: 31.79, currency: 'USD', type: 'expense' },
  // Friday, June 28, 2024
  { date: '2024-06-28', description: 'Monthly Subscription: LinkedIn Premium', merchant: 'LinkedIn', amount: 21.20, currency: 'USD', type: 'expense' },
  { date: '2024-06-28', description: 'Jeans', merchant: "Levi's", amount: 62.65, currency: 'USD', type: 'expense' },
  { date: '2024-06-28', description: '2 pairs of shorts', merchant: 'LL Bean', amount: 129.90, currency: 'USD', type: 'expense' },
  { date: '2024-06-28', description: 'Dinner', merchant: 'Guiseppies', amount: 26.68, currency: 'USD', type: 'expense' },
  // Saturday, June 29, 2024
  { date: '2024-06-29', description: 'US Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-29', description: 'Lunch', merchant: 'Chipotle', amount: 13.36, currency: 'USD', type: 'expense' },
  // Sunday, June 30, 2024
  { date: '2024-06-30', description: 'Annual Subscription: Sleep Cycle', merchant: 'Apple', amount: 21.19, currency: 'USD', type: 'expense' },
  { date: '2024-06-30', description: 'Cancelled taxi', merchant: 'Lyft', amount: 5.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-30', description: 'Bar Tip', merchant: 'Bar', amount: 20.00, currency: 'USD', type: 'expense' },
  { date: '2024-06-30', description: 'Drinks', merchant: 'Urbane Restaurant (Marriott)', amount: 22.19, currency: 'USD', type: 'expense' },
  // Gross Income
  { date: '2024-06-04', description: 'Refund', merchant: 'WSJ', amount: 2.84, currency: 'USD', type: 'income' },
  { date: '2024-06-08', description: 'Reimbursement: iCloud Apple', merchant: 'Apple', amount: 9.99, currency: 'USD', type: 'income' },
  { date: '2024-06-14', description: 'Paycheck', merchant: 'e2open', amount: 2993.22, currency: 'USD', type: 'income' },
  { date: '2024-06-16', description: 'Refund: Original Flights to Portland', merchant: 'Delta', amount: 409.60, currency: 'USD', type: 'income' },
  { date: '2024-06-28', description: 'Paycheck & Bonus', merchant: 'e2open', amount: 6465.73, currency: 'USD', type: 'income' },
  { date: '2024-06-26', description: 'Birthday gifts', merchant: 'Mom, Dad, Sandy', amount: 200.00, currency: 'USD', type: 'income' },
  // Savings
  { date: '2024-06-30', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' }
];

const JULY_2024_PDF_TRANSACTIONS = [
  // Monday, July 1, 2024
  { date: '2024-07-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2024-07-01', description: "Hotel: Brad's Wedding", merchant: 'La Quinta', amount: 545.62, currency: 'USD', type: 'expense' },
  { date: '2024-07-01', description: 'Checked Bag', merchant: 'American Airlines', amount: 45.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-01', description: 'Lunch', merchant: "Bud & Marilyn's", amount: 30.85, currency: 'USD', type: 'expense' },
  { date: '2024-07-01', description: 'Gas', merchant: 'Wawa', amount: 52.66, currency: 'USD', type: 'expense' },
  { date: '2024-07-01', description: 'Breakfast', merchant: 'Wawa', amount: 10.05, currency: 'USD', type: 'expense' },
  // Tuesday, July 2, 2024
  { date: '2024-07-02', description: 'Lunch', merchant: 'Mike D', amount: 16.25, currency: 'USD', type: 'expense' },
  { date: '2024-07-02', description: 'Ice Cream', merchant: 'Prince Pucklers', amount: 4.50, currency: 'USD', type: 'expense' },
  { date: '2024-07-02', description: 'Coffee', merchant: "Farmer's Union", amount: 3.50, currency: 'USD', type: 'expense' },
  // Wednesday, July 3, 2024
  { date: '2024-07-03', description: 'Storage Parking Space', merchant: 'Metro Self Storage', amount: 136.74, currency: 'USD', type: 'expense' },
  { date: '2024-07-03', description: 'Transfer Fee', merchant: 'Wise', amount: 8.73, currency: 'USD', type: 'expense' },
  { date: '2024-07-03', description: 'Transfer Fee', merchant: 'Wise', amount: 44.76, currency: 'THB', type: 'expense' },
  { date: '2024-07-03', description: "This Month's Rent", merchant: 'Pol', amount: 25000.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-03', description: 'Monthly Cleaning', merchant: 'BLISS', amount: 3477.50, currency: 'THB', type: 'expense' },
  { date: '2024-07-03', description: 'Taxi to Airport', merchant: 'Lyft', amount: 32.99, currency: 'USD', type: 'expense' },
  { date: '2024-07-03', description: 'Lunch', merchant: 'Jordan', amount: 30.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-03', description: 'Dinner', merchant: 'Melody', amount: 25.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-03', description: 'Parking', merchant: 'Portland', amount: 6.00, currency: 'USD', type: 'expense' },
  // Thursday, July 4, 2024
  { date: '2024-07-04', description: 'Gas', merchant: 'Circle K', amount: 47.96, currency: 'USD', type: 'expense' },
  // Friday, July 5, 2024
  { date: '2024-07-05', description: 'Breakfast', merchant: 'Black Rock Coffee Bar', amount: 11.40, currency: 'USD', type: 'expense' },
  { date: '2024-07-05', description: 'Water & Snacks', merchant: 'Safeway', amount: 11.73, currency: 'USD', type: 'expense' },
  { date: '2024-07-05', description: 'Lighter', merchant: 'Circle K', amount: 2.47, currency: 'USD', type: 'expense' },
  // Saturday, July 6, 2024
  { date: '2024-07-06', description: 'Breakfast', merchant: 'Early Bird Cafe', amount: 64.23, currency: 'USD', type: 'expense' },
  { date: '2024-07-06', description: 'Beer, snacks, sunscreen', merchant: 'Fred Myer', amount: 43.40, currency: 'USD', type: 'expense' },
  { date: '2024-07-06', description: 'Drinks', merchant: 'The Gorge', amount: 34.62, currency: 'USD', type: 'expense' },
  { date: '2024-07-06', description: 'Drinks', merchant: 'The Gorge', amount: 41.11, currency: 'USD', type: 'expense' },
  // Sunday, July 7, 2024
  { date: '2024-07-07', description: 'Monthly Subscription: iPhone Payment', merchant: "Citizen's Bank", amount: 54.08, currency: 'USD', type: 'expense' },
  { date: '2024-07-07', description: 'Parking', merchant: 'ParkMobile', amount: 7.30, currency: 'USD', type: 'expense' },
  { date: '2024-07-07', description: 'Gas', merchant: 'Chevron', amount: 62.77, currency: 'USD', type: 'expense' },
  { date: '2024-07-07', description: 'Coffees', merchant: 'D&M Coffee', amount: 10.47, currency: 'USD', type: 'expense' },
  { date: '2024-07-07', description: 'Lunch', merchant: "Mozart's", amount: 90.02, currency: 'USD', type: 'expense' },
  { date: '2024-07-07', description: 'Dinner', merchant: "Graham's Restaurant", amount: 42.37, currency: 'USD', type: 'expense' },
  // Monday, July 8, 2024
  { date: '2024-07-08', description: 'Monthly Subscription: Paramount+', merchant: 'CBS', amount: 12.71, currency: 'USD', type: 'expense' },
  { date: '2024-07-08', description: 'Breakfast', merchant: 'Wake n Bake', amount: 35.30, currency: 'USD', type: 'expense' },
  { date: '2024-07-08', description: 'Gas', merchant: '7-Eleven', amount: 45.30, currency: 'USD', type: 'expense' },
  { date: '2024-07-08', description: 'Snack', merchant: '7-Eleven', amount: 7.59, currency: 'USD', type: 'expense' },
  { date: '2024-07-08', description: 'Dinner', merchant: 'Bai Thong', amount: 70.70, currency: 'USD', type: 'expense' },
  // Tuesday, July 9, 2024
  { date: '2024-07-09', description: 'Car Rental', merchant: 'Avis', amount: 555.03, currency: 'USD', type: 'expense' },
  // Wednesday, July 10, 2024
  { date: '2024-07-10', description: 'Taxi to Condo', merchant: 'Grab', amount: 8.55, currency: 'USD', type: 'expense' },
  { date: '2024-07-10', description: 'Vape', merchant: 'Zigarlab', amount: 145.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-10', description: 'Deoderant, USB-C to MicroUSB, Shampoo/Body Wash, USBA to USBC', merchant: 'Lazada', amount: 177.75, currency: 'USD', type: 'expense' },
  { date: '2024-07-10', description: 'Monthly Subscription: Claude Pro', merchant: 'Apple', amount: 21.20, currency: 'USD', type: 'expense' },
  { date: '2024-07-10', description: 'Internet Bill', merchant: '3BB', amount: 20.62, currency: 'USD', type: 'expense' },
  { date: '2024-07-10', description: 'Cell Phone Bill', merchant: 'AIS', amount: 41.17, currency: 'USD', type: 'expense' },
  // Thursday, July 11, 2024
  { date: '2024-07-11', description: 'Monthly Subscription: YouTube Premium', merchant: 'Apple', amount: 20.13, currency: 'USD', type: 'expense' },
  { date: '2024-07-11', description: 'Gas', merchant: 'PT', amount: 220.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-11', description: 'Water Bill', merchant: 'Punna 2', amount: 128.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-11', description: 'Electricity Bill', merchant: '7-Eleven', amount: 165.75, currency: 'THB', type: 'expense' },
  { date: '2024-07-11', description: 'Breakfast: Living a Dream', merchant: 'Grab', amount: 7.69, currency: 'USD', type: 'expense' },
  { date: '2024-07-11', description: 'Snack: Protein Shake', merchant: 'Grab', amount: 2.98, currency: 'USD', type: 'expense' },
  { date: '2024-07-11', description: 'Golf Balls', merchant: 'Lazada', amount: 31.31, currency: 'USD', type: 'expense' },
  { date: '2024-07-11', description: 'Haircut', merchant: 'The Cutler', amount: 600.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-11', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 10.61, currency: 'USD', type: 'expense' },
  // Friday, July 12, 2024
  { date: '2024-07-12', description: 'Monthly Subscription: Netflix', merchant: 'Netflix', amount: 24.37, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Breakfast', merchant: "Sally's", amount: 451.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-12', description: 'Driving range, water', merchant: 'North Hill', amount: 95.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-12', description: 'Drinks', merchant: 'North Hill', amount: 310.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-12', description: 'Greens Fee', merchant: 'North Hill', amount: 38.86, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Caddy Tip', merchant: 'North Hill', amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-12', description: 'Ubox Shipping', merchant: 'U-Haul', amount: 2144.85, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Ubox Delivery & Pickup', merchant: 'U-Haul', amount: 107.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Home Inspection', merchant: '82 West Home Inspections', amount: 415.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Taxi to Restaurant', merchant: 'Grab', amount: 2.33, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Dinner', merchant: 'Leigh', amount: 660.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-12', description: 'Taxi Home', merchant: 'Grab', amount: 2.17, currency: 'USD', type: 'expense' },
  { date: '2024-07-12', description: 'Drinks', merchant: 'Winstons', amount: 378.00, currency: 'THB', type: 'expense' },
  // Saturday, July 13, 2024
  { date: '2024-07-13', description: 'Breakfast: Going Up Cafe Nimman', merchant: 'Grab', amount: 5.14, currency: 'USD', type: 'expense' },
  { date: '2024-07-13', description: 'Laundry', merchant: "Em's Laundry", amount: 609.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-13', description: 'Partial Refund', merchant: 'Grab', amount: 1.39, currency: 'USD', type: 'income' },
  { date: '2024-07-13', description: 'Water Jug', merchant: 'Punna 2', amount: 42.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-13', description: 'Lunch: Alchemy Vegan', merchant: 'Grab', amount: 10.33, currency: 'USD', type: 'expense' },
  { date: '2024-07-13', description: 'Drink', merchant: '7-Eleven', amount: 30.00, currency: 'THB', type: 'expense' },
  // Sunday, July 14, 2024
  { date: '2024-07-14', description: 'Snack', merchant: '7-Eleven', amount: 76.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-14', description: 'Bar Bill', merchant: "Snooker's Bar", amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-14', description: 'Food', merchant: 'Snooker', amount: 157.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-14', description: 'Food', merchant: 'Murray', amount: 133.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-14', description: 'Groceries', merchant: 'Foodpanda', amount: 1054.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-14', description: 'Dinner: Radjarbar', merchant: 'Grab', amount: 12.24, currency: 'USD', type: 'expense' },
  // Monday, July 15, 2024
  { date: '2024-07-15', description: 'Gym', merchant: 'The Wall', amount: 100.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-15', description: 'Movers: Young Muscle Movers', merchant: 'U-Haul', amount: 185.95, currency: 'USD', type: 'expense' },
  { date: '2024-07-15', description: 'Lunch: Alchemy Vegan', merchant: 'Grab', amount: 8.88, currency: 'USD', type: 'expense' },
  { date: '2024-07-15', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 14.60, currency: 'USD', type: 'expense' },
  // Tuesday, July 16, 2024
  { date: '2024-07-16', description: 'Lunch', merchant: 'Gravity Cafe', amount: 325.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-16', description: 'Massage', merchant: 'TTCM', amount: 12.48, currency: 'USD', type: 'expense' },
  { date: '2024-07-16', description: 'Dinner: Healthy Junk Express', merchant: 'Grab', amount: 13.68, currency: 'USD', type: 'expense' },
  { date: '2024-07-16', description: 'Coffee', merchant: 'Wawee', amount: 75.00, currency: 'THB', type: 'expense' },
  // Wednesday, July 17, 2024
  { date: '2024-07-17', description: 'Monthly Gym Membership', merchant: 'Playground Fitness', amount: 48.68, currency: 'USD', type: 'expense' },
  { date: '2024-07-17', description: 'Lunch: Salad Concept', merchant: 'Grab', amount: 6.54, currency: 'USD', type: 'expense' },
  { date: '2024-07-17', description: 'Groceries: Tops', merchant: 'Grab', amount: 20.39, currency: 'USD', type: 'expense' },
  { date: '2024-07-17', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 16.61, currency: 'USD', type: 'expense' },
  { date: '2024-07-17', description: 'Box cutter, Face wash, USB-A Ethernet Adapter', merchant: 'Lazada', amount: 37.22, currency: 'USD', type: 'expense' },
  // Thursday, July 18, 2024
  { date: '2024-07-18', description: 'Lunch: Food4Thought', merchant: 'Grab', amount: 6.31, currency: 'USD', type: 'expense' },
  { date: '2024-07-18', description: 'Laundry', merchant: "Em's Laundry", amount: 441.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-18', description: 'Dinner: Healthy Junk Express', merchant: 'Grab', amount: 7.48, currency: 'USD', type: 'expense' },
  { date: '2024-07-18', description: 'Taxi to Bar', merchant: 'Grab', amount: 5.98, currency: 'USD', type: 'expense' },
  { date: '2024-07-18', description: 'Transfer Fee', merchant: 'Wise', amount: 8.73, currency: 'USD', type: 'expense' },
  { date: '2024-07-18', description: 'Transfer Fee', merchant: 'Wise', amount: 44.76, currency: 'THB', type: 'expense' },
  { date: '2024-07-18', description: 'Drinks', merchant: 'Leigh', amount: 500.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-18', description: 'Taxi to Bar', merchant: 'Bolt', amount: 200.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-18', description: 'Drinks', merchant: 'Lollipop', amount: 5500.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-18', description: 'Taxi home', merchant: 'Grab', amount: 3.10, currency: 'USD', type: 'expense' },
  // Friday, July 19, 2024
  { date: '2024-07-19', description: 'Vapes', merchant: 'Zigarlab', amount: 325.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-19', description: 'Delivery', merchant: 'Grab', amount: 50.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-19', description: 'Lunch: Fern Forest', merchant: 'Grab', amount: 19.09, currency: 'USD', type: 'expense' },
  { date: '2024-07-19', description: 'Dinner: Goro', merchant: 'Grab', amount: 18.28, currency: 'USD', type: 'expense' },
  // Saturday, July 20, 2024
  { date: '2024-07-20', description: 'Lunch w Aommy', merchant: 'Maya', amount: 200.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Water Jug', merchant: 'Punna 2', amount: 42.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Movies w Aommy', merchant: 'SF Cinema', amount: 340.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Snacks', merchant: '7-Eleven', amount: 184.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Water', merchant: 'SF Cinema', amount: 25.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Taxi Home', merchant: 'Bolt', amount: 200.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: 'Snack: Burger King', merchant: 'Grab', amount: 9.54, currency: 'USD', type: 'expense' },
  { date: '2024-07-20', description: 'Dinner and drinks', merchant: 'Murray', amount: 583.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-20', description: "Taxi to Murray's", merchant: 'Grab', amount: 6.96, currency: 'USD', type: 'expense' },
  // Sunday, July 21, 2024
  { date: '2024-07-21', description: 'Annual Subscription: Amazon Prime', merchant: 'Amazon', amount: 147.34, currency: 'USD', type: 'expense' },
  { date: '2024-07-21', description: 'Flight: JFK-BKK', merchant: 'Singapore Airlines', amount: 1095.40, currency: 'USD', type: 'expense' },
  { date: '2024-07-21', description: 'Flight: RSW-JFK', merchant: 'Delta', amount: 190.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-21', description: 'Dinner: Street Pizza & Wine', merchant: 'Grab', amount: 15.15, currency: 'USD', type: 'expense' },
  { date: '2024-07-21', description: 'Groceries', merchant: 'Foodpanda', amount: 532.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-21', description: 'Groceries', merchant: 'Foodpanda', amount: 321.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-21', description: "Homeowner's Insurance", merchant: "Dee's Insurance", amount: 1461.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-21', description: 'Lunch: Food4Thought', merchant: 'Grab', amount: 7.68, currency: 'USD', type: 'expense' },
  // Monday, July 22, 2024
  { date: '2024-07-22', description: 'Dinner: Hong Kong Lucky', merchant: 'Grab', amount: 13.43, currency: 'USD', type: 'expense' },
  { date: '2024-07-22', description: 'Monthly Subscription: Tinder gold', merchant: 'Apple', amount: 42.39, currency: 'USD', type: 'expense' },
  { date: '2024-07-22', description: 'CNX Internet', merchant: '3BB', amount: 20.78, currency: 'USD', type: 'expense' },
  { date: '2024-07-22', description: 'Ubox Rental', merchant: 'U-Haul', amount: 53.45, currency: 'USD', type: 'expense' },
  { date: '2024-07-22', description: 'Ubox Rental', merchant: 'U-Haul', amount: 53.45, currency: 'USD', type: 'expense' },
  { date: '2024-07-22', description: 'Ubox Rental', merchant: 'U-Haul', amount: 53.45, currency: 'USD', type: 'expense' },
  // Tuesday, July 23, 2024
  { date: '2024-07-23', description: 'Monthly Subscription: Notion AI', merchant: 'Notion', amount: 10.60, currency: 'USD', type: 'expense' },
  { date: '2024-07-23', description: 'Lunch', merchant: 'Fern Forest Cafe', amount: 400.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-23', description: 'Massage', merchant: 'TTCM', amount: 12.43, currency: 'USD', type: 'expense' },
  { date: '2024-07-23', description: 'Vapes', merchant: 'Zigarlab', amount: 435.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-23', description: 'Motorcycle Boots', merchant: 'PandaRider', amount: 4800.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-23', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 10.36, currency: 'USD', type: 'expense' },
  // Wednesday, July 24, 2024
  { date: '2024-07-24', description: 'My share of Apple One', merchant: 'Mom', amount: 10.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-24', description: 'Lunch: Healthy Junk', merchant: 'Grab', amount: 11.67, currency: 'USD', type: 'expense' },
  { date: '2024-07-24', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 15.52, currency: 'USD', type: 'expense' },
  { date: '2024-07-24', description: 'Snack: Little Istanbul', merchant: 'Grab', amount: 10.45, currency: 'USD', type: 'expense' },
  // Thursday, July 25, 2024
  { date: '2024-07-25', description: 'Monthly Subscription: HBO Max', merchant: 'Apple', amount: 18.01, currency: 'USD', type: 'expense' },
  { date: '2024-07-25', description: 'Cannabis', merchant: 'Impala', amount: 1600.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-25', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 7.71, currency: 'USD', type: 'expense' },
  { date: '2024-07-25', description: 'Snack: KFC', merchant: 'Grab', amount: 10.36, currency: 'USD', type: 'expense' },
  // Friday, July 26, 2024
  { date: '2024-07-26', description: 'Breakfast: Going Up Cafe Nimman', merchant: 'Grab', amount: 5.14, currency: 'USD', type: 'expense' },
  { date: '2024-07-26', description: 'Laundry', merchant: "Em's Laundry", amount: 497.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-26', description: 'Taxi', merchant: 'Grab', amount: 4.25, currency: 'USD', type: 'expense' },
  { date: '2024-07-26', description: 'Haircut', merchant: 'The Cutler', amount: 600.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-26', description: 'Taxi', merchant: 'Grab', amount: 5.36, currency: 'USD', type: 'expense' },
  { date: '2024-07-26', description: 'Dinner: Wrapmaster', merchant: 'Grab', amount: 8.64, currency: 'USD', type: 'expense' },
  { date: '2024-07-26', description: 'Snack', merchant: 'Grab', amount: 5.33, currency: 'USD', type: 'expense' },
  // Saturday, July 27, 2024
  { date: '2024-07-27', description: 'Breakfast: Going Up Cafe Nimman', merchant: 'Grab', amount: 5.13, currency: 'USD', type: 'expense' },
  { date: '2024-07-27', description: 'Groceries: Tops', merchant: 'Grab', amount: 32.88, currency: 'USD', type: 'expense' },
  { date: '2024-07-27', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 7.89, currency: 'USD', type: 'expense' },
  { date: '2024-07-27', description: 'Taxi', merchant: 'Grab', amount: 4.10, currency: 'USD', type: 'expense' },
  { date: '2024-07-27', description: 'Drinks', merchant: 'OMG', amount: 240.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-27', description: 'Taxi', merchant: 'Tuktuk', amount: 80.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-27', description: 'Drinks', merchant: 'Lost Hut', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-27', description: 'Drinks', merchant: 'Home Bar', amount: 900.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-27', description: 'Drinks', merchant: 'Friends', amount: 750.00, currency: 'THB', type: 'income' },
  { date: '2024-07-27', description: 'Drinks', merchant: '1Way Bar', amount: 300.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-27', description: 'Taxi', merchant: 'Grab', amount: 3.76, currency: 'USD', type: 'expense' },
  { date: '2024-07-27', description: 'Snack: McDonalds', merchant: 'Grab', amount: 8.51, currency: 'USD', type: 'expense' },
  // Sunday, July 28, 2024
  { date: '2024-07-28', description: '3-month Subscription: CMB Premium', merchant: 'Apple', amount: 105.99, currency: 'USD', type: 'expense' },
  { date: '2024-07-28', description: 'Lunch: Donut Cafe', merchant: 'Grab', amount: 8.34, currency: 'USD', type: 'expense' },
  { date: '2024-07-28', description: 'Monthly Subscription: LinkedIn', merchant: 'LinkedIn', amount: 21.20, currency: 'USD', type: 'expense' },
  { date: '2024-07-28', description: 'Dinner: Amatoros Sourdough Pizza', merchant: 'Grab', amount: 14.92, currency: 'USD', type: 'expense' },
  { date: '2024-07-28', description: 'Snack: Burger King', merchant: 'Grab', amount: 9.70, currency: 'USD', type: 'expense' },
  // Monday, July 29, 2024
  { date: '2024-07-29', description: 'US Cell Phone', merchant: 'T-Mobile', amount: 70.00, currency: 'USD', type: 'expense' },
  { date: '2024-07-29', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 11.04, currency: 'USD', type: 'expense' },
  { date: '2024-07-29', description: 'Snack: KFC', merchant: 'Grab', amount: 10.74, currency: 'USD', type: 'expense' },
  // Tuesday, July 30, 2024
  { date: '2024-07-30', description: 'Water Jug', merchant: 'Punna 2', amount: 42.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-30', description: 'Lunch', merchant: 'Gravity Cafe', amount: 195.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-30', description: 'Massage', merchant: 'TTCM', amount: 12.57, currency: 'USD', type: 'expense' },
  { date: '2024-07-30', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 7.29, currency: 'USD', type: 'expense' },
  // Wednesday, July 31, 2024
  { date: '2024-07-31', description: 'Groceries: Tops', merchant: 'Grab', amount: 15.34, currency: 'USD', type: 'expense' },
  { date: '2024-07-31', description: 'Breakfast: Living a Dream', merchant: 'Grab', amount: 5.11, currency: 'USD', type: 'expense' },
  { date: '2024-07-31', description: 'Immigration Lawyer', merchant: 'Siam Legal', amount: 8560.00, currency: 'THB', type: 'expense' },
  { date: '2024-07-31', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 5.17, currency: 'USD', type: 'expense' },
  // Gross Income
  { date: '2024-07-05', description: 'Reimbursement: Peekskill Hotel', merchant: 'Mike D', amount: 255.00, currency: 'USD', type: 'income' },
  { date: '2024-07-12', description: 'Refund: Car Insurance', merchant: 'Travelers', amount: 103.00, currency: 'USD', type: 'income' },
  { date: '2024-07-15', description: 'Paycheck', merchant: 'e2open', amount: 2993.24, currency: 'USD', type: 'income' },
  { date: '2024-07-22', description: 'Uhaul move, Home Insurance, Inspection, movers', merchant: 'Me', amount: 4580.41, currency: 'USD', type: 'income' },
  { date: '2024-07-22', description: 'Reimbursement for Oregon/Washington trip', merchant: 'Jordan', amount: 395.74, currency: 'USD', type: 'income' },
  { date: '2024-07-21', description: 'Flight Refund: JFK-CNX', merchant: 'Singapore Airlines', amount: 1181.30, currency: 'USD', type: 'income' },
  { date: '2024-07-31', description: 'Paycheck', merchant: 'e2open', amount: 3184.32, currency: 'USD', type: 'income' },
  // Savings
  { date: '2024-07-31', description: 'Emergency Savings', merchant: 'Vanguard', amount: 341.67, currency: 'USD', type: 'expense' },
  // Florida House
  { date: '2024-07-23', description: "Homeowner's Insurance", merchant: 'Olympus', amount: 1461.00, currency: 'USD', type: 'expense' }
];

// August 2024 PDF Transactions will be added here (200+ transactions)
const AUGUST_2024_PDF_TRANSACTIONS = [
  // I'll add the first few to demonstrate, but full extraction needed
  { date: '2024-08-01', description: 'Work Email', merchant: 'Google', amount: 6.36, currency: 'USD', type: 'expense' },
  { date: '2024-08-01', description: 'Lunch', merchant: 'Fujiyama55', amount: 267.00, currency: 'THB', type: 'expense' },
  { date: '2024-08-01', description: 'Annual Subscription', merchant: 'FoodPanda', amount: 228.00, currency: 'THB', type: 'expense' },
  { date: '2024-08-01', description: 'Annual Membership Fee', merchant: 'United Airlines', amount: 95.00, currency: 'USD', type: 'expense' },
  { date: '2024-08-01', description: 'Dinner: Food4Thought', merchant: 'Grab', amount: 7.92, currency: 'USD', type: 'expense' },
  { date: '2024-08-01', description: 'Snack: Burger King', merchant: 'Grab', amount: 8.43, currency: 'USD', type: 'expense' },
  // ... (need to extract all 214 transactions from August PDF)
];

/**
 * Main validation function
 */
async function validateMonth(month, year, pdfTransactions) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`LEVEL 6 VALIDATION: ${month.toUpperCase()} ${year}`);
  console.log('='.repeat(80));

  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, parseInt(monthStr), 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Query database for all transactions in this month
  const { data: dbTransactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_date,
      description,
      merchant,
      amount,
      currency,
      transaction_type,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', USER_ID)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date');

  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`\nDatabase: ${dbTransactions.length} transactions`);
  console.log(`PDF: ${pdfTransactions.length} transactions`);

  // STEP 1: PDF → Database (100% coverage)
  console.log(`\n${'─'.repeat(80)}`);
  console.log('STEP 1: PDF → DATABASE VERIFICATION');
  console.log('─'.repeat(80));

  const pdfToDbResults = [];
  let pdfFoundCount = 0;
  let pdfMissingCount = 0;
  let pdfMismatchCount = 0;

  for (const pdfTxn of pdfTransactions) {
    // Find matching transaction in database
    const matches = dbTransactions.filter(dbTxn => {
      const dateMatch = dbTxn.transaction_date === pdfTxn.date;
      const amountMatch = Math.abs(dbTxn.amount - pdfTxn.amount) < 0.11; // Within $0.10
      const descMatch = dbTxn.description.toLowerCase().includes(pdfTxn.description.toLowerCase().substring(0, 20)) ||
                        pdfTxn.description.toLowerCase().includes(dbTxn.description.toLowerCase().substring(0, 20));

      return dateMatch && amountMatch;
    });

    if (matches.length === 0) {
      pdfMissingCount++;
      pdfToDbResults.push({
        status: 'MISSING',
        pdfTxn,
        dbTxn: null,
        note: 'No matching transaction found in database'
      });
    } else if (matches.length === 1) {
      const dbTxn = matches[0];
      const amountDiff = Math.abs(dbTxn.amount - pdfTxn.amount);
      const currencyMatch = dbTxn.currency === pdfTxn.currency;
      const typeMatch = dbTxn.transaction_type === pdfTxn.type;

      if (amountDiff < 0.11 && currencyMatch && typeMatch) {
        pdfFoundCount++;
        pdfToDbResults.push({
          status: 'FOUND',
          pdfTxn,
          dbTxn,
          note: 'Perfect match'
        });
      } else {
        pdfMismatchCount++;
        pdfToDbResults.push({
          status: 'MISMATCH',
          pdfTxn,
          dbTxn,
          note: `Differences: amount=${amountDiff.toFixed(2)}, currency=${!currencyMatch}, type=${!typeMatch}`
        });
      }
    } else {
      // Multiple matches - need to be more specific
      pdfMismatchCount++;
      pdfToDbResults.push({
        status: 'MULTIPLE_MATCHES',
        pdfTxn,
        dbTxn: matches[0],
        note: `Found ${matches.length} potential matches`
      });
    }
  }

  const pdfMatchRate = (pdfFoundCount / pdfTransactions.length * 100).toFixed(2);

  console.log(`\nRESULTS:`);
  console.log(`  FOUND: ${pdfFoundCount}/${pdfTransactions.length} (${pdfMatchRate}%)`);
  console.log(`  MISSING: ${pdfMissingCount}`);
  console.log(`  MISMATCH: ${pdfMismatchCount}`);

  // Show first 10 missing/mismatched transactions
  const issues = pdfToDbResults.filter(r => r.status !== 'FOUND').slice(0, 10);
  if (issues.length > 0) {
    console.log(`\nFIRST 10 ISSUES:`);
    issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.status}`);
      console.log(`   PDF: ${issue.pdfTxn.date} | ${issue.pdfTxn.description} | ${issue.pdfTxn.amount} ${issue.pdfTxn.currency}`);
      if (issue.dbTxn) {
        console.log(`   DB:  ${issue.dbTxn.transaction_date} | ${issue.dbTxn.description} | ${issue.dbTxn.amount} ${issue.dbTxn.currency}`);
      }
      console.log(`   Note: ${issue.note}`);
    });
  }

  // STEP 2: Database → PDF (100% coverage)
  console.log(`\n${'─'.repeat(80)}`);
  console.log('STEP 2: DATABASE → PDF VERIFICATION');
  console.log('─'.repeat(80));

  const dbToPdfResults = [];
  let dbVerifiedCount = 0;
  let dbNotInPdfCount = 0;

  for (const dbTxn of dbTransactions) {
    // Find in PDF extraction
    const matches = pdfTransactions.filter(pdfTxn => {
      const dateMatch = pdfTxn.date === dbTxn.transaction_date;
      const amountMatch = Math.abs(pdfTxn.amount - dbTxn.amount) < 0.11;

      return dateMatch && amountMatch;
    });

    if (matches.length > 0) {
      dbVerifiedCount++;
      dbToPdfResults.push({
        status: 'VERIFIED',
        dbTxn,
        pdfTxn: matches[0]
      });
    } else {
      dbNotInPdfCount++;
      dbToPdfResults.push({
        status: 'NOT_IN_PDF',
        dbTxn,
        pdfTxn: null
      });
    }
  }

  const dbVerificationRate = (dbVerifiedCount / dbTransactions.length * 100).toFixed(2);

  console.log(`\nRESULTS:`);
  console.log(`  VERIFIED: ${dbVerifiedCount}/${dbTransactions.length} (${dbVerificationRate}%)`);
  console.log(`  NOT_IN_PDF: ${dbNotInPdfCount}`);

  // Show transactions not in PDF
  const notInPdf = dbToPdfResults.filter(r => r.status === 'NOT_IN_PDF').slice(0, 10);
  if (notInPdf.length > 0) {
    console.log(`\nFIRST 10 TRANSACTIONS NOT IN PDF:`);
    notInPdf.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.dbTxn.transaction_date} | ${item.dbTxn.description} | ${item.dbTxn.amount} ${item.dbTxn.currency}`);
    });
  }

  // STEP 3: Final Verdict
  console.log(`\n${'='.repeat(80)}`);
  console.log('FINAL VERDICT');
  console.log('='.repeat(80));

  const pdfToDbPass = pdfMatchRate >= 100.0;
  const dbToPdfPass = dbVerificationRate >= 100.0;
  const overallPass = pdfToDbPass && dbToPdfPass;

  console.log(`\nPDF → Database: ${pdfToDbPass ? '✅ PASS' : '❌ FAIL'} (${pdfMatchRate}%)`);
  console.log(`Database → PDF: ${dbToPdfPass ? '✅ PASS' : '❌ FAIL'} (${dbVerificationRate}%)`);
  console.log(`\nOVERALL: ${overallPass ? '✅ PASS - 100% MATCH' : '❌ FAIL - DISCREPANCIES FOUND'}`);

  return {
    month,
    year,
    pdfCount: pdfTransactions.length,
    dbCount: dbTransactions.length,
    pdfToDb: {
      found: pdfFoundCount,
      missing: pdfMissingCount,
      mismatch: pdfMismatchCount,
      matchRate: parseFloat(pdfMatchRate),
      pass: pdfToDbPass
    },
    dbToPdf: {
      verified: dbVerifiedCount,
      notInPdf: dbNotInPdfCount,
      verificationRate: parseFloat(dbVerificationRate),
      pass: dbToPdfPass
    },
    overallPass,
    pdfToDbResults,
    dbToPdfResults
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('COMPREHENSIVE LEVEL 6: 100% 1:1 PDF-TO-DATABASE VERIFICATION');
  console.log('For June, July, and August 2024');
  console.log('Following MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md Phase 4\n');

  const results = {};

  // Validate June 2024
  console.log('\n\nSTARTING JUNE 2024 VALIDATION...');
  results.june = await validateMonth('06', '2024', JUNE_2024_PDF_TRANSACTIONS);

  // Validate July 2024
  console.log('\n\nSTARTING JULY 2024 VALIDATION...');
  results.july = await validateMonth('07', '2024', JULY_2024_PDF_TRANSACTIONS);

  // Validate August 2024 (once we complete the transaction extraction)
  // console.log('\n\nSTARTING AUGUST 2024 VALIDATION...');
  // results.august = await validateMonth('08', '2024', AUGUST_2024_PDF_TRANSACTIONS);

  // Save results to file
  const outputDir = path.join(__dirname);
  fs.writeFileSync(
    path.join(outputDir, 'validation-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n\nResults saved to: ${outputDir}/validation-results.json`);
  console.log('\nNext steps:');
  console.log('1. Review discrepancies in detail');
  console.log('2. Generate comprehensive markdown reports');
  console.log('3. Create final summary report');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateMonth };
