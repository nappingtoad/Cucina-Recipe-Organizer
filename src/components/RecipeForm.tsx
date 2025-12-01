import { useState, useEffect } from 'react';
import { Recipe, RecipeIngredient, Ingredient, Measurement } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, X, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface RecipeFormProps {
  recipe?: Recipe;
  ingredients: Ingredient[];
  measurements: Measurement[];
  onSave: (recipe: Omit<Recipe, 'id' | 'userId' | 'viewCount' | 'cookCount' | 'createdAt'>) => void;
  onCancel: () => void;
  onAddIngredient?: (name: string) => string; // Returns the new ingredient ID
}

export function RecipeForm({ recipe, ingredients, measurements, onSave, onCancel, onAddIngredient }: RecipeFormProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [servings, setServings] = useState(recipe?.servings || 4);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  );
  const [instructions, setInstructions] = useState<string[]>(recipe?.instructions || ['']);
  const [customIngredient, setCustomIngredient] = useState('');
  const [customMeasurement, setCustomMeasurement] = useState('');

  const addIngredient = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      { ingredientId: '', quantity: 0, measurementId: '' },
    ]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a recipe name');
      return;
    }

    if (recipeIngredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    const validIngredients = recipeIngredients.filter(
      (ing) => ing.ingredientId && ing.quantity > 0 && ing.measurementId
    );

    if (validIngredients.length === 0) {
      toast.error('Please complete all ingredient fields');
      return;
    }

    const validInstructions = instructions.filter((inst) => inst.trim());

    if (validInstructions.length === 0) {
      toast.error('Please add at least one instruction');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      servings,
      ingredients: validIngredients,
      instructions: validInstructions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2>{recipe ? 'Edit Recipe' : 'Add New Recipe'}</h2>
          <p className="text-muted-foreground">
            {recipe ? 'Update your recipe details' : 'Create a new recipe'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spaghetti Carbonara"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your recipe"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Servings *</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                step="0.5"
                value={servings}
                onChange={(e) => setServings(parseFloat(e.target.value) || 1)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ingredients</CardTitle>
            <Button type="button" size="sm" onClick={addIngredient}>
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipeIngredients.map((ing, index) => (
              <IngredientRow
                key={index}
                ingredient={ing}
                ingredients={ingredients}
                measurements={measurements}
                onChange={(field, value) => updateIngredient(index, field, value)}
                onRemove={() => removeIngredient(index)}
                onAddIngredient={onAddIngredient}
              />
            ))}
            {recipeIngredients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ingredients added yet. Click "Add Ingredient" to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Instructions</CardTitle>
            <Button type="button" size="sm" onClick={addInstruction}>
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 mt-2 rounded-full text-sm" style={{ backgroundColor: '#e8f0e9', color: '#6b8e6f' }}>
                  {index + 1}
                </span>
                <Textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-2"
                  onClick={() => removeInstruction(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {instructions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No instructions added yet. Click "Add Step" to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{recipe ? 'Update Recipe' : 'Create Recipe'}</Button>
        </div>
      </form>
    </div>
  );
}

interface IngredientRowProps {
  ingredient: RecipeIngredient;
  ingredients: Ingredient[];
  measurements: Measurement[];
  onChange: (field: keyof RecipeIngredient, value: any) => void;
  onRemove: () => void;
  onAddIngredient?: (name: string) => string; // Returns the new ingredient ID
}

function IngredientRow({
  ingredient,
  ingredients,
  measurements,
  onChange,
  onRemove,
  onAddIngredient,
}: IngredientRowProps) {
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [measurementSearch, setMeasurementSearch] = useState('');
  const [showIngredientSuggestions, setShowIngredientSuggestions] = useState(false);
  const [showMeasurementSuggestions, setShowMeasurementSuggestions] = useState(false);

  const selectedIngredient = ingredients.find((i) => i.id === ingredient.ingredientId);
  const selectedMeasurement = measurements.find((m) => m.id === ingredient.measurementId);

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const filteredMeasurements = measurements.filter((meas) =>
    meas.name.toLowerCase().includes(measurementSearch.toLowerCase())
  );

  const handleSelectIngredient = (ingredientId: string, ingredientName: string) => {
    onChange('ingredientId', ingredientId);
    setIngredientSearch(ingredientName);
    setShowIngredientSuggestions(false);
  };

  const handleCreateCustomIngredient = () => {
    if (ingredientSearch.trim() && onAddIngredient) {
      const newIngredientId = onAddIngredient(ingredientSearch.trim());
      onChange('ingredientId', newIngredientId);
      setShowIngredientSuggestions(false);
      toast.success(`Added "${ingredientSearch}" to ingredients`);
    }
  };

  const handleSelectMeasurement = (measurementId: string, measurementName: string) => {
    onChange('measurementId', measurementId);
    setMeasurementSearch(measurementName);
    setShowMeasurementSuggestions(false);
  };

  useEffect(() => {
    if (selectedIngredient) {
      setIngredientSearch(selectedIngredient.name);
    }
  }, [selectedIngredient]);

  useEffect(() => {
    if (selectedMeasurement) {
      setMeasurementSearch(selectedMeasurement.name);
    }
  }, [selectedMeasurement]);

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 space-y-2">
        <Label>Ingredient</Label>
        <div className="relative">
          <Input
            placeholder="Search ingredients..."
            value={ingredientSearch}
            onChange={(e) => {
              setIngredientSearch(e.target.value);
              setShowIngredientSuggestions(true);
              if (!e.target.value) {
                onChange('ingredientId', '');
              }
            }}
            onFocus={() => setShowIngredientSuggestions(true)}
            onBlur={() => setTimeout(() => setShowIngredientSuggestions(false), 200)}
          />
          {showIngredientSuggestions && ingredientSearch && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
              {filteredIngredients.length > 0 && (
                <>
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
                </>
              )}
              {onAddIngredient && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors cursor-pointer border-t"
                  style={{ color: '#6b8e6f' }}
                  onClick={handleCreateCustomIngredient}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add "{ingredientSearch}" as new ingredient
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-24 space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          min="0"
          step="0.1"
          value={ingredient.quantity || ''}
          onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>

      <div className="w-32 space-y-2">
        <Label>Unit</Label>
        <div className="relative">
          <Input
            placeholder="Search units..."
            value={measurementSearch}
            onChange={(e) => {
              setMeasurementSearch(e.target.value);
              setShowMeasurementSuggestions(true);
              if (!e.target.value) {
                onChange('measurementId', '');
              }
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
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-8"
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}