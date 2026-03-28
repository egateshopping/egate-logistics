import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Save, Loader2, Settings, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usdToIqd, setUsdToIqd] = useState('1500');
  const [shippingRate, setShippingRate] = useState('10');
  const [minShipping, setMinShipping] = useState('8');
  const [customsRate, setCustomsRate] = useState('10');
  const [serviceFee, setServiceFee] = useState('2');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) { navigate('/'); return; }
    if (isAdmin) fetchSettings();
  }, [user, isAdmin, authLoading]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value');
    if (data) {
      data.forEach(({ key, value }) => {
        if (key === 'usd_to_iqd') setUsdToIqd(value);
        if (key === 'shipping_rate_per_lb') setShippingRate(value);
        if (key === 'min_shipping') setMinShipping(value);
        if (key === 'customs_rate') setCustomsRate(value);
        if (key === 'service_fee') setServiceFee(value);
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const settings = [
      { key: 'usd_to_iqd', value: usdToIqd },
      { key: 'shipping_rate_per_lb', value: shippingRate },
      { key: 'min_shipping', value: minShipping },
      { key: 'customs_rate', value: customsRate },
      { key: 'service_fee', value: serviceFee },
    ];

    const { error } = await supabase
      .from('app_settings')
      .upsert(settings, { onConflict: 'key' });

    setIsSaving(false);
    if (error) { toast.error('Failed to save settings'); return; }
    toast.success('✅ Settings saved successfully');
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

  const previewTotal = (productPrice: number) => {
    const ship = Math.max(Number(minShipping), productPrice > 0 ? Number(shippingRate) * 2 : 0);
    const customs = productPrice * (Number(customsRate) / 100);
    const total = productPrice + ship + customs + Number(serviceFee);
    const iqd = total * Number(usdToIqd);
    return { total: total.toFixed(2), iqd: iqd.toLocaleString() };
  };

  const preview = previewTotal(100);

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Pricing Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Control exchange rate and shipping fees</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* سعر الصرف */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Exchange Rate</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usd_iqd">1 USD = ? Iraqi Dinar (IQD)</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="usd_iqd"
                  type="number"
                  value={usdToIqd}
                  onChange={(e) => setUsdToIqd(e.target.value)}
                  className="text-lg font-bold max-w-[200px]"
                />
                <span className="text-muted-foreground text-sm">IQD per $1</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current rate: $1 = {Number(usdToIqd).toLocaleString()} IQD
              </p>
            </div>
          </div>

          {/* أسعار الشحن */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h2 className="font-semibold">Shipping & Fees</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Shipping Rate ($ per lb)</Label>
                <Input type="number" step="0.5" value={shippingRate}
                  onChange={(e) => setShippingRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Minimum Shipping ($)</Label>
                <Input type="number" step="0.5" value={minShipping}
                  onChange={(e) => setMinShipping(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Customs Rate (%)</Label>
                <Input type="number" step="1" value={customsRate}
                  onChange={(e) => setCustomsRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Service Fee ($)</Label>
                <Input type="number" step="0.5" value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)} />
              </div>
            </div>
          </div>

          {/* معاينة المعادلة */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Live Preview — Product $100, 2 lbs</span>
            </div>
            <div className="space-y-1.5 text-sm">
              {[
                ['🛒 Product Price', '$100.00'],
                [`✈️ Shipping (2 lbs × $${shippingRate})`, `$${(2 * Number(shippingRate)).toFixed(2)}`],
                [`🏛️ Customs (${customsRate}%)`, `$${(100 * Number(customsRate) / 100).toFixed(2)}`],
                [`⚙️ Service Fee`, `$${Number(serviceFee).toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <div className="text-right">
                  <p className="text-primary">${preview.total}</p>
                  <p className="text-xs text-muted-foreground font-normal">{preview.iqd} IQD</p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full gradient-hero border-0" size="lg">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Settings</>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
