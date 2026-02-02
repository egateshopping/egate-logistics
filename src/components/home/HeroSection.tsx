import { Package, Truck, ShieldCheck, Globe } from 'lucide-react';
import { ProductLinkInput } from './ProductLinkInput';
import egateLogo from '@/assets/egate-logo.png';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="container py-16 lg:py-28">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Brand Logo */}
          <div className="inline-flex flex-col items-center gap-2 animate-fade-in">
            <img src={egateLogo} alt="Egate Shopping" className="h-24 sm:h-32 w-auto" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight animate-fade-in">
            Shop{' '}
            <span className="text-primary">US Stores</span>,
            <br />
            We Ship to You
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in font-light">
            Paste any product link below. We handle purchasing, shipping, and customs — hassle-free.
          </p>

          {/* Main CTA - Product Link Input */}
          <div className="pt-2 animate-fade-in">
            <ProductLinkInput />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fade-in">
          {[
            { icon: Package, label: 'Any Product', desc: 'From any US store' },
            { icon: ShieldCheck, label: 'Secure', desc: 'Protected payments' },
            { icon: Truck, label: 'Fast Delivery', desc: '7-14 days shipping' },
            { icon: Globe, label: 'Full Tracking', desc: 'Door to door' },
          ].map(({ icon: Icon, label, desc }) => (
            <div 
              key={label}
              className="text-center p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground mt-1 font-light">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
