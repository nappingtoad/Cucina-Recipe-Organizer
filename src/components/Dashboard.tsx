import { Recipe, Ingredient, Measurement } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChefHat, Eye, Plus, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';

interface DashboardProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  measurements: Measurement[];
  onViewRecipe: (recipeId: string) => void;
  onCookRecipe: (recipeId: string) => void;
  onAddRecipe: () => void;
}

export function Dashboard({
  recipes,
  ingredients,
  measurements,
  onViewRecipe,
  onCookRecipe,
  onAddRecipe,
}: DashboardProps) {
  const mostCooked = [...recipes].sort((a, b) => b.cookCount - a.cookCount).slice(0, 5);
  const mostViewed = [...recipes].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Dashboard</h2>
          <p className="text-muted-foreground">Your recipe overview and quick actions</p>
        </div>
        <Button onClick={onAddRecipe}>
          <Plus className="w-4 h-4 mr-2" />
          Add Recipe
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Recipes</CardTitle>
            <ChefHat className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{recipes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Ingredients</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{ingredients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Cooks</CardTitle>
            <ChefHat className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{recipes.reduce((sum, r) => sum + r.cookCount, 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{recipes.reduce((sum, r) => sum + r.viewCount, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Cooked</CardTitle>
            <CardDescription>Your favorite recipes to prepare</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostCooked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipes yet. Start cooking!</p>
              ) : (
                mostCooked.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onViewRecipe(recipe.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{recipe.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Cooked {recipe.cookCount} times
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCookRecipe(recipe.id);
                      }}
                    >
                      Cook
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Viewed</CardTitle>
            <CardDescription>Recipes you visit often</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostViewed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipes yet. Add some!</p>
              ) : (
                mostViewed.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onViewRecipe(recipe.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{recipe.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Viewed {recipe.viewCount} times
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCookRecipe(recipe.id);
                      }}
                    >
                      Cook
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
