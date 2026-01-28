import { useState } from 'react';
import { AlertTriangle, User, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Dispute, Order, Profile } from '@/lib/supabase';

interface AdminDisputeCardProps {
  dispute: Dispute;
  order?: Order;
  profile?: Profile;
  onUpdate: () => void;
}

const issueLabels: Record<string, string> = {
  wrong_item: 'Wrong Item',
  broken_item: 'Broken/Damaged',
  missing_item: 'Missing Item',
  wrong_size: 'Wrong Size',
  wrong_color: 'Wrong Color',
  other: 'Other',
};

export function AdminDisputeCard({ dispute, order, profile, onUpdate }: AdminDisputeCardProps) {
  const [adminNotes, setAdminNotes] = useState(dispute.admin_notes || '');
  const [status, setStatus] = useState<string>(dispute.status);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    const updates: { status: string; admin_notes: string; resolved_at?: string } = {
      status,
      admin_notes: adminNotes,
    };

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', dispute.id);

    // If resolved, also update order status back to previous
    if (!error && (status === 'resolved' || status === 'closed') && order) {
      await supabase
        .from('orders')
        .update({ status: 'at_warehouse' })
        .eq('id', order.id);
    }

    setIsSaving(false);

    if (error) {
      toast.error('Failed to update dispute');
      return;
    }

    toast.success('Dispute updated');
    onUpdate();
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const message = encodeURIComponent(
      `Hi ${profile.full_name},\n\nRegarding your dispute for order #${order?.id.slice(0, 8).toUpperCase()}:\n\n${adminNotes || 'We are looking into this issue.'}\n\nThank you for your patience!`
    );
    window.open(`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">
              {issueLabels[dispute.issue_type] || dispute.issue_type}
            </h3>
            <Badge variant="outline" className="text-destructive border-destructive/50">
              {dispute.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Order #{order?.id.slice(0, 8).toUpperCase()} • Reported {format(new Date(dispute.created_at), 'MMM d, yyyy')}
          </p>
        </div>

        {profile?.phone && (
          <Button variant="outline" size="sm" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-1" />
            Contact
          </Button>
        )}
      </div>

      {/* Customer Info */}
      {profile && (
        <div className="flex items-center gap-3 text-sm mb-4 p-3 bg-card rounded-lg">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{profile.full_name}</span>
          {profile.phone && <span className="text-muted-foreground">{profile.phone}</span>}
        </div>
      )}

      {/* Customer Description */}
      {dispute.description && (
        <div className="mb-4 p-3 bg-card rounded-lg">
          <Label className="text-xs text-muted-foreground">Customer's Description:</Label>
          <p className="text-sm mt-1">{dispute.description}</p>
        </div>
      )}

      {/* Admin Response */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Admin Notes</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes about this dispute..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
