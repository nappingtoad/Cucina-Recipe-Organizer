import { useState } from 'react';
import { Ingredient } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Search, Edit, Trash2, Save, X } from 'lucide-react';
import { Badge } from './ui/badge';
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
import { toast } from 'sonner@2.0.3';

interface IngredientsManagerProps {
  ingredients: Ingredient[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function IngredientsManager({ ingredients, onAdd, onEdit, onDelete }: IngredientsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newIngredientName.trim()) {
      toast.error('Please enter an ingredient name');
      return;
    }
    onAdd(newIngredientName.trim());
    setNewIngredientName('');
    toast.success('Ingredient added');
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) {
      toast.error('Please enter an ingredient name');
      return;
    }
    onEdit(id, editName.trim());
    setEditingId(null);
    setEditName('');
    toast.success('Ingredient updated');
  };

  const startEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setEditName(ingredient.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Ingredients Manager</h2>
        <p className="text-muted-foreground">Manage your predefined ingredient list</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Ingredient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ingredient name..."
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Ingredients ({ingredients.length})</CardTitle>
          <CardDescription>Search and manage your ingredient library</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                {editingId === ingredient.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit(ingredient.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <Button size="sm" onClick={() => handleEdit(ingredient.id)}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{ingredient.name}</span>
                    {ingredient.isCustom && <Badge variant="secondary">Custom</Badge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(ingredient)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(ingredient.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {filteredIngredients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No ingredients found' : 'No ingredients yet'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this ingredient. Recipes using this ingredient may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                  toast.success('Ingredient deleted');
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
