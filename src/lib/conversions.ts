import { Measurement } from '../types';

/**
 * Cucina Recipe Organizer - Measurement Conversion Utilities
 * 
 * This module provides utilities for converting between different measurement units
 * and managing inventory deductions when cooking recipes. It supports automatic
 * unit conversion, so if a recipe requires "2 cups of flour" but you only have
 * "500g of flour" in inventory, it will convert and deduct correctly.
 * 
 * Key Features:
 * - Direct unit conversion (e.g., cups to tablespoons)
 * - Total inventory calculation across multiple units
 * - Automatic deduction with unit conversion
 */

/**
 * Convert a quantity from one measurement unit to another
 * 
 * This function looks up the conversion factor between two measurement units
 * and applies it to convert the quantity. Only direct conversions are supported
 * (no multi-hop conversion chains).
 * 
 * @param fromMeasurementId - Source measurement unit ID
 * @param toMeasurementId - Target measurement unit ID
 * @param quantity - Amount to convert
 * @param measurements - Array of all measurement definitions with conversions
 * @returns Converted quantity, or null if no conversion exists
 * 
 * @example
 * // Convert 2 cups to tablespoons (1 cup = 16 tbsp)
 * convertMeasurement('cup-id', 'tbsp-id', 2, measurements) // Returns 32
 */
export function convertMeasurement(
  fromMeasurementId: string,
  toMeasurementId: string,
  quantity: number,
  measurements: Measurement[]
): number | null {
  // If same unit, no conversion needed
  if (fromMeasurementId === toMeasurementId) {
    return quantity;
  }

  const fromMeasurement = measurements.find((m) => m.id === fromMeasurementId);
  if (!fromMeasurement) return null;

  // Check for direct conversion
  const directConversion = fromMeasurement.conversions.find(
    (c) => c.toMeasurementId === toMeasurementId
  );
  
  if (directConversion) {
    return quantity * directConversion.factor;
  }

  // No conversion path found
  return null;
}

/**
 * Calculate total available quantity of an ingredient across all inventory entries
 * 
 * This is useful when you have the same ingredient stored in different units.
 * For example, if you have "1 cup of flour" and "200g of flour", this function
 * can calculate the total in either unit.
 * 
 * @param ingredientId - The ingredient to check
 * @param targetMeasurementId - The unit to express the total in
 * @param inventory - Array of inventory items
 * @param measurements - Array of measurement definitions for conversions
 * @returns Total quantity in the target unit (unconvertible items are skipped)
 * 
 * @example
 * // Get total flour in grams
 * getTotalInventoryInUnit('flour-id', 'gram-id', inventory, measurements)
 */
export function getTotalInventoryInUnit(
  ingredientId: string,
  targetMeasurementId: string,
  inventory: Array<{ ingredientId: string; measurementId: string; quantity: number }>,
  measurements: Measurement[]
): number {
  let total = 0;

  // Find all inventory items for this ingredient
  const inventoryItems = inventory.filter((item) => item.ingredientId === ingredientId);

  // Convert each to the target unit and sum
  for (const item of inventoryItems) {
    const converted = convertMeasurement(
      item.measurementId,
      targetMeasurementId,
      item.quantity,
      measurements
    );
    
    if (converted !== null) {
      total += converted;
    }
  }

  return total;
}

/**
 * Check if there's enough of an ingredient in inventory for a recipe
 * 
 * Automatically converts all available inventory entries to the required unit
 * and checks if the total meets or exceeds the required quantity.
 * 
 * @param ingredientId - The ingredient to check
 * @param requiredMeasurementId - The unit the recipe requires
 * @param requiredQuantity - How much is needed
 * @param inventory - Array of inventory items
 * @param measurements - Array of measurement definitions
 * @returns Object with hasEnough flag and available quantity
 * 
 * @example
 * // Check if we have 2 cups of flour
 * hasEnoughInventory('flour-id', 'cup-id', 2, inventory, measurements)
 * // Returns: { hasEnough: true, available: 3.5 }
 */
export function hasEnoughInventory(
  ingredientId: string,
  requiredMeasurementId: string,
  requiredQuantity: number,
  inventory: Array<{ ingredientId: string; measurementId: string; quantity: number }>,
  measurements: Measurement[]
): { hasEnough: boolean; available: number; convertedFrom?: string } {
  // Get total available in the required unit
  const totalAvailable = getTotalInventoryInUnit(
    ingredientId,
    requiredMeasurementId,
    inventory,
    measurements
  );

  return {
    hasEnough: totalAvailable >= requiredQuantity,
    available: totalAvailable,
  };
}

/**
 * Deduct ingredients from inventory when completing a recipe
 * 
 * This is the core function for inventory management. When a user completes cooking
 * a recipe, this function automatically:
 * 1. Finds all inventory entries for the ingredient
 * 2. Prioritizes exact unit matches
 * 3. Converts units as needed
 * 4. Deducts quantities, removing entries that reach zero
 * 5. Returns the updated inventory array
 * 
 * IMPORTANT: This function handles unit conversion automatically. If a recipe needs
 * 2 cups but you only have grams, it will convert and deduct the equivalent amount.
 * 
 * @param ingredientId - The ingredient to deduct
 * @param requiredMeasurementId - The unit the recipe specifies
 * @param requiredQuantity - How much to deduct
 * @param inventory - Current inventory array
 * @param measurements - Measurement definitions for conversions
 * @param userId - Current user (ensures we only touch their inventory)
 * @returns Object with updatedInventory array and details of what was deducted
 * 
 * @example
 * // Deduct 2 cups of flour from inventory
 * const result = deductFromInventory('flour-id', 'cup-id', 2, inventory, measurements, 'user-123');
 * // result.updatedInventory contains the new inventory state
 * // result.deducted shows what was taken from each inventory entry
 */
export function deductFromInventory(
  ingredientId: string,
  requiredMeasurementId: string,
  requiredQuantity: number,
  inventory: Array<{ userId: string; ingredientId: string; measurementId: string; quantity: number }>,
  measurements: Measurement[],
  userId: string
): {
  updatedInventory: typeof inventory;
  deducted: Array<{ measurementId: string; quantity: number }>;
} {
  const deducted: Array<{ measurementId: string; quantity: number }> = [];
  let remainingToDeduct = requiredQuantity;
  let updatedInventory = [...inventory];

  // Find all inventory items for this ingredient and user
  const relevantItems = updatedInventory
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) => item.userId === userId && item.ingredientId === ingredientId
    );

  // Sort by preference: exact unit match first, then convertible units
  const sortedItems = relevantItems.sort((a, b) => {
    if (a.item.measurementId === requiredMeasurementId) return -1;
    if (b.item.measurementId === requiredMeasurementId) return 1;
    return 0;
  });

  for (const { item, index } of sortedItems) {
    if (remainingToDeduct <= 0) break;

    // Convert the remaining amount to this item's unit
    const amountInItemUnit = convertMeasurement(
      requiredMeasurementId,
      item.measurementId,
      remainingToDeduct,
      measurements
    );

    if (amountInItemUnit === null) continue; // Can't convert, skip this item

    // Determine how much we can deduct from this item
    const toDeduct = Math.min(item.quantity, amountInItemUnit);

    // Update the inventory item
    const newQuantity = item.quantity - toDeduct;
    
    if (newQuantity > 0.001) {
      // Keep the item with reduced quantity (threshold prevents floating point issues)
      updatedInventory[index] = {
        ...item,
        quantity: newQuantity,
      };
    } else {
      // Remove the item (mark for removal)
      updatedInventory[index] = { ...item, quantity: -1 };
    }

    // Record what was deducted
    deducted.push({
      measurementId: item.measurementId,
      quantity: toDeduct,
    });

    // Convert back to required unit to track remaining
    const deductedInRequiredUnit = convertMeasurement(
      item.measurementId,
      requiredMeasurementId,
      toDeduct,
      measurements
    );

    if (deductedInRequiredUnit !== null) {
      remainingToDeduct -= deductedInRequiredUnit;
    }
  }

  // Remove items marked for deletion (quantity === -1)
  updatedInventory = updatedInventory.filter((item) => item.quantity !== -1);

  return { updatedInventory, deducted };
}