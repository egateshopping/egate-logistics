import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, Mail, Calendar, Package, 
  DollarSign, Loader2
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getStatusLabel, getStatusColor } from '@/lib/supabase';
import type { Order, Profile } from '@/lib/supabase';
import { format } from 'date-fns';

export default function CustomerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (isAdmin && userId) {
      fetchCustomerData();
    }
  }, [user, isAdmin, authLoading, userId]);

  const fetchCustomerData = async () => {
    if (!userId) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch orders - sorted by newest first
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData as unknown as Order[]);
    }

    setIsLoading(false);
  };

  const totalSpent = orders
    .filter(o => o.is_paid)
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-8">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Customer not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        {/* User Info Header */}
        <div className="p-6 rounded-2xl bg-card border border-border mb-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-display font-bold">{profile.full_name || 'Unknown'}</h1>
                {profile.is_verified ? (
                  <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning/50">Unverified</Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </span>
                )}
                {profile.city && (
                  <span className="flex items-center gap-1">
                    📍 {profile.city}, {profile.country || 'Iraq'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              {profile.address && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong>Address:</strong> {profile.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
            <Package className="h-5 w-5 text-primary mb-2" />
            <p className="text-3xl font-display font-bold text-primary">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
          <div className="p-5 rounded-xl bg-success/5 border border-success/20">
            <DollarSign className="h-5 w-5 text-success mb-2" />
            <p className="text-3xl font-display font-bold text-success">${totalSpent.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </div>
        </div>

        {/* Order History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Order History</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                      {order.product_image ? (
                        <img
                          src={order.product_image}
                          alt={order.product_title || 'Product'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-medium text-sm">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.product_title || 'Product Order'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Qty: {order.quantity}</span>
                          {order.color && <span>Color: {order.color}</span>}
                          {order.size && <span>Size: {order.size}</span>}
                        </div>
                        <div className="text-right">
                          {order.total_amount ? (
                            <p className="font-semibold text-primary">${Number(order.total_amount).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Pending quote</p>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
