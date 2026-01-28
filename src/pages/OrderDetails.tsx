import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, ExternalLink, Calendar, MapPin, 
  Truck, CheckCircle, Clock, CreditCard, AlertTriangle,
  ShoppingCart, Box, Plane, Home, ImageIcon
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getStatusLabel, getStatusColor } from '@/lib/supabase';
import type { Order } from '@/lib/supabase';
import { format } from 'date-fns';

// Timeline step configuration
const timelineSteps = [
  { key: 'created', label: 'Order Placed', icon: ShoppingCart },
  { key: 'paid', label: 'Payment Received', icon: CreditCard },
  { key: 'purchased', label: 'Item Purchased', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Plane },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

// Map order status to timeline step
const getTimelineStep = (status: string): number => {
  switch (status) {
    case 'pending_payment':
      return 0;
    case 'payment_received':
    case 'purchasing':
      return 1;
    case 'purchased':
    case 'domestic_shipping':
    case 'at_warehouse':
      return 2;
    case 'international_shipping':
    case 'customs':
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
    case 'under_investigation':
      return -1;
    default:
      return 0;
  }
};

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user && id) {
      fetchOrder();
    }
  }, [user, authLoading, id]);

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching order:', error);
      navigate('/dashboard');
      return;
    }

    setOrder(data as Order);
    setIsLoading(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return `$${Number(amount).toFixed(2)}`;
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-8 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-2xl" />
            <div className="h-32 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">This order doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const currentStep = getTimelineStep(order.status);
  const isCancelled = order.status === 'cancelled';
  const isUnderInvestigation = order.status === 'under_investigation';

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {format(new Date(order.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
          <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        {/* Product Card */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden mb-6">
          <div className="flex flex-col sm:flex-row gap-6 p-6">
            {/* Image */}
            <div className="h-40 w-40 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
              {order.product_image ? (
                <img
                  src={order.product_image}
                  alt={order.product_title || 'Product'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold mb-2">
                {order.product_title || 'Product Order'}
              </h2>
              <a
                href={order.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4"
              >
                <ExternalLink className="h-3 w-3" />
                View Original Product
              </a>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-muted/50 rounded-lg">
                {order.color && (
                  <div>
                    <span className="text-xs text-muted-foreground">Color</span>
                    <p className="font-medium">{order.color}</p>
                  </div>
                )}
                {order.size && (
                  <div>
                    <span className="text-xs text-muted-foreground">Size</span>
                    <p className="font-medium">{order.size}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Quantity</span>
                  <p className="font-medium">{order.quantity}</p>
                </div>
                {order.eta && (
                  <div>
                    <span className="text-xs text-muted-foreground">ETA</span>
                    <p className="font-medium">{format(new Date(order.eta), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {order.special_notes && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <span className="text-xs text-muted-foreground">Special Notes</span>
                  <p className="text-sm font-medium text-warning">{order.special_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6">
          <h3 className="font-semibold mb-6">Order Progress</h3>
          
          {(isCancelled || isUnderInvestigation) ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {isCancelled ? 'Order Cancelled' : 'Under Investigation'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isCancelled 
                    ? 'This order has been cancelled.' 
                    : 'We are investigating an issue with this order.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-5 right-5 h-1 bg-muted rounded-full">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / (timelineSteps.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps */}
              <div className="relative flex justify-between">
                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div 
                        className={`
                          h-10 w-10 rounded-full flex items-center justify-center z-10 transition-all
                          ${isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                          }
                          ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                        `}
                      >
                        {isCompleted && index < currentStep ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center max-w-[60px] ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tracking */}
        {order.international_tracking && (
          <div className="rounded-2xl bg-card border border-border p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Tracking Information
            </h3>
            <a
              href={`https://www.17track.net/en/track?nums=${order.international_tracking}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Track Package: {order.international_tracking}
            </a>
          </div>
        )}

        {/* Financials */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Price Breakdown
          </h3>

          {order.total_amount && Number(order.total_amount) > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item Cost</span>
                <span>{formatCurrency(order.base_item_cost)}</span>
              </div>
              {order.domestic_shipping && Number(order.domestic_shipping) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Domestic Shipping</span>
                  <span>{formatCurrency(order.domestic_shipping)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">International Shipping</span>
                <span>{formatCurrency(order.international_shipping)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee / Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              {order.customs && Number(order.customs) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customs</span>
                  <span>{formatCurrency(order.customs)}</span>
                </div>
              )}
              {(order as any).other_fees && Number((order as any).other_fees) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Other Fees{(order as any).other_fees_note && ` (${(order as any).other_fees_note})`}
                  </span>
                  <span>{formatCurrency((order as any).other_fees)}</span>
                </div>
              )}
              {order.discount && Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>

              {/* Payment status */}
              <div className={`mt-4 p-3 rounded-lg ${order.is_paid ? 'bg-success/10 border border-success/30' : 'bg-warning/10 border border-warning/30'}`}>
                <p className={`text-sm font-medium ${order.is_paid ? 'text-success' : 'text-warning'}`}>
                  {order.is_paid ? '✓ Payment Confirmed' : '⏳ Awaiting Payment'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>Price pending calculation</p>
              <p className="text-sm">We'll contact you once we have the final price.</p>
            </div>
          )}
        </div>

        {/* Warehouse Photos */}
        {order.warehouse_photos && Array.isArray(order.warehouse_photos) && order.warehouse_photos.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-6 mt-6">
            <h3 className="font-semibold mb-4">Warehouse Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(order.warehouse_photos as string[]).map((photo, index) => (
                <a 
                  key={index} 
                  href={photo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                >
                  <img src={photo} alt={`Warehouse photo ${index + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
