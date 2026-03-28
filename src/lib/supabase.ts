import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type OrderStatus = 
  | 'pending_payment'
  | 'payment_received'
  | 'purchasing'
  | 'purchased'
  | 'domestic_shipping'
  | 'at_warehouse'
  | 'international_shipping'
  | 'customs'
  | 'out_for_delivery'
  | 'delivered'
  | 'under_investigation'
  | 'cancelled';

export type IssueType = 
  | 'wrong_item'
  | 'broken_item'
  | 'missing_item'
  | 'wrong_size'
  | 'wrong_color'
  | 'other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_url: string;
  product_title: string | null;
  product_image: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  special_notes: string | null;
  base_item_cost: number;
  domestic_shipping: number;
  tax: number;
  international_shipping: number;
  customs: number;
  discount: number;
  promo_code_id: string | null;
  total_amount: number;
  weight_lbs: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  chargeable_weight: number | null;
  status: OrderStatus;
  domestic_tracking: string | null;
  international_tracking: string | null;
  eta: string | null;
  payment_receipt_url: string | null;
  is_paid: boolean;
  warehouse_photos: string[];
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  user_id: string;
  issue_type: IssueType;
  description: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    pending_payment: 'Pending Payment',
    payment_received: 'Payment & Purchase Clear',
    purchasing: 'Payment & Purchase Clear',
    purchased: 'Item Purchased',
    domestic_shipping: 'Shipping to Warehouse',
    at_warehouse: 'Arrived at Warehouse',
    international_shipping: 'On the Way to You',
    customs: 'Customs Clearance',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    under_investigation: 'Under Investigation',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending_payment: 'bg-warning/10 text-warning border-warning/30',
    payment_received: 'bg-primary/10 text-primary border-primary/30',
    purchasing: 'bg-accent/10 text-accent border-accent/30',
    purchased: 'bg-accent/10 text-accent border-accent/30',
    domestic_shipping: 'bg-primary/10 text-primary border-primary/30',
    at_warehouse: 'bg-primary/10 text-primary border-primary/30',
    international_shipping: 'bg-accent/10 text-accent border-accent/30',
    customs: 'bg-warning/10 text-warning border-warning/30',
    out_for_delivery: 'bg-success/10 text-success border-success/30',
    delivered: 'bg-success/10 text-success border-success/30',
    under_investigation: 'bg-destructive/10 text-destructive border-destructive/30',
    cancelled: 'bg-muted text-muted-foreground border-muted',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};
