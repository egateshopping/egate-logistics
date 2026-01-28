import { Package, Truck, ShieldCheck, Globe } from 'lucide-react';
import { ProductLinkInput } from './ProductLinkInput';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="container py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Brand Logo */}
          <div className="inline-flex flex-col items-center gap-2 animate-fade-in">
            <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
              <span className="text-primary">e</span>
              <span className="text-primary">g</span>
              <span className="text-primary">ate</span>
            </span>
            <span className="text-sm font-medium text-accent tracking-widest uppercase">
              Discover, Share & Buy
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight animate-fade-in">
            Shop from{' '}
            <span className="text-primary">
              Any US Store
            </span>
            <br />
            Delivered to Your Door
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in font-light">
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
              <h3 className="font-semibold">{label}</h3>
              <p className="text-sm text-muted-foreground mt-1 font-light">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
