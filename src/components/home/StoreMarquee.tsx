import { useEffect, useRef, useState } from 'react';

const stores = [
  { name: 'Amazon', color: '#FF9900' },
  { name: 'eBay', color: '#E53238' },
  { name: 'Nike', color: '#111111' },
  { name: 'Apple', color: '#555555' },
  { name: 'Sephora', color: '#000000' },
  { name: 'Best Buy', color: '#0046BE' },
  { name: 'Walmart', color: '#0071CE' },
  { name: 'Target', color: '#CC0000' },
  { name: 'Nordstrom', color: '#000000' },
  { name: 'Macy\'s', color: '#E21A2C' },
  { name: 'Costco', color: '#E31837' },
  { name: 'Home Depot', color: '#F96302' },
];

export function StoreMarquee() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;

    const animate = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += 0.5;
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  // Duplicate stores for seamless loop
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
      
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-hidden whitespace-nowrap px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {allStores.map((store, index) => (
          <div
            key={`${store.name}-${index}`}
            className="flex-shrink-0 flex items-center justify-center px-8 py-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer"
          >
            <span 
              className="text-xl font-bold"
              style={{ color: store.color }}
            >
              {store.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
