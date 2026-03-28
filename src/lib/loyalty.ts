// ── نظام الولاء الـ 5 مستويات ──────────────────────────────

export interface LoyaltyTier {
  id: string;
  name: string;
  nameAr: string;
  minSpend: number;        // $ per year
  period: 'year' | 'half_year';
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  perks: string[];
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'new',
    name: 'New Customer',
    nameAr: 'زبون جديد',
    minSpend: 0,
    period: 'year',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted',
    emoji: '🌱',
    perks: ['Free delivery on first order', 'Standard support'],
  },
  {
    id: 'essential',
    name: 'Essential',
    nameAr: 'زبون أساسي',
    minSpend: 3000,
    period: 'year',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    emoji: '⭐',
    perks: ['Priority support', 'Early access to promotions'],
  },
  {
    id: 'premium',
    name: 'Premium',
    nameAr: 'زبون مميز',
    minSpend: 7000,
    period: 'year',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    emoji: '💎',
    perks: [
      '30% off + free delivery on 1 order ≤ $500',
      'Free delivery on orders ≥ $2,000',
      '3–10% off shipping every 12 months',
    ],
  },
  {
    id: 'signature',
    name: 'Signature',
    nameAr: 'زبون موقّع',
    minSpend: 15000,
    period: 'year',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    emoji: '🏆',
    perks: [
      'Free delivery on 3 orders',
      'Free delivery on orders ≥ $1,000',
      '3–10% off shipping every 12 months',
    ],
  },
  {
    id: 'prestige',
    name: 'Prestige',
    nameAr: 'زبون النخبة',
    minSpend: 25000,
    period: 'half_year',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    emoji: '👑',
    perks: [
      'Free delivery on every order',
      '3–10% off shipping every 6 months',
      'Exclusive prizes & special discounts',
    ],
  },
];

export function getTierBySpend(totalSpendUSD: number): LoyaltyTier {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (totalSpendUSD >= LOYALTY_TIERS[i].minSpend) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

export function getNextTier(currentTierId: string): LoyaltyTier | null {
  const idx = LOYALTY_TIERS.findIndex(t => t.id === currentTierId);
  return idx < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[idx + 1] : null;
}

export function getProgressToNextTier(totalSpend: number, currentTier: LoyaltyTier, nextTier: LoyaltyTier | null): number {
  if (!nextTier) return 100;
  const range = nextTier.minSpend - currentTier.minSpend;
  const progress = totalSpend - currentTier.minSpend;
  return Math.min(100, Math.round((progress / range) * 100));
}