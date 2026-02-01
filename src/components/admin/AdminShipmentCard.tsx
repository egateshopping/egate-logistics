import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, Package, User, Phone, MapPin, Calendar,
  ChevronDown, ChevronUp, DollarSign, Scale, MessageCircle,
  ExternalLink, Clock, CheckCircle, AlertCircle
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

interface ShipmentProfile {
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
}

interface Shipment {
  id: string;
  user_id: string;
  carrier: string;
  master_tracking_number: string | null;
  status: string;
  total_weight: number;
  total_volumetric_weight: number;
  chargeable_weight: number;
  total_cost: number;
  paid_from_wallet: number;
  cod_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminShipmentCardProps {
  shipment: Shipment;
  profile?: ShipmentProfile;
  ordersCount: number;
  onUpdate: () => void;
}

const shipmentStatuses = [
  'Ready for Pickup',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const paymentStatuses = [
  'Pending',
  'COD Pending',
  'COD Collected',
  'Paid',
  'Refunded',
];

export function AdminShipmentCard({ shipment, profile, ordersCount, onUpdate }: AdminShipmentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(shipment.master_tracking_number || '');
  const [notes, setNotes] = useState(shipment.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready for Pickup':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Picked Up':
      case 'In Transit':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Out for Delivery':
        return 'bg-info/10 text-info border-info/20';
      case 'Delivered':
        return 'bg-success/10 text-success border-success/20';
      case 'Cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'COD Collected':
        return 'bg-success/10 text-success border-success/20';
      case 'COD Pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Refunded':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('shipments')
      .update({ status: newStatus })
      .eq('id', shipment.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success(`Status updated to ${newStatus}`);
    onUpdate();
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('shipments')
      .update({ payment_status: newStatus })
      .eq('id', shipment.id);

    if (error) {
      toast.error('Failed to update payment status');
      return;
    }

    toast.success(`Payment status updated to ${newStatus}`);
    onUpdate();
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('shipments')
      .update({
        master_tracking_number: trackingNumber || null,
        notes: notes || null,
      })
      .eq('id', shipment.id);

    setIsSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      return;
    }

    toast.success('Shipment updated');
    onUpdate();
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const message = encodeURIComponent(
      `Hi ${profile.full_name},\n\nYour shipment update:\nTracking: ${shipment.master_tracking_number || 'Pending'}\nCarrier: ${shipment.carrier}\nStatus: ${shipment.status}\n${shipment.cod_amount > 0 ? `\nCOD Amount: $${shipment.cod_amount.toFixed(2)}` : ''}\n\nThank you!`
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Carrier Icon */}
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-6 w-6 text-primary" />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">
                      {shipment.master_tracking_number || 'No Tracking'}
                    </span>
                    <Badge variant="outline" className={getStatusColor(shipment.status)}>
                      {shipment.status}
                    </Badge>
                    <Badge variant="outline" className={getPaymentStatusColor(shipment.payment_status)}>
                      {shipment.payment_status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      {ordersCount} items
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="h-3.5 w-3.5" />
                      {shipment.chargeable_weight?.toFixed(2) || 0} lbs
                    </span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${shipment.total_cost?.toFixed(2) || 0}
                    </span>
                    {shipment.cod_amount > 0 && (
                      <span className="flex items-center gap-1 text-warning font-medium">
                        COD: ${shipment.cod_amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Customer Info */}
                  {profile && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Link 
                        to={`/admin/customer/${profile.user_id}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <User className="h-3.5 w-3.5" />
                        {profile.full_name}
                      </Link>
                      {profile.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.city}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t border-border mt-2">
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              {/* Left Column - Shipment Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipment Details
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Carrier</Label>
                    <p className="font-medium">{shipment.carrier}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Items Count</Label>
                    <p className="font-medium">{ordersCount} items</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tracking" className="text-xs text-muted-foreground">
                    Tracking Number
                  </Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={shipment.status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {shipmentStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Status</Label>
                    <Select value={shipment.payment_status} onValueChange={handlePaymentStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                  />
                </div>
              </div>

              {/* Right Column - Weight & Cost */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Weight & Cost Breakdown
                </h4>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Actual Weight</span>
                    <span>{shipment.total_weight?.toFixed(2) || 0} lbs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Volumetric Weight</span>
                    <span>{shipment.total_volumetric_weight?.toFixed(2) || 0} lbs</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
                    <span>Chargeable Weight</span>
                    <span>{shipment.chargeable_weight?.toFixed(2) || 0} lbs</span>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-medium">${shipment.total_cost?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid from Wallet</span>
                    <span className="text-success">-${shipment.paid_from_wallet?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
                    <span>COD Amount</span>
                    <span className={shipment.cod_amount > 0 ? 'text-warning' : 'text-success'}>
                      ${shipment.cod_amount?.toFixed(2) || 0}
                    </span>
                  </div>
                </div>

                {/* Customer Contact */}
                {profile && (
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Customer</h5>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <Link 
                        to={`/admin/customer/${profile.user_id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {profile.full_name}
                      </Link>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{profile.address}, {profile.city}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="flex gap-2">
                {profile?.phone && (
                  <Button variant="outline" size="sm" onClick={openWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
