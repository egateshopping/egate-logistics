import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Loader2, ArrowLeft, Tag, Plus, Minus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const initialUrl = (location.state as { productUrl?: string })?.productUrl || '';
  
  const [formData, setFormData] = useState({
    product_url: initialUrl,
    product_title: '',
    color: '',
    size: '',
    quantity: 1,
    special_notes: '',
    promo_code: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const handleApplyPromo = async () => {
    if (!formData.promo_code.trim()) return;

    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', formData.promo_code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!promo) {
      toast.error('Invalid promo code');
      return;
    }

    setPromoApplied(true);
    setPromoDiscount(promo.discount_type === 'percentage' ? promo.discount_value : promo.discount_value);
    toast.success(`Promo code applied! ${promo.discount_type === 'percentage' ? promo.discount_value + '%' : '$' + promo.discount_value} off`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_url) {
      toast.error('Please enter a product URL');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('orders').insert({
      user_id: user?.id,
      product_url: formData.product_url,
      product_title: formData.product_title || 'Product Order',
      color: formData.color || null,
      size: formData.size || null,
      quantity: formData.quantity,
      special_notes: formData.special_notes || null,
      discount: promoDiscount,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to create order');
      return;
    }

    toast.success('Order submitted! We\'ll contact you with pricing.');
    navigate('/dashboard');
  };

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">New Order</h1>
          <p className="text-muted-foreground mt-1">Enter product details to place your order</p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product URL */}
            <div className="space-y-2">
              <Label htmlFor="product_url">Product URL *</Label>
              <Input
                id="product_url"
                type="url"
                value={formData.product_url}
                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                placeholder="https://amazon.com/product/..."
                required
              />
            </div>

            {/* Product Title */}
            <div className="space-y-2">
              <Label htmlFor="product_title">Product Name (optional)</Label>
              <Input
                id="product_title"
                value={formData.product_title}
                onChange={(e) => setFormData({ ...formData, product_title: e.target.value })}
                placeholder="e.g., Nike Air Max 90"
              />
            </div>

            {/* Color & Size */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g., US 10"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{formData.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <Label htmlFor="special_notes">Special Notes</Label>
              <Textarea
                id="special_notes"
                value={formData.special_notes}
                onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                placeholder="Any special requests or instructions..."
                rows={3}
              />
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label htmlFor="promo_code">
                <Tag className="h-4 w-4 inline mr-1" />
                Promo Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="promo_code"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., IRAQ2026"
                  disabled={promoApplied}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoApplied || !formData.promo_code}
                >
                  {promoApplied ? 'Applied' : 'Apply'}
                </Button>
              </div>
              {promoApplied && (
                <p className="text-sm text-success">✓ Discount will be applied to your final invoice</p>
              )}
            </div>

            {/* Payment Notice */}
            {!profile?.is_verified && (
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-sm">
                <p className="font-medium text-warning">Down Payment Required</p>
                <p className="text-muted-foreground mt-1">
                  As a new customer, a down payment will be required after we calculate the total cost. 
                  You'll need to upload a payment receipt to proceed.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-hero border-0"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Package className="h-5 w-5 mr-2" />
                  Submit Order Request
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              We'll contact you with the final price breakdown including shipping and customs.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
