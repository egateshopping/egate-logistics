import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface WeightRule {
  id: string;
  keyword: string;
  weight: number;
  created_at: string;
}

export default function AdminWeightSettings() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [rules, setRules] = useState<WeightRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newWeight, setNewWeight] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchRules();
    }
  }, [user, isAdmin, authLoading]);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('shipping_weight_rules')
      .select('*')
      .order('keyword', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading rules',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRules(data || []);
    }
    setIsLoading(false);
  };

  const handleAddRule = async () => {
    if (!newKeyword.trim() || !newWeight) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both keyword and weight.',
        variant: 'destructive',
      });
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: 'Invalid weight',
        description: 'Please enter a valid weight greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('shipping_weight_rules')
      .insert({ keyword: newKeyword.toLowerCase().trim(), weight });

    if (error) {
      toast({
        title: 'Error adding rule',
        description: error.code === '23505' 
          ? 'This keyword already exists.' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Rule added',
        description: `"${newKeyword}" → ${weight} lbs`,
      });
      setNewKeyword('');
      setNewWeight('');
      fetchRules();
    }
    setIsSaving(false);
  };

  const handleDeleteRule = async (id: string, keyword: string) => {
    const { error } = await supabase
      .from('shipping_weight_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting rule',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Rule deleted',
        description: `Removed "${keyword}"`,
      });
      fetchRules();
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded-xl w-1/3" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Weight Estimation Rules ⚖️
          </h1>
          <p className="text-muted-foreground mt-1 font-light">
            Define keywords to auto-estimate product weights. Longer keywords match first.
          </p>
        </div>

        {/* Add New Rule */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add New Rule</CardTitle>
            <CardDescription>
              Enter a keyword (e.g., "iphone", "jacket") and its estimated weight in lbs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="new-keyword" className="text-xs text-muted-foreground">Keyword</Label>
                <Input
                  id="new-keyword"
                  placeholder="e.g., women's shoe"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label htmlFor="new-weight" className="text-xs text-muted-foreground">Weight (lbs)</Label>
                <Input
                  id="new-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="2.0"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                />
              </div>
              <Button onClick={handleAddRule} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Current Rules ({rules.length})</CardTitle>
            <CardDescription>
              Priority: Longer keywords are matched first (e.g., "women's shoe" before "shoe").
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No weight rules defined yet.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <code className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                        {rule.keyword}
                      </code>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold">{rule.weight} lbs</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteRule(rule.id, rule.keyword)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
