import { useState, useEffect } from 'react';
import { Plus, Package, Search, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface OrderOption {
  id: string;
  product_title: string | null;
  user_id: string;
  status: string;
  weight_lbs: number | null;
  quantity: number;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  package_code: string | null;
  profile_name?: string;
}

interface CreateShipmentDialogProps {
  onCreated: () => void;
}

export function CreateShipmentDialog({ onCreated }: CreateShipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [carrier, setCarrier] = useState('DHL');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [search, setSearch] = useState('');
  const [codesText, setCodesText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) fetchOrders();
  }, [open]);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, product_title, user_id, status, weight_lbs, quantity, length_in, width_in, height_in, package_code' as any)
      .is('shipment_id', null)
      .order('created_at', { ascending: false });

    if (ordersData && ordersData.length > 0) {
      const userIds = [...new Set(ordersData.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setOrders(ordersData.map((o: any) => ({ ...o, profile_name: profileMap.get(o.user_id) || 'Unknown' })));
    } else {
      setOrders([]);
    }
    setIsLoading(false);
  };

  const toggleOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Parse codes from text like "Consolidated from: ERM + ERN + ERO"
  const parseCodesFromText = (text: string): string[] => {
    // Remove "Consolidated from:" prefix if present
    const cleaned = text.replace(/^.*?:/i, '').trim();
    // Split by + or , or whitespace and clean
    return cleaned
      .split(/[\+,\s]+/)
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);
  };

  const handleMatchCodes = () => {
    const codes = parseCodesFromText(codesText);
    if (codes.length === 0) {
      toast.error('No valid codes found in the text');
      return;
    }

    const matched = new Set<string>();
    const unmatchedCodes: string[] = [];

    codes.forEach(code => {
      const order = orders.find(o => o.package_code?.toUpperCase() === code);
      if (order) {
        matched.add(order.id);
      } else {
        unmatchedCodes.push(code);
      }
    });

    setSelectedIds(matched);

    if (unmatchedCodes.length > 0) {
      toast.warning(`Matched ${matched.size}/${codes.length} codes. Unmatched: ${unmatchedCodes.join(', ')}`);
    } else {
      toast.success(`All ${matched.size} codes matched!`);
    }
  };

  const selectedOrders = orders.filter(o => selectedIds.has(o.id));

  const DIM_FACTOR = 139;
  const totalActualWeight = selectedOrders.reduce((sum, o) => sum + (o.weight_lbs || 0) * (o.quantity || 1), 0);
  const totalVolWeight = selectedOrders.reduce((sum, o) => {
    const vol = ((o.length_in || 0) * (o.width_in || 0) * (o.height_in || 0)) / DIM_FACTOR;
    return sum + vol * (o.quantity || 1);
  }, 0);
  const chargeableWeight = Math.max(totalActualWeight, totalVolWeight);
  const baseRate = carrier === 'DHL' ? 35 : 28;
  const ratePerLb = carrier === 'DHL' ? 8 : 7;
  const totalCost = baseRate + chargeableWeight * ratePerLb;

  const consolidatedCodes = selectedOrders
    .filter(o => o.package_code)
    .map(o => o.package_code)
    .join(' + ');

  const handleCreate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one order');
      return;
    }

    setIsCreating(true);

    const firstOrder = selectedOrders[0];
    const tracking = trackingNumber || `${carrier === 'DHL' ? 'JD' : 'FED'}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const notes = consolidatedCodes
      ? `Consolidated from: ${consolidatedCodes}`
      : `Manual shipment. ${selectedIds.size} items.`;

    const { data: shipment, error: shipError } = await supabase
      .from('shipments')
      .insert({
        user_id: firstOrder.user_id,
        carrier,
        master_tracking_number: tracking,
        status: 'Ready for Pickup',
        total_weight: totalActualWeight,
        total_volumetric_weight: totalVolWeight,
        chargeable_weight: chargeableWeight,
        total_cost: totalCost,
        paid_from_wallet: 0,
        cod_amount: totalCost,
        payment_status: 'COD Pending',
        notes,
      })
      .select()
      .single();

    if (shipError) {
      toast.error('Failed to create shipment');
      setIsCreating(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'international_shipping' as any,
        shipment_id: shipment.id,
        international_tracking: tracking,
      })
      .in('id', Array.from(selectedIds));

    setIsCreating(false);

    if (updateError) {
      toast.error('Shipment created but failed to link orders');
      return;
    }

    toast.success(`Shipment created with ${selectedIds.size} packages`);
    setOpen(false);
    setSelectedIds(new Set());
    setTrackingNumber('');
    setCodesText('');
    onCreated();
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.product_title?.toLowerCase().includes(q) ||
      o.profile_name?.toLowerCase().includes(q) ||
      o.package_code?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Shipment
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs text-muted-foreground">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DHL">DHL</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tracking # (auto if empty)</Label>
            <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {/* Paste codes to auto-match */}
        <div className="mb-4 p-3 bg-muted/30 border border-border rounded-lg space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Paste Package Codes (auto-match orders)
          </Label>
          <Textarea
            value={codesText}
            onChange={e => setCodesText(e.target.value)}
            placeholder="Consolidated from: ERM + ERN + ERO + ERP + ERQ..."
            className="text-sm font-mono min-h-[60px]"
          />
          <Button size="sm" variant="outline" onClick={handleMatchCodes} disabled={!codesText.trim()}>
            <Upload className="h-3 w-3 mr-1" />
            Match Codes
          </Button>
        </div>

        {/* Summary */}
        {selectedIds.size > 0 && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4 text-sm">
            <div><span className="text-muted-foreground text-xs">Selected</span><p className="font-bold">{selectedIds.size}</p></div>
            <div><span className="text-muted-foreground text-xs">Weight</span><p className="font-bold">{chargeableWeight.toFixed(2)} lbs</p></div>
            <div><span className="text-muted-foreground text-xs">Cost</span><p className="font-bold">${totalCost.toFixed(2)}</p></div>
            <div><span className="text-muted-foreground text-xs">COD</span><p className="font-bold text-warning">${totalCost.toFixed(2)}</p></div>
          </div>
        )}

        {/* Consolidated codes preview */}
        {consolidatedCodes && (
          <div className="p-2 bg-muted/50 rounded-lg mb-2 text-xs font-mono text-muted-foreground truncate">
            Consolidated from: {consolidatedCodes}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, or customer..." className="pl-10" />
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto border rounded-lg divide-y divide-border min-h-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No unassigned orders found</div>
          ) : (
            filtered.map(order => (
              <label
                key={order.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}
              >
                <Checkbox
                  checked={selectedIds.has(order.id)}
                  onCheckedChange={() => toggleOrder(order.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.product_title || 'Product Order'}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{order.profile_name}</span>
                    {order.package_code && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-bold text-primary">{order.package_code}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Qty: {order.quantity}</span>
                    {order.weight_lbs && <><span>•</span><span>{order.weight_lbs} lbs</span></>}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{order.status.replace(/_/g, ' ')}</Badge>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || selectedIds.size === 0}>
            {isCreating ? 'Creating...' : `Create Shipment (${selectedIds.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
