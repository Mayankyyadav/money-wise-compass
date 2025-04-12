
import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Calendar, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PaymentForm = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [preferredCategory, setPreferredCategory] = useState('');
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [fallbackCategory, setFallbackCategory] = useState('');
  
  const { budget, makePayment, schedulePayment } = useFinance();

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setIsScheduled(false);
    setScheduledDate(new Date());
    setScheduledTime('12:00');
    setFrequency('once');
    setPreferredCategory('');
    setInsufficientFunds(false);
    setRemainingAmount(0);
    setFallbackCategory('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    
    if (isScheduled && scheduledDate) {
      // Handle scheduled payment
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const paymentDate = new Date(scheduledDate);
      paymentDate.setHours(hours, minutes);
      
      schedulePayment({
        amount: numAmount,
        description,
        date: paymentDate,
        recurring: frequency !== 'once',
        frequency: frequency === 'once' ? undefined : frequency,
        preferredCategory: preferredCategory || undefined
      });
      
      resetForm();
      setOpen(false);
      return;
    }
    
    // Handle immediate payment
    const result = makePayment(
      numAmount, 
      description, 
      preferredCategory || undefined, 
      fallbackCategory || undefined
    );
    
    if (result.success) {
      resetForm();
      setOpen(false);
    } else if (result.insufficientFunds) {
      setInsufficientFunds(true);
      setRemainingAmount(result.remainingAmount || 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center">
          <CreditCard className="mr-2 h-4 w-4" />
          Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input 
                id="amount"
                type="number" 
                placeholder="0.00" 
                className="pl-8" 
                value={amount} 
                onChange={(e) => {
                  setAmount(e.target.value);
                  setInsufficientFunds(false);
                }}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              placeholder="What is this payment for?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-preference">Preferred Category to Deduct From</Label>
            <Select 
              value={preferredCategory} 
              onValueChange={setPreferredCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto (Daily Use then Savings)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto (Daily Use then Savings)</SelectItem>
                {budget.categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} - ${category.amount.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {insufficientFunds && (
            <>
              <Alert variant="destructive" className="my-2">
                <AlertDescription>
                  Insufficient funds! You need an additional ${remainingAmount.toFixed(2)} to complete this payment.
                  Please select another category to deduct from:
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="fallback-category">Fallback Category</Label>
                <Select 
                  value={fallbackCategory} 
                  onValueChange={setFallbackCategory}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budget.categories
                      .filter(c => c.amount > 0 && c.id !== preferredCategory)
                      .map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} - ${category.amount.toFixed(2)}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          
          <div className="flex items-center space-x-2">
            <Switch
              id="scheduled"
              checked={isScheduled}
              onCheckedChange={setIsScheduled}
            />
            <Label htmlFor="scheduled">Schedule this payment</Label>
          </div>
          
          {isScheduled && (
            <div className="space-y-4 border rounded-md p-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'PPP') : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">Payment Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select 
                  value={frequency} 
                  onValueChange={(val: 'once' | 'daily' | 'weekly' | 'monthly') => setFrequency(val)}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <Button type="submit" className="w-full">
            {isScheduled ? "Schedule Payment" : "Pay Now"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
