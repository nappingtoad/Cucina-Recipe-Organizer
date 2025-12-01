import { useState } from 'react';
import { InventoryItem, Ingredient, Measurement } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Search, Edit, Trash2, Save, X, Package, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { getTotalInventoryInUnit, convertMeasurement } from '../lib/conversions';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  ingredients: Ingredient[];
  measurements: Measurement[];
  onAdd: (item: Omit<InventoryItem, 'userId'>) => void;
  onEdit: (ingredientId: string, oldMeasurementId: string, newMeasurementId: string, quantity: number) => void;
  onDelete: (ingredientId: string, measurementId: string) => void;
}

export function InventoryManager({
  inventory,
  ingredients,
  measurements,
  onAdd,
  onEdit,
  onDelete,
}: InventoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newMeasurementId, setNewMeasurementId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [measurementSearch, setMeasurementSearch] = useState('');
  const [showIngredientSuggestions, setShowIngredientSuggestions] = useState(false);
  const [showMeasurementSuggestions, setShowMeasurementSuggestions] = useState(false);
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMeasurementId, setEditMeasurementId] = useState('');
  
  const [deleteItem, setDeleteItem] = useState<{ ingredientId: string; measurementId: string } | null>(null);

  const getIngredientName = (id: string) => {
    return ingredients.find((i) => i.id === id)?.name || 'Unknown';
  };

  const getMeasurementName = (id: string) => {
    return measurements.find((m) => m.id === id)?.name || '';
  };

  const getConvertibleUnits = (measurementId: string): Measurement[] => {
    const measurement = measurements.find((m) => m.id === measurementId);
    if (!measurement) return [];
    
    const convertibleIds = measurement.conversions.map((c) => c.toMeasurementId);
    return measurements.filter((m) => convertibleIds.includes(m.id));
  };

  const getAggregatedInventory = () => {
    // Group inventory by ingredient and show total in multiple units
    const grouped: Map<string, Array<{ measurementId: string; quantity: number }>> = new Map();
    
    inventory.forEach((item) => {
      if (!grouped.has(item.ingredientId)) {
        grouped.set(item.ingredientId, []);
      }
      grouped.get(item.ingredientId)!.push({
        measurementId: item.measurementId,
        quantity: item.quantity,
      });
    });
    
    return grouped;
  };

  const filteredInventory = inventory.filter((item) =>
    getIngredientName(item.ingredientId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const filteredMeasurements = measurements.filter((meas) =>
    meas.name.toLowerCase().includes(measurementSearch.toLowerCase())
  );

  const handleSelectIngredient = (ingredientId: string, ingredientName: string) => {
    setNewIngredientId(ingredientId);
    setIngredientSearch(ingredientName);
    setShowIngredientSuggestions(false);
  };

  const handleSelectMeasurement = (measurementId: string, measurementName: string) => {
    setNewMeasurementId(measurementId);
    setMeasurementSearch(measurementName);
    setShowMeasurementSuggestions(false);
  };

  const handleAdd = () => {
    if (!newIngredientId) {
      toast.error('Please select an ingredient');
      return;
    }
    if (!newMeasurementId) {
      toast.error('Please select a measurement');
      return;
    }
    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    onAdd({
      ingredientId: newIngredientId,
      measurementId: newMeasurementId,
      quantity,
    });

    setNewIngredientId('');
    setShowIngredientSuggestions(false);
    setShowMeasurementSuggestions(false);
    setNewMeasurementId('');
    setNewQuantity('');
    setIngredientSearch('');
    setMeasurementSearch('');
    setShowAddForm(false);
    toast.success('Item added to inventory');
  };

  const handleEdit = (item: InventoryItem) => {
    const quantity = parseFloat(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!editMeasurementId) {
      toast.error('Please select a measurement');
      return;
    }
    onEdit(item.ingredientId, item.measurementId, editMeasurementId, quantity);
    setEditingKey(null);
    setEditQuantity('');
    setEditMeasurementId('');
    toast.success('Inventory updated');
  };

  const startEdit = (item: InventoryItem) => {
    setEditingKey(`${item.ingredientId}-${item.measurementId}`);
    setEditQuantity(item.quantity.toString());
    setEditMeasurementId(item.measurementId);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditQuantity('');
    setEditMeasurementId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Inventory Manager</h2>
          <p className="text-muted-foreground">Track your ingredient supplies</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Inventory ({inventory.length} items)</CardTitle>
          <CardDescription>Search and manage your ingredient stock</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No items found' : 'No items in inventory'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </div>
          ) : (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  💡 Units convert automatically! Add ingredients in any unit - the system will recognize compatible measurements.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredInventory.map((item) => {
                  const key = `${item.ingredientId}-${item.measurementId}`;
                  const isEditing = editingKey === key;
                  const convertibleUnits = getConvertibleUnits(item.measurementId);
                  
                  // Calculate some common conversions to display
                  const commonConversions = convertibleUnits.slice(0, 2).map((unit) => {
                    const converted = convertMeasurement(
                      item.measurementId,
                      unit.id,
                      item.quantity,
                      measurements
                    );
                    return converted !== null ? { unit: unit.name, amount: converted } : null;
                  }).filter(Boolean);

                  return (
                    <div
                      key={key}
                      className="border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 p-3">
                        <span className="flex-1">
                          {getIngredientName(item.ingredientId)}
                        </span>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-24"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEdit(item);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Select
                              value={editMeasurementId}
                              onValueChange={setEditMeasurementId}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                {measurements.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => handleEdit(item)}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-right">
                              {item.quantity} {getMeasurementName(item.measurementId)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteItem({
                                  ingredientId: item.ingredientId,
                                  measurementId: item.measurementId,
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {!isEditing && commonConversions.length > 0 && (
                        <div className="px-3 pb-3 pt-0 flex flex-wrap gap-2">
                          {commonConversions.map((conv, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              ≈ {conv!.amount.toFixed(2)} {conv!.unit}
                            </Badge>
                          ))}
                          {convertibleUnits.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{convertibleUnits.length - 2} more units
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>
              Add ingredients in any unit - conversions work automatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ingredient</Label>
              <div className="relative">
                <Input
                  placeholder="Search ingredients..."
                  value={ingredientSearch}
                  onChange={(e) => {
                    setIngredientSearch(e.target.value);
                    setShowIngredientSuggestions(true);
                    setNewIngredientId('');
                  }}
                  onFocus={() => setShowIngredientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowIngredientSuggestions(false), 200)}
                />
                {showIngredientSuggestions && ingredientSearch && filteredIngredients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {filteredIngredients.slice(0, 10).map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => handleSelectIngredient(ing.id, ing.name)}
                      >
                        {ing.name}
                      </button>
                    ))}
                    {filteredIngredients.length > 10 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        +{filteredIngredients.length - 10} more...
                      </div>
                    )}
                  </div>
                )}
                {newIngredientId && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Selected: {getIngredientName(newIngredientId)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Measurement</Label>
              <div className="relative">
                <Input
                  placeholder="Search measurements..."
                  value={measurementSearch}
                  onChange={(e) => {
                    setMeasurementSearch(e.target.value);
                    setShowMeasurementSuggestions(true);
                    setNewMeasurementId('');
                  }}
                  onFocus={() => setShowMeasurementSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMeasurementSuggestions(false), 200)}
                />
                {showMeasurementSuggestions && measurementSearch && filteredMeasurements.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {filteredMeasurements.slice(0, 10).map((meas) => (
                      <button
                        key={meas.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => handleSelectMeasurement(meas.id, meas.name)}
                      >
                        {meas.name}
                      </button>
                    ))}
                    {filteredMeasurements.length > 10 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        +{filteredMeasurements.length - 10} more...
                      </div>
                    )}
                  </div>
                )}
                {newMeasurementId && (
                  <div className="mt-2 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Selected: {getMeasurementName(newMeasurementId)}
                    </div>
                    {getConvertibleUnits(newMeasurementId).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">Auto-converts to:</span>
                        {getConvertibleUnits(newMeasurementId).slice(0, 4).map((unit) => (
                          <Badge key={unit.id} variant="secondary" className="text-xs">
                            {unit.name}
                          </Badge>
                        ))}
                        {getConvertibleUnits(newMeasurementId).length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{getConvertibleUnits(newMeasurementId).length - 4} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAdd} className="flex-1">
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItem !== null} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteItem) {
                  onDelete(deleteItem.ingredientId, deleteItem.measurementId);
                  setDeleteItem(null);
                  toast.success('Item removed from inventory');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}