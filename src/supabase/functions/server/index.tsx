/**
 * Cucina Recipe Organizer - Supabase Edge Function Server
 * 
 * This is the backend API server that runs as a Supabase Edge Function.
 * It provides RESTful endpoints for authentication and data management,
 * acting as the middle layer between the frontend and the Supabase database.
 * 
 * Technology Stack:
 * - Hono: Fast, lightweight web framework for Edge Functions
 * - Deno: JavaScript/TypeScript runtime
 * - Supabase: PostgreSQL database
 * 
 * Architecture:
 * Frontend (React) → HTTP/JSON → This Server → Supabase Database
 * 
 * Critical Design Decisions:
 * 1. Per-User Data Isolation: Each user has their own copy of ingredients,
 *    measurements, recipes, etc. (not shared globally)
 * 2. Foreign Key Constraints: Data must be saved in specific order
 * 3. Prefix Strategy: User-specific IDs are prefixed with userId to ensure uniqueness
 * 
 * Endpoints:
 * - POST /auth/signup - Create new user account
 * - POST /auth/login - Authenticate user
 * - GET /data/:userId - Fetch all user data
 * - POST /data/:userId/all - Save all user data (respects FK constraints)
 * - POST /data/:userId/recipes - Save recipes only
 * - POST /data/:userId/inventory - Save inventory only
 * - POST /data/:userId/sessions - Save cooking sessions only
 * - POST /data/:userId/ingredients - Save ingredients only
 * - POST /data/:userId/measurements - Save measurements only
 * - POST /data/:userId/initialize - Initialize new user with defaults
 * - GET /health - Health check endpoint
 */

import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as db from './database.tsx';

const app = new Hono();

// Enable CORS for all routes (allows frontend to make requests)
app.use('*', cors());

// Log all requests to console for debugging
app.use('*', logger(console.log));

// ==================== AUTH ROUTES ====================

/**
 * POST /auth/signup
 * Create a new user account
 * 
 * Request: { username: string, password: string }
 * Response: { user: { id: string, username: string } }
 * 
 * Validates:
 * - Username and password are provided
 * - Username is unique
 */
app.post('/make-server-940412d4/auth/signup', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400);
    }

    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return c.json({ error: 'Username already exists' }, 400);
    }

    const user = await db.createUser(username, password);

    return c.json({ user: { id: user.id, username: user.username } }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

/**
 * POST /auth/login
 * Authenticate a user
 * 
 * Request: { username: string, password: string }
 * Response: { user: { id: string, username: string } }
 * 
 * Special case: "demo"/"demo" credentials return demo user without DB lookup
 * 
 * Validates:
 * - Username and password are provided
 * - Credentials match a user in the database
 */
app.post('/make-server-940412d4/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400);
    }

    if (username === 'demo' && password === 'demo') {
      return c.json({ user: { id: 'demo', username: 'demo' } }, 200);
    }

    const user = await db.getUserByUsername(username);
    if (!user || user.password !== password) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({ user: { id: user.id, username: user.username } }, 200);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Failed to authenticate' }, 500);
  }
});

// ==================== DATA ROUTES ====================

/**
 * GET /data/:userId
 * Fetch all data for a specific user
 * 
 * Returns all user-owned data in parallel for performance:
 * - Recipes
 * - Inventory items
 * - Cooking sessions
 * - Ingredients (user-specific copy)
 * - Measurements (user-specific copy with conversions)
 * 
 * Response: {
 *   recipes: Recipe[],
 *   inventory: InventoryItem[],
 *   cookingSessions: CookingSession[],
 *   ingredients: Ingredient[],
 *   measurements: Measurement[]
 * }
 */
app.get('/make-server-940412d4/data/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    const [recipes, inventory, cookingSessions, ingredients, measurements] = await Promise.all([
      db.getRecipes(userId),
      db.getInventory(userId),
      db.getCookingSessions(userId),
      db.getIngredients(userId),
      db.getMeasurements(userId)
    ]);

    return c.json({
      recipes,
      inventory,
      cookingSessions,
      ingredients,
      measurements
    }, 200);
  } catch (error) {
    console.error('Get data error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

/**
 * POST /data/:userId/recipes
 * Save/update all recipes for a user
 * 
 * Replaces all existing recipes with the provided array.
 * Used for individual recipe updates from the frontend.
 */
app.post('/make-server-940412d4/data/:userId/recipes', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { recipes } = await c.req.json();
    
    await db.saveAllRecipes(recipes, userId);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Save recipes error:', error);
    return c.json({ error: 'Failed to save recipes' }, 500);
  }
});

/**
 * POST /data/:userId/inventory
 * Save/update all inventory items for a user
 */
app.post('/make-server-940412d4/data/:userId/inventory', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { inventory } = await c.req.json();
    
    await db.saveAllInventory(inventory, userId);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Save inventory error:', error);
    return c.json({ error: 'Failed to save inventory' }, 500);
  }
});

/**
 * POST /data/:userId/sessions
 * Save/update all cooking sessions for a user
 */
app.post('/make-server-940412d4/data/:userId/sessions', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { sessions } = await c.req.json();
    
    await db.saveAllCookingSessions(sessions, userId);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Save sessions error:', error);
    return c.json({ error: 'Failed to save sessions' }, 500);
  }
});

/**
 * POST /data/:userId/ingredients
 * Save/update all ingredients for a user
 */
app.post('/make-server-940412d4/data/:userId/ingredients', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { ingredients } = await c.req.json();
    
    await db.saveAllIngredients(ingredients, userId);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Save ingredients error:', error);
    return c.json({ error: 'Failed to save ingredients' }, 500);
  }
});

/**
 * POST /data/:userId/measurements
 * Save/update all measurements for a user
 */
app.post('/make-server-940412d4/data/:userId/measurements', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { measurements } = await c.req.json();
    
    await db.saveAllMeasurements(measurements, userId);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Save measurements error:', error);
    return c.json({ error: 'Failed to save measurements' }, 500);
  }
});

/**
 * POST /data/:userId/all
 * Save all user data in a single request
 * 
 * CRITICAL: This endpoint respects foreign key constraint order:
 * 
 * Step 1: Save ingredients & measurements (no dependencies)
 *   - These are foundational data with no FK constraints
 *   - Can be saved in parallel
 * 
 * Step 2: Save recipes (depends on ingredients & measurements)
 *   - Recipe ingredients reference ingredient IDs
 *   - Recipe measurements reference measurement IDs
 *   - Must wait for Step 1 to complete
 * 
 * Step 3: Save inventory & sessions (depends on ingredients & recipes)
 *   - Inventory items reference ingredient IDs
 *   - Cooking sessions reference recipe IDs
 *   - Must wait for Steps 1 & 2 to complete
 * 
 * This ordering prevents foreign key constraint violations.
 * 
 * Request: {
 *   recipes: Recipe[],
 *   inventory: InventoryItem[],
 *   cookingSessions: CookingSession[],
 *   ingredients: Ingredient[],
 *   measurements: Measurement[]
 * }
 * 
 * Response: { success: true }
 */
app.post('/make-server-940412d4/data/:userId/all', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { recipes, inventory, cookingSessions, ingredients, measurements } = await c.req.json();
    
    console.log(`Saving all data for user ${userId}:`, {
      recipesCount: recipes.length,
      inventoryCount: inventory.length,
      sessionsCount: cookingSessions.length,
      ingredientsCount: ingredients.length,
      measurementsCount: measurements.length
    });
    
    // IMPORTANT: Save in order to respect ALL foreign key constraints
    // 1. First save ingredients and measurements (no dependencies)
    await Promise.all([
      db.saveAllIngredients(ingredients, userId),
      db.saveAllMeasurements(measurements, userId)
    ]);
    console.log('✅ Step 1: Saved ingredients and measurements');
    
    // 2. Then save recipes (depends on ingredients/measurements)
    await db.saveAllRecipes(recipes, userId);
    console.log('✅ Step 2: Saved recipes');
    
    // 3. Finally save inventory and sessions (depend on ingredients AND recipes)
    await Promise.all([
      db.saveAllInventory(inventory, userId),
      db.saveAllCookingSessions(cookingSessions, userId)
    ]);
    console.log('✅ Step 3: Saved inventory and sessions');
    
    console.log(`✅ Successfully saved all data for user ${userId}`);
    
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('❌ [Supabase] Save all data error:', error);
    return c.json({ error: 'Failed to save data' }, 500);
  }
});

/**
 * POST /data/:userId/initialize
 * Initialize a new user with default ingredients and measurements
 * 
 * Called automatically when a user logs in for the first time.
 * The database layer checks if the user already has data and skips if so.
 * 
 * This gives each user their own copy of ~148 ingredients and 25 measurements,
 * allowing customization without affecting other users.
 * 
 * Request: {
 *   ingredients: Ingredient[],
 *   measurements: Measurement[]
 * }
 * 
 * Response: {
 *   initialized: boolean,
 *   measurementsCount: number,
 *   ingredientsCount: number
 * }
 * or
 * {
 *   alreadyInitialized: true
 * }
 */
app.post('/make-server-940412d4/data/:userId/initialize', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { ingredients, measurements } = await c.req.json();
    
    console.log(`[Initialize] Initializing user ${userId} with ${measurements.length} measurements and ${ingredients.length} ingredients`);
    
    const result = await db.initializeUserDefaults(userId, ingredients, measurements);
    
    return c.json(result, 200);
  } catch (error) {
    console.error('Initialize user error:', error);
    return c.json({ error: 'Failed to initialize user data' }, 500);
  }
});

/**
 * GET /health
 * Health check endpoint
 * 
 * Returns 200 OK if the server is running.
 * Used by frontend to check backend connectivity on app startup.
 * 
 * Response: { status: 'ok', timestamp: number }
 */
app.get('/make-server-940412d4/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() }, 200);
});

// Start the Deno server
Deno.serve(app.fetch);