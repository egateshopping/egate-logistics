import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, Package, DollarSign, Loader2, MapPin, Star, MessageCircle, Copy } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getStatusLabel, getStatusColor } from '@/lib/supabase';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { Order, Profile } from '@/lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CustomerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useAppSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) { navigate('/'); return; }
    if (isAdmin && userId) fetchCustomerData();
  }, [user, isAdmin, authLoading, userId]);

  const fetchCustomerData = async () => {
    if (!userId) return;
    const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (profileData) setProfile(profileData);
    const { data: ordersData } = await supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (ordersData) setOrders(ordersData as unknown as Order[]);
    setIsLoading(false);
  };

  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const isLoyal = (profile as any)?.is_loyal;

  const openWhatsApp = () => {
    if (!profile?.phone) { toast.error('No phone number'); return; }
    const phone = profile.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const copyPhone = () => {
    if (!profile?.phone) return;
    navigator.clipboard.writeText(profile.phone);
    toast.success('Phone copied!');
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Customer not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Admin
        </Button>

        {/* بيانات العميل الكاملة — #13 */}
        <div className="p-6 rounded-2xl bg-card border border-border mb-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-2xl font-display font-bold">{profile.full_name || 'Unknown'}</h1>
                {profile.is_verified
                  ? <Badge className="bg-success/10 text-success border-success/20">✓ Verified</Badge>
                  : <Badge variant="outline" className="text-warning border-warning/50">Unverified</Badge>}
                {isLoyal && (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <Star className="h-3 w-3 mr-1" />Loyal Customer
                  </Badge>
                )}
              </div>

              {/* بيانات التواصل */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.phone && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Phone className="h-4 w-4 text-success shrink-0" />
                    <span className="text-sm font-medium flex-1">{profile.phone}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={openWhatsApp} title="Open WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyPhone} title="Copy">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {(profile as any).address && (
                  <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm min-w-0">
                      <p className="font-medium truncate">{(profile as any).address}</p>
                      {(profile as any).city && (
                        <p className="text-muted-foreground">{(profile as any).city}, {(profile as any).country || 'Iraq'}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}
                  </span>
                </div>

                {(profile as any).customer_notes && (
                  <div className="flex items-start gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg sm:col-span-2">
                    <span className="text-sm text-warning">📝 {(profile as any).customer_notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <Package className="h-5 w-5 text-primary mb-2 mx-auto" />
            <p className="text-3xl font-display font-bold text-primary">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
          <div className="p-5 rounded-xl bg-warning/5 border border-warning/20 text-center">
            <Package className="h-5 w-5 text-warning mb-2 mx-auto" />
            <p className="text-3xl font-display font-bold text-warning">{activeOrders}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="p-5 rounded-xl bg-success/5 border border-success/20 text-center">
            <DollarSign className="h-5 w-5 text-success mb-2 mx-auto" />
            <div>
              <p className="text-2xl font-display font-bold text-success">${totalSpent.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(totalSpent * settings.usdToIqd).toLocaleString()} IQD
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </div>
        </div>

        {/* سجل الطلبات */}
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
                <div key={order.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/order/${order.id}`)}>
                  <div className="flex gap-4">
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                      {order.product_image
                        ? <img src={order.product_image} alt="" className="h-full w-full object-cover" />
                        : <Package className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {order.product_title || 'Product Order'}
                          </p>
                        </div>
                        <Badge className={`shrink-0 text-xs ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Qty: {order.quantity}</span>
                          {order.color && <span>Color: {order.color}</span>}
                          {order.size && <span>Size: {order.size}</span>}
                          <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="text-right">
                          {order.total_amount ? (
                            <>
                              <p className="font-semibold text-primary">${Number(order.total_amount).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                {Math.round(Number(order.total_amount) * settings.usdToIqd).toLocaleString()} IQD
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">Pending quote</p>
                          )}
                        </div>
                      </div>
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
