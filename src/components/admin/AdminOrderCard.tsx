import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Clock, CheckCircle, Package, Truck, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Order, Profile } from "@/lib/supabase";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending_payment: { label: "Pending Payment", color: "bg-warning/10 text-warning border-warning/30", icon: DollarSign },
  payment_received: { label: "Payment Received", color: "bg-success/10 text-success border-success/30", icon: CheckCircle },
  purchasing: { label: "Purchasing", color: "bg-primary/10 text-primary border-primary/30", icon: Package },
  purchased: { label: "Purchased", color: "bg-primary/10 text-primary border-primary/30", icon: Package },
  domestic_shipping: { label: "Domestic Shipping", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Truck },
  at_warehouse: { label: "At Warehouse", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: Package },
  international_shipping: { label: "Int'l Shipping", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", icon: Truck },
  customs: { label: "Customs", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: Clock },
  out_for_delivery: { label: "Out for Delivery", color: "bg-teal-500/10 text-teal-600 border-teal-500/30", icon: Truck },
  delivered: { label: "Delivered", color: "bg-success/10 text-success border-success/30", icon: CheckCircle },
  under_investigation: { label: "Under Investigation", color: "bg-destructive/10 text-destructive border-destructive/30", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground border-border", icon: Clock },
};

interface AdminOrderCardProps {
  order: Order & { profiles?: Profile };
  profile?: Profile;
  onUpdate: () => void;
}

export default function AdminOrderCard({ order, profile, onUpdate }: AdminOrderCardProps) {
  const statusInfo = STATUS_CONFIG[order.status || "pending_payment"] || STATUS_CONFIG.pending_payment;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {order.product_image && (
            <img
              src={order.product_image}
              alt={order.product_title || "Product"}
              className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{order.product_title || "Untitled Order"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {profile?.full_name || "Unknown"} • {profile?.phone || "No phone"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {order.id.slice(0, 8)}… • {new Date(order.created_at).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              {order.total_amount && (
                <span className="text-xs font-medium">${order.total_amount.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
        <Link to={`/order/${order.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </Link>
      </div>
    </div>
  );
}
