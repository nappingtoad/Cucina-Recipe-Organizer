/**
 * Cucina Recipe Organizer - API Client
 * 
 * This module provides the frontend interface to the Supabase backend server.
 * All HTTP requests to the backend go through these functions.
 * 
 * Architecture:
 * - Frontend (this file) → Supabase Edge Function → Database
 * - All requests include Bearer token authentication
 * - Server runs at /functions/v1/make-server-940412d4/
 * 
 * Error Handling:
 * - Network errors throw exceptions
 * - HTTP errors (4xx, 5xx) throw with server error message
 * - Caller should catch and display user-friendly messages
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AppData, User, Recipe, InventoryItem, CookingSession, Ingredient, Measurement } from '../types';

// Construct the base URL for all API calls
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-940412d4`;

// Standard headers for all requests
const headers = {
  'Authorization': `Bearer ${publicAnonKey}`,  // Supabase anonymous key for authentication
  'Content-Type': 'application/json',
};

export const api = {
  // ==================== AUTHENTICATION ====================
  
  /**
   * Create a new user account
   * 
   * @param username - Unique username (checked server-side)
   * @param password - Plain text password (hashed server-side in production apps)
   * @returns User object without password
   * @throws Error if username already exists or server error
   */
  async signup(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }
    
    const data = await response.json();
    return data.user;
  },

  /**
   * Authenticate a user
   * 
   * Special case: username/password "demo"/"demo" returns a demo account
   * without hitting the database, using local default data.
   * 
   * @param username - Username to authenticate
   * @param password - Password to verify
   * @returns User object without password
   * @throws Error if credentials are invalid or server error
   */
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data = await response.json();
    return data.user;
  },

  // ==================== DATA RETRIEVAL ====================

  /**
   * Load all data for a specific user from the database
   * 
   * This fetches recipes, inventory, cooking sessions, ingredients, and measurements
   * that belong to the specified user. Each data type is isolated by userId.
   * 
   * @param userId - The user whose data to fetch
   * @returns Object containing all user data arrays
   * @throws Error if fetch fails
   */
  async getUserData(userId: string): Promise<{
    recipes: Recipe[];
    inventory: InventoryItem[];
    cookingSessions: CookingSession[];
    ingredients: Ingredient[];
    measurements: Measurement[];
  }> {
    const response = await fetch(`${API_BASE}/data/${userId}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    return await response.json();
  },

  // ==================== DATA PERSISTENCE ====================

  /**
   * Save all data for a user in a single transaction
   * 
   * CRITICAL: This endpoint saves data in a specific order to respect foreign key constraints:
   * 1. Ingredients and measurements (no dependencies)
   * 2. Recipes (depend on ingredients/measurements)
   * 3. Inventory and sessions (depend on ingredients AND recipes)
   * 
   * The server handles the ordering automatically. This is the preferred method
   * for bulk saves as it's atomic and maintains data integrity.
   * 
   * @param userId - User whose data to save
   * @param data - Complete user data object
   * @throws Error if save fails (may leave partial data)
   */
  async saveAllData(
    userId: string,
    data: {
      recipes: Recipe[];
      inventory: InventoryItem[];
      cookingSessions: CookingSession[];
      ingredients: Ingredient[];
      measurements: Measurement[];
    }
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/all`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save data');
    }
  },

  /**
   * Save only recipes for a user
   * Used when recipes are updated independently
   */
  async saveRecipes(userId: string, recipes: Recipe[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/recipes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipes }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save recipes');
    }
  },

  /**
   * Save only inventory for a user
   * Used when inventory is updated independently
   */
  async saveInventory(userId: string, inventory: InventoryItem[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inventory }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save inventory');
    }
  },

  /**
   * Save only cooking sessions for a user
   * Used when sessions are updated independently
   */
  async saveSessions(userId: string, sessions: CookingSession[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessions }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save sessions');
    }
  },

  /**
   * Save only ingredients for a user
   * Used when ingredients are updated independently
   */
  async saveIngredients(userId: string, ingredients: Ingredient[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/ingredients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ingredients }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save ingredients');
    }
  },

  /**
   * Save only measurements for a user
   * Used when measurements are updated independently
   */
  async saveMeasurements(userId: string, measurements: Measurement[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/measurements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ measurements }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save measurements');
    }
  },

  // ==================== INITIALIZATION ====================

  /**
   * Initialize a new user with default ingredients and measurements
   * 
   * This is called automatically when a new user logs in for the first time.
   * The server checks if the user already has data and skips if so.
   * 
   * Default data includes:
   * - ~148 common ingredients (vegetables, proteins, spices, etc.)
   * - 25 measurement units with conversion factors
   * - Filipino cooking ingredients
   * 
   * Each user gets their own copy, prefixed with their userId in the database.
   * This allows customization without affecting other users.
   * 
   * @param userId - User to initialize
   * @param ingredients - Default ingredients to copy
   * @param measurements - Default measurements to copy
   * @throws Error if initialization fails
   */
  async initializeUserDefaults(userId: string, ingredients: Ingredient[], measurements: Measurement[]): Promise<void> {
    const response = await fetch(`${API_BASE}/data/${userId}/initialize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ingredients, measurements }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize user data');
    }
  },

  // ==================== HEALTH CHECK ====================

  /**
   * Check if the Supabase backend is reachable
   * 
   * Used on app startup to show connection status to user.
   * Returns true if server responds with 200, false if unreachable.
   * 
   * @returns true if backend is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
