import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

/**
 * Cucina Recipe Organizer - Database Layer
 * 
 * This module handles all direct interactions with the Supabase PostgreSQL database.
 * It implements the per-user data isolation strategy and manages foreign key constraints.
 * 
 * KEY ARCHITECTURAL DECISION: User-Specific ID Prefixing
 * =======================================================
 * To give each user their own isolated copy of ingredients and measurements while using
 * a single shared database, we prefix all IDs with the userId. For example:
 * 
 * Frontend ID: "1" (cup)
 * Database ID: "user-123-1" (cup for user-123)
 * Database ID: "user-456-1" (cup for user-456)
 * 
 * This strategy:
 * - Ensures each user has unique IDs in the database
 * - Allows users to customize their ingredients/measurements
 * - Prevents foreign key constraint violations
 * - Maintains referential integrity
 * 
 * The prefixing is applied in:
 * - saveAllIngredients(): ingredient.id → "${userId}-${ingredient.id}"
 * - saveAllMeasurements(): measurement.id → "${userId}-${measurement.id}"
 * - All references in recipes, inventory, and conversions are also prefixed
 * 
 * When data is retrieved, IDs are stripped of the prefix to keep the frontend simple.
 * 
 * Database Schema:
 * ================
 * - users: User accounts (id, username, password)
 * - ingredients: Per-user ingredients (id, name, is_custom, user_id)
 * - measurements: Per-user measurement units (id, name, user_id)
 * - measurement_conversions: Conversion factors (id, from_measurement_id, to_measurement_id, factor)
 * - recipes: User recipes (id, user_id, name, description, servings, view_count, cook_count, created_at)
 * - recipe_ingredients: Recipe ingredient list (id, recipe_id, ingredient_id, quantity, measurement_id)
 * - recipe_instructions: Recipe steps (id, recipe_id, step_number, instruction)
 * - inventory: User's ingredient stock (id, user_id, ingredient_id, quantity, measurement_id)
 * - cooking_sessions: Active cooking sessions (id, recipe_id, user_id, ingredients_checked, steps_checked, serving_size, status)
 * 
 * Foreign Key Constraints:
 * ========================
 * The save order matters! Always save in this sequence:
 * 1. Ingredients & Measurements (no dependencies)
 * 2. Recipes (references ingredients & measurements)
 * 3. Inventory & Sessions (references ingredients & recipes)
 */

/**
 * Create a Supabase client instance
 * Uses the service role key to bypass Row Level Security (RLS)
 * This is safe because this code runs on the server, not in the browser
 */
const supabase = () => createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// ==================== USER FUNCTIONS ====================

/**
 * Create a new user account
 * 
 * Generates a unique user ID using timestamp and random string.
 * In production, passwords should be hashed (e.g., with bcrypt).
 * 
 * @param username - Unique username
 * @param password - Plain text password (should be hashed in production!)
 * @returns Created user object
 */
export async function createUser(username: string, password: string) {
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { data, error } = await supabase()
    .from('users')
    .insert({ id: userId, username, password })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Find a user by username
 * 
 * @param username - Username to search for
 * @returns User object if found, null otherwise
 */
export async function getUserByUsername(username: string) {
  const { data, error } = await supabase()
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// ==================== INGREDIENT FUNCTIONS ====================

/**
 * Retrieve all ingredients for a user
 * 
 * Strips the userId prefix from ingredient IDs before returning to keep frontend simple.
 * Example: Database "user-123-47" → Frontend "47"
 * 
 * @param userId - User whose ingredients to fetch
 * @returns Array of ingredients (IDs without prefix)
 */
export async function getIngredients(userId: string) {
  console.log(`[getIngredients] Fetching ingredients for user ${userId}`);
  const { data, error } = await supabase()
    .from('ingredients')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  
  if (error) {
    console.error(`[getIngredients] Error:`, error);
    throw error;
  }
  
  console.log(`[getIngredients] Found ${data?.length || 0} ingredients for user ${userId}`);
  
  // Strip userId prefix from IDs for frontend
  return (data || []).map(ing => ({
    id: ing.id,  // Keep full ID since it's already user-specific in DB
    name: ing.name,
    isCustom: ing.is_custom
  }));
}

/**
 * Save a single ingredient for a user
 * 
 * @param ingredient - Ingredient object to save
 * @param userId - User who owns this ingredient
 * @returns Saved ingredient
 */
export async function saveIngredient(ingredient: any, userId: string) {
  const { data, error } = await supabase()
    .from('ingredients')
    .upsert({
      id: ingredient.id,
      name: ingredient.name,
      is_custom: ingredient.isCustom || false,
      user_id: userId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Save all ingredients for a user
 * 
 * CRITICAL FUNCTION: Implements the userId-prefixing strategy
 * 
 * Process:
 * 1. Delete all existing ingredients for this user
 * 2. Prefix each ingredient ID with userId
 * 3. Insert all ingredients in one batch
 * 
 * Example transformation:
 * Frontend: { id: "47", name: "Eggplant" }
 * Database: { id: "user-123-47", name: "Eggplant", user_id: "user-123" }
 * 
 * This ensures each user has unique ingredient IDs in the database.
 * 
 * @param ingredients - Array of ingredients from frontend (unprefixed IDs)
 * @param userId - User who owns these ingredients
 */
export async function saveAllIngredients(ingredients: any[], userId: string) {
  console.log(`[saveAllIngredients] Starting save for user ${userId} with ${ingredients.length} ingredients`);
  console.log(`[saveAllIngredients] Sample ingredients:`, ingredients.slice(0, 3));
  
  const db = supabase();
  
  // Delete all existing ingredients for this user
  await db
    .from('ingredients')
    .delete()
    .eq('user_id', userId);
  
  console.log(`[saveAllIngredients] Deleted existing ingredients for user ${userId}`);
  
  // Upsert all ingredients for this user
  if (ingredients.length > 0) {
    const ingredientsData = ingredients.map(ingredient => ({
      id: `${userId}-${ingredient.id}`, // Prefix with userId to make it unique per user
      name: ingredient.name,
      is_custom: ingredient.isCustom || false,
      user_id: userId
    }));
    
    console.log(`[saveAllIngredients] Inserting ${ingredientsData.length} ingredients for user ${userId}`);
    
    const { error } = await db
      .from('ingredients')
      .insert(ingredientsData);
    
    if (error) {
      console.error('[saveAllIngredients] Error inserting ingredients:', error);
      throw error;
    }
    
    console.log(`[saveAllIngredients] ✅ Successfully saved ${ingredients.length} ingredients for user ${userId}`);
  } else {
    console.log('[saveAllIngredients] No ingredients to save');
  }
}

// ==================== MEASUREMENT FUNCTIONS ====================

/**
 * Retrieve all measurements for a user (with their conversions)
 * 
 * Fetches both measurements and their conversion factors in separate queries,
 * then combines them into the expected format.
 * 
 * @param userId - User whose measurements to fetch
 * @returns Array of measurements with nested conversion arrays
 */
export async function getMeasurements(userId: string) {
  const db = supabase();
  
  // Get all measurements for this user
  const { data: measurements, error: measError } = await db
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  
  if (measError) throw measError;

  if (!measurements || measurements.length === 0) return [];

  const measurementIds = measurements.map(m => m.id);

  // Get all conversions for this user's measurements
  const { data: conversions, error: convError } = await db
    .from('measurement_conversions')
    .select('*')
    .in('from_measurement_id', measurementIds);
  
  if (convError) throw convError;

  // Combine into measurement objects with conversions
  return measurements.map(m => ({
    id: m.id,
    name: m.name,
    conversions: (conversions || [])
      .filter(c => c.from_measurement_id === m.id)
      .map(c => ({
        toMeasurementId: c.to_measurement_id,
        factor: parseFloat(c.factor)
      }))
  }));
}

/**
 * Save a single measurement with its conversions
 * 
 * @param measurement - Measurement object with conversions array
 * @param userId - User who owns this measurement
 * @returns Saved measurement
 */
export async function saveMeasurement(measurement: any, userId: string) {
  const db = supabase();
  
  // Upsert measurement
  const { data, error: measError } = await db
    .from('measurements')
    .upsert({
      id: measurement.id,
      name: measurement.name,
      user_id: userId
    })
    .select()
    .single();
  
  if (measError) throw measError;

  // Delete existing conversions for this measurement
  await db
    .from('measurement_conversions')
    .delete()
    .eq('from_measurement_id', measurement.id);

  // Insert new conversions
  if (measurement.conversions && measurement.conversions.length > 0) {
    const conversionsToInsert = measurement.conversions.map((c: any, index: number) => ({
      id: `conv-${measurement.id}-${index}`,
      from_measurement_id: measurement.id,
      to_measurement_id: c.toMeasurementId,
      factor: c.factor
    }));
    
    const { error: convError } = await db
      .from('measurement_conversions')
      .insert(conversionsToInsert);
    
    if (convError) throw convError;
  }

  return data;
}

/**
 * Save all measurements for a user
 * 
 * CRITICAL FUNCTION: Implements userId-prefixing for measurements AND their conversions
 * 
 * Process:
 * 1. Delete existing measurement conversions
 * 2. Delete existing measurements
 * 3. Insert measurements with prefixed IDs
 * 4. Insert conversions with prefixed from/to IDs
 * 
 * Example transformation:
 * Frontend measurement: { id: "1", name: "cup", conversions: [{ toMeasurementId: "2", factor: 16 }] }
 * Database measurement: { id: "user-123-1", name: "cup", user_id: "user-123" }
 * Database conversion: { from_measurement_id: "user-123-1", to_measurement_id: "user-123-2", factor: 16 }
 * 
 * This ensures all measurement references are user-specific and don't conflict between users.
 * 
 * @param measurements - Array of measurements from frontend (unprefixed IDs)
 * @param userId - User who owns these measurements
 */
export async function saveAllMeasurements(measurements: any[], userId: string) {
  console.log(`[saveAllMeasurements] Starting save for user ${userId} with ${measurements.length} measurements`);
  const db = supabase();
  
  try {
    // Delete all existing measurements and conversions for this user
    const { data: existingMeasurements } = await db
      .from('measurements')
      .select('id')
      .eq('user_id', userId);
    
    if (existingMeasurements && existingMeasurements.length > 0) {
      const existingIds = existingMeasurements.map(m => m.id);
      
      // Delete conversions first (foreign key constraint)
      await db
        .from('measurement_conversions')
        .delete()
        .in('from_measurement_id', existingIds);
      
      console.log(`[saveAllMeasurements] Deleted existing conversions for user ${userId}`);
    }
    
    // Delete measurements
    await db
      .from('measurements')
      .delete()
      .eq('user_id', userId);
    
    console.log(`[saveAllMeasurements] Deleted existing measurements for user ${userId}`);
    
    // Insert all measurements with prefixed IDs
    const measurementsData = measurements.map(m => ({
      id: `${userId}-${m.id}`, // Prefix with userId to make it unique per user
      name: m.name,
      user_id: userId
    }));
    
    console.log(`[saveAllMeasurements] Inserting ${measurementsData.length} measurements...`);
    const { error: measError } = await db
      .from('measurements')
      .insert(measurementsData);
    
    if (measError) {
      console.error('[saveAllMeasurements] Error inserting measurements:', measError);
      throw measError;
    }
    console.log(`[saveAllMeasurements] ✅ Successfully inserted ${measurementsData.length} measurements`);
    
    // Collect all conversions from all measurements with prefixed IDs
    const allConversions: any[] = [];
    measurements.forEach(measurement => {
      if (measurement.conversions && measurement.conversions.length > 0) {
        measurement.conversions.forEach((c: any, index: number) => {
          allConversions.push({
            id: `${userId}-conv-${measurement.id}-${index}`,  // Prefix with userId
            from_measurement_id: `${userId}-${measurement.id}`,  // Use the new userId-prefixed ID
            to_measurement_id: `${userId}-${c.toMeasurementId}`,  // Use the new userId-prefixed ID
            factor: c.factor
          });
        });
      }
    });
    
    // Insert all conversions in one batch
    if (allConversions.length > 0) {
      console.log(`[saveAllMeasurements] Inserting ${allConversions.length} conversions...`);
      const { error: convError } = await db
        .from('measurement_conversions')
        .insert(allConversions);
      
      if (convError) {
        console.error('[saveAllMeasurements] Error inserting conversions:', convError);
        throw convError;
      }
      console.log(`[saveAllMeasurements] ✅ Successfully inserted ${allConversions.length} conversions`);
    }
    
    console.log(`[saveAllMeasurements] ✅ Successfully saved all ${measurements.length} measurements with conversions for user ${userId}`);
  } catch (error) {
    console.error('[saveAllMeasurements] ❌ Fatal error:', error);
    throw error;
  }
}

// ==================== RECIPE FUNCTIONS ====================

export async function getRecipes(userId: string) {
  const db = supabase();
  
  // Get all recipes for this user
  const { data: recipes, error: recipesError } = await db
    .from('recipes')
    .select('*')
    .eq('user_id', userId);
  
  if (recipesError) throw recipesError;
  if (!recipes || recipes.length === 0) return [];

  const recipeIds = recipes.map(r => r.id);

  // Get all instructions for these recipes
  const { data: instructions, error: instructionsError } = await db
    .from('recipe_instructions')
    .select('*')
    .in('recipe_id', recipeIds)
    .order('step_number');
  
  if (instructionsError) throw instructionsError;

  // Get all recipe ingredients
  const { data: recipeIngredients, error: ingredientsError } = await db
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds);
  
  if (ingredientsError) throw ingredientsError;

  // Combine everything into recipe objects
  return recipes.map(recipe => {
    const recipeInstructions = (instructions || [])
      .filter(i => i.recipe_id === recipe.id)
      .sort((a, b) => a.step_number - b.step_number)
      .map(i => i.instruction);
    
    const ingredients = (recipeIngredients || [])
      .filter(ri => ri.recipe_id === recipe.id)
      .map(ri => ({
        ingredientId: ri.ingredient_id,
        quantity: parseFloat(ri.quantity),
        measurementId: ri.measurement_id
      }));

    return {
      id: recipe.id,
      userId: recipe.user_id,
      name: recipe.name,
      description: recipe.description || '',
      servings: recipe.servings,
      ingredients,
      instructions: recipeInstructions,
      viewCount: recipe.view_count || 0,
      cookCount: recipe.cook_count || 0,
      createdAt: recipe.created_at
    };
  });
}

export async function saveRecipe(recipe: any, userId: string) {
  const db = supabase();
  
  // Upsert recipe
  const { data: savedRecipe, error: recipeError } = await db
    .from('recipes')
    .upsert({
      id: recipe.id,
      user_id: userId,
      name: recipe.name,
      description: recipe.description,
      servings: recipe.servings,
      view_count: recipe.viewCount || 0,
      cook_count: recipe.cookCount || 0,
      created_at: recipe.createdAt
    })
    .select()
    .single();
  
  if (recipeError) throw recipeError;

  // Delete existing instructions and ingredients
  await db.from('recipe_instructions').delete().eq('recipe_id', recipe.id);
  await db.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);

  // Insert instructions
  if (recipe.instructions && recipe.instructions.length > 0) {
    const instructionsData = recipe.instructions.map((instruction: string, index: number) => ({
      id: `inst-${recipe.id}-${index}`,
      recipe_id: recipe.id,
      step_number: index,
      instruction
    }));
    
    const { error: instructionsError } = await db
      .from('recipe_instructions')
      .insert(instructionsData);
    
    if (instructionsError) throw instructionsError;
  }

  // Insert recipe ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const ingredientsDataToInsert = recipe.ingredients.map((ingredient: any, index: number) => ({
      id: `ri-${recipe.id}-${index}`,
      recipe_id: recipe.id,
      ingredient_id: ingredient.ingredientId,
      quantity: ingredient.quantity,
      measurement_id: ingredient.measurementId
    }));
    
    const { error: ingredientsError } = await db
      .from('recipe_ingredients')
      .insert(ingredientsDataToInsert);
    
    if (ingredientsError) throw ingredientsError;
  }

  return savedRecipe;
}

export async function deleteRecipe(recipeId: string, userId: string) {
  const { error } = await supabase()
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

export async function saveAllRecipes(recipes: any[], userId: string) {
  // Delete all existing recipes for this user
  const db = supabase();
  await db
    .from('recipes')
    .delete()
    .eq('user_id', userId);
  
  // Insert all new recipes
  for (const recipe of recipes) {
    await saveRecipe(recipe, userId);
  }
}

// ==================== INVENTORY FUNCTIONS ====================

export async function getInventory(userId: string) {
  const { data, error } = await supabase()
    .from('inventory')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    userId: item.user_id,
    ingredientId: item.ingredient_id,
    quantity: parseFloat(item.quantity),
    measurementId: item.measurement_id
  }));
}

export async function saveInventoryItem(item: any, userId: string) {
  const db = supabase();
  
  // Check if item exists
  const { data: existing } = await db
    .from('inventory')
    .select('id')
    .eq('user_id', userId)
    .eq('ingredient_id', item.ingredientId)
    .maybeSingle();

  const { data, error } = await db
    .from('inventory')
    .upsert({
      id: existing?.id || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
      measurement_id: item.measurementId
    }, {
      onConflict: 'user_id,ingredient_id'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(userId: string, ingredientId: string) {
  const { error } = await supabase()
    .from('inventory')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId);
  
  if (error) throw error;
}

export async function saveAllInventory(inventory: any[], userId: string) {
  console.log(`[saveAllInventory] Starting save for user ${userId} with ${inventory.length} items`);
  
  // Delete all existing inventory for this user
  const { error: deleteError } = await supabase()
    .from('inventory')
    .delete()
    .eq('user_id', userId);
  
  if (deleteError) {
    console.error('[saveAllInventory] Error deleting existing inventory:', deleteError);
    throw deleteError;
  }
  console.log(`[saveAllInventory] Deleted existing inventory for user ${userId}`);
  
  // Insert all new inventory items
  if (inventory.length > 0) {
    const inventoryData = inventory.map((item, index) => ({
      id: `inv-${userId}-${Date.now()}-${index}`,
      user_id: userId,
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
      measurement_id: item.measurementId
    }));

    const { error } = await supabase()
      .from('inventory')
      .insert(inventoryData);
    
    if (error) {
      console.error('[saveAllInventory] Error inserting inventory:', error);
      throw error;
    }
    
    console.log(`[saveAllInventory] ✅ Successfully saved ${inventory.length} inventory items for user ${userId}`);
  } else {
    console.log('[saveAllInventory] No inventory items to save');
  }
}

// ==================== COOKING SESSION FUNCTIONS ====================

export async function getCookingSessions(userId: string) {
  const { data, error } = await supabase()
    .from('cooking_sessions')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  return (data || []).map(session => ({
    id: session.id,
    recipeId: session.recipe_id,
    userId: session.user_id,
    ingredientsChecked: session.ingredients_checked || [],
    stepsChecked: session.steps_checked || [],
    servingSize: session.serving_size,
    status: session.status
  }));
}

export async function saveCookingSession(session: any, userId: string) {
  const { data, error } = await supabase()
    .from('cooking_sessions')
    .upsert({
      id: session.id,
      recipe_id: session.recipeId,
      user_id: userId,
      ingredients_checked: session.ingredientsChecked,
      steps_checked: session.stepsChecked,
      serving_size: session.servingSize,
      status: session.status
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCookingSession(sessionId: string, userId: string) {
  const { error } = await supabase()
    .from('cooking_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

export async function saveAllCookingSessions(sessions: any[], userId: string) {
  // Delete all existing sessions for this user
  await supabase()
    .from('cooking_sessions')
    .delete()
    .eq('user_id', userId);
  
  // Insert all new sessions
  if (sessions.length > 0) {
    const sessionsData = sessions.map(session => ({
      id: session.id,
      recipe_id: session.recipeId,
      user_id: userId,
      ingredients_checked: session.ingredientsChecked,
      steps_checked: session.stepsChecked,
      serving_size: session.servingSize,
      status: session.status
    }));

    const { error } = await supabase()
      .from('cooking_sessions')
      .insert(sessionsData);
    
    if (error) throw error;
  }
}

// ==================== INITIALIZATION FUNCTIONS ====================

export async function initializeUserDefaults(userId: string, defaultIngredients: any[], defaultMeasurements: any[]) {
  console.log(`[initializeUserDefaults] Initializing defaults for user ${userId}`);
  
  // Check if user already has data
  const existingIngredients = await getIngredients(userId);
  const existingMeasurements = await getMeasurements(userId);
  
  if (existingIngredients.length > 0 || existingMeasurements.length > 0) {
    console.log(`[initializeUserDefaults] User ${userId} already has data, skipping initialization`);
    return { alreadyInitialized: true };
  }
  
  console.log(`[initializeUserDefaults] Populating ${defaultMeasurements.length} measurements and ${defaultIngredients.length} ingredients for user ${userId}`);
  
  // Save measurements and ingredients for this user
  await saveAllMeasurements(defaultMeasurements, userId);
  await saveAllIngredients(defaultIngredients, userId);
  
  console.log(`[initializeUserDefaults] ✅ Successfully initialized user ${userId}`);
  
  return { 
    initialized: true,
    measurementsCount: defaultMeasurements.length,
    ingredientsCount: defaultIngredients.length
  };
}
