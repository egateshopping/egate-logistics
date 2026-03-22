import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  MessageCircle,
  User,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Wand2,
  Loader2,
  Zap,
  Truck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Order, OrderStatus, Profile } from "@/lib/supabase";
import { getStatusLabel } from "@/lib/supabase";

interface AdminOrderCardProps {
  order: Order;
  profile?: Profile;
  onUpdate: () => void;
}

const orderStatuses: OrderStatus[] = [
  "pending_payment",
  "payment_received",
  "purchasing",
  "purchased",
  "domestic_shipping",
  "at_warehouse",
  "international_shipping",
  "customs",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// شركات الشحن الداخلية في أمريكا
const DOMESTIC_CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "OnTrac", "Royal Mail", "Aramex", "Other"];

// شركات الشحن الدولي
const INTERNATIONAL_CARRIERS = ["DHL", "FedEx", "Aramex", "UPS", "Other"];

const SHIPPING_RATE = 10; // $10 per lb
const MIN_SHIPPING = 8; // $8 minimum
const CUSTOMS_RATE = 0.1; // 10% of product price
const SERVICE_FEE = 2; // $2 fixed
const USD_TO_AED = 3.67;

export function AdminOrderCard({ order, profile, onUpdate }: AdminOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  // Pricing state
  const [pricing, setPricing] = useState({
    base_item_cost: Number(order.base_item_cost) || 0,
    international_shipping: Number(order.international_shipping) || 0,
    customs: Number(order.customs) || 0,
    weight_lbs: Number(order.weight_lbs) || 0,
    length_in: Number(order.length_in) || 0,
    width_in: Number(order.width_in) || 0,
    height_in: Number(order.height_in) || 0,
  });
  const [productImageUrl, setProductImageUrl] = useState(order.product_image || "");

  // Tracking state
  const [domesticTracking, setDomesticTracking] = useState((order as any).domestic_tracking || "");
  const [domesticCarrier, setDomesticCarrier] = useState((order as any).domestic_carrier || "");
  const [internationalTracking, setInternationalTracking] = useState((order as any).international_tracking || "");
  const [internationalCarrier, setInternationalCarrier] = useState((order as any).international_carrier || "");
  const [eta, setEta] = useState(order.eta || "");

  // حساب المعادلة الصحيحة
  const calcPricing = () => {
    const vol = (pricing.length_in * pricing.width_in * pricing.height_in) / 139;
    const chargeable = Math.max(pricing.weight_lbs, vol);
    const shipping = chargeable < 0.5 ? MIN_SHIPPING : parseFloat((chargeable * SHIPPING_RATE).toFixed(2));
    const customs = parseFloat((pricing.base_item_cost * CUSTOMS_RATE).toFixed(2));
    const total = pricing.base_item_cost + shipping + customs + SERVICE_FEE;
    return {
      shipping: parseFloat(shipping.toFixed(2)),
      customs: parseFloat(customs.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      totalAED: parseFloat((total * USD_TO_AED).toFixed(2)),
      chargeable: parseFloat(chargeable.toFixed(2)),
    };
  };

  // تحديث الشحن تلقائياً عند تغيير الوزن
  useEffect(() => {
    const { shipping, customs } = calcPricing();
    setPricing((prev) => ({ ...prev, international_shipping: shipping, customs }));
  }, [pricing.weight_lbs, pricing.length_in, pricing.width_in, pricing.height_in, pricing.base_item_cost]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success("Status updated");
    onUpdate();
  };

  // جلب الصورة تلقائياً
  const handleAutoFetch = async () => {
    if (!order.product_url) {
      toast.error("No product URL");
      return;
    }
    setIsFetchingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-metadata", {
        body: { url: order.product_url },
      });
      if (!error && data?.image) {
        setProductImageUrl(data.image);
        toast.success("✅ Image fetched");
      }
      if (!error && data?.suggested_price && !pricing.base_item_cost) {
        setPricing((prev) => ({ ...prev, base_item_cost: data.suggested_price }));
      }
    } catch (err) {
      toast.error("Failed to fetch");
    } finally {
      setIsFetchingImage(false);
    }
  };

  // حفظ التسعير
  const handleSavePricing = async () => {
    setIsSaving(true);
    const { shipping, customs, total, chargeable } = calcPricing();

    const { error } = await supabase
      .from("orders")
      .update({
        base_item_cost: pricing.base_item_cost,
        international_shipping: shipping,
        customs,
        weight_lbs: pricing.weight_lbs,
        length_in: pricing.length_in,
        width_in: pricing.width_in,
        height_in: pricing.height_in,
        chargeable_weight: chargeable,
        total_amount: total,
        product_image: productImageUrl || null,
        status: "pending_payment",
      })
      .eq("id", order.id);

    setIsSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("✅ Pricing saved — Order set to Pending Payment");
    setIsPricingDialogOpen(false);
    onUpdate();
  };

  // حفظ أرقام التتبع
  const handleSaveTracking = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        domestic_tracking: domesticTracking || null,
        domestic_carrier: domesticCarrier || null,
        international_tracking: internationalTracking || null,
        international_carrier: internationalCarrier || null,
        eta: eta || null,
      } as any)
      .eq("id", order.id);

    setIsSaving(false);
    if (error) {
      toast.error("Failed to save tracking");
      return;
    }
    toast.success("✅ Tracking numbers saved");
    setIsTrackingDialogOpen(false);
    onUpdate();
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const msg = encodeURIComponent(
      `Hi ${profile.full_name},\n\nUpdate on your order #${order.id.slice(0, 8).toUpperCase()}:\nStatus: ${getStatusLabel(order.status)}\n\nThank you for choosing Egate Shopping!`,
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  const { shipping, customs, total, totalAED, chargeable } = calcPricing();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-4 rounded-2xl bg-card border border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* صورة المنتج */}
          <div className="h-16 w-16 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
            {order.product_image ? (
              <img
                src={order.product_image}
                alt={order.product_title || "Product"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground truncate max-w-xs">
                  {order.product_title || order.product_url}
                </p>
              </div>
              <Select value={order.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* معلومات العميل */}
            {profile && (
              <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                <Link
                  to={`/admin/customer/${order.user_id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <User className="h-3 w-3" />
                  <strong>{profile.full_name}</strong>
                </Link>
                {profile.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-success hover:text-success"
                    onClick={openWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {profile.phone}
                  </Button>
                )}
                {!profile.is_verified && (
                  <Badge variant="outline" className="text-warning border-warning/50">
                    Unverified
                  </Badge>
                )}
              </div>
            )}

            {/* تفاصيل الطلب */}
            <div className="flex flex-wrap gap-3 p-2 bg-muted/50 rounded-lg text-sm mb-3">
              {order.color && (
                <span>
                  <strong className="text-primary">Color:</strong> {order.color}
                </span>
              )}
              {order.size && (
                <span>
                  <strong className="text-primary">Size:</strong> {order.size}
                </span>
              )}
              <span>
                Qty: <strong>{order.quantity}</strong>
              </span>
              {order.special_notes && (
                <span className="text-warning">
                  <strong>Notes:</strong> {order.special_notes}
                </span>
              )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* زر التسعير */}
              <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-accent border-0">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Set Price
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Set Order Price</DialogTitle>
                    <DialogDescription>Order #{order.id.slice(0, 8).toUpperCase()}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* رابط المنتج + Auto Fetch */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 justify-start gap-2 text-primary"
                        onClick={() => window.open(order.product_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Product Link
                      </Button>
                      <Button variant="outline" onClick={handleAutoFetch} disabled={isFetchingImage}>
                        {isFetchingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Auto
                      </Button>
                    </div>

                    {/* الصورة */}
                    <div className="space-y-2">
                      <Label>Product Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={productImageUrl}
                          onChange={(e) => setProductImageUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                        />
                        <div className="h-12 w-12 shrink-0 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                          {productImageUrl ? (
                            <img
                              src={productImageUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* سعر المنتج */}
                    <div className="space-y-1">
                      <Label>Product Price (Amazon/eBay) $</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricing.base_item_cost}
                        onChange={(e) =>
                          setPricing((prev) => ({ ...prev, base_item_cost: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="0.00"
                      />
                    </div>

                    {/* الوزن والأبعاد */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <Label className="text-sm font-medium">⚖️ Weight & Dimensions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Weight (lbs)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={pricing.weight_lbs || ""}
                            onChange={(e) =>
                              setPricing((prev) => ({ ...prev, weight_lbs: parseFloat(e.target.value) || 0 }))
                            }
                            placeholder="0.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Chargeable</Label>
                          <div className="h-9 flex items-center px-3 bg-primary/10 rounded-md border border-primary/20">
                            <span className="font-bold text-primary text-sm">{chargeable} lbs</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {["length_in", "width_in", "height_in"].map((dim, i) => (
                          <div key={dim} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{["L", "W", "H"][i]} (in)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={(pricing as any)[dim] || ""}
                              onChange={(e) =>
                                setPricing((prev) => ({ ...prev, [dim]: parseFloat(e.target.value) || 0 }))
                              }
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ملخص السعر */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <Label className="text-sm font-medium">💰 Price Breakdown</Label>
                      {[
                        ["🛒 Product Price", `$${pricing.base_item_cost.toFixed(2)}`],
                        [`✈️ Shipping (${chargeable} lbs × $10)`, `$${shipping}`],
                        ["🏛️ Customs (10%)", `$${customs}`],
                        ["⚙️ Service Fee", `$${SERVICE_FEE}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">${total}</p>
                          <p className="text-xs text-muted-foreground">AED {totalAED}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSavePricing} disabled={isSaving} className="gradient-accent border-0">
                      {isSaving ? "Saving..." : "Save & Set Pending"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* زر أرقام التتبع */}
              <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Truck className="h-4 w-4 mr-1" />
                    Tracking
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Tracking Numbers</DialogTitle>
                    <DialogDescription>Order #{order.id.slice(0, 8).toUpperCase()}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 py-4">
                    {/* رقم التتبع الداخلي */}
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <Label className="font-medium">📦 Domestic Tracking</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">From seller → Oregon Warehouse</p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Carrier</Label>
                        <Select value={domesticCarrier} onValueChange={setDomesticCarrier}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select carrier..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DOMESTIC_CARRIERS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tracking Number</Label>
                        <Input
                          value={domesticTracking}
                          onChange={(e) => setDomesticTracking(e.target.value)}
                          placeholder="e.g., 1Z999AA10123456784"
                        />
                      </div>
                    </div>

                    {/* رقم التتبع الدولي */}
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <Label className="font-medium">✈️ International Tracking</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">From Oregon Warehouse → Customer</p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Carrier</Label>
                        <Select value={internationalCarrier} onValueChange={setInternationalCarrier}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select carrier..." />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERNATIONAL_CARRIERS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tracking Number</Label>
                        <Input
                          value={internationalTracking}
                          onChange={(e) => setInternationalTracking(e.target.value)}
                          placeholder="e.g., JD014600006261234567"
                        />
                      </div>
                    </div>

                    {/* ETA */}
                    <div className="space-y-1">
                      <Label>Expected Delivery Date</Label>
                      <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTrackingDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTracking} disabled={isSaving} className="gradient-hero border-0">
                      {isSaving ? "Saving..." : "Save Tracking"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* إظهار السعر */}
              {order.total_amount > 0 && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  ${Number(order.total_amount).toFixed(2)}
                </Badge>
              )}

              {/* إظهار رقم التتبع الدولي إذا موجود */}
              {(order as any).international_tracking && (
                <Badge variant="outline" className="text-success border-success/30 text-xs">
                  ✈️ {(order as any).international_carrier} — {(order as any).international_tracking}
                </Badge>
              )}
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* تفاصيل موسعة */}
        <CollapsibleContent className="mt-4 pt-4 border-t border-border space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Product URL</Label>
            <a
              href={order.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
            >
              {order.product_url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          {/* ملخص التتبع */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground">📦 Domestic</Label>
              <p className="text-sm font-medium mt-1">
                {(order as any).domestic_carrier || "—"}{" "}
                {(order as any).domestic_tracking ? `· ${(order as any).domestic_tracking}` : ""}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground">✈️ International</Label>
              <p className="text-sm font-medium mt-1">
                {(order as any).international_carrier || "—"}{" "}
                {(order as any).international_tracking ? `· ${(order as any).international_tracking}` : ""}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
