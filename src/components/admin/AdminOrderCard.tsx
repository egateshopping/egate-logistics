import { Link } from "react-router-dom";
import { Package, Truck, Clock, CheckCircle, DollarSign, AlertTriangle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Profile } from "@/lib/supabase";
import { getStatusLabel, getStatusColor } from "@/lib/supabase";

interface AdminOrderCardProps {
  order: Order;
  profile?: Profile;
  onUpdate: () => Promise<void>;
}

export default function AdminOrderCard({ order, profile, onUpdate }: AdminOrderCardProps) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
      {order.product_image ? (
        <img src={order.product_image} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{order.product_title || "Untitled Product"}</p>
        <p className="text-xs text-muted-foreground">
          {profile?.full_name || "Unknown"} · {profile?.phone || "No phone"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {order.total_amount != null && (
          <span className="text-sm font-semibold">${order.total_amount.toFixed(2)}</span>
        )}
        <Badge className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
        <Link to={`/order/${order.id}`}>
          <Button size="sm" variant="ghost">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
