import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, AlertTriangle, User, Phone, MapPin, Calendar } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { OrderCard } from '@/components/orders/OrderCard';
import type { Order } from '@/lib/supabase';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setOrders(data as Order[]);
    }
    setIsLoading(false);
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const stats = {
    total: orders.length,
    active: activeOrders.length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Profile Header */}
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
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </span>
                )}
                {profile?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.city}, {profile.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {format(new Date(profile?.created_at || Date.now()), 'MMM yyyy')}
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-display font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-display font-bold text-primary">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-4 rounded-xl bg-success/5 border border-success/20 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-display font-bold text-success">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              History ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-display font-semibold mb-2">No active orders</h3>
                <p className="text-muted-foreground mb-4">Start by pasting a product link on the homepage</p>
                <Button onClick={() => navigate('/')}>
                  Browse Products
                </Button>
              </div>
            ) : (
              activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} onUpdate={fetchOrders} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed orders yet</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onUpdate={fetchOrders} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
