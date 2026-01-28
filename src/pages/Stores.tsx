import { useState, useEffect } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { Store } from '@/lib/supabase';

const categories = ['All', 'Retail', 'Sports', 'Electronics', 'Cosmetics', 'Fashion', 'Watches', 'Car Parts'];

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    filterStores();
  }, [stores, selectedCategory, searchQuery]);

  const fetchStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setStores(data as Store[]);
    }
    setIsLoading(false);
  };

  const filterStores = () => {
    let filtered = stores;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(store => store.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredStores(filtered);
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Store Directory
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our supported US stores. Click any store to visit their website and find products to order.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'gradient-hero border-0' : ''}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Stores Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No stores found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredStores.map((store) => (
              <a
                key={store.id}
                href={store.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-elevated transition-all overflow-hidden"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary font-display font-bold text-2xl">
                      {store.name[0]}
                    </div>
                  )}
                  <span className="font-medium text-sm text-center">{store.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{store.category}</span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
