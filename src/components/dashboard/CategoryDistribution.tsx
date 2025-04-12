
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { PenLine, Plus } from 'lucide-react';

interface CategoryDistributionProps {
  onAddCategory: () => void;
  onEditCategory: (categoryId: string) => void;
}

const CategoryDistribution: React.FC<CategoryDistributionProps> = ({
  onAddCategory,
  onEditCategory,
}) => {
  const { budget } = useFinance();
  const { categories } = budget;

  const data = categories.map(category => ({
    name: category.name,
    value: category.amount,
    percentage: category.percentage,
    color: category.color,
    id: category.id,
  }));

  return (
    <div className="finance-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Budget Categories</h2>
        <Button onClick={onAddCategory} variant="outline" size="sm" className="flex items-center">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              labelFormatter={(name) => `${name}`}
            />
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(category => (
          <div 
            key={category.id}
            className="p-3 rounded-lg border flex justify-between items-center"
            style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
          >
            <div>
              <div className="font-medium">{category.name}</div>
              <div className="text-sm text-muted-foreground">{category.percentage}%</div>
              <div className="font-semibold">${category.amount.toFixed(2)}</div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onEditCategory(category.id)}
            >
              <PenLine className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryDistribution;
