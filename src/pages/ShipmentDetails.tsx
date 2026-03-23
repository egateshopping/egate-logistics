import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, Plane, Scale, DollarSign,
  ExternalLink, ImageIcon, CheckCircle, Clock
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getStatusLabel, getStatusColor } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/supabase';
import { format } from 'date-fns';

interface ShipmentOrder {
  id: string;
  product_title: string | null;
  product_image: string | null;
  product_url: string;
  quantity: number;
  status: string;
  weight_lbs: number | null;
  volumetric_weight: number | null;
  base_item_cost: number | null;
  color: string | null;
  size: string | null;
  created_at: string;
}

interface ShipmentInfo {
  id: string;
  carrier: string;
  master_tracking_number: string | null;
  status: string;
  total_weight: number | null;
  total_volumetric_weight: number | null;
  chargeable_weight: number | null;
  total_cost: number | null;
  paid_from_wallet: number | null;
  cod_amount: number | null;
  payment_status: string | null;
  notes: string | null;
  created_at: string;
}

export default function ShipmentDetails() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [shipment, setShipment] = useState<ShipmentInfo | null>(null);
  const [orders, setOrders] = useState<ShipmentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user && shipmentId) fetchData();
  }, [user, authLoading, shipmentId]);

  const fetchData = async () => {
    const [shipmentRes, ordersRes] = await Promise.all([
      supabase.from('shipments').select('*').eq('id', shipmentId).single(),
      supabase.from('orders').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: false }),
    ]);

    if (shipmentRes.error || !shipmentRes.data) {
      navigate('/dashboard');
      return;
    }

    setShipment(shipmentRes.data as ShipmentInfo);
    setOrders((ordersRes.data || []) as ShipmentOrder[]);
    setIsLoading(false);
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-8 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-40 bg-muted rounded-2xl" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!shipment) return null;

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Ready for Pickup': return 'bg-warning/10 text-warning border-warning/20';
      case 'In Transit': return 'bg-primary/10 text-primary border-primary/20';
      case 'Delivered': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Shipment Header */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold">International Shipment</h1>
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(shipment.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge className={`text-sm px-3 py-1 ${getShipmentStatusColor(shipment.status || '')}`}>
              {shipment.status}
            </Badge>
          </div>

          {/* Tracking & Carrier */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Tracking #</span>
              <p className="font-mono text-sm font-bold mt-1">{shipment.master_tracking_number || '—'}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Carrier</span>
              <p className="font-medium text-sm mt-1">{shipment.carrier}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Total Packages</span>
              <p className="font-bold text-sm mt-1">{orders.length}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Payment</span>
              <p className="font-medium text-sm mt-1">{shipment.payment_status || 'Pending'}</p>
            </div>
          </div>

          {/* Weight & Cost */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Weight:</span>
              <span className="font-medium">{shipment.chargeable_weight?.toFixed(2) || 0} lbs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-medium">${shipment.total_cost?.toFixed(2) || 0}</span>
            </div>
            {(shipment.cod_amount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-warning" />
                <span className="text-warning font-medium">COD: ${shipment.cod_amount?.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Track button */}
          {shipment.master_tracking_number && (
            <div className="mt-4 pt-4 border-t border-border">
              <a
                href={`https://www.17track.net/en/track?nums=${shipment.master_tracking_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                Track on 17track
              </a>
            </div>
          )}
        </div>

        {/* Packages List */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Packages in this Shipment ({orders.length})
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3" />
              <p>No packages found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/order/${order.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Image */}
                  <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                    {order.product_image ? (
                      <img
                        src={order.product_image}
                        alt={order.product_title || 'Product'}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {order.product_title || 'Product Order'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>Qty: {order.quantity}</span>
                      {order.color && <span>Color: {order.color}</span>}
                      {order.size && <span>Size: {order.size}</span>}
                      {order.weight_lbs && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          {order.weight_lbs} lbs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Price */}
                  <div className="text-right flex-shrink-0">
                    <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    {order.base_item_cost && (
                      <p className="text-sm font-medium mt-1">${Number(order.base_item_cost).toFixed(2)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
