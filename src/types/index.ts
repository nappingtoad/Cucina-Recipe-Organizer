/**
 * Cucina Recipe Organizer - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout the application.
 * The data model is designed around a multi-user system where each user has their own
 * isolated copy of ingredients, measurements, recipes, inventory, and cooking sessions.
 * 
 * Database Architecture:
 * - All user-specific data uses userId as a foreign key
 * - Ingredients and measurements are per-user to allow customization
 * - Recipes reference user-specific ingredient and measurement IDs
 * - Inventory tracks what ingredients a user has on hand
 * - Cooking sessions track active recipe cooking progress
 */

/**
 * User Account
 * Represents a user in the authentication system
 */
export interface User {
  id: string;
  username: string;
  password: string;
}

/**
 * Ingredient
 * Represents a food item that can be used in recipes
 * Each user has their own copy of ingredients (including default ones)
 * This allows users to add custom ingredients without affecting others
 */
export interface Ingredient {
  id: string;
  name: string;
  isCustom?: boolean;  // True if user created this ingredient
}

/**
 * Measurement Unit
 * Represents a unit of measurement (e.g., cup, gram, tablespoon)
 * Each user has their own copy to allow custom units
 */
export interface Measurement {
  id: string;
  name: string;
  conversions: MeasurementConversion[];  // How to convert to other units
}

/**
 * Measurement Conversion
 * Defines how one measurement unit converts to another
 * factor: multiply the source quantity by this to get the target quantity
 * Example: 1 cup = 16 tablespoons, so factor would be 16
 */
export interface MeasurementConversion {
  toMeasurementId: string;
  factor: number;
}

/**
 * Recipe Ingredient
 * Represents an ingredient within a recipe's ingredient list
 * References must point to user-specific ingredient and measurement IDs
 */
export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  measurementId: string;
}

/**
 * Recipe
 * A complete recipe with ingredients and instructions
 * userId ensures proper data isolation between users
 */
export interface Recipe {
  id: string;
  userId: string;
  name: string;
  description: string;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  viewCount: number;   // How many times the recipe was viewed
  cookCount: number;   // How many times the recipe was cooked
  createdAt: number;   // Unix timestamp
}

/**
 * Inventory Item
 * Tracks what ingredients a user has available
 * Multiple entries can exist for the same ingredient if in different units
 * (e.g., 2 cups of flour AND 500g of flour)
 */
export interface InventoryItem {
  userId: string;
  ingredientId: string;
  quantity: number;
  measurementId: string;
}

/**
 * Cooking Session
 * Tracks the state of an active recipe being cooked
 * Stores which ingredients and steps have been checked off
 * Status: 'active' (in progress), 'completed', or 'cancelled'
 */
export interface CookingSession {
  id: string;
  recipeId: string;
  userId: string;
  ingredientsChecked: number[];  // Array of ingredient indices that are checked
  stepsChecked: number[];        // Array of instruction step indices that are checked
  servingSize: number;           // Can be adjusted from original recipe servings
  status: 'active' | 'completed' | 'cancelled';
}

/**
 * Application Data
 * The complete data structure for the entire application
 * In frontend state, this includes all data needed for the UI
 * In backend/Supabase, data is filtered by userId
 */
export interface AppData {
  users: User[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  measurements: Measurement[];
  inventory: InventoryItem[];
  cookingSessions: CookingSession[];
  currentUserId: string | null;
  version?: number;  // Data schema version for migrations
}
