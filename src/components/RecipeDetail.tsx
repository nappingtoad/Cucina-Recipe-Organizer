import { Recipe, Ingredient, Measurement } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ChefHat, Edit, ArrowLeft, Eye } from 'lucide-react';

interface RecipeDetailProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  measurements: Measurement[];
  onBack: () => void;
  onEdit: () => void;
  onCook: () => void;
}

export function RecipeDetail({
  recipe,
  ingredients,
  measurements,
  onBack,
  onEdit,
  onCook,
}: RecipeDetailProps) {
  const getIngredientName = (id: string) => {
    return ingredients.find((i) => i.id === id)?.name || 'Unknown';
  };

  const getMeasurementName = (id: string) => {
    return measurements.find((m) => m.id === id)?.name || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2>{recipe.name}</h2>
          <p className="text-muted-foreground">{recipe.description}</p>
        </div>
        <Button variant="outline" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button onClick={onCook}>
          <ChefHat className="w-4 h-4 mr-2" />
          Start Cooking
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="secondary">Serves {recipe.servings}</Badge>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          Viewed {recipe.viewCount} times
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChefHat className="w-4 h-4" />
          Cooked {recipe.cookCount} times
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            <CardDescription>What you'll need</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b8e6f' }} />
                  <span>
                    {ing.quantity} {getMeasurementName(ing.measurementId)}{' '}
                    {getIngredientName(ing.ingredientId)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Step by step</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-sm" style={{ backgroundColor: '#e8f0e9', color: '#6b8e6f' }}>
                    {index + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
