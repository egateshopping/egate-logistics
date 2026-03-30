import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Phone, MapPin, Save, Star, Package, Clock } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getTierBySpend, getNextTier, getProgressToNextTier, LOYALTY_TIERS } from '@/lib/loyalty';
import { MFASetup } from '@/components/profile/MFASetup';

export default function Profile() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const { t, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [totalSpend, setTotalSpend] = useState(0);
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0, delivered: 0 });
  const [formData, setFormData] = useState({
    full_name: '', phone: '', address: '', city: '', country: 'Iraq',
  });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: (profile as any).address || '',
        city: (profile as any).city || '',
        country: (profile as any).country || 'Iraq',
      });
    }
    if (user) fetchOrderStats();
  }, [user, profile, authLoading]);

  const fetchOrderStats = async () => {
    const { data } = await supabase.from('orders').select('status, total_amount').eq('user_id', user?.id);
    if (data) {
      const spent = data.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      setTotalSpend(spent);
      setOrderStats({
        total: data.length,
        active: data.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
        delivered: data.filter(o => o.status === 'delivered').length,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from('profiles').update(formData).eq('user_id', user?.id);
    setIsLoading(false);
    if (error) { toast.error('Failed to update profile'); return; }
    await refreshProfile();
    toast.success('Profile updated successfully');
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const isLoyal = (profile as any)?.is_loyal;
  const currentTier = getTierBySpend(totalSpend);
  const nextTier = getNextTier(currentTier.id);
  const progress = getProgressToNextTier(totalSpend, currentTier, nextTier);

  return (
    <Layout>
      <div className="container py-8 max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">{t('profileSettings')}</h1>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border mb-6">
          {/* رأس الملف الشخصي */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-semibold text-lg">{formData.full_name || 'Your Name'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile?.is_verified && (
                  <Badge className="bg-success/10 text-success border-success/30">✓ Verified</Badge>
                )}
                {isLoyal && (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <Star className="h-3 w-3 mr-1" />{t('loyalCustomer')}
                  </Badge>
                )}
                <Badge className={`${currentTier.bgColor} ${currentTier.color} border ${currentTier.borderColor}`}>
                  {currentTier.emoji} {currentTier.name}
                </Badge>
              </div>
            </div>
          </div>

          {/* إحصائيات الطلبات */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Package, value: orderStats.total, label: t('totalOrders'), color: 'text-muted-foreground', bg: 'bg-muted/30' },
              { icon: Clock, value: orderStats.active, label: t('active'), color: 'text-primary', bg: 'bg-primary/5' },
              { icon: Package, value: orderStats.delivered, label: t('delivered') || 'Delivered', color: 'text-success', bg: 'bg-success/5' },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className={`p-3 ${bg} rounded-xl text-center`}>
                <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* شريط تقدم الولاء */}
          <div className={`p-4 rounded-xl border mb-6 ${currentTier.bgColor} ${currentTier.borderColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentTier.emoji}</span>
                <span className="font-semibold text-sm">{currentTier.name}</span>
              </div>
              <span className="text-sm font-medium">${totalSpend.toLocaleString()} {t('spentThisYear')}</span>
            </div>

            {nextTier && (
              <>
                <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('progressTo')} {nextTier.emoji} {nextTier.name} —
                  ${(nextTier.minSpend - totalSpend).toLocaleString()} {t('toNextLevel')}
                </p>
              </>
            )}

            {currentTier.perks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/30">
                <p className="text-xs font-medium mb-1">{t('memberBenefits')}:</p>
                <ul className="space-y-0.5">
                  {currentTier.perks.map((perk, i) => (
                    <li key={i} className="text-xs text-muted-foreground">✓ {perk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* نظام الدفع */}
          <div className={`p-4 rounded-xl border mb-6 ${isLoyal ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isLoyal ? <Star className="h-4 w-4 text-yellow-600" /> : <Package className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium text-sm">
                {isLoyal ? t('payOnDelivery') : t('depositRequired')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoyal
                ? 'You can order without upfront payment. Full payment upon delivery.'
                : 'A deposit is required before your order is processed.'}
            </p>
          </div>

          {/* نموذج التعديل */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('fullName')}</Label>
                <Input id="full_name" value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone"><Phone className="h-4 w-4 inline mr-1" />{t('phone')}</Label>
                <Input id="phone" type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+964 xxx xxx xxxx" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address"><MapPin className="h-4 w-4 inline mr-1" />{t('address')}</Label>
              <Textarea id="address" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input id="city" value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Baghdad" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('country')}</Label>
                <Input id="country" value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Iraq" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="gradient-hero border-0">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />{t('saveChanges')}</>}
              </Button>
            </div>
          </form>
        </div>

        {/* قسم 2FA */}
        <MFASetup />

        {/* جميع مستويات الولاء */}
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h3 className="font-semibold mb-4">🏅 Loyalty Program</h3>
          <div className="space-y-3">
            {LOYALTY_TIERS.map((tier) => (
              <div key={tier.id} className={`p-3 rounded-xl border flex items-center justify-between
                ${tier.id === currentTier.id ? `${tier.bgColor} ${tier.borderColor}` : 'bg-muted/20 border-border opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tier.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.minSpend === 0 ? 'Starting level' :
                        `$${tier.minSpend.toLocaleString()}/${tier.period === 'year' ? 'year' : '6 months'}`}
                    </p>
                  </div>
                </div>
                {tier.id === currentTier.id && (
                  <Badge className={`${tier.bgColor} ${tier.color} border ${tier.borderColor} text-xs`}>Current</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
