import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, ExternalLink, Truck, CheckCircle,
  CreditCard, AlertTriangle, ShoppingCart, Box, Plane,
  Home, ImageIcon, Clock, Warehouse, MapPin,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getStatusLabel, getStatusColor } from "@/lib/supabase";
import type { Order } from "@/lib/supabase";
import { format } from "date-fns";
import { useAppSettings } from "@/hooks/useAppSettings";

// ── مراحل التتبع الصحيحة ─────────────────────────────────
const timelineSteps = [
  { key: "order_placed",          label: "Order Placed",          icon: ShoppingCart },
  { key: "payment_received",      label: "Payment & Purchase Clear", icon: CreditCard },
  { key: "purchased",             label: "Item Purchased",         icon: Box },
  { key: "domestic_shipping",     label: "Shipping to Warehouse",  icon: Truck },
  { key: "at_warehouse",          label: "Arrived at Warehouse",   icon: Warehouse },
  { key: "international_shipping", label: "On the Way to You",     icon: Plane },
  { key: "delivered",             label: "Delivered",              icon: Home },
];

const getTimelineStep = (status: string): number => {
  switch (status) {
    case "pending_payment":
      return 0;
    case "payment_received":
      return 1;
    case "purchasing":
      return 1;
    case "purchased":
      return 2;
    case "domestic_shipping":
      return 3;
    case "at_warehouse":
      return 4;
    case "international_shipping":
      return 5;
    case "customs":
      return 5;
    case "out_for_delivery":
      return 5;
    case "delivered":
      return 6;
    default:
      return 0;
  }
};

const USD_TO_AED = 3.67;

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useAppSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user && id) fetchOrder();
  }, [user, authLoading, id]);

  const fetchOrder = async () => {
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
    if (error || !data) {
      navigate("/dashboard");
      return;
    }
    setOrder(data as Order);
    setIsLoading(false);
  };

  const fmt = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || Number(amount) === 0) return "—";
    return `$${Number(amount).toFixed(2)}`;
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-8 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-2xl" />
            <div className="h-32 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold mb-2">Order Not Found</h1>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const currentStep = getTimelineStep(order.status);
  const isCancelled = order.status === "cancelled";
  const o = order as any;

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>

        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {format(new Date(order.created_at), "MMMM d, yyyy")}
            </p>
          </div>
          <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</Badge>
        </div>

        {/* بطاقة المنتج */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden mb-6">
          <div className="flex flex-col sm:flex-row gap-6 p-6">
            <div className="h-40 w-40 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center mx-auto sm:mx-0">
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
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold mb-2">{order.product_title || "Product Order"}</h2>
              <a
                href={order.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4"
              >
                <ExternalLink className="h-3 w-3" />
                View Original Product
              </a>
              <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-muted/50 rounded-lg">
                {order.color && (
                  <div>
                    <span className="text-xs text-muted-foreground">Color</span>
                    <p className="font-medium">{order.color}</p>
                  </div>
                )}
                {order.size && (
                  <div>
                    <span className="text-xs text-muted-foreground">Size</span>
                    <p className="font-medium">{order.size}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Quantity</span>
                  <p className="font-medium">{order.quantity}</p>
                </div>
                {order.eta && (
                  <div>
                    <span className="text-xs text-muted-foreground">Expected Delivery</span>
                    <p className="font-medium">{format(new Date(order.eta), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
              {order.special_notes && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <span className="text-xs text-muted-foreground">Special Notes</span>
                  <p className="text-sm font-medium text-warning">{order.special_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* مراحل التتبع */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6">
          <h3 className="font-semibold mb-6">Order Progress</h3>

          {isCancelled ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Order Cancelled</p>
                <p className="text-sm text-muted-foreground">This order has been cancelled.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* شريط التقدم */}
              <div className="absolute top-5 left-5 right-5 h-1 bg-muted rounded-full hidden sm:block">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / (timelineSteps.length - 1)) * 100}%` }}
                />
              </div>

              {/* المراحل */}
              <div className="relative flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                {timelineSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <div key={step.key} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                      <div
                        className={`
                        h-10 w-10 rounded-full flex items-center justify-center z-10 shrink-0 transition-all
                        ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                        ${isCurrent ? "ring-4 ring-primary/20" : ""}
                      `}
                      >
                        {isCompleted && index < currentStep ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={`text-xs sm:mt-2 sm:text-center sm:max-w-[70px] ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* أرقام التتبع */}
        {(o.domestic_tracking || o.international_tracking) && (
          <div className="rounded-2xl bg-card border border-border p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Tracking Information
            </h3>

            <div className="space-y-4">
              {/* التتبع الداخلي — مخفي عن العميل */}
              {o.domestic_tracking && (
                <div className="p-4 bg-muted/30 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">📦 Shipped — On the Way</span>
                  </div>
                  <a
                    href={`https://www.17track.net/en/track?nums=${o.domestic_tracking}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Track Package
                  </a>
                </div>
              )}

              {/* التتبع الدولي — بدون اسم الشاحن */}
              {o.international_tracking && (
                <div className="p-4 bg-muted/30 rounded-xl border">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">✈️ International Shipment to You</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://www.17track.net/en/track?nums=${o.international_tracking}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Track Package
                    </a>
                    {o.shipment_id && (
                      <a
                        href={`/shipment/${o.shipment_id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                      >
                        <Package className="h-3 w-3" />
                        View All Packages
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* تفصيل السعر */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Price Breakdown
          </h3>

          {order.total_amount && Number(order.total_amount) > 0 ? (
            <div className="space-y-3">
              {[
                ["🛒 Product Price", fmt(order.base_item_cost)],
                ["✈️ International Shipping", fmt(order.international_shipping)],
                ["🏛️ Customs (10%)", fmt(order.customs)],
                ["⚙️ Service Fee", "$2.00"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              {order.discount && Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-{fmt(order.discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <div className="text-right">
                    <p className="font-bold text-xl text-primary">{fmt(order.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(Number(order.total_amount) * settings.usdToIqd).toLocaleString()} IQD
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 p-3 rounded-lg ${
                  order.is_paid ? "bg-success/10 border border-success/30" : "bg-warning/10 border border-warning/30"
                }`}
              >
                <p className={`text-sm font-medium ${order.is_paid ? "text-success" : "text-warning"}`}>
                  {order.is_paid ? "✓ Payment Confirmed" : "⏳ Awaiting Payment"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>Price pending calculation</p>
              <p className="text-sm">We'll contact you once we have the final price.</p>
            </div>
          )}
        </div>

        {/* صور المستودع */}
        {order.warehouse_photos && Array.isArray(order.warehouse_photos) && order.warehouse_photos.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-6 mt-6">
            <h3 className="font-semibold mb-4">Warehouse Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(order.warehouse_photos as string[]).map((photo, index) => (
                <a
                  key={index}
                  href={photo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                >
                  <img src={photo} alt={`Warehouse photo ${index + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
