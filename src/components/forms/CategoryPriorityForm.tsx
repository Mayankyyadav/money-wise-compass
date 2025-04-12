
import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';

const CategoryPriorityForm = () => {
  const { budget, updateCategoryPriorities } = useFinance();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; priority: number; maxAmount: number | undefined }>>([]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Initialize categories with current data
      const sortedCategories = [...budget.categories]
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
      setCategories(sortedCategories.map(c => ({
        id: c.id,
        name: c.name,
        priority: c.priority || 999,
        maxAmount: c.maxAmount
      })));
    }
    setOpen(newOpen);
  };

  const handlePriorityChange = (id: string, priority: number) => {
    setCategories(prev => 
      prev.map(c => c.id === id ? { ...c, priority } : c)
    );
  };

  const handleMaxAmountChange = (id: string, value: string) => {
    const maxAmount = value === '' ? undefined : parseFloat(value);
    setCategories(prev => 
      prev.map(c => c.id === id ? { ...c, maxAmount: isNaN(maxAmount as number) ? undefined : maxAmount } : c)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCategoryPriorities(categories);
    setOpen(false);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
    
    // Update priorities
    newCategories.forEach((cat, idx) => {
      cat.priority = idx + 1;
    });
    
    setCategories(newCategories);
  };

  const moveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    
    // Update priorities
    newCategories.forEach((cat, idx) => {
      cat.priority = idx + 1;
    });
    
    setCategories(newCategories);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center">
          <Settings className="h-4 w-4 mr-1" />
          Category Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Category Priorities & Limits</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="font-medium mb-2">Arrange your categories by priority (top = highest)</div>
            <div className="text-sm text-muted-foreground mb-4">
              Higher priority categories are filled first when income is received, and are used last when making payments.
            </div>
            
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2">
                  <div className="flex-1 p-3 border rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category.name}</span>
                      <div className="flex space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => moveDown(index)}
                          disabled={index === categories.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                    
                    {category.name !== 'Daily Use' && (
                      <div className="mt-2">
                        <Label htmlFor={`max-${category.id}`}>Max Amount ($)</Label>
                        <Input
                          id={`max-${category.id}`}
                          type="number"
                          placeholder="No limit"
                          value={category.maxAmount === undefined ? '' : category.maxAmount}
                          onChange={(e) => handleMaxAmountChange(category.id, e.target.value)}
                          min="0"
                          step="0.01"
                          className="mt-1"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          When this amount is reached, excess funds go to Savings
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryPriorityForm;
