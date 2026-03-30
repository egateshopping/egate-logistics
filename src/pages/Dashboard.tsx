import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, Truck, CheckCircle, Clock, User,
  Phone, MapPin, Calendar, Plane, ExternalLink
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/lib/supabase';
import { OrderCard } from '@/components/orders/OrderCard';
import type { Order } from '@/lib/supabase';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  carrier: string;
  master_tracking_number: string | null;
  status: string;
  chargeable_weight: number;
  total_cost: number;
  cod_amount: number;
  created_at: string;
  orderCount?: number;
  orders?: Order[];
}

export default function Dashboard() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { t, isRtl } = useLanguage();
  const { settings } = useAppSettings();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (user) fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    const [ordersRes, shipmentsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('shipments').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);

    const allOrders = (ordersRes.data || []) as Order[];
    setOrders(allOrders);

    // ربط الطلبات بالشحنات
    const allShipments = (shipmentsRes.data || []) as Shipment[];
    const shipmentsWithOrders = allShipments.map(s => ({
      ...s,
      orders: allOrders.filter(o => (o as any).shipment_id === s.id),
      orderCount: allOrders.filter(o => (o as any).shipment_id === s.id).length,
    }));
    setShipments(shipmentsWithOrders);

    setIsLoading(false);
  };

  // الطلبات الفردية (غير المجمعة في شحنة)
  const soloOrders = orders.filter(o => !(o as any).shipment_id);
  const activeOrders = soloOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = soloOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const stats = {
    total: orders.length,
    active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Ready for Pickup': return 'bg-warning/10 text-warning border-warning/20';
      case 'Picked Up':
      case 'In Transit': return 'bg-primary/10 text-primary border-primary/20';
      case 'Out for Delivery': return 'bg-success/10 text-success border-success/20';
      case 'Delivered': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* رأس الملف الشخصي */}
        <div className="mb-8 p-6 rounded-2xl bg-card border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{profile?.full_name || 'Welcome'}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                {profile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />{profile.phone}
                  </span>
                )}
                {(profile as any)?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {(profile as any).city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {format(new Date(profile?.created_at || Date.now()), 'MMM yyyy')}
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              {t('profileSettings')}
            </Button>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-display font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t('totalOrders')}</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-display font-bold text-primary">{stats.active}</p>
            <p className="text-xs text-muted-foreground">{t('active')}</p>
          </div>
          <div className="p-4 rounded-xl bg-success/5 border border-success/20 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-display font-bold text-success">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="active" className="gap-1 text-xs sm:text-sm">
              <Clock className="h-4 w-4" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="shipments" className="gap-1 text-xs sm:text-sm">
              <Plane className="h-4 w-4" />
              Shipments ({shipments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4" />
              History ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* الطلبات النشطة */}
          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display font-semibold mb-2">No active orders</h3>
                <p className="text-muted-foreground mb-4">Start by pasting a product link on the homepage</p>
                <Button onClick={() => navigate('/')}>Start Shopping</Button>
              </div>
            ) : (
              activeOrders.map(order => <OrderCard key={order.id} order={order} onUpdate={fetchData} />)
            )}
          </TabsContent>

          {/* الشحنات المجمعة */}
          <TabsContent value="shipments" className="space-y-4">
            {shipments.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display font-semibold mb-2">No shipments yet</h3>
                <p className="text-muted-foreground">Your grouped orders will appear here once shipped</p>
              </div>
            ) : (
              shipments.map(shipment => (
                <Link key={shipment.id} to={`/shipment/${shipment.id}`}
                  className="block p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-soft transition-all">

                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          International Shipment — {shipment.orderCount} {shipment.orderCount === 1 ? 'package' : 'packages'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {shipment.carrier} · {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 ${getShipmentStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </Badge>
                  </div>

                  {/* رقم التتبع */}
                  {shipment.master_tracking_number && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-muted/30 rounded-lg">
                      <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono font-medium flex-1">
                        {shipment.master_tracking_number}
                      </span>
                      <a href={`https://www.17track.net/en/track?nums=${shipment.master_tracking_number}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />Track
                      </a>
                    </div>
                  )}

                  {/* الطلبات داخل الشحنة */}
                  {shipment.orders && shipment.orders.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {shipment.orders.slice(0, 4).map(o => (
                        <div key={o.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg text-xs">
                          {o.product_image && (
                            <img src={o.product_image} alt="" className="h-4 w-4 rounded object-cover" />
                          )}
                          <span className="truncate max-w-[100px]">{o.product_title || 'Product'}</span>
                        </div>
                      ))}
                      {shipment.orders.length > 4 && (
                        <span className="px-2 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                          +{shipment.orders.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* التكلفة */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      {shipment.chargeable_weight?.toFixed(2)} lbs
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${shipment.total_cost?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(shipment.total_cost * settings.usdToIqd).toLocaleString()} IQD
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          {/* السجل */}
          <TabsContent value="history" className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed orders yet</p>
              </div>
            ) : (
              completedOrders.map(order => <OrderCard key={order.id} order={order} onUpdate={fetchData} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
