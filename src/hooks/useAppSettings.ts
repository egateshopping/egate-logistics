import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AppSettings {
  usdToIqd: number;
  shippingRatePerLb: number;
  minShipping: number;
  customsRate: number;
  serviceFee: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  usdToIqd: 1500,
  shippingRatePerLb: 10,
  minShipping: 8,
  customsRate: 10,
  serviceFee: 2,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('key, value');
    if (data) {
      const s = { ...DEFAULT_SETTINGS };
      data.forEach(({ key, value }) => {
        const num = parseFloat(value);
        if (key === 'usd_to_iqd') s.usdToIqd = num;
        if (key === 'shipping_rate_per_lb') s.shippingRatePerLb = num;
        if (key === 'min_shipping') s.minShipping = num;
        if (key === 'customs_rate') s.customsRate = num;
        if (key === 'service_fee') s.serviceFee = num;
      });
      setSettings(s);
    }
    setIsLoading(false);
  };

  const formatIqd = (usd: number) =>
    Math.round(usd * settings.usdToIqd).toLocaleString() + ' IQD';

  const calcPricing = (productPrice: number, weightLbs: number) => {
    const shipping = weightLbs < 0.5
      ? settings.minShipping
      : parseFloat((weightLbs * settings.shippingRatePerLb).toFixed(2));
    const customs = parseFloat((productPrice * (settings.customsRate / 100)).toFixed(2));
    const total = parseFloat((productPrice + shipping + customs + settings.serviceFee).toFixed(2));
    return { shipping, customs, serviceFee: settings.serviceFee, total };
  };

  return { settings, isLoading, formatIqd, calcPricing };
}
