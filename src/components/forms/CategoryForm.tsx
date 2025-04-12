
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Category } from '@/types/finance';
import { CircleDollarSign, Coffee, CreditCard, Home, PiggyBank, ShoppingCart, Tv, TrendingUp } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: Category;
}

const ICON_OPTIONS = [
  { name: 'piggy-bank', Icon: PiggyBank },
  { name: 'home', Icon: Home },
  { name: 'shopping-cart', Icon: ShoppingCart },
  { name: 'coffee', Icon: Coffee },
  { name: 'credit-card', Icon: CreditCard },
  { name: 'tv', Icon: Tv },
  { name: 'trending-up', Icon: TrendingUp },
  { name: 'circle-dollar-sign', Icon: CircleDollarSign },
];

const COLOR_OPTIONS = [
  { name: 'blue', value: '#3B82F6' },
  { name: 'red', value: '#EF4444' },
  { name: 'green', value: '#10B981' },
  { name: 'amber', value: '#F59E0B' },
  { name: 'purple', value: '#8B5CF6' },
  { name: 'teal', value: '#0D9488' },
  { name: 'indigo', value: '#4F46E5' },
  { name: 'pink', value: '#EC4899' },
];

const CategoryForm: React.FC<CategoryFormProps> = ({
  open,
  onOpenChange,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [icon, setIcon] = useState(ICON_OPTIONS[0].name);
  const { addCategory, updateCategory, deleteCategory } = useFinance();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setPercentage(categoryToEdit.percentage.toString());
      setColor(categoryToEdit.color);
      setIcon(categoryToEdit.icon);
    } else {
      // Reset form when adding a new category
      setName('');
      setPercentage('');
      setColor(COLOR_OPTIONS[0].value);
      setIcon(ICON_OPTIONS[0].name);
    }
  }, [categoryToEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numPercentage = parseFloat(percentage);
    if (isNaN(numPercentage) || numPercentage <= 0 || numPercentage > 100) {
      return;
    }

    if (categoryToEdit) {
      updateCategory({
        ...categoryToEdit,
        name,
        percentage: numPercentage,
        color,
        icon,
      });
    } else {
      addCategory({
        name,
        percentage: numPercentage,
        color,
        icon,
      });
    }
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (categoryToEdit) {
      deleteCategory(categoryToEdit.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {categoryToEdit ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input 
              id="name"
              placeholder="e.g., Rent, Groceries" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage Allocation (%)</Label>
            <Input 
              id="percentage"
              type="number" 
              placeholder="e.g., 20" 
              value={percentage} 
              onChange={(e) => setPercentage(e.target.value)}
              min="1"
              max="100"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Select Icon</Label>
            <RadioGroup 
              className="grid grid-cols-4 gap-2" 
              value={icon} 
              onValueChange={setIcon}
            >
              {ICON_OPTIONS.map(({ name: iconName, Icon: IconComponent }) => (
                <div key={iconName} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={iconName} 
                    id={`icon-${iconName}`} 
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`icon-${iconName}`}
                    className={`flex flex-col items-center justify-center p-2 rounded-md cursor-pointer ${
                      icon === iconName ? 'border-2 border-primary' : 'border border-input'
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Select Color</Label>
            <RadioGroup 
              className="grid grid-cols-4 gap-2" 
              value={color} 
              onValueChange={setColor}
            >
              {COLOR_OPTIONS.map(({ name: colorName, value: colorValue }) => (
                <div key={colorName} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={colorValue} 
                    id={`color-${colorName}`} 
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`color-${colorName}`}
                    className={`w-10 h-10 rounded-full cursor-pointer ${
                      color === colorValue ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: colorValue }}
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="flex space-x-2 pt-2">
            {categoryToEdit && (
              <Button 
                type="button" 
                onClick={handleDelete} 
                variant="destructive"
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {categoryToEdit ? 'Update' : 'Add'} Category
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryForm;
