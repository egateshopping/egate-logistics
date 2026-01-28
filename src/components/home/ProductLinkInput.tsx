import { useState } from 'react';
import { Link2, Loader2, ArrowRight, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ProductLinkInput() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productPreview, setProductPreview] = useState<{
    title: string;
    image: string;
    store: string;
  } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const extractStoreName = (url: string): string => {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const parts = hostname.split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch {
      return 'Unknown Store';
    }
  };

  const handlePaste = async (pastedUrl: string) => {
    if (!pastedUrl.startsWith('http')) return;
    
    setUrl(pastedUrl);
    setIsLoading(true);
    
    // Simulate fetching product details
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const store = extractStoreName(pastedUrl);
    setProductPreview({
      title: `Product from ${store}`,
      image: '/placeholder.svg',
      store,
    });
    setIsLoading(false);
  };

  const handleSubmit = () => {
    if (!user) {
      toast.info('Please sign in to place an order');
      navigate('/login', { state: { from: '/', productUrl: url } });
      return;
    }
    navigate('/order/new', { state: { productUrl: url, productPreview } });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-50 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-3 p-2 bg-card border border-border rounded-2xl shadow-elevated">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary ml-2">
            <Link2 className="h-5 w-5" />
          </div>
          <Input
            type="url"
            placeholder="Paste any US product link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text');
              handlePaste(pasted);
            }}
            className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0"
          />
          {url && (
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="gradient-accent border-0 text-accent-foreground px-6 rounded-xl hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 text-muted-foreground animate-pulse-soft">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Fetching product details...</span>
        </div>
      )}

      {productPreview && !isLoading && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-soft">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{productPreview.title}</p>
              <p className="text-sm text-muted-foreground">From {productPreview.store}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                ✓ Link recognized
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Supported stores:</span>
        {['Amazon', 'eBay', 'Nike', 'Apple', 'Best Buy'].map((store) => (
          <span 
            key={store}
            className="px-2 py-0.5 bg-secondary rounded-md text-secondary-foreground text-xs font-medium"
          >
            {store}
          </span>
        ))}
        <span>+ more</span>
      </div>
    </div>
  );
}
