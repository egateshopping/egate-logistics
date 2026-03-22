import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, User, Phone, MapPin, Save, Star, Package, Clock } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0, delivered: 0 });
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    country: "Iraq",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: (profile as any).address || "",
        city: (profile as any).city || "",
        country: (profile as any).country || "Iraq",
      });
    }
    if (user) fetchOrderStats();
  }, [user, profile, authLoading]);

  const fetchOrderStats = async () => {
    const { data } = await supabase.from("orders").select("status").eq("user_id", user?.id);
    if (data) {
      setOrderStats({
        total: data.length,
        active: data.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
        delivered: data.filter((o) => o.status === "delivered").length,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from("profiles").update(formData).eq("user_id", user?.id);
    setIsLoading(false);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated successfully");
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const isLoyal = (profile as any)?.is_loyal;

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Update your account information</p>
        </div>

        {/* بطاقة الملف الشخصي */}
        <div className="p-6 rounded-2xl bg-card border border-border mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-semibold text-lg">{formData.full_name || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile?.is_verified && (
                  <Badge className="bg-success/10 text-success border-success/30">✓ Verified Account</Badge>
                )}
                {isLoyal && (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <Star className="h-3 w-3 mr-1" />
                    Loyal Customer
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* إحصائيات الطلبات */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-muted/30 rounded-xl text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{orderStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="p-3 bg-primary/5 rounded-xl text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-primary">{orderStats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="p-3 bg-success/5 rounded-xl text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold text-success">{orderStats.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </div>

          {/* نظام الدفع */}
          <div
            className={`p-4 rounded-xl border mb-6 ${
              isLoyal ? "bg-yellow-500/5 border-yellow-500/20" : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isLoyal ? (
                <Star className="h-4 w-4 text-yellow-600" />
              ) : (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">
                {isLoyal ? "Loyal Customer — Pay on Delivery" : "Standard Customer — Deposit Required"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoyal
                ? "You can order without upfront payment. Full payment upon delivery."
                : "A deposit is required before your order is processed. Remaining balance due upon delivery."}
            </p>
          </div>

          {/* نموذج التعديل */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone (WhatsApp)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+964 xxx xxx xxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                <MapPin className="h-4 w-4 inline mr-1" />
                Delivery Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, building, apartment..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Baghdad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Iraq"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gradient-hero border-0">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
