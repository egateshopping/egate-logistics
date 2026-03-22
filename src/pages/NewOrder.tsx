import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Package,
  Loader2,
  ArrowLeft,
  Tag,
  Plus,
  Minus,
  ExternalLink,
  ImageIcon,
  Scale,
  Calculator,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── أسعار الشحن ──────────────────────────────────────────────
const SHIPPING_RATE_PER_LB = 6.5;
const MIN_SHIPPING = 40;
const CUSTOMS_RATE = 0.05;
const SERVICE_FEE_RATE = 0.12;
const UAE_VAT = 0.05;
const USD_TO_AED = 3.67;

function calcVolumetric(l: number, w: number, h: number) {
  return parseFloat(((l * w * h) / 139).toFixed(2));
}

function calcShippingCost(chargeableWeight: number) {
  return parseFloat(Math.max(chargeableWeight * SHIPPING_RATE_PER_LB, MIN_SHIPPING).toFixed(2));
}

interface PriceBreakdown {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  shippingCost: number;
  customsDuty: number;
  vat: number;
  serviceFee: number;
  totalUSD: number;
  totalAED: number;
  source: "cache" | "scraped" | "category_default";
  category: string;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const initialUrl = (location.state as { productUrl?: string })?.productUrl || "";

  const [formData, setFormData] = useState({
    product_url: initialUrl,
    product_title: "",
    product_image: "",
    color: "",
    size: "",
    quantity: 1,
    special_notes: "",
    promo_code: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [pricing, setPricing] = useState<PriceBreakdown | null>(null);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUrl = useRef<string>("");

  // ── 1. جلب بيانات المنتج ───────────────────────────────────
  const fetchMetadata = async (url: string) => {
    if (!url || url === lastFetchedUrl.current) return;
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return;
    }

    setIsFetchingMeta(true);
    lastFetchedUrl.current = url;

    try {
      const { data, error } = await supabase.functions.invoke("fetch-metadata", { body: { url } });
      if (!error && (data?.image || data?.title)) {
        setFormData((prev) => ({
          ...prev,
          product_image: data.image || prev.product_image,
          product_title: data.title && !prev.product_title ? data.title : prev.product_title,
        }));
        setMetaFetched(true);
      }
    } catch (err) {
      console.error("Metadata fetch failed:", err);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // ── 2. حساب السعر التلقائي ────────────────────────────────
  const calculatePricing = async (url: string, productName: string) => {
    if (!url) return;
    setIsCalculating(true);
    setPricing(null);

    try {
      // أولاً: هل الرابط موجود في الذاكرة؟
      const { data: cached } = await supabase.from("product_cache").select("*").eq("url", url).single();

      if (cached && cached.weight_lbs) {
        const vol = calcVolumetric(cached.length_in || 0, cached.width_in || 0, cached.height_in || 0);
        const chargeable = Math.max(cached.weight_lbs, vol);
        const shipping = calcShippingCost(chargeable);
        const cif = shipping;
        const duty = parseFloat((cif * CUSTOMS_RATE).toFixed(2));
        const vat = parseFloat(((cif + duty) * UAE_VAT).toFixed(2));
        const serviceFee = parseFloat((shipping * SERVICE_FEE_RATE).toFixed(2));
        const totalUSD = parseFloat((shipping + duty + vat + serviceFee).toFixed(2));

        setPricing({
          actualWeight: cached.weight_lbs,
          volumetricWeight: vol,
          chargeableWeight: chargeable,
          shippingCost: shipping,
          customsDuty: duty,
          vat,
          serviceFee,
          totalUSD,
          totalAED: parseFloat((totalUSD * USD_TO_AED).toFixed(2)),
          source: "cache",
          category: "other",
        });
        toast.success("✅ السعر محسوب من ذاكرة المنتجات");
        return;
      }

      // ثانياً: استخراج الوزن والأبعاد عبر الذكاء الاصطناعي
      const { data: aiData } = await supabase.functions.invoke("extract-product-weight", {
        body: { url, productName },
      });

      let weight = aiData?.weightLbs;
      let length = aiData?.lengthInch;
      let width = aiData?.widthInch;
      let height = aiData?.heightInch;
      let category = aiData?.category || "other";
      let source: "scraped" | "category_default" = "scraped";

      // ثالثاً: إذا لم يجد → استخدم الجدول الافتراضي حسب الفئة
      if (!weight) {
        const { data: categoryData } = await supabase
          .from("shipping_weight_rules")
          .select("*")
          .ilike("keyword", `%${category}%`)
          .single();

        if (categoryData) {
          weight = categoryData.weight;
          length = categoryData.default_length;
          width = categoryData.default_width;
          height = categoryData.default_height;
          source = "category_default";
        } else {
          weight = 2.0;
          length = 12;
          width = 10;
          height = 6;
          source = "category_default";
        }
      }

      // حفظ في الذاكرة للمرة القادمة
      await supabase.from("product_cache").upsert(
        {
          url,
          image_url: null,
          weight_lbs: weight,
          length_in: length || null,
          width_in: width || null,
          height_in: height || null,
        },
        { onConflict: "url" },
      );

      const vol = calcVolumetric(length || 0, width || 0, height || 0);
      const chargeable = Math.max(weight, vol);
      const shipping = calcShippingCost(chargeable);
      const cif = shipping;
      const duty = parseFloat((cif * CUSTOMS_RATE).toFixed(2));
      const vat = parseFloat(((cif + duty) * UAE_VAT).toFixed(2));
      const serviceFee = parseFloat((shipping * SERVICE_FEE_RATE).toFixed(2));
      const totalUSD = parseFloat((shipping + duty + vat + serviceFee).toFixed(2));

      setPricing({
        actualWeight: weight,
        volumetricWeight: vol,
        chargeableWeight: chargeable,
        shippingCost: shipping,
        customsDuty: duty,
        vat,
        serviceFee,
        totalUSD,
        totalAED: parseFloat((totalUSD * USD_TO_AED).toFixed(2)),
        source,
        category,
      });

      toast.success(source === "scraped" ? "✅ تم استخراج الوزن من صفحة المنتج" : "✅ تم احتساب السعر حسب الفئة");
    } catch (err) {
      console.error("Pricing calculation failed:", err);
      toast.error("تعذّر حساب السعر، يرجى المحاولة مرة أخرى");
    } finally {
      setIsCalculating(false);
    }
  };

  // ── معالجة تغيير الرابط ───────────────────────────────────
  const handleUrlChange = (value: string) => {
    setFormData({ ...formData, product_url: value });
    setMetaFetched(false);
    setPricing(null);
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    if (value.length > 10) {
      fetchTimeoutRef.current = setTimeout(() => fetchMetadata(value), 800);
    }
  };

  const handleUrlBlur = () => {
    if (formData.product_url && !metaFetched) fetchMetadata(formData.product_url);
  };

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialUrl && !metaFetched) fetchMetadata(initialUrl);
  }, [initialUrl]);

  // ── تطبيق الكود الترويجي ──────────────────────────────────
  const handleApplyPromo = async () => {
    if (!formData.promo_code.trim()) return;
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", formData.promo_code.toUpperCase())
      .eq("is_active", true)
      .single();
    if (!promo) {
      toast.error("Invalid promo code");
      return;
    }
    setPromoApplied(true);
    setPromoDiscount(promo.discount_value);
    toast.success(
      `Promo applied! ${promo.discount_type === "percentage" ? promo.discount_value + "%" : "$" + promo.discount_value} off`,
    );
  };

  // ── إرسال الطلب ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_url) {
      toast.error("Please enter a product URL");
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase.from("orders").insert({
      user_id: user?.id,
      product_url: formData.product_url,
      product_name: formData.product_title || "Product Order",
      product_image: formData.product_image || null,
      color: formData.color || null,
      size: formData.size || null,
      quantity: formData.quantity,
      special_notes: formData.special_notes || null,
      actual_weight: pricing?.actualWeight || null,
      length: null,
      width: null,
      height: null,
      volumetric_weight: pricing?.volumetricWeight || null,
      chargeable_weight: pricing?.chargeableWeight || null,
      shipping_cost: pricing?.shippingCost || null,
      discount: promoDiscount,
      status: "Pending",
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("Failed to create order");
      return;
    }
    toast.success("Order submitted successfully!");
    navigate("/dashboard");
  };

  const sourceLabel = {
    cache: "⚡ من الذاكرة — محسوب فورياً",
    scraped: "🔍 مستخرج من صفحة المنتج",
    category_default: "📦 مبني على متوسط الفئة",
  };

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">New Order</h1>
          <p className="text-muted-foreground mt-1">Enter product details to place your order</p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product URL */}
            <div className="space-y-2">
              <Label htmlFor="product_url">Product URL *</Label>
              <div className="relative">
                <Input
                  id="product_url"
                  type="url"
                  value={formData.product_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://amazon.com/product/..."
                  required
                  className={isFetchingMeta ? "pr-10" : ""}
                />
                {isFetchingMeta && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Preview */}
            {(formData.product_image || formData.product_title || isFetchingMeta) && (
              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                {isFetchingMeta ? (
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 p-4">
                    <div className="h-24 w-24 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                      {formData.product_image ? (
                        <img
                          src={formData.product_image}
                          alt="Product preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{formData.product_title || "Product preview"}</p>
                      <a
                        href={formData.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View original link
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* زر احتساب السعر */}
            {metaFetched && !pricing && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => calculatePricing(formData.product_url, formData.product_title)}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري احتساب سعر الشحن...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    احتسب سعر الشحن تلقائياً
                  </>
                )}
              </Button>
            )}

            {/* بطاقة السعر */}
            {pricing && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
                <div className="p-4 border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">تفصيل سعر الشحن</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{sourceLabel[pricing.source]}</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {/* الأوزان */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      ["الوزن الفعلي", `${pricing.actualWeight} lbs`],
                      ["الوزن الحجمي", `${pricing.volumetricWeight} lbs`],
                      ["⚡ الوزن المحاسب", `${pricing.chargeableWeight} lbs`],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-background rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-bold text-sm mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* التفاصيل المالية */}
                  {[
                    ["✈️ الشحن الدولي", `$${pricing.shippingCost}`],
                    ["🏛️ الجمارك (5%)", `$${pricing.customsDuty}`],
                    ["📋 ضريبة القيمة المضافة (5%)", `$${pricing.vat}`],
                    ["⚙️ رسوم الخدمة (12%)", `$${pricing.serviceFee}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm py-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-primary/20 pt-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">الإجمالي النهائي</span>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">${pricing.totalUSD}</p>
                        <p className="text-xs text-muted-foreground">AED {pricing.totalAED}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Title */}
            <div className="space-y-2">
              <Label htmlFor="product_title">Product Name (optional)</Label>
              <Input
                id="product_title"
                value={formData.product_title}
                onChange={(e) => setFormData({ ...formData, product_title: e.target.value })}
                placeholder="e.g., Nike Air Max 90"
              />
            </div>

            {/* Color & Size */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g., US 10"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{formData.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <Label htmlFor="special_notes">Special Notes</Label>
              <Textarea
                id="special_notes"
                value={formData.special_notes}
                onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                placeholder="Any special requests or instructions..."
                rows={3}
              />
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label htmlFor="promo_code">
                <Tag className="h-4 w-4 inline mr-1" />
                Promo Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="promo_code"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., IRAQ2026"
                  disabled={promoApplied}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoApplied || !formData.promo_code}
                >
                  {promoApplied ? "Applied" : "Apply"}
                </Button>
              </div>
              {promoApplied && <p className="text-sm text-success">✓ Discount will be applied</p>}
            </div>

            {/* Submit */}
            <Button type="submit" disabled={isSubmitting} className="w-full gradient-hero border-0" size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Package className="h-5 w-5 mr-2" />
                  Submit Order Request
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Final price includes shipping, customs, and service fees.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
