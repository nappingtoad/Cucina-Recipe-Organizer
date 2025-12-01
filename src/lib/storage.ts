/**
 * Cucina Recipe Organizer - Frontend Storage Layer
 * 
 * This module manages data initialization and provides default data for the application.
 * It has been migrated from localStorage to Supabase while keeping the same interface.
 * 
 * ARCHITECTURE:
 * =============
 * Frontend State (React) ← This Module ← API Client ← Backend Server ← Supabase Database
 * 
 * Responsibilities:
 * - Define default ingredients (~148 common ingredients including Filipino cuisine)
 * - Define default measurements (25 units with conversion factors)
 * - Define default demo recipes (8 recipes including Filipino dishes)
 * - Define default demo inventory
 * - Initialize new users with default data via Supabase
 * - Load and save user data from/to Supabase
 * 
 * IMPORTANT NOTES ON DEFAULT DATA:
 * =================================
 * 1. Default Ingredients (lines 241-419):
 *    - Organized by category (seasonings, herbs, vegetables, proteins, etc.)
 *    - Includes Filipino ingredients (Fish Sauce, Calamansi, Tamarind, etc.)
 *    - IDs MUST be unique and consistent
 *    - WARNING: Do not duplicate IDs or names
 * 
 * 2. Default Measurements (lines 8-239):
 *    - Volume units: US (cup, tbsp, tsp, etc.) and Metric (liter, ml)
 *    - Weight units: US (ounce, pound) and Metric (gram, kilogram, milligram)
 *    - Countable units: piece, slice, clove, bunch, etc.
 *    - Each has bidirectional conversions where applicable
 * 
 * 3. Default Recipes (lines 421-677):
 *    - Includes both Western and Filipino recipes
 *    - Each recipe references ingredient IDs and measurement IDs
 *    - CRITICAL: All ingredient/measurement IDs must exist in default arrays
 * 
 * 4. Default Inventory (lines 679-733):
 *    - Demo user's starting inventory
 *    - Enough ingredients to make several recipes
 *    - References the same ingredient IDs
 * 
 * DATA INITIALIZATION FLOW:
 * =========================
 * When a new user signs up/logs in:
 * 1. Frontend calls loadDataFromSupabase(userId)
 * 2. If user has no data in database:
 *    a. api.initializeUserDefaults() is called
 *    b. Server copies defaultIngredients and defaultMeasurements
 *    c. Server prefixes IDs with userId (e.g., "47" → "user-123-47")
 *    d. Server inserts into database
 * 3. Frontend reloads user data
 * 4. User now has their own isolated copy of ingredients/measurements
 * 
 * USER DATA ISOLATION:
 * ====================
 * Each user gets their own copy of ingredients and measurements.
 * This allows users to:
 * - Add custom ingredients without affecting others
 * - Customize measurement names
 * - Have recipes that reference their specific IDs
 * 
 * CRITICAL BUG FIX HISTORY:
 * =========================
 * Issue: Duplicate ingredient IDs caused foreign key constraint violations
 * - Original ingredients array had duplicate IDs (e.g., two id='138', two id='148')
 * - This caused new user initialization to fail with "duplicate key" errors
 * 
 * Fix Applied (December 2024):
 * - ID '138' changed from duplicate 'Eggplant' to 'Bitter Melon'
 * - ID '148' changed from duplicate 'Ground Pork' to 'Annatto Seeds'
 * - All recipe references updated:
 *   - Sinigang recipe: ingredientId '138' → '47' (Eggplant)
 *   - Kare-Kare recipe: kept '47' for Eggplant
 *   - Lumpia recipe: ingredientId '148' → '56' (Ground Pork)
 *   - Inventory: '138' → '47', '148' → '56'
 * 
 * MIGRATION NOTES:
 * ================
 * The app originally used localStorage for persistence.
 * It has been migrated to Supabase with these changes:
 * - saveData() is now a no-op (kept for compatibility)
 * - loadData() returns default data only (demo mode)
 * - loadDataFromSupabase() is the new data loading function
 * - saveDataToSupabase() is the new data saving function
 * - Auto-save debouncing (1 second) in App.tsx
 */

import { AppData, User, Recipe, Ingredient, Measurement, InventoryItem, CookingSession } from '../types';
import { api } from './api';
import { toast } from 'sonner@2.0.3';

const STORAGE_KEY = 'cucina-app-data';
const DATA_VERSION = 3; // Increment this when adding new default items

const defaultMeasurements: Measurement[] = [
  // ==================== VOLUME - US CUSTOMARY ====================
  { 
    id: '1', 
    name: 'cup', 
    conversions: [
      // To other US volume
      { toMeasurementId: '2', factor: 16 },           // 1 cup = 16 tablespoons
      { toMeasurementId: '3', factor: 48 },           // 1 cup = 48 teaspoons
      { toMeasurementId: '4', factor: 8 },            // 1 cup = 8 fluid ounces
      { toMeasurementId: '5', factor: 0.5 },          // 1 cup = 0.5 pints
      { toMeasurementId: '6', factor: 0.25 },         // 1 cup = 0.25 quarts
      { toMeasurementId: '7', factor: 0.0625 },       // 1 cup = 0.0625 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.236588 },     // 1 cup = 0.236588 liters
      { toMeasurementId: '9', factor: 236.588 },      // 1 cup = 236.588 milliliters
    ] 
  },
  { 
    id: '2', 
    name: 'tablespoon', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 0.0625 },       // 1 tbsp = 0.0625 cups
      { toMeasurementId: '3', factor: 3 },            // 1 tbsp = 3 teaspoons
      { toMeasurementId: '4', factor: 0.5 },          // 1 tbsp = 0.5 fluid ounces
      { toMeasurementId: '5', factor: 0.03125 },      // 1 tbsp = 0.03125 pints
      { toMeasurementId: '6', factor: 0.015625 },     // 1 tbsp = 0.015625 quarts
      { toMeasurementId: '7', factor: 0.00390625 },   // 1 tbsp = 0.00390625 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.0147868 },    // 1 tbsp = 0.0147868 liters
      { toMeasurementId: '9', factor: 14.7868 },      // 1 tbsp = 14.7868 milliliters
    ] 
  },
  { 
    id: '3', 
    name: 'teaspoon', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 0.0208333 },    // 1 tsp = 0.0208333 cups
      { toMeasurementId: '2', factor: 0.333333 },     // 1 tsp = 0.333333 tablespoons
      { toMeasurementId: '4', factor: 0.166667 },     // 1 tsp = 0.166667 fluid ounces
      { toMeasurementId: '5', factor: 0.0104167 },    // 1 tsp = 0.0104167 pints
      { toMeasurementId: '6', factor: 0.00520833 },   // 1 tsp = 0.00520833 quarts
      { toMeasurementId: '7', factor: 0.00130208 },   // 1 tsp = 0.00130208 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.00492892 },   // 1 tsp = 0.00492892 liters
      { toMeasurementId: '9', factor: 4.92892 },      // 1 tsp = 4.92892 milliliters
    ] 
  },
  { 
    id: '4', 
    name: 'fluid ounce', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 0.125 },        // 1 fl oz = 0.125 cups
      { toMeasurementId: '2', factor: 2 },            // 1 fl oz = 2 tablespoons
      { toMeasurementId: '3', factor: 6 },            // 1 fl oz = 6 teaspoons
      { toMeasurementId: '5', factor: 0.0625 },       // 1 fl oz = 0.0625 pints
      { toMeasurementId: '6', factor: 0.03125 },      // 1 fl oz = 0.03125 quarts
      { toMeasurementId: '7', factor: 0.0078125 },    // 1 fl oz = 0.0078125 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.0295735 },    // 1 fl oz = 0.0295735 liters
      { toMeasurementId: '9', factor: 29.5735 },      // 1 fl oz = 29.5735 milliliters
    ] 
  },
  { 
    id: '5', 
    name: 'pint', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 2 },            // 1 pint = 2 cups
      { toMeasurementId: '2', factor: 32 },           // 1 pint = 32 tablespoons
      { toMeasurementId: '3', factor: 96 },           // 1 pint = 96 teaspoons
      { toMeasurementId: '4', factor: 16 },           // 1 pint = 16 fluid ounces
      { toMeasurementId: '6', factor: 0.5 },          // 1 pint = 0.5 quarts
      { toMeasurementId: '7', factor: 0.125 },        // 1 pint = 0.125 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.473176 },     // 1 pint = 0.473176 liters
      { toMeasurementId: '9', factor: 473.176 },      // 1 pint = 473.176 milliliters
    ] 
  },
  { 
    id: '6', 
    name: 'quart', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 4 },            // 1 quart = 4 cups
      { toMeasurementId: '2', factor: 64 },           // 1 quart = 64 tablespoons
      { toMeasurementId: '3', factor: 192 },          // 1 quart = 192 teaspoons
      { toMeasurementId: '4', factor: 32 },           // 1 quart = 32 fluid ounces
      { toMeasurementId: '5', factor: 2 },            // 1 quart = 2 pints
      { toMeasurementId: '7', factor: 0.25 },         // 1 quart = 0.25 gallons
      // To metric volume
      { toMeasurementId: '8', factor: 0.946353 },     // 1 quart = 0.946353 liters
      { toMeasurementId: '9', factor: 946.353 },      // 1 quart = 946.353 milliliters
    ] 
  },
  { 
    id: '7', 
    name: 'gallon', 
    conversions: [
      // To other US volume
      { toMeasurementId: '1', factor: 16 },           // 1 gallon = 16 cups
      { toMeasurementId: '2', factor: 256 },          // 1 gallon = 256 tablespoons
      { toMeasurementId: '3', factor: 768 },          // 1 gallon = 768 teaspoons
      { toMeasurementId: '4', factor: 128 },          // 1 gallon = 128 fluid ounces
      { toMeasurementId: '5', factor: 8 },            // 1 gallon = 8 pints
      { toMeasurementId: '6', factor: 4 },            // 1 gallon = 4 quarts
      // To metric volume
      { toMeasurementId: '8', factor: 3.78541 },      // 1 gallon = 3.78541 liters
      { toMeasurementId: '9', factor: 3785.41 },      // 1 gallon = 3785.41 milliliters
    ] 
  },
  
  // ==================== VOLUME - METRIC ====================
  { 
    id: '8', 
    name: 'liter', 
    conversions: [
      // To metric volume
      { toMeasurementId: '9', factor: 1000 },         // 1 liter = 1000 milliliters
      // To US volume
      { toMeasurementId: '1', factor: 4.22675 },      // 1 liter = 4.22675 cups
      { toMeasurementId: '2', factor: 67.628 },       // 1 liter = 67.628 tablespoons
      { toMeasurementId: '3', factor: 202.884 },      // 1 liter = 202.884 teaspoons
      { toMeasurementId: '4', factor: 33.814 },       // 1 liter = 33.814 fluid ounces
      { toMeasurementId: '5', factor: 2.11338 },      // 1 liter = 2.11338 pints
      { toMeasurementId: '6', factor: 1.05669 },      // 1 liter = 1.05669 quarts
      { toMeasurementId: '7', factor: 0.264172 },     // 1 liter = 0.264172 gallons
    ] 
  },
  { 
    id: '9', 
    name: 'milliliter', 
    conversions: [
      // To metric volume
      { toMeasurementId: '8', factor: 0.001 },        // 1 ml = 0.001 liters
      // To US volume
      { toMeasurementId: '1', factor: 0.00422675 },   // 1 ml = 0.00422675 cups
      { toMeasurementId: '2', factor: 0.067628 },     // 1 ml = 0.067628 tablespoons
      { toMeasurementId: '3', factor: 0.202884 },     // 1 ml = 0.202884 teaspoons
      { toMeasurementId: '4', factor: 0.033814 },     // 1 ml = 0.033814 fluid ounces
      { toMeasurementId: '5', factor: 0.00211338 },   // 1 ml = 0.00211338 pints
      { toMeasurementId: '6', factor: 0.00105669 },   // 1 ml = 0.00105669 quarts
      { toMeasurementId: '7', factor: 0.000264172 },  // 1 ml = 0.000264172 gallons
    ] 
  },
  
  // ==================== WEIGHT - US CUSTOMARY ====================
  { 
    id: '10', 
    name: 'ounce', 
    conversions: [
      // To other US weight
      { toMeasurementId: '12', factor: 0.0625 },      // 1 oz = 0.0625 pounds
      // To metric weight
      { toMeasurementId: '11', factor: 28.3495 },     // 1 oz = 28.3495 grams
      { toMeasurementId: '13', factor: 0.0283495 },   // 1 oz = 0.0283495 kilograms
      { toMeasurementId: '14', factor: 28349.5 },     // 1 oz = 28349.5 milligrams
    ] 
  },
  { 
    id: '12', 
    name: 'pound', 
    conversions: [
      // To other US weight
      { toMeasurementId: '10', factor: 16 },          // 1 lb = 16 ounces
      // To metric weight
      { toMeasurementId: '11', factor: 453.592 },     // 1 lb = 453.592 grams
      { toMeasurementId: '13', factor: 0.453592 },    // 1 lb = 0.453592 kilograms
      { toMeasurementId: '14', factor: 453592 },      // 1 lb = 453592 milligrams
    ] 
  },
  
  // ==================== WEIGHT - METRIC ====================
  { 
    id: '14', 
    name: 'milligram', 
    conversions: [
      // To metric weight
      { toMeasurementId: '11', factor: 0.001 },       // 1 mg = 0.001 grams
      { toMeasurementId: '13', factor: 0.000001 },    // 1 mg = 0.000001 kilograms
      // To US weight
      { toMeasurementId: '10', factor: 0.000035274 }, // 1 mg = 0.000035274 ounces
      { toMeasurementId: '12', factor: 0.0000022046 }, // 1 mg = 0.0000022046 pounds
    ] 
  },
  { 
    id: '11', 
    name: 'gram', 
    conversions: [
      // To metric weight
      { toMeasurementId: '14', factor: 1000 },        // 1 g = 1000 milligrams
      { toMeasurementId: '13', factor: 0.001 },       // 1 g = 0.001 kilograms
      // To US weight
      { toMeasurementId: '10', factor: 0.035274 },    // 1 g = 0.035274 ounces
      { toMeasurementId: '12', factor: 0.00220462 },  // 1 g = 0.00220462 pounds
      // To volume (water equivalence: 1g ≈ 1ml)
      { toMeasurementId: '2', factor: 0.067628 },     // 1 g ≈ 0.067628 tablespoons
      { toMeasurementId: '3', factor: 0.202884 },     // 1 g ≈ 0.202884 teaspoons
    ] 
  },
  { 
    id: '13', 
    name: 'kilogram', 
    conversions: [
      // To metric weight
      { toMeasurementId: '14', factor: 1000000 },     // 1 kg = 1,000,000 milligrams
      { toMeasurementId: '11', factor: 1000 },        // 1 kg = 1000 grams
      // To US weight
      { toMeasurementId: '10', factor: 35.274 },      // 1 kg = 35.274 ounces
      { toMeasurementId: '12', factor: 2.20462 },     // 1 kg = 2.20462 pounds
      // To volume (water equivalence: 1kg ≈ 1L)
      { toMeasurementId: '2', factor: 67.628 },       // 1 kg ≈ 67.628 tablespoons
      { toMeasurementId: '3', factor: 202.884 },      // 1 kg ≈ 202.884 teaspoons
    ] 
  },
  
  // ==================== COUNTABLE UNITS (NO CONVERSIONS) ====================
  { id: '15', name: 'piece', conversions: [] },
  { id: '16', name: 'slice', conversions: [] },
  { id: '17', name: 'clove', conversions: [] },
  { id: '18', name: 'bunch', conversions: [] },
  { id: '19', name: 'can', conversions: [] },
  { id: '20', name: 'package', conversions: [] },
  { id: '21', name: 'handful', conversions: [] },
  { id: '22', name: 'pinch', conversions: [] },
  { id: '23', name: 'dash', conversions: [] },
  { id: '24', name: 'sprig', conversions: [] },
  { id: '25', name: 'leaf', conversions: [] },
];

const defaultIngredients: Ingredient[] = [
  // Seasonings & Spices
  { id: '1', name: 'Salt' },
  { id: '2', name: 'Black Pepper' },
  { id: '3', name: 'White Pepper' },
  { id: '4', name: 'Red Pepper Flakes' },
  { id: '5', name: 'Paprika' },
  { id: '6', name: 'Cayenne Pepper' },
  { id: '7', name: 'Cumin' },
  { id: '8', name: 'Coriander' },
  { id: '9', name: 'Turmeric' },
  { id: '10', name: 'Cinnamon' },
  { id: '11', name: 'Nutmeg' },
  { id: '12', name: 'Ginger' },
  { id: '13', name: 'Garlic Powder' },
  { id: '14', name: 'Onion Powder' },
  { id: '15', name: 'Chili Powder' },
  
  // Fresh Herbs
  { id: '16', name: 'Basil' },
  { id: '17', name: 'Oregano' },
  { id: '18', name: 'Thyme' },
  { id: '19', name: 'Rosemary' },
  { id: '20', name: 'Parsley' },
  { id: '21', name: 'Cilantro' },
  { id: '22', name: 'Mint' },
  { id: '23', name: 'Dill' },
  { id: '24', name: 'Sage' },
  { id: '25', name: 'Bay Leaf' },
  
  // Oils & Fats
  { id: '26', name: 'Olive Oil' },
  { id: '27', name: 'Vegetable Oil' },
  { id: '28', name: 'Coconut Oil' },
  { id: '29', name: 'Sesame Oil' },
  { id: '30', name: 'Butter' },
  { id: '31', name: 'Margarine' },
  
  // Fresh Vegetables
  { id: '32', name: 'Onion' },
  { id: '33', name: 'Garlic' },
  { id: '34', name: 'Tomato' },
  { id: '35', name: 'Bell Pepper' },
  { id: '36', name: 'Carrot' },
  { id: '37', name: 'Celery' },
  { id: '38', name: 'Potato' },
  { id: '39', name: 'Sweet Potato' },
  { id: '40', name: 'Broccoli' },
  { id: '41', name: 'Cauliflower' },
  { id: '42', name: 'Spinach' },
  { id: '43', name: 'Kale' },
  { id: '44', name: 'Lettuce' },
  { id: '45', name: 'Cucumber' },
  { id: '46', name: 'Zucchini' },
  { id: '47', name: 'Eggplant' },
  { id: '48', name: 'Mushroom' },
  { id: '49', name: 'Corn' },
  { id: '50', name: 'Green Beans' },
  
  // Proteins
  { id: '51', name: 'Chicken Breast' },
  { id: '52', name: 'Chicken Thigh' },
  { id: '53', name: 'Ground Beef' },
  { id: '54', name: 'Beef Steak' },
  { id: '55', name: 'Pork Chop' },
  { id: '56', name: 'Ground Pork' },
  { id: '57', name: 'Bacon' },
  { id: '58', name: 'Sausage' },
  { id: '59', name: 'Salmon' },
  { id: '60', name: 'Tuna' },
  { id: '61', name: 'Shrimp' },
  { id: '62', name: 'Tofu' },
  { id: '63', name: 'Egg' },
  
  // Dairy
  { id: '64', name: 'Milk' },
  { id: '65', name: 'Heavy Cream' },
  { id: '66', name: 'Sour Cream' },
  { id: '67', name: 'Yogurt' },
  { id: '68', name: 'Cheese' },
  { id: '69', name: 'Parmesan Cheese' },
  { id: '70', name: 'Mozzarella Cheese' },
  { id: '71', name: 'Cheddar Cheese' },
  { id: '72', name: 'Cream Cheese' },
  
  // Grains & Pasta
  { id: '73', name: 'Rice' },
  { id: '74', name: 'Brown Rice' },
  { id: '75', name: 'Pasta' },
  { id: '76', name: 'Spaghetti' },
  { id: '77', name: 'Bread' },
  { id: '78', name: 'Flour' },
  { id: '79', name: 'All-Purpose Flour' },
  { id: '80', name: 'Bread Flour' },
  { id: '81', name: 'Whole Wheat Flour' },
  { id: '82', name: 'Cornstarch' },
  { id: '83', name: 'Breadcrumbs' },
  { id: '84', name: 'Oats' },
  { id: '85', name: 'Quinoa' },
  
  // Legumes & Beans
  { id: '86', name: 'Black Beans' },
  { id: '87', name: 'Kidney Beans' },
  { id: '88', name: 'Chickpeas' },
  { id: '89', name: 'Lentils' },
  { id: '90', name: 'Peanuts' },
  
  // Sweeteners
  { id: '91', name: 'Sugar' },
  { id: '92', name: 'Brown Sugar' },
  { id: '93', name: 'Honey' },
  { id: '94', name: 'Maple Syrup' },
  { id: '95', name: 'Vanilla Extract' },
  
  // Condiments & Sauces
  { id: '96', name: 'Soy Sauce' },
  { id: '97', name: 'Worcestershire Sauce' },
  { id: '98', name: 'Hot Sauce' },
  { id: '99', name: 'Ketchup' },
  { id: '100', name: 'Mustard' },
  { id: '101', name: 'Mayonnaise' },
  { id: '102', name: 'Vinegar' },
  { id: '103', name: 'Balsamic Vinegar' },
  { id: '104', name: 'Apple Cider Vinegar' },
  { id: '105', name: 'Lemon Juice' },
  { id: '106', name: 'Lime Juice' },
  
  // Canned & Preserved
  { id: '107', name: 'Tomato Paste' },
  { id: '108', name: 'Tomato Sauce' },
  { id: '109', name: 'Canned Tomatoes' },
  { id: '110', name: 'Chicken Broth' },
  { id: '111', name: 'Beef Broth' },
  { id: '112', name: 'Vegetable Broth' },
  { id: '113', name: 'Coconut Milk' },
  
  // Baking
  { id: '114', name: 'Baking Powder' },
  { id: '115', name: 'Baking Soda' },
  { id: '116', name: 'Yeast' },
  { id: '117', name: 'Chocolate Chips' },
  { id: '118', name: 'Cocoa Powder' },
  
  // Nuts & Seeds
  { id: '119', name: 'Almonds' },
  { id: '120', name: 'Walnuts' },
  { id: '121', name: 'Cashews' },
  { id: '122', name: 'Pine Nuts' },
  { id: '123', name: 'Sesame Seeds' },
  { id: '124', name: 'Sunflower Seeds' },
  
  // Fruits
  { id: '125', name: 'Lemon' },
  { id: '126', name: 'Lime' },
  { id: '127', name: 'Apple' },
  { id: '128', name: 'Banana' },
  { id: '129', name: 'Orange' },
  { id: '130', name: 'Strawberry' },
  { id: '131', name: 'Blueberry' },
  { id: '132', name: 'Avocado' },
  
  // Filipino Ingredients
  { id: '133', name: 'Fish Sauce' },
  { id: '134', name: 'Calamansi' },
  { id: '135', name: 'Tamarind' },
  { id: '136', name: 'Bok Choy' },
  { id: '137', name: 'Long Green Beans' },
  { id: '138', name: 'Bitter Melon' },  // Changed from duplicate 'Eggplant'
  { id: '139', name: 'Taro' },
  { id: '140', name: 'Radish' },
  { id: '141', name: 'Spring Onion' },
  { id: '142', name: 'Lemongrass' },  // Changed from duplicate 'Ginger'
  { id: '143', name: 'Bay Leaves' },
  { id: '144', name: 'Pork Belly' },
  { id: '145', name: 'Shrimp Paste' },
  { id: '146', name: 'Rice Noodles' },
  { id: '147', name: 'Spring Roll Wrapper' },
  { id: '148', name: 'Annatto Seeds' },  // Changed from duplicate 'Ground Pork'
];

const defaultRecipes: Recipe[] = [
  {
    id: '1',
    userId: 'demo',
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
    servings: 4,
    ingredients: [
      { ingredientId: '75', quantity: 400, measurementId: '11' },
      { ingredientId: '63', quantity: 4, measurementId: '15' },
      { ingredientId: '68', quantity: 100, measurementId: '11' },
      { ingredientId: '2', quantity: 1, measurementId: '3' },
      { ingredientId: '1', quantity: 1, measurementId: '22' },
    ],
    instructions: [
      'Bring a large pot of salted water to boil and cook pasta according to package directions',
      'While pasta cooks, whisk eggs and grated cheese together in a bowl',
      'Cook pancetta in a large skillet until crispy',
      'Drain pasta, reserving 1 cup of pasta water',
      'Add hot pasta to the skillet with pancetta',
      'Remove from heat and quickly mix in egg mixture, adding pasta water to create a creamy sauce',
      'Season with black pepper and serve immediately',
    ],
    viewCount: 24,
    cookCount: 8,
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: '2',
    userId: 'demo',
    name: 'Garlic Butter Chicken',
    description: 'Juicy chicken breasts in a rich garlic butter sauce',
    servings: 2,
    ingredients: [
      { ingredientId: '51', quantity: 2, measurementId: '15' },
      { ingredientId: '30', quantity: 3, measurementId: '2' },
      { ingredientId: '33', quantity: 4, measurementId: '17' },
      { ingredientId: '1', quantity: 1, measurementId: '3' },
      { ingredientId: '2', quantity: 0.5, measurementId: '3' },
      { ingredientId: '5', quantity: 1, measurementId: '3' },
    ],
    instructions: [
      'Season chicken breasts with salt, pepper, and paprika',
      'Heat 1 tablespoon butter in a skillet over medium-high heat',
      'Cook chicken for 6-7 minutes per side until golden and cooked through',
      'Remove chicken and set aside',
      'Add remaining butter and minced garlic to the pan',
      'Cook garlic for 1 minute until fragrant',
      'Return chicken to pan and coat with garlic butter',
      'Serve hot with your favorite sides',
    ],
    viewCount: 18,
    cookCount: 12,
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: '3',
    userId: 'demo',
    name: 'Chicken Adobo',
    description: 'The Philippines\' national dish - tender chicken braised in soy sauce, vinegar, and spices',
    servings: 4,
    ingredients: [
      { ingredientId: '52', quantity: 1, measurementId: '13' },  // Chicken Thigh
      { ingredientId: '96', quantity: 0.5, measurementId: '1' }, // Soy Sauce
      { ingredientId: '102', quantity: 0.5, measurementId: '1' }, // Vinegar
      { ingredientId: '33', quantity: 8, measurementId: '17' },  // Garlic cloves
      { ingredientId: '143', quantity: 3, measurementId: '15' }, // Bay Leaves
      { ingredientId: '2', quantity: 1, measurementId: '3' },    // Black Pepper
      { ingredientId: '27', quantity: 2, measurementId: '2' },   // Vegetable Oil
      { ingredientId: '32', quantity: 1, measurementId: '15' },  // Onion
    ],
    instructions: [
      'Combine chicken, soy sauce, vinegar, crushed garlic, bay leaves, and black pepper in a bowl. Marinate for at least 30 minutes',
      'Heat oil in a large pot over medium-high heat',
      'Remove chicken from marinade (reserve marinade) and brown on all sides, about 3-4 minutes per side',
      'Add the reserved marinade and sliced onion to the pot',
      'Bring to a boil, then reduce heat to low and simmer covered for 30 minutes',
      'Remove lid and continue simmering for another 15 minutes until sauce thickens',
      'Serve hot over steamed rice with sauce spooned over',
    ],
    viewCount: 32,
    cookCount: 18,
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: '4',
    userId: 'demo',
    name: 'Sinigang na Baboy',
    description: 'Tangy and savory Filipino tamarind pork soup with vegetables',
    servings: 6,
    ingredients: [
      { ingredientId: '144', quantity: 500, measurementId: '11' }, // Pork Belly
      { ingredientId: '135', quantity: 50, measurementId: '11' },  // Tamarind
      { ingredientId: '34', quantity: 2, measurementId: '15' },    // Tomato
      { ingredientId: '32', quantity: 1, measurementId: '15' },    // Onion
      { ingredientId: '140', quantity: 200, measurementId: '11' }, // Radish
      { ingredientId: '47', quantity: 2, measurementId: '15' },    // Eggplant (changed from '138' which is now Bitter Melon)
      { ingredientId: '137', quantity: 100, measurementId: '11' }, // Long Green Beans
      { ingredientId: '136', quantity: 100, measurementId: '11' }, // Bok Choy
      { ingredientId: '133', quantity: 2, measurementId: '2' },    // Fish Sauce
      { ingredientId: '1', quantity: 1, measurementId: '3' },      // Salt
    ],
    instructions: [
      'In a large pot, bring 8 cups of water to a boil',
      'Add pork belly and simmer for 45 minutes until tender',
      'Add quartered tomatoes and sliced onions, cook for 5 minutes',
      'Add tamarind and mash it to release the sour flavor, or use tamarind powder/mix',
      'Add sliced radish and cook for 5 minutes',
      'Add eggplant cut into chunks and long green beans cut into 2-inch pieces',
      'Cook for another 5 minutes until vegetables are tender',
      'Season with fish sauce and salt to taste',
      'Add bok choy and cook for 1 minute',
      'Serve hot with steamed rice',
    ],
    viewCount: 28,
    cookCount: 14,
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: '5',
    userId: 'demo',
    name: 'Pancit Canton',
    description: 'Filipino stir-fried noodles with vegetables, chicken, and shrimp',
    servings: 6,
    ingredients: [
      { ingredientId: '146', quantity: 400, measurementId: '11' }, // Rice Noodles
      { ingredientId: '51', quantity: 300, measurementId: '11' },  // Chicken Breast
      { ingredientId: '61', quantity: 200, measurementId: '11' },  // Shrimp
      { ingredientId: '96', quantity: 4, measurementId: '2' },     // Soy Sauce
      { ingredientId: '33', quantity: 6, measurementId: '17' },    // Garlic
      { ingredientId: '32', quantity: 1, measurementId: '15' },    // Onion
      { ingredientId: '36', quantity: 1, measurementId: '15' },    // Carrot
      { ingredientId: '40', quantity: 100, measurementId: '11' },  // Cabbage (using Broccoli as substitute)
      { ingredientId: '27', quantity: 3, measurementId: '2' },     // Vegetable Oil
      { ingredientId: '110', quantity: 1, measurementId: '1' },    // Chicken Broth
      { ingredientId: '125', quantity: 1, measurementId: '15' },   // Lemon
    ],
    instructions: [
      'Soak rice noodles in warm water for 15 minutes, then drain',
      'Cut chicken into thin strips and season with salt and pepper',
      'Heat oil in a large wok or pan over high heat',
      'Sauté minced garlic and sliced onions until fragrant',
      'Add chicken and cook until no longer pink, about 5 minutes',
      'Add shrimp and cook until pink, about 3 minutes',
      'Add julienned carrots and cabbage, stir-fry for 2 minutes',
      'Add noodles, soy sauce, and chicken broth',
      'Toss everything together and cook until noodles are tender and liquid is absorbed',
      'Serve hot with calamansi or lemon wedges',
    ],
    viewCount: 26,
    cookCount: 16,
    createdAt: Date.now() - 86400000 * 18,
  },
  {
    id: '6',
    userId: 'demo',
    name: 'Lumpia Shanghai',
    description: 'Crispy Filipino spring rolls filled with savory pork and vegetables',
    servings: 8,
    ingredients: [
      { ingredientId: '56', quantity: 500, measurementId: '11' },  // Ground Pork (changed from '148' which is now Annatto Seeds)
      { ingredientId: '147', quantity: 30, measurementId: '15' },  // Spring Roll Wrapper
      { ingredientId: '36', quantity: 1, measurementId: '15' },    // Carrot
      { ingredientId: '32', quantity: 1, measurementId: '15' },    // Onion
      { ingredientId: '33', quantity: 4, measurementId: '17' },    // Garlic
      { ingredientId: '96', quantity: 2, measurementId: '2' },     // Soy Sauce
      { ingredientId: '1', quantity: 1, measurementId: '3' },      // Salt
      { ingredientId: '2', quantity: 0.5, measurementId: '3' },    // Black Pepper
      { ingredientId: '63', quantity: 1, measurementId: '15' },    // Egg
      { ingredientId: '27', quantity: 2, measurementId: '1' },     // Vegetable Oil for frying
    ],
    instructions: [
      'In a large bowl, combine ground pork, finely chopped carrot, minced onion, minced garlic, soy sauce, salt, pepper, and egg',
      'Mix well until thoroughly combined',
      'Place a spring roll wrapper on a clean surface with one corner pointing toward you',
      'Place about 2 tablespoons of filling in a line near the bottom corner',
      'Fold the bottom corner over the filling, then fold in the sides',
      'Roll tightly toward the top corner, sealing the edge with a bit of water',
      'Repeat with remaining wrappers and filling',
      'Heat oil in a deep pan or wok to 350°F (175°C)',
      'Fry lumpia in batches until golden brown and crispy, about 3-4 minutes per batch',
      'Drain on paper towels and serve hot with sweet chili sauce or banana ketchup',
    ],
    viewCount: 35,
    cookCount: 22,
    createdAt: Date.now() - 86400000 * 12,
  },
  {
    id: '7',
    userId: 'demo',
    name: 'Kare-Kare',
    description: 'Rich Filipino oxtail and vegetable stew in savory peanut sauce',
    servings: 6,
    ingredients: [
      { ingredientId: '144', quantity: 1, measurementId: '13' },   // Pork Belly (substitute for oxtail)
      { ingredientId: '90', quantity: 150, measurementId: '11' },  // Peanuts (for peanut butter)
      { ingredientId: '47', quantity: 2, measurementId: '15' },    // Eggplant
      { ingredientId: '137', quantity: 200, measurementId: '11' }, // Long Green Beans
      { ingredientId: '136', quantity: 200, measurementId: '11' }, // Bok Choy
      { ingredientId: '32', quantity: 1, measurementId: '15' },    // Onion
      { ingredientId: '33', quantity: 6, measurementId: '17' },    // Garlic
      { ingredientId: '145', quantity: 2, measurementId: '2' },    // Shrimp Paste
      { ingredientId: '27', quantity: 2, measurementId: '2' },     // Vegetable Oil
      { ingredientId: '73', quantity: 50, measurementId: '11' },   // Rice (toasted and ground)
      { ingredientId: '1', quantity: 2, measurementId: '3' },      // Salt
    ],
    instructions: [
      'In a large pot, boil pork belly in water for 1.5 hours until tender',
      'Remove meat and reserve 4 cups of broth',
      'Toast rice in a dry pan until golden, then grind into powder',
      'In a separate pot, heat oil and sauté minced garlic and sliced onions',
      'Add ground peanuts or peanut butter and toasted rice powder',
      'Gradually add the reserved broth while stirring continuously',
      'Add the cooked meat and simmer for 15 minutes',
      'Add eggplant cut into chunks and long green beans',
      'Cook for 10 minutes until vegetables are tender',
      'Add bok choy and cook for 2 more minutes',
      'Season with salt to taste',
      'Serve hot with steamed rice and shrimp paste (bagoong) on the side',
    ],
    viewCount: 22,
    cookCount: 11,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: '8',
    userId: 'demo',
    name: 'Lechon Kawali',
    description: 'Crispy deep-fried pork belly - a Filipino favorite',
    servings: 4,
    ingredients: [
      { ingredientId: '144', quantity: 1, measurementId: '13' },   // Pork Belly
      { ingredientId: '143', quantity: 3, measurementId: '15' },   // Bay Leaves
      { ingredientId: '2', quantity: 1, measurementId: '2' },      // Black Pepper
      { ingredientId: '1', quantity: 2, measurementId: '2' },      // Salt
      { ingredientId: '33', quantity: 6, measurementId: '17' },    // Garlic
      { ingredientId: '27', quantity: 4, measurementId: '1' },     // Vegetable Oil for frying
    ],
    instructions: [
      'In a large pot, place pork belly skin-side down',
      'Add water to cover, bay leaves, peppercorns, and salt',
      'Bring to a boil, then reduce heat and simmer for 1 hour until tender',
      'Remove pork from pot and let cool completely',
      'Pat dry with paper towels, especially the skin',
      'Refrigerate uncovered for at least 2 hours or overnight to dry the skin',
      'Heat oil in a deep pan or wok to 350°F (175°C)',
      'Carefully lower the pork into the hot oil, skin-side down',
      'Fry for 10-15 minutes until skin is golden and crispy',
      'Flip and fry the other side for another 5 minutes',
      'Remove and drain on paper towels',
      'Cut into serving pieces and serve with liver sauce or vinegar dipping sauce',
    ],
    viewCount: 30,
    cookCount: 15,
    createdAt: Date.now() - 86400000 * 8,
  },
];

function getDefaultData(): AppData {
  const defaultInventory: InventoryItem[] = [
    // Basic Seasonings & Spices (abundant amounts)
    { userId: 'demo', ingredientId: '1', quantity: 500, measurementId: '11' },  // Salt - 500g
    { userId: 'demo', ingredientId: '2', quantity: 100, measurementId: '11' },  // Black Pepper - 100g
    { userId: 'demo', ingredientId: '5', quantity: 50, measurementId: '11' },   // Paprika - 50g
    
    // Oils & Fats
    { userId: 'demo', ingredientId: '26', quantity: 2, measurementId: '1' },    // Olive Oil - 2 cups
    { userId: 'demo', ingredientId: '27', quantity: 3, measurementId: '1' },    // Vegetable Oil - 3 cups
    { userId: 'demo', ingredientId: '30', quantity: 200, measurementId: '11' }, // Butter - 200g
    
    // Fresh Vegetables & Aromatics
    { userId: 'demo', ingredientId: '32', quantity: 5, measurementId: '15' },   // Onion - 5 pieces
    { userId: 'demo', ingredientId: '33', quantity: 20, measurementId: '17' },  // Garlic - 20 cloves
    { userId: 'demo', ingredientId: '34', quantity: 6, measurementId: '15' },   // Tomato - 6 pieces
    { userId: 'demo', ingredientId: '36', quantity: 4, measurementId: '15' },   // Carrot - 4 pieces
    { userId: 'demo', ingredientId: '40', quantity: 300, measurementId: '11' }, // Broccoli - 300g
    
    // Proteins - enough for Garlic Butter Chicken & Chicken Adobo
    { userId: 'demo', ingredientId: '51', quantity: 800, measurementId: '11' }, // Chicken Breast - 800g
    { userId: 'demo', ingredientId: '52', quantity: 1.2, measurementId: '13' }, // Chicken Thigh - 1.2kg
    { userId: 'demo', ingredientId: '61', quantity: 300, measurementId: '11' }, // Shrimp - 300g
    { userId: 'demo', ingredientId: '63', quantity: 12, measurementId: '15' },  // Egg - 12 pieces
    { userId: 'demo', ingredientId: '144', quantity: 2, measurementId: '13' },  // Pork Belly - 2kg
    { userId: 'demo', ingredientId: '56', quantity: 600, measurementId: '11' }, // Ground Pork - 600g (changed from '148')
    
    // Dairy & Cheese
    { userId: 'demo', ingredientId: '68', quantity: 200, measurementId: '11' }, // Cheese - 200g
    
    // Grains & Pasta
    { userId: 'demo', ingredientId: '73', quantity: 2, measurementId: '13' },   // Rice - 2kg
    { userId: 'demo', ingredientId: '75', quantity: 500, measurementId: '11' }, // Pasta - 500g
    
    // Filipino Ingredients - enough for multiple Filipino recipes
    { userId: 'demo', ingredientId: '96', quantity: 2, measurementId: '1' },    // Soy Sauce - 2 cups
    { userId: 'demo', ingredientId: '102', quantity: 1.5, measurementId: '1' }, // Vinegar - 1.5 cups
    { userId: 'demo', ingredientId: '133', quantity: 0.5, measurementId: '1' }, // Fish Sauce - 0.5 cup
    { userId: 'demo', ingredientId: '135', quantity: 100, measurementId: '11' }, // Tamarind - 100g
    { userId: 'demo', ingredientId: '136', quantity: 400, measurementId: '11' }, // Bok Choy - 400g
    { userId: 'demo', ingredientId: '137', quantity: 300, measurementId: '11' }, // Long Green Beans - 300g
    { userId: 'demo', ingredientId: '47', quantity: 4, measurementId: '15' },   // Eggplant - 4 pieces (changed from '138' which is now Bitter Melon)
    { userId: 'demo', ingredientId: '140', quantity: 300, measurementId: '11' }, // Radish - 300g
    { userId: 'demo', ingredientId: '143', quantity: 20, measurementId: '15' }, // Bay Leaves - 20 pieces
    { userId: 'demo', ingredientId: '145', quantity: 0.3, measurementId: '1' }, // Shrimp Paste - 0.3 cup
    { userId: 'demo', ingredientId: '146', quantity: 500, measurementId: '11' }, // Rice Noodles - 500g
    { userId: 'demo', ingredientId: '147', quantity: 40, measurementId: '15' }, // Spring Roll Wrapper - 40 pieces
    
    // Broths & Liquids
    { userId: 'demo', ingredientId: '110', quantity: 4, measurementId: '1' },   // Chicken Broth - 4 cups
    
    // Additional ingredients
    { userId: 'demo', ingredientId: '90', quantity: 200, measurementId: '11' }, // Peanuts - 200g
    { userId: 'demo', ingredientId: '125', quantity: 3, measurementId: '15' },  // Lemon - 3 pieces
  ];

  return {
    users: [{ id: 'demo', username: 'demo', password: 'demo' }],
    recipes: defaultRecipes,
    ingredients: defaultIngredients,
    measurements: defaultMeasurements,
    inventory: defaultInventory,
    cookingSessions: [],
    currentUserId: null,
    version: DATA_VERSION,
  };
}

function mergeDefaultItems<T extends { id: string; name: string }>(
  existingItems: T[],
  defaultItems: T[]
): T[] {
  const existingIds = new Set(existingItems.map(item => item.id));
  const existingNames = new Set(existingItems.map(item => item.name.toLowerCase()));
  
  // Add default items that don't exist (by ID or name)
  const itemsToAdd = defaultItems.filter(
    item => !existingIds.has(item.id) && !existingNames.has(item.name.toLowerCase())
  );
  
  return [...existingItems, ...itemsToAdd];
}

export function loadData(): AppData {
  // Return default data - will be replaced by async load from Supabase
  return getDefaultData();
}

export async function loadDataFromSupabase(userId: string): Promise<AppData> {
  try {
    console.log('[loadDataFromSupabase] Loading data from Supabase for user:', userId);
    const userData = await api.getUserData(userId);
    
    console.log('[loadDataFromSupabase] Received data:', {
      ingredients: userData.ingredients?.length || 0,
      measurements: userData.measurements?.length || 0,
      recipes: userData.recipes?.length || 0
    });
    
    // Check if user has no data - if so, initialize with defaults
    if ((!userData.ingredients || userData.ingredients.length === 0) && 
        (!userData.measurements || userData.measurements.length === 0)) {
      console.log('[loadDataFromSupabase] 🆕 New user detected - initializing with default data');
      console.log(`[loadDataFromSupabase] Will initialize with ${defaultIngredients.length} ingredients and ${defaultMeasurements.length} measurements`);
      
      try {
        await api.initializeUserDefaults(userId, defaultIngredients, defaultMeasurements);
        console.log('[loadDataFromSupabase] ✅ Initialization completed, reloading data...');
        
        // Reload data after initialization
        const freshData = await api.getUserData(userId);
        console.log('[loadDataFromSupabase] Fresh data loaded:', {
          ingredients: freshData.ingredients?.length || 0,
          measurements: freshData.measurements?.length || 0,
        });
        
        return {
          users: [], // Users are managed by auth
          recipes: freshData.recipes || [],
          ingredients: freshData.ingredients || [],
          measurements: freshData.measurements || [],
          inventory: freshData.inventory || [],
          cookingSessions: freshData.cookingSessions || [],
          currentUserId: userId,
          version: DATA_VERSION,
        };
      } catch (initError) {
        console.error('[loadDataFromSupabase] ❌ Initialization failed:', initError);
        toast.error('Failed to initialize your account. Please check the database migration.');
        throw initError;
      }
    }
    
    console.log('[loadDataFromSupabase] ✅ Returning existing user data');
    return {
      users: [], // Users are managed by auth
      recipes: userData.recipes || [],
      ingredients: userData.ingredients || [],
      measurements: userData.measurements || [],
      inventory: userData.inventory || [],
      cookingSessions: userData.cookingSessions || [],
      currentUserId: userId,
      version: DATA_VERSION,
    };
  } catch (error) {
    console.error('[loadDataFromSupabase] ❌ Failed to load data from Supabase:', error);
    toast.error('Failed to load your data. Please try refreshing.');
    // Return empty data on error
    return {
      users: [],
      recipes: [],
      ingredients: [],
      measurements: [],
      inventory: [],
      cookingSessions: [],
      currentUserId: userId,
      version: DATA_VERSION,
    };
  }
}

export async function saveDataToSupabase(data: AppData): Promise<void> {
  if (!data.currentUserId) return;
  
  try {
    console.log('[Frontend] Saving data to Supabase for user:', data.currentUserId);
    console.log('[Frontend] Inventory count being saved:', data.inventory.length);
    console.log('[Frontend] Inventory items:', JSON.stringify(data.inventory, null, 2));
    
    await api.saveAllData(data.currentUserId, {
      recipes: data.recipes,
      inventory: data.inventory,
      cookingSessions: data.cookingSessions,
      ingredients: data.ingredients,
      measurements: data.measurements,
    });
    
    console.log('[Frontend] ✅ Data saved to Supabase successfully');
  } catch (error) {
    console.error('[Frontend] Failed to save data to Supabase:', error);
    throw error;
  }
}

export async function initializeSupabaseDefaults(): Promise<void> {
  // This function is deprecated - initialization now happens automatically
  // when a user logs in via loadDataFromSupabase()
  console.log('[DEPRECATED] initializeSupabaseDefaults called - initialization now happens automatically per user');
}

// Legacy localStorage functions - keeping for backwards compatibility
export function saveData(data: AppData): void {
  // No-op - data is now saved to Supabase
  console.log('saveData called - data saved to Supabase via async calls');
}

export function generateId(): string {
  return crypto.randomUUID();
}