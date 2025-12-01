import { useState } from 'react';
import { Measurement, MeasurementConversion } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Search, Edit, Trash2, Save, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface MeasurementsManagerProps {
  measurements: Measurement[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddConversion: (fromId: string, toId: string, factor: number) => void;
  onRemoveConversion: (fromId: string, toId: string) => void;
}

export function MeasurementsManager({
  measurements,
  onAdd,
  onEdit,
  onDelete,
  onAddConversion,
  onRemoveConversion,
}: MeasurementsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMeasurementName, setNewMeasurementName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [showConversionFor, setShowConversionFor] = useState<string | null>(null);
  const [conversionToId, setConversionToId] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');

  const filteredMeasurements = measurements.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newMeasurementName.trim()) {
      toast.error('Please enter a measurement name');
      return;
    }
    onAdd(newMeasurementName.trim());
    setNewMeasurementName('');
    toast.success('Measurement added');
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) {
      toast.error('Please enter a measurement name');
      return;
    }
    onEdit(id, editName.trim());
    setEditingId(null);
    setEditName('');
    toast.success('Measurement updated');
  };

  const startEdit = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setEditName(measurement.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleAddConversion = (fromId: string) => {
    if (!conversionToId) {
      toast.error('Please select a target measurement');
      return;
    }
    const factor = parseFloat(conversionFactor);
    if (isNaN(factor) || factor <= 0) {
      toast.error('Please enter a valid conversion factor');
      return;
    }
    onAddConversion(fromId, conversionToId, factor);
    setConversionToId('');
    setConversionFactor('');
    toast.success('Conversion added');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Measurements Manager</h2>
        <p className="text-muted-foreground">Manage units and conversions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Measurement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Measurement name (e.g., kilogram)..."
                value={newMeasurementName}
                onChange={(e) => setNewMeasurementName(e.target.value)}
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
          <CardTitle>All Measurements ({measurements.length})</CardTitle>
          <CardDescription>Search and manage your measurement units</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search measurements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMeasurements.map((measurement) => (
              <div key={measurement.id} className="border rounded-lg">
                <div className="flex items-center gap-2 p-3 hover:bg-accent transition-colors">
                  {editingId === measurement.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(measurement.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button size="sm" onClick={() => handleEdit(measurement.id)}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{measurement.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShowConversionFor(
                            showConversionFor === measurement.id ? null : measurement.id
                          )
                        }
                      >
                        Conversions ({measurement.conversions.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(measurement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(measurement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>

                {showConversionFor === measurement.id && (
                  <div className="p-3 bg-accent/50 border-t space-y-3">
                    <div className="space-y-2">
                      <Label>Existing Conversions</Label>
                      {measurement.conversions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No conversions defined</p>
                      ) : (
                        <div className="space-y-1">
                          {measurement.conversions.map((conv) => {
                            const toMeasurement = measurements.find((m) => m.id === conv.toMeasurementId);
                            return (
                              <div
                                key={conv.toMeasurementId}
                                className="flex items-center justify-between p-2 bg-background rounded text-sm"
                              >
                                <span>
                                  1 {measurement.name} = {conv.factor} {toMeasurement?.name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    onRemoveConversion(measurement.id, conv.toMeasurementId);
                                    toast.success('Conversion removed');
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Add Conversion</Label>
                      <div className="flex gap-2">
                        <Select value={conversionToId} onValueChange={setConversionToId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="To measurement..." />
                          </SelectTrigger>
                          <SelectContent>
                            {measurements
                              .filter((m) => m.id !== measurement.id)
                              .map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Factor"
                          value={conversionFactor}
                          onChange={(e) => setConversionFactor(e.target.value)}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddConversion(measurement.id)}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Example: 1 {measurement.name} = [factor] [to measurement]
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredMeasurements.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No measurements found' : 'No measurements yet'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Measurement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this measurement unit. Recipes using this unit may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                  toast.success('Measurement deleted');
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