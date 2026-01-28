import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package, Calendar, AlertTriangle, ExternalLink, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Order, IssueType } from '@/lib/supabase';
import { getStatusLabel, getStatusColor } from '@/lib/supabase';

interface OrderCardProps {
  order: Order;
  onUpdate: () => void;
}

const issueTypes: { value: IssueType; label: string }[] = [
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'broken_item', label: 'Item Broken/Damaged' },
  { value: 'missing_item', label: 'Item Missing' },
  { value: 'wrong_size', label: 'Wrong Size' },
  { value: 'wrong_color', label: 'Wrong Color' },
  { value: 'other', label: 'Other Issue' },
];

export function OrderCard({ order, onUpdate }: OrderCardProps) {
  const navigate = useNavigate();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReportIssue = async () => {
    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }

    setIsSubmitting(true);
    
    const { error: disputeError } = await supabase
      .from('disputes')
      .insert({
        order_id: order.id,
        user_id: order.user_id,
        issue_type: issueType,
        description: issueDescription,
      });

    if (!disputeError) {
      await supabase
        .from('orders')
        .update({ status: 'under_investigation' })
        .eq('id', order.id);
    }

    setIsSubmitting(false);

    if (disputeError) {
      toast.error('Failed to submit report');
      return;
    }

    toast.success('Issue reported successfully');
    setIsReportOpen(false);
    onUpdate();
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border hover:shadow-soft transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Product Image */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted">
          {order.product_image ? (
            <img
              src={order.product_image}
              alt={order.product_title || 'Product'}
              className="h-full w-full object-cover rounded-xl"
            />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {/* Order Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-medium truncate">
                {order.product_title || 'Product Order'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Badge className={`shrink-0 ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </Badge>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            {order.color && <span>Color: {order.color}</span>}
            {order.size && <span>Size: {order.size}</span>}
            <span>Qty: {order.quantity}</span>
            {order.eta && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                ETA: {format(new Date(order.eta), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Tracking */}
          {order.international_tracking && (
            <div className="mb-3">
              <a
                href={`https://track.example.com/${order.international_tracking}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Track Package
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Warehouse Photos */}
          {order.warehouse_photos && order.warehouse_photos.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {order.warehouse_photos.length} warehouse photo(s)
              </span>
            </div>
          )}

          {/* Price & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <span className="text-lg font-display font-bold">
                {formatCurrency(Number(order.total_amount) || 0)}
              </span>
              {!order.is_paid && order.status === 'pending_payment' && (
                <span className="ml-2 text-xs text-warning">Payment required</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Report Issue
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report an Issue</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Issue Type</Label>
                        <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select issue type" />
                          </SelectTrigger>
                          <SelectContent>
                            {issueTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe the issue in detail..."
                          value={issueDescription}
                          onChange={(e) => setIssueDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={handleReportIssue}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/order/${order.id}`)}
              >
                Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
