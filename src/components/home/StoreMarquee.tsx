import amazonLogo from '@/assets/logos/amazon.svg';
import ebayLogo from '@/assets/logos/ebay.svg';
import nikeLogo from '@/assets/logos/nike.svg';
import appleLogo from '@/assets/logos/apple.svg';
import bestbuyLogo from '@/assets/logos/bestbuy.svg';
import targetLogo from '@/assets/logos/target.svg';
import costcoLogo from '@/assets/logos/costco.svg';
import homedepotLogo from '@/assets/logos/homedepot.svg';
import nordstromLogo from '@/assets/logos/nordstrom.svg';
import macysLogo from '@/assets/logos/macys.svg';

const stores = [
  { name: 'Amazon', logo: amazonLogo },
  { name: 'eBay', logo: ebayLogo },
  { name: 'Nike', logo: nikeLogo },
  { name: 'Apple', logo: appleLogo },
  { name: 'Best Buy', logo: bestbuyLogo },
  { name: 'Target', logo: targetLogo },
  { name: 'Costco', logo: costcoLogo },
  { name: 'Home Depot', logo: homedepotLogo },
  { name: 'Nordstrom', logo: nordstromLogo },
  { name: "Macy's", logo: macysLogo },
];

export function StoreMarquee() {
  // Duplicate for seamless loop
  const allStores = [...stores, ...stores];

  return (
    <section className="py-12 bg-background border-y border-border/50 overflow-hidden">
      <div className="container mb-8">
        <h2 className="text-center text-2xl sm:text-3xl font-bold">
          We Ship from These Stores
        </h2>
        <p className="text-center text-muted-foreground mt-2">
          Shop from America's most popular retailers
        </p>
      </div>
      
      <div className="relative">
        {/* Gradient overlays for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {allStores.map((store, index) => (
            <div
              key={`${store.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center mx-4 px-8 py-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer min-w-[160px] h-20"
            >
              <img 
                src={store.logo} 
                alt={`${store.name} logo`}
                className="h-8 w-auto max-w-[120px] object-contain grayscale hover:grayscale-0 transition-all"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
