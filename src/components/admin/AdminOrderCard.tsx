import { useState } from 'react';
import { 
  Package, MessageCircle, User, Phone, Calendar, 
  ChevronDown, ChevronUp, Truck, Image, DollarSign,
  ExternalLink
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
  const [pricing, setPricing] = useState({
    base_item_cost: Number(order.base_item_cost) || 0,
    domestic_shipping: Number(order.domestic_shipping) || 0,
    tax: Number(order.tax) || 0,
    international_shipping: Number(order.international_shipping) || 0,
    customs: Number(order.customs) || 0,
    weight_lbs: Number(order.weight_lbs) || 0,
    length_in: Number(order.length_in) || 0,
    width_in: Number(order.width_in) || 0,
    height_in: Number(order.height_in) || 0,
  });
  const [eta, setEta] = useState(order.eta || '');
  const [domesticTracking, setDomesticTracking] = useState(order.domestic_tracking || '');
  const [internationalTracking, setInternationalTracking] = useState(order.international_tracking || '');
  const [isSaving, setIsSaving] = useState(false);

  const calculateTotal = () => {
    const volumetricWeight = (pricing.length_in * pricing.width_in * pricing.height_in) / 139;
    const chargeableWeight = Math.max(pricing.weight_lbs, volumetricWeight);
    const subtotal = pricing.base_item_cost + pricing.domestic_shipping + pricing.tax + pricing.international_shipping + pricing.customs;
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
        chargeable_weight: chargeableWeight,
        total_amount: total,
        eta: eta || null,
        domestic_tracking: domesticTracking || null,
        international_tracking: internationalTracking || null,
      })
      .eq('id', order.id);

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
      `Hi ${profile.full_name},\n\nUpdate on your order #${order.id.slice(0, 8).toUpperCase()}:\nStatus: ${getStatusLabel(order.status)}\n\nThank you for choosing ShipME!`
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const { total, chargeableWeight } = calculateTotal();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-4 rounded-2xl bg-card border border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
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
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <strong>{profile.full_name}</strong>
                </span>
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
