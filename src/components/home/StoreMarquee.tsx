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
import { useLanguage } from '@/contexts/LanguageContext';

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
  // Alibaba & AliExpress — text-only (no SVG available)
  { name: 'Alibaba', logo: null },
  { name: 'AliExpress', logo: null },
];

export function StoreMarquee() {
  const { lang } = useLanguage();
  const allStores = [...stores, ...stores];

  return (
    <section className="py-12 bg-background border-y border-border/50 overflow-hidden">
      <div className="container mb-8 text-center">
        {/* #28 — تغيير العبارة */}
        <h2 className="text-2xl sm:text-3xl font-bold">
          {lang === 'ar'
            ? 'نتسوق من أمريكا والصين وأوروبا'
            : 'American, Chinese & European Stores'}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {lang === 'ar'
            ? 'ويمكن الشراء من أي موقع آخر ذي تقييم عالي'
            : 'And many more high-rated stores worldwide'}
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {allStores.map((store, index) => (
            <div key={`${store.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center mx-4 px-8 py-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer min-w-[160px] h-20">
              {store.logo ? (
                <img src={store.logo} alt={`${store.name} logo`}
                  className="h-8 w-auto max-w-[120px] object-contain" />
              ) : (
                <span className="font-bold text-lg text-primary">{store.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
