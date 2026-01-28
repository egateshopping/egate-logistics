import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Users, AlertTriangle, Truck, Search, 
  MessageCircle, Eye, CheckCircle, Clock, X, DollarSign
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminOrderCard } from '@/components/admin/AdminOrderCard';
import { AdminDisputeCard } from '@/components/admin/AdminDisputeCard';
import type { Order, Dispute, Profile } from '@/lib/supabase';

interface OrderWithProfile extends Order {
  profiles?: Profile;
}

interface DisputeWithOrder extends Dispute {
  orders?: Order;
  profiles?: Profile;
}

export default function Admin() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [disputes, setDisputes] = useState<DisputeWithOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, authLoading]);

  const fetchData = async () => {
    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch profiles for orders
    if (ordersData) {
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const ordersWithProfiles = ordersData.map(o => ({
        ...o,
        profiles: profileMap.get(o.user_id),
      }));
      setOrders(ordersWithProfiles as OrderWithProfile[]);
    }

    // Fetch disputes with orders
    const { data: disputesData } = await supabase
      .from('disputes')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (disputesData) {
      const orderIds = [...new Set(disputesData.map(d => d.order_id))];
      const userIds = [...new Set(disputesData.map(d => d.user_id))];
      
      const { data: ordersForDisputes } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      const { data: profilesForDisputes } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const orderMap = new Map(ordersForDisputes?.map(o => [o.id, o]) || []);
      const profileMap = new Map(profilesForDisputes?.map(p => [p.user_id, p]) || []);

      const disputesWithData = disputesData.map(d => ({
        ...d,
        orders: orderMap.get(d.order_id),
        profiles: profileMap.get(d.user_id),
      }));
      setDisputes(disputesWithData as DisputeWithOrder[]);
    }

    setIsLoading(false);
  };

  const stats = {
    totalOrders: orders.length,
    pendingPayment: orders.filter(o => o.status === 'pending_payment').length,
    inProgress: orders.filter(o => !['pending_payment', 'delivered', 'cancelled'].includes(o.status)).length,
    openDisputes: disputes.length,
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(query) ||
      o.product_title?.toLowerCase().includes(query) ||
      o.profiles?.full_name?.toLowerCase().includes(query) ||
      o.profiles?.phone?.includes(query)
    );
  });

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage orders, customers, and disputes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <Package className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-display font-bold">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
            <DollarSign className="h-5 w-5 text-warning mb-2" />
            <p className="text-2xl font-display font-bold text-warning">{stats.pendingPayment}</p>
            <p className="text-xs text-muted-foreground">Pending Payment</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Truck className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-display font-bold text-primary">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
            <p className="text-2xl font-display font-bold text-destructive">{stats.openDisputes}</p>
            <p className="text-xs text-muted-foreground">Open Disputes</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by order ID, product, customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              All Orders
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes ({disputes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <AdminOrderCard 
                  key={order.id} 
                  order={order} 
                  profile={order.profiles as Profile}
                  onUpdate={fetchData} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            {disputes.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-muted-foreground">No open disputes</p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <AdminDisputeCard 
                  key={dispute.id} 
                  dispute={dispute}
                  order={dispute.orders as Order}
                  profile={dispute.profiles as Profile}
                  onUpdate={fetchData} 
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
