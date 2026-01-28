import { Package, Truck, ShieldCheck, Globe } from 'lucide-react';
import { ProductLinkInput } from './ProductLinkInput';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-sm font-medium text-primary animate-fade-in">
            <Globe className="h-4 w-4" />
            US Stores → Middle East Delivery
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight animate-fade-in">
            Shop from{' '}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Any US Store
            </span>
            <br />
            Delivered to Your Door
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Just paste a product link. We handle purchasing, shipping, and customs — 
            so you can get anything from America, hassle-free.
          </p>

          <div className="pt-4 animate-fade-in">
            <ProductLinkInput />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 animate-fade-in">
          {[
            { icon: Package, label: 'Any Product', desc: 'From any US store' },
            { icon: ShieldCheck, label: 'Secure', desc: 'Protected payments' },
            { icon: Truck, label: 'Fast Delivery', desc: '7-14 days shipping' },
            { icon: Globe, label: 'Full Tracking', desc: 'Door to door' },
          ].map(({ icon: Icon, label, desc }) => (
            <div 
              key={label}
              className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold">{label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
