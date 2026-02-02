import { useState } from 'react';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function TrackOrderInput() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter an order ID or tracking number');
      return;
    }

    setIsLoading(true);
    
    // Simulate a brief lookup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to order details (assumes order ID format)
    navigate(`/order/${trackingNumber.trim()}`);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Search className="h-4 w-4" />
        Track Your Order
      </h4>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter order ID..."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          className="flex-1"
        />
        <Button 
          onClick={handleTrack} 
          disabled={isLoading}
          className="gradient-accent border-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
