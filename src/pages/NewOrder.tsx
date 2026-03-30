import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, Loader2, ArrowLeft, Tag, Plus, Minus, ExternalLink, ImageIcon, Info, Camera, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

// ── فئات المنتجات والأوزان التقديرية ──────────────────────
const CATEGORIES = [
  { value: "shoes", label: "👟 Shoes / Boots", weight: 2.5 },
  { value: "clothing", label: "👕 Clothing / Apparel", weight: 1.0 },
  { value: "electronics", label: "📱 Electronics", weight: 3.0 },
  { value: "supplements", label: "💪 Supplements / Vitamins", weight: 2.0 },
  { value: "cosmetics", label: "💄 Cosmetics / Beauty", weight: 1.0 },
  { value: "fragrance", label: "🌸 Fragrance / Perfume", weight: 1.5 },
  { value: "bags", label: "👜 Bags / Accessories", weight: 2.0 },
  { value: "watches", label: "⌚ Watches / Jewelry", weight: 1.0 },
  { value: "sports", label: "🏋️ Sports / Fitness", weight: 3.0 },
  { value: "baby_clothing", label: "👶 Baby & Kids", weight: 0.5 },
  { value: "car_parts", label: "🚗 Car Parts", weight: 5.0 },
  { value: "home", label: "🏠 Home & Kitchen", weight: 4.0 },
  { value: "other", label: "📦 Other", weight: 2.0 },
];

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { settings, formatIqd } = useAppSettings();
  const initialUrl = (location.state as { productUrl?: string })?.productUrl || "";

  const [formData, setFormData] = useState({
    product_url: initialUrl,
    product_title: "",
    product_image: "",
    category: "",
    color: "",
    size: "",
    quantity: 1,
    special_notes: "",
    promo_code: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUrl = useRef<string>("");

  // ── جلب صورة وعنوان المنتج فقط ────────────────────────────
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
          product_title: data.title || prev.product_title,
        }));
        setMetaFetched(true);
      }
    } catch (err) {
      console.error("Metadata fetch failed:", err);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setFormData({ ...formData, product_url: value });
    setMetaFetched(false);
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
    toast.success(`Promo applied! $${promo.discount_value} off`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_url) {
      toast.error("Please enter a product URL");
      return;
    }
    setIsSubmitting(true);

    const selectedCategory = CATEGORIES.find((c) => c.value === formData.category);

    const { error } = await supabase.from("orders").insert({
      user_id: user?.id,
      product_url: formData.product_url,
      product_title: formData.product_title || "Product Order",
      product_image: formData.product_image || null,
      color: formData.color || null,
      size: formData.size || null,
      quantity: formData.quantity,
      special_notes: formData.special_notes
        ? `[Category: ${selectedCategory?.label || formData.category}] ${formData.special_notes}`
        : `[Category: ${selectedCategory?.label || "Not specified"}]`,
      discount: promoDiscount,
      status: "pending_payment",
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("Failed to create order");
      return;
    }
    toast.success("✅ Order submitted! We'll contact you with the final price.");
    navigate("/dashboard");
  };

  const selectedCat = CATEGORIES.find((c) => c.value === formData.category);

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

            {/* إشعار للعميل */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">How it works</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit your order and our team will contact you with the final price within 24 hours. Price includes
                  shipping + customs (10%) + $2 service fee.
                </p>
              </div>
            </div>

            {/* فئة المنتج */}
            <div className="space-y-2">
              <Label htmlFor="category">Product Category *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {selectedCat && (
                <p className="text-xs text-muted-foreground">
                  📦 Estimated weight: ~{selectedCat.weight} lbs (final weight confirmed by our team)
                </p>
              )}
            </div>

            {/* Product Title */}
            <div className="space-y-2">
              <Label htmlFor="product_title">Product Name</Label>
              <Input
                id="product_title"
                value={formData.product_title}
                onChange={(e) => setFormData({ ...formData, product_title: e.target.value })}
                placeholder="e.g., Nike Air Max 90 - Size 10"
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
                  placeholder="e.g., US 10 / XL"
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
                placeholder="Any special requests, specific variant, or instructions..."
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
                  {promoApplied ? "Applied ✓" : "Apply"}
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
              Our team will review your order and send you the final price within 24 hours.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
