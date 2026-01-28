import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, MessageCircle, User, Phone, Calendar, 
  ChevronDown, ChevronUp, Truck, Image, DollarSign,
  ExternalLink, Wand2, Loader2, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Order, OrderStatus, Profile } from '@/lib/supabase';
import { getStatusLabel, getStatusColor } from '@/lib/supabase';

interface AdminOrderCardProps {
  order: Order;
  profile?: Profile;
  onUpdate: () => void;
}

const orderStatuses: OrderStatus[] = [
  'pending_payment',
  'payment_received',
  'purchasing',
  'purchased',
  'domestic_shipping',
  'at_warehouse',
  'international_shipping',
  'customs',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export function AdminOrderCard({ order, profile, onUpdate }: AdminOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [pricing, setPricing] = useState({
    base_item_cost: Number(order.base_item_cost) || 0,
    domestic_shipping: Number(order.domestic_shipping) || 0,
    tax: Number(order.tax) || 0,
    international_shipping: Number(order.international_shipping) || 0,
    customs: Number(order.customs) || 0,
    other_fees: Number((order as any).other_fees) || 0,
    weight_lbs: Number(order.weight_lbs) || 0,
    length_in: Number(order.length_in) || 0,
    width_in: Number(order.width_in) || 0,
    height_in: Number(order.height_in) || 0,
  });
  const [otherFeesNote, setOtherFeesNote] = useState((order as any).other_fees_note || '');
  const [productImageUrl, setProductImageUrl] = useState(order.product_image || '');
  const [eta, setEta] = useState(order.eta || '');
  const [domesticTracking, setDomesticTracking] = useState(order.domestic_tracking || '');
  const [internationalTracking, setInternationalTracking] = useState(order.international_tracking || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Smart Product Memory - Check cache when pricing dialog opens
  const checkProductCache = async () => {
    if (!order.product_url) return;
    
    const { data } = await supabase
      .from('product_cache')
      .select('*')
      .eq('url', order.product_url)
      .single();

    if (data) {
      setPricing(prev => ({
        ...prev,
        weight_lbs: data.weight_lbs || prev.weight_lbs,
        length_in: data.length_in || prev.length_in,
        width_in: data.width_in || prev.width_in,
        height_in: data.height_in || prev.height_in,
      }));
      if (data.image_url && !productImageUrl) {
        setProductImageUrl(data.image_url);
      }
      setIsAutoFilled(true);
    }
  };

  // Smart Product Memory - Save to cache on save
  const saveToProductCache = async () => {
    if (!order.product_url) return;
    
    const cacheData = {
      url: order.product_url,
      weight_lbs: pricing.weight_lbs || null,
      length_in: pricing.length_in || null,
      width_in: pricing.width_in || null,
      height_in: pricing.height_in || null,
      image_url: productImageUrl || null,
    };

    await supabase
      .from('product_cache')
      .upsert(cacheData, { onConflict: 'url' });
  };

  // Load cache when dialog opens
  useEffect(() => {
    if (isPricingDialogOpen) {
      checkProductCache();
    }
  }, [isPricingDialogOpen]);

  const calculateTotal = () => {
    const volumetricWeight = (pricing.length_in * pricing.width_in * pricing.height_in) / 139;
    const chargeableWeight = Math.max(pricing.weight_lbs, volumetricWeight);
    const subtotal = pricing.base_item_cost + pricing.domestic_shipping + pricing.tax + pricing.international_shipping + pricing.customs + pricing.other_fees;
    const discount = Number(order.discount) || 0;
    return { total: subtotal - discount, chargeableWeight };
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success('Status updated');
    onUpdate();
  };

  const handleSavePricing = async () => {
    setIsSaving(true);
    const { total, chargeableWeight } = calculateTotal();

    const { error } = await supabase
      .from('orders')
      .update({
        ...pricing,
        other_fees_note: otherFeesNote || null,
        chargeable_weight: chargeableWeight,
        total_amount: total,
        eta: eta || null,
        domestic_tracking: domesticTracking || null,
        international_tracking: internationalTracking || null,
      })
      .eq('id', order.id);

    // Save to product cache for future orders
    await saveToProductCache();

    setIsSaving(false);

    if (error) {
      toast.error('Failed to update order');
      return;
    }

    toast.success('Order updated');
    onUpdate();
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const message = encodeURIComponent(
      `Hi ${profile.full_name},\n\nUpdate on your order #${order.id.slice(0, 8).toUpperCase()}:\nStatus: ${getStatusLabel(order.status)}\n\nThank you for choosing Egate Shopping!`
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  // Calculate quick total for the pricing dialog (includes other_fees)
  const quickTotal = pricing.base_item_cost + pricing.international_shipping + pricing.tax + pricing.other_fees;

  const handleAutoFetchImage = async () => {
    setIsFetchingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-metadata', {
        body: { url: order.product_url }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Image not found - please add manually');
        return;
      }

      if (data?.image) {
        setProductImageUrl(data.image);
        toast.success('Image found and applied!');
      } else {
        toast.error('Image not found - please add manually');
      }
    } catch (err) {
      console.error('Fetch metadata error:', err);
      toast.error('Image not found - please add manually');
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handleSaveQuickPricing = async () => {
    setIsSavingPricing(true);
    
    const { error } = await supabase
      .from('orders')
      .update({
        base_item_cost: pricing.base_item_cost,
        international_shipping: pricing.international_shipping,
        tax: pricing.tax,
        other_fees: pricing.other_fees,
        other_fees_note: otherFeesNote || null,
        total_amount: quickTotal,
        product_image: productImageUrl || null,
        status: 'pending_payment',
      })
      .eq('id', order.id);

    // Save to product cache for future orders
    await saveToProductCache();

    setIsSavingPricing(false);

    if (error) {
      toast.error('Failed to update pricing');
      return;
    }

    toast.success('Pricing updated - Order set to Pending Payment');
    setIsPricingDialogOpen(false);
    setIsAutoFilled(false);
    onUpdate();
  };

  const { total, chargeableWeight } = calculateTotal();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-4 rounded-2xl bg-card border border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
            {order.product_image ? (
              <img
                src={order.product_image}
                alt={order.product_title || 'Product'}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-medium">
                  #{order.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {order.product_title || order.product_url}
                </p>
              </div>
              <Select value={order.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Info */}
            {profile && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link 
                  to={`/admin/customer/${order.user_id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <User className="h-3 w-3" />
                  <strong>{profile.full_name}</strong>
                </Link>
                {profile.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-success hover:text-success"
                    onClick={openWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {profile.phone}
                  </Button>
                )}
                {!profile.is_verified && (
                  <Badge variant="outline" className="text-warning border-warning/50">
                    Unverified
                  </Badge>
                )}
              </div>
            )}

            {/* Key order details - BOLD for purchasing */}
            <div className="flex flex-wrap gap-3 mt-2 p-2 bg-muted/50 rounded-lg text-sm">
              {order.color && (
                <span><strong className="text-primary">Color:</strong> <strong>{order.color}</strong></span>
              )}
              {order.size && (
                <span><strong className="text-primary">Size:</strong> <strong>{order.size}</strong></span>
              )}
              <span>Qty: <strong>{order.quantity}</strong></span>
              {order.special_notes && (
                <span className="text-warning"><strong>Notes:</strong> {order.special_notes}</span>
              )}
            </div>

            {/* Quick Price Button */}
            <div className="flex items-center gap-2 mt-3">
              <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-accent border-0">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Set Price & Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Set Order Price</DialogTitle>
                    <DialogDescription>
                      Order #{order.id.slice(0, 8).toUpperCase()} — Updates status to "Pending Payment"
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-5 py-4">
                    {/* Header Section: Product Link */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 justify-start gap-2 text-primary hover:text-primary"
                          onClick={() => window.open(order.product_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          🔗 Open Customer Link
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleAutoFetchImage}
                          disabled={isFetchingImage}
                          className="gap-2"
                        >
                          {isFetchingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          {isFetchingImage ? 'Fetching...' : '🪄 Auto-Fetch Image'}
                        </Button>
                      </div>
                      
                      {/* User's Options */}
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <Label className="text-xs text-muted-foreground mb-2 block">Customer Options</Label>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Color:</span>{' '}
                            <strong className="text-foreground">{order.color || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Size:</span>{' '}
                            <strong className="text-foreground">{order.size || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{' '}
                            <strong className="text-foreground">{order.quantity}</strong>
                          </div>
                          {order.special_notes && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Notes:</span>{' '}
                              <strong className="text-warning">{order.special_notes}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image Section */}
                    <div className="space-y-2">
                      <Label htmlFor="product-image-url">Product Image URL</Label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            id="product-image-url"
                            type="url"
                            value={productImageUrl}
                            onChange={(e) => setProductImageUrl(e.target.value)}
                            placeholder="https://..."
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Paste the image address here to update the product photo.
                          </p>
                        </div>
                        <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                          {productImageUrl ? (
                            <img 
                              src={productImageUrl} 
                              alt="Preview" 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Package className={`h-6 w-6 text-muted-foreground ${productImageUrl ? 'hidden' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Pricing</Label>
                        {isAutoFilled && (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            <Zap className="h-3 w-3 mr-1" />
                            Data auto-filled from history
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="item-cost" className="text-xs text-muted-foreground">Item Cost ($)</Label>
                          <Input
                            id="item-cost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricing.base_item_cost}
                            onChange={(e) => setPricing({ ...pricing, base_item_cost: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="intl-shipping" className="text-xs text-muted-foreground">International Shipping ($)</Label>
                          <Input
                            id="intl-shipping"
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricing.international_shipping}
                            onChange={(e) => setPricing({ ...pricing, international_shipping: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="service-fee" className="text-xs text-muted-foreground">Service Fee / Tax ($)</Label>
                          <Input
                            id="service-fee"
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricing.tax}
                            onChange={(e) => setPricing({ ...pricing, tax: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>

                        {/* Other Fees with Note */}
                        <div className="space-y-1">
                          <Label htmlFor="other-fees" className="text-xs text-muted-foreground">Other / Misc Fees ($)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="other-fees"
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.other_fees}
                              onChange={(e) => setPricing({ ...pricing, other_fees: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-28"
                            />
                            <Input
                              type="text"
                              value={otherFeesNote}
                              onChange={(e) => setOtherFeesNote(e.target.value)}
                              placeholder="Note (e.g., Express handling)"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <Label className="text-sm text-muted-foreground">Total Customer Price</Label>
                        <p className="text-2xl font-display font-bold text-primary">
                          ${quickTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveQuickPricing} 
                      disabled={isSavingPricing}
                      className="gradient-accent border-0"
                    >
                      {isSavingPricing ? 'Saving...' : 'Save & Update'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {order.total_amount > 0 && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  ${Number(order.total_amount).toFixed(2)}
                </Badge>
              )}
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-4 pt-4 border-t border-border space-y-6">
          {/* Product Link */}
          <div>
            <Label className="text-xs text-muted-foreground">Product URL</Label>
            <a 
              href={order.product_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
            >
              {order.product_url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          {/* Pricing */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Base Item Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.base_item_cost}
                onChange={(e) => setPricing({ ...pricing, base_item_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Domestic Shipping ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.domestic_shipping}
                onChange={(e) => setPricing({ ...pricing, domestic_shipping: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.tax}
                onChange={(e) => setPricing({ ...pricing, tax: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>International Shipping ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.international_shipping}
                onChange={(e) => setPricing({ ...pricing, international_shipping: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Customs ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.customs}
                onChange={(e) => setPricing({ ...pricing, customs: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Other / Misc Fees ($)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.other_fees}
                  onChange={(e) => setPricing({ ...pricing, other_fees: parseFloat(e.target.value) || 0 })}
                  className="w-28"
                />
                <Input
                  type="text"
                  value={otherFeesNote}
                  onChange={(e) => setOtherFeesNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg">
              <Label className="text-xs text-muted-foreground">Total</Label>
              <p className="text-xl font-display font-bold text-primary">${total.toFixed(2)}</p>
              {Number(order.discount) > 0 && (
                <p className="text-xs text-success">-${order.discount} discount</p>
              )}
            </div>
          </div>

          {/* Weight & Dimensions */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Weight (lbs)</Label>
              <Input
                type="number"
                step="0.1"
                value={pricing.weight_lbs}
                onChange={(e) => setPricing({ ...pricing, weight_lbs: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Length (in)</Label>
              <Input
                type="number"
                step="0.1"
                value={pricing.length_in}
                onChange={(e) => setPricing({ ...pricing, length_in: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Width (in)</Label>
              <Input
                type="number"
                step="0.1"
                value={pricing.width_in}
                onChange={(e) => setPricing({ ...pricing, width_in: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Height (in)</Label>
              <Input
                type="number"
                step="0.1"
                value={pricing.height_in}
                onChange={(e) => setPricing({ ...pricing, height_in: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Chargeable Weight: <strong>{chargeableWeight.toFixed(2)} lbs</strong> (max of actual vs volumetric)
          </p>

          {/* Tracking & ETA */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>ETA Date</Label>
              <Input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Domestic Tracking (Admin Only)</Label>
              <Input
                value={domesticTracking}
                onChange={(e) => setDomesticTracking(e.target.value)}
                placeholder="Internal tracking..."
              />
            </div>
            <div className="space-y-2">
              <Label>International Tracking</Label>
              <Input
                value={internationalTracking}
                onChange={(e) => setInternationalTracking(e.target.value)}
                placeholder="Customer visible tracking..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePricing} disabled={isSaving} className="gradient-hero border-0">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
