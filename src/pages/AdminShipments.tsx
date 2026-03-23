import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, Truck, Search, ArrowLeft, Scale, 
  DollarSign, Clock, CheckCircle, AlertCircle, User,
  Phone, MapPin, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AdminShipmentCard } from '@/components/admin/AdminShipmentCard';
import { CreateShipmentDialog } from '@/components/admin/CreateShipmentDialog';
import { format } from 'date-fns';

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

interface ShipmentWithProfile extends Shipment {
  profiles?: {
    user_id: string;
    full_name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  orders_count?: number;
  package_codes?: string[];
}

export default function AdminShipments() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<ShipmentWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchShipments();
    }
  }, [user, isAdmin, authLoading]);

  const fetchShipments = async () => {
    setIsLoading(true);

    // Fetch shipments
    const { data: shipmentsData, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipments:', error);
      setIsLoading(false);
      return;
    }

    if (shipmentsData && shipmentsData.length > 0) {
      // Fetch profiles for shipments
      const userIds = [...new Set(shipmentsData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, address, city')
        .in('user_id', userIds);

      // Count orders per shipment and get package codes
      const shipmentIds = shipmentsData.map(s => s.id);
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, shipment_id, package_code')
        .in('shipment_id', shipmentIds);

      const orderCountMap = new Map<string, number>();
      const packageCodesMap = new Map<string, string[]>();
      ordersData?.forEach((o: any) => {
        if (o.shipment_id) {
          orderCountMap.set(o.shipment_id, (orderCountMap.get(o.shipment_id) || 0) + 1);
          if (o.package_code) {
            const codes = packageCodesMap.get(o.shipment_id) || [];
            codes.push(o.package_code.trim());
            packageCodesMap.set(o.shipment_id, codes);
          }
        }
      });

      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const shipmentsWithProfiles = shipmentsData.map(s => ({
        ...s,
        profiles: profileMap.get(s.user_id),
        orders_count: orderCountMap.get(s.id) || 0,
        package_codes: packageCodesMap.get(s.id) || [],
      }));

      setShipments(shipmentsWithProfiles as ShipmentWithProfile[]);
    } else {
      setShipments([]);
    }

    setIsLoading(false);
  };

  const stats = {
    totalShipments: shipments.length,
    readyForPickup: shipments.filter(s => s.status === 'Ready for Pickup').length,
    inTransit: shipments.filter(s => ['In Transit', 'Out for Delivery'].includes(s.status)).length,
    codPending: shipments.filter(s => s.payment_status === 'COD Pending').length,
    totalRevenue: shipments.reduce((sum, s) => sum + (s.total_cost || 0), 0),
  };

  const filteredShipments = shipments.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.id.toLowerCase().includes(query) ||
      s.master_tracking_number?.toLowerCase().includes(query) ||
      s.profiles?.full_name?.toLowerCase().includes(query) ||
      s.profiles?.phone?.includes(query) ||
      s.carrier?.toLowerCase().includes(query)
    );
  });

  const getStatusShipments = (status: string) => {
    return filteredShipments.filter(s => s.status === status);
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="grid md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                Shipments Management
              </h1>
              <p className="text-muted-foreground mt-1 font-light">
                Manage consolidated shipments and COD
              </p>
            </div>
          </div>
          <CreateShipmentDialog onCreated={fetchShipments} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <Truck className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-display font-bold">{stats.totalShipments}</p>
            <p className="text-xs text-muted-foreground">Total Shipments</p>
          </div>
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
            <Package className="h-5 w-5 text-warning mb-2" />
            <p className="text-2xl font-display font-bold text-warning">{stats.readyForPickup}</p>
            <p className="text-xs text-muted-foreground">Ready for Pickup</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Truck className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-display font-bold text-primary">{stats.inTransit}</p>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </div>
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <DollarSign className="h-5 w-5 text-destructive mb-2" />
            <p className="text-2xl font-display font-bold text-destructive">{stats.codPending}</p>
            <p className="text-xs text-muted-foreground">COD Pending</p>
          </div>
          <div className="p-4 rounded-xl bg-success/5 border border-success/20">
            <DollarSign className="h-5 w-5 text-success mb-2" />
            <p className="text-2xl font-display font-bold text-success">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by tracking number, customer name, phone, or carrier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Truck className="h-4 w-4" />
              All ({filteredShipments.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-2">
              <Package className="h-4 w-4" />
              Ready ({getStatusShipments('Ready for Pickup').length})
            </TabsTrigger>
            <TabsTrigger value="transit" className="gap-2">
              <Truck className="h-4 w-4" />
              In Transit ({getStatusShipments('In Transit').length})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Delivered ({getStatusShipments('Delivered').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredShipments.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No shipments found</p>
              </div>
            ) : (
              filteredShipments.map((shipment) => (
                <AdminShipmentCard 
                  key={shipment.id} 
                  shipment={shipment} 
                  profile={shipment.profiles}
                  ordersCount={shipment.orders_count || 0}
                  packageCodes={shipment.package_codes || []}
                  onUpdate={fetchShipments} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="ready" className="space-y-4">
            {getStatusShipments('Ready for Pickup').length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No shipments ready for pickup</p>
              </div>
            ) : (
              getStatusShipments('Ready for Pickup').map((shipment) => (
                <AdminShipmentCard 
                  key={shipment.id} 
                  shipment={shipment} 
                  profile={shipment.profiles}
                  ordersCount={shipment.orders_count || 0}
                  packageCodes={shipment.package_codes || []}
                  onUpdate={fetchShipments} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="transit" className="space-y-4">
            {getStatusShipments('In Transit').length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No shipments in transit</p>
              </div>
            ) : (
              getStatusShipments('In Transit').map((shipment) => (
                <AdminShipmentCard 
                  key={shipment.id} 
                  shipment={shipment} 
                  profile={shipment.profiles}
                  ordersCount={shipment.orders_count || 0}
                  onUpdate={fetchShipments} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="delivered" className="space-y-4">
            {getStatusShipments('Delivered').length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-muted-foreground">No delivered shipments</p>
              </div>
            ) : (
              getStatusShipments('Delivered').map((shipment) => (
                <AdminShipmentCard 
                  key={shipment.id} 
                  shipment={shipment} 
                  profile={shipment.profiles}
                  ordersCount={shipment.orders_count || 0}
                  onUpdate={fetchShipments} 
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
