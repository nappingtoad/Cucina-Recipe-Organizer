import { useState, useEffect } from 'react';
import { AppData, Recipe, CookingSession } from './types';
import { loadData, saveDataToSupabase, loadDataFromSupabase, initializeSupabaseDefaults, generateId } from './lib/storage';
import { api } from './lib/api';
import { deductFromInventory } from './lib/conversions';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { RecipesList } from './components/RecipesList';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipeForm } from './components/RecipeForm';
import { CookMode } from './components/CookMode';
import { IngredientsManager } from './components/IngredientsManager';
import { MeasurementsManager } from './components/MeasurementsManager';
import { InventoryManager } from './components/InventoryManager';
import { Button } from './components/ui/button';
import { ChefHat, Home, BookOpen, ShoppingBasket, Layers, Ruler, LogOut, Menu, X } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type View =
  | 'dashboard'
  | 'recipes'
  | 'recipe-detail'
  | 'recipe-form'
  | 'cook-mode'
  | 'ingredients'
  | 'measurements'
  | 'inventory';

export default function App() {
  const [data, setData] = useState<AppData>(loadData());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Cucina Recipe Organizer';
  }, []);

  // Check Supabase connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await api.healthCheck();
      setSupabaseConnected(isConnected);
      if (isConnected) {
        console.log('✅ Supabase backend connected successfully');
      } else {
        console.log('❌ Supabase backend connection failed');
      }
    };
    checkConnection();
  }, []);

  // Load user data from Supabase when user logs in
  useEffect(() => {
    if (data.currentUserId && data.currentUserId !== 'demo') {
      const loadUserData = async () => {
        setIsLoading(true);
        try {
          const userData = await loadDataFromSupabase(data.currentUserId!);
          setData(userData);
        } catch (error) {
          console.error('Failed to load user data:', error);
          toast.error('Failed to load your data');
        } finally {
          setIsLoading(false);
        }
      };
      loadUserData();
    }
  }, [data.currentUserId]);

  // Auto-save to Supabase on data changes (debounced)
  useEffect(() => {
    if (!data.currentUserId || data.currentUserId === 'demo') return;
    
    const timeoutId = setTimeout(async () => {
      try {
        console.log('Auto-saving data to Supabase...');
        await saveDataToSupabase(data);
        console.log('Auto-save completed successfully');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [data]);

  // Initialize default data on mount
  useEffect(() => {
    initializeSupabaseDefaults();
  }, []);

  const currentUser = data.currentUserId ? { id: data.currentUserId, username: 'User' } : null;
  const userRecipes = data.recipes.filter((r) => r.userId === data.currentUserId);
  const userInventory = data.inventory.filter((i) => i.userId === data.currentUserId);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const user = await api.login(username, password);
      
      // Special handling for demo account - use local default data
      if (user.id === 'demo') {
        const defaultData = loadData();
        setData({ ...defaultData, currentUserId: 'demo' });
        toast.success('Welcome to the demo!');
        return true;
      }
      
      // Load user's data from Supabase for regular accounts
      const userData = await loadDataFromSupabase(user.id);
      
      setData(userData);
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Error toast is shown by AuthPage component
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await api.signup(username, password);
      toast.success('Account created! You can now log in.');
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Signup failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setData(loadData());
    setCurrentView('dashboard');
    toast.success('Logged out successfully');
  };

  const handleAddRecipe = () => {
    setEditingRecipeId(null);
    setCurrentView('recipe-form');
  };

  const handleEditRecipe = (recipeId: string) => {
    setEditingRecipeId(recipeId);
    setCurrentView('recipe-form');
  };

  const handleViewRecipe = (recipeId: string) => {
    const recipe = data.recipes.find((r) => r.id === recipeId);
    if (recipe) {
      const updatedRecipes = data.recipes.map((r) =>
        r.id === recipeId ? { ...r, viewCount: r.viewCount + 1 } : r
      );
      setData({ ...data, recipes: updatedRecipes });
      setSelectedRecipeId(recipeId);
      setCurrentView('recipe-detail');
    }
  };

  const handleSaveRecipe = (recipeData: Omit<Recipe, 'id' | 'userId' | 'viewCount' | 'cookCount' | 'createdAt'>) => {
    if (editingRecipeId) {
      const updatedRecipes = data.recipes.map((r) =>
        r.id === editingRecipeId ? { ...r, ...recipeData } : r
      );
      setData({ ...data, recipes: updatedRecipes });
      toast.success('Recipe updated successfully');
    } else {
      const newRecipe: Recipe = {
        ...recipeData,
        id: generateId(),
        userId: data.currentUserId!,
        viewCount: 0,
        cookCount: 0,
        createdAt: Date.now(),
      };
      setData({ ...data, recipes: [...data.recipes, newRecipe] });
      toast.success('Recipe created successfully');
    }
    setCurrentView('recipes');
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const updatedRecipes = data.recipes.filter((r) => r.id !== recipeId);
    const updatedSessions = data.cookingSessions.filter((s) => s.recipeId !== recipeId);
    setData({ ...data, recipes: updatedRecipes, cookingSessions: updatedSessions });
  };

  const handleStartCooking = (recipeId: string) => {
    const recipe = data.recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const existingSession = data.cookingSessions.find(
      (s) => s.recipeId === recipeId && s.userId === data.currentUserId && s.status === 'active'
    );

    if (!existingSession) {
      const newSession: CookingSession = {
        id: generateId(),
        recipeId,
        userId: data.currentUserId!,
        ingredientsChecked: [],
        stepsChecked: [],
        servingSize: recipe.servings,
        status: 'active',
      };
      setData({ ...data, cookingSessions: [...data.cookingSessions, newSession] });
    }

    setSelectedRecipeId(recipeId);
    setCurrentView('cook-mode');
  };

  const handleUpdateCookingSession = (session: CookingSession) => {
    const updatedSessions = data.cookingSessions.map((s) =>
      s.id === session.id ? session : s
    );
    setData({ ...data, cookingSessions: updatedSessions });
  };

  const handleCompleteCooking = () => {
    const session = data.cookingSessions.find(
      (s) => s.recipeId === selectedRecipeId && s.userId === data.currentUserId && s.status === 'active'
    );
    
    if (session) {
      const recipe = data.recipes.find((r) => r.id === selectedRecipeId);
      
      if (recipe && data.currentUserId) {
        // Calculate scaling factor based on serving size
        const scalingFactor = session.servingSize / recipe.servings;
        
        // Subtract ingredients from inventory with automatic unit conversion
        let updatedInventory = [...data.inventory];
        
        recipe.ingredients.forEach((ing) => {
          const requiredAmount = ing.quantity * scalingFactor;
          
          // Use the conversion utility to deduct from inventory
          const result = deductFromInventory(
            ing.ingredientId,
            ing.measurementId,
            requiredAmount,
            updatedInventory,
            data.measurements,
            data.currentUserId!
          );
          
          updatedInventory = result.updatedInventory;
        });
        
        const updatedSessions = data.cookingSessions.map((s) =>
          s.id === session.id ? { ...s, status: 'completed' as const } : s
        );
        const updatedRecipes = data.recipes.map((r) =>
          r.id === selectedRecipeId ? { ...r, cookCount: r.cookCount + 1 } : r
        );
        
        setData({ 
          ...data, 
          cookingSessions: updatedSessions, 
          recipes: updatedRecipes,
          inventory: updatedInventory 
        });
      }
    }
    
    setCurrentView('recipes');
  };

  const handleCancelCooking = () => {
    const session = data.cookingSessions.find(
      (s) => s.recipeId === selectedRecipeId && s.userId === data.currentUserId && s.status === 'active'
    );
    
    if (session) {
      const updatedSessions = data.cookingSessions.map((s) =>
        s.id === session.id ? { ...s, status: 'cancelled' as const } : s
      );
      setData({ ...data, cookingSessions: updatedSessions });
    }
    
    setCurrentView('recipes');
  };

  const handleAddIngredient = (name: string) => {
    const newIngredient = { id: generateId(), name, isCustom: true };
    setData({ ...data, ingredients: [...data.ingredients, newIngredient] });
    return newIngredient.id;
  };

  const handleEditIngredient = (id: string, name: string) => {
    const updatedIngredients = data.ingredients.map((i) =>
      i.id === id ? { ...i, name } : i
    );
    setData({ ...data, ingredients: updatedIngredients });
  };

  const handleDeleteIngredient = (id: string) => {
    const updatedIngredients = data.ingredients.filter((i) => i.id !== id);
    setData({ ...data, ingredients: updatedIngredients });
  };

  const handleAddMeasurement = (name: string) => {
    const newMeasurement = { id: generateId(), name, conversions: [] };
    setData({ ...data, measurements: [...data.measurements, newMeasurement] });
  };

  const handleEditMeasurement = (id: string, name: string) => {
    const updatedMeasurements = data.measurements.map((m) =>
      m.id === id ? { ...m, name } : m
    );
    setData({ ...data, measurements: updatedMeasurements });
  };

  const handleDeleteMeasurement = (id: string) => {
    const updatedMeasurements = data.measurements.filter((m) => m.id !== id);
    setData({ ...data, measurements: updatedMeasurements });
  };

  const handleAddConversion = (fromId: string, toId: string, factor: number) => {
    const updatedMeasurements = data.measurements.map((m) => {
      if (m.id === fromId) {
        const existingConversion = m.conversions.find((c) => c.toMeasurementId === toId);
        if (existingConversion) {
          return {
            ...m,
            conversions: m.conversions.map((c) =>
              c.toMeasurementId === toId ? { ...c, factor } : c
            ),
          };
        } else {
          return {
            ...m,
            conversions: [...m.conversions, { toMeasurementId: toId, factor }],
          };
        }
      }
      return m;
    });
    setData({ ...data, measurements: updatedMeasurements });
  };

  const handleRemoveConversion = (fromId: string, toId: string) => {
    const updatedMeasurements = data.measurements.map((m) => {
      if (m.id === fromId) {
        return {
          ...m,
          conversions: m.conversions.filter((c) => c.toMeasurementId !== toId),
        };
      }
      return m;
    });
    setData({ ...data, measurements: updatedMeasurements });
  };

  const handleAddInventoryItem = (item: Omit<typeof data.inventory[0], 'userId'>) => {
    const existingIndex = data.inventory.findIndex(
      (i) =>
        i.userId === data.currentUserId &&
        i.ingredientId === item.ingredientId &&
        i.measurementId === item.measurementId
    );

    if (existingIndex >= 0) {
      const updatedInventory = [...data.inventory];
      updatedInventory[existingIndex] = {
        ...updatedInventory[existingIndex],
        quantity: updatedInventory[existingIndex].quantity + item.quantity,
      };
      setData({ ...data, inventory: updatedInventory });
    } else {
      const newItem = { ...item, userId: data.currentUserId! };
      setData({ ...data, inventory: [...data.inventory, newItem] });
    }
  };

  const handleEditInventoryItem = (
    ingredientId: string, 
    oldMeasurementId: string, 
    newMeasurementId: string, 
    quantity: number
  ) => {
    // If measurement unit changed, we need to remove the old entry and add/update the new one
    if (oldMeasurementId !== newMeasurementId) {
      // Remove the old entry
      const withoutOld = data.inventory.filter(
        (i) =>
          !(
            i.userId === data.currentUserId &&
            i.ingredientId === ingredientId &&
            i.measurementId === oldMeasurementId
          )
      );
      
      // Check if an entry with the new measurement already exists
      const existingIndex = withoutOld.findIndex(
        (i) =>
          i.userId === data.currentUserId &&
          i.ingredientId === ingredientId &&
          i.measurementId === newMeasurementId
      );
      
      if (existingIndex >= 0) {
        // Add to existing quantity
        withoutOld[existingIndex] = {
          ...withoutOld[existingIndex],
          quantity: withoutOld[existingIndex].quantity + quantity,
        };
        setData({ ...data, inventory: withoutOld });
      } else {
        // Add new entry
        const newItem = {
          userId: data.currentUserId!,
          ingredientId,
          measurementId: newMeasurementId,
          quantity,
        };
        setData({ ...data, inventory: [...withoutOld, newItem] });
      }
    } else {
      // Just update the quantity
      const updatedInventory = data.inventory.map((i) =>
        i.userId === data.currentUserId &&
        i.ingredientId === ingredientId &&
        i.measurementId === oldMeasurementId
          ? { ...i, quantity }
          : i
      );
      setData({ ...data, inventory: updatedInventory });
    }
  };

  const handleDeleteInventoryItem = (ingredientId: string, measurementId: string) => {
    const updatedInventory = data.inventory.filter(
      (i) =>
        !(
          i.userId === data.currentUserId &&
          i.ingredientId === ingredientId &&
          i.measurementId === measurementId
        )
    );
    setData({ ...data, inventory: updatedInventory });
  };

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />;
  }

  const selectedRecipe = data.recipes.find((r) => r.id === selectedRecipeId);
  const editingRecipe = data.recipes.find((r) => r.id === editingRecipeId);
  const cookingSession = data.cookingSessions.find(
    (s) => s.recipeId === selectedRecipeId && s.userId === data.currentUserId && s.status === 'active'
  );

  return (
    <div className="min-h-screen relative" style={{
      background: `linear-gradient(135deg, rgba(250, 248, 245, 0.97) 0%, rgba(245, 241, 237, 0.97) 100%), url('https://images.unsplash.com/photo-1686806374120-e7ae3f19801d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaW5lbiUyMGZhYnJpYyUyMHRleHR1cmUlMjBiZWlnZXxlbnwxfHx8fDE3NjIzMzQ0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080')`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed'
    }}>
      <div className="flex">
        <aside 
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } min-h-screen bg-white border-r shadow-sm transition-all duration-300`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <ChefHat className="w-8 h-8 flex-shrink-0" style={{ color: '#6b8e6f' }} />
              {!sidebarCollapsed && (
                <div>
                  <h1 style={{ color: '#6b8e6f' }}>Cucina</h1>
                  <p className="text-sm text-muted-foreground">Recipe Organizer</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <Menu className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            </div>

            <nav className="space-y-2">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                onClick={() => setCurrentView('dashboard')}
                title="Dashboard"
              >
                <Home className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Dashboard</span>}
              </Button>
              <Button
                variant={currentView === 'recipes' ? 'default' : 'ghost'}
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                onClick={() => setCurrentView('recipes')}
                title="Recipes"
              >
                <BookOpen className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Recipes</span>}
              </Button>
              <Button
                variant={currentView === 'inventory' ? 'default' : 'ghost'}
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                onClick={() => setCurrentView('inventory')}
                title="Inventory"
              >
                <ShoppingBasket className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Inventory</span>}
              </Button>
              <Button
                variant={currentView === 'ingredients' ? 'default' : 'ghost'}
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                onClick={() => setCurrentView('ingredients')}
                title="Ingredients"
              >
                <Layers className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Ingredients</span>}
              </Button>
              <Button
                variant={currentView === 'measurements' ? 'default' : 'ghost'}
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                onClick={() => setCurrentView('measurements')}
                title="Measurements"
              >
                <Ruler className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Measurements</span>}
              </Button>
            </nav>

            <div className="mt-8 pt-8 border-t">
              {supabaseConnected !== null && !sidebarCollapsed && (
                <div className="mb-4 flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">
                    {supabaseConnected ? 'Supabase Connected' : 'Offline Mode'}
                  </span>
                </div>
              )}
              <Button 
                variant="outline" 
                className={`w-full ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8">
          {currentView === 'dashboard' && (
            <Dashboard
              recipes={userRecipes}
              ingredients={data.ingredients}
              measurements={data.measurements}
              onViewRecipe={handleViewRecipe}
              onCookRecipe={handleStartCooking}
              onAddRecipe={handleAddRecipe}
            />
          )}

          {currentView === 'recipes' && (
            <RecipesList
              recipes={userRecipes}
              ingredients={data.ingredients}
              measurements={data.measurements}
              onViewRecipe={handleViewRecipe}
              onEditRecipe={handleEditRecipe}
              onDeleteRecipe={handleDeleteRecipe}
              onAddRecipe={handleAddRecipe}
              onCookRecipe={handleStartCooking}
            />
          )}

          {currentView === 'recipe-detail' && selectedRecipe && (
            <RecipeDetail
              recipe={selectedRecipe}
              ingredients={data.ingredients}
              measurements={data.measurements}
              onBack={() => setCurrentView('recipes')}
              onEdit={() => handleEditRecipe(selectedRecipe.id)}
              onCook={() => handleStartCooking(selectedRecipe.id)}
            />
          )}

          {currentView === 'recipe-form' && (
            <RecipeForm
              recipe={editingRecipe}
              ingredients={data.ingredients}
              measurements={data.measurements}
              onSave={handleSaveRecipe}
              onCancel={() => setCurrentView('recipes')}
              onAddIngredient={handleAddIngredient}
            />
          )}

          {currentView === 'cook-mode' && selectedRecipe && (
            <CookMode
              recipe={selectedRecipe}
              ingredients={data.ingredients}
              measurements={data.measurements}
              inventory={userInventory}
              session={cookingSession || null}
              onUpdateSession={handleUpdateCookingSession}
              onComplete={handleCompleteCooking}
              onCancel={handleCancelCooking}
              onBack={() => setCurrentView('recipes')}
            />
          )}

          {currentView === 'ingredients' && (
            <IngredientsManager
              ingredients={data.ingredients}
              onAdd={handleAddIngredient}
              onEdit={handleEditIngredient}
              onDelete={handleDeleteIngredient}
            />
          )}

          {currentView === 'measurements' && (
            <MeasurementsManager
              measurements={data.measurements}
              onAdd={handleAddMeasurement}
              onEdit={handleEditMeasurement}
              onDelete={handleDeleteMeasurement}
              onAddConversion={handleAddConversion}
              onRemoveConversion={handleRemoveConversion}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryManager
              inventory={userInventory}
              ingredients={data.ingredients}
              measurements={data.measurements}
              onAdd={handleAddInventoryItem}
              onEdit={handleEditInventoryItem}
              onDelete={handleDeleteInventoryItem}
            />
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
