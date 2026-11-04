export interface StoreOffer {
  store: string;
  storeLogo?: string;
  price: number;
  previousPrice?: number;
  priceChange?: number;
  url: string;
}

export interface StoreDailySummary {
  store: string;
  totalPhones: number;
  cheapestCount: number;
  dropsCount: number;
  hikesCount: number;
  unchangedCount: number;
  netChangeAmount: number;
  biggestDrop?: {
    modelName: string;
    oldPrice: number;
    newPrice: number;
    dropAmount: number;
    dropPercent: number;
  };
}

export interface PhoneVariant {
  storage: string;
  color?: string;
  lowestPrice: number;
  highestPrice: number;
  offers: StoreOffer[];
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PhoneModelGroup {
  id: string;
  name: string;
  brand:
    | 'Apple'
    | 'Samsung'
    | 'Xiaomi'
    | 'Google'
    | 'OPPO'
    | 'Nothing'
    | 'OnePlus'
    | 'Ulefone'
    | 'Motorola'
    | 'Nokia'
    | 'Aðrir';
  image?: string;
  lowestPrice: number;
  highestPrice: number;
  storesCount: number;
  variantsCount: number;
  stores: string[];
  variants: PhoneVariant[];
  history: PricePoint[];
  trend: 'DOWN' | 'UP' | 'SAME';
  priceChangePercent: number;
  priceChangeAmount: number;
  maxSavings: number;
}

export interface MetaData {
  lastRun: string;
  durationMs: number;
  totalModels: number;
  totalVariants: number;
  totalStores: number;
  storesList: string[];
  brandsList: string[];
  biggestDrops: {
    id: string;
    name: string;
    brand: string;
    oldPrice: number;
    currentPrice: number;
    dropPercent: number;
    store: string;
  }[];
  topSavings?: {
    id: string;
    name: string;
    brand: string;
    variantStorage?: string;
    lowestPrice: number;
    highestPrice: number;
    savings: number;
    cheapestStore: string;
    expensiveStore: string;
  }[];
  storeSummaries?: StoreDailySummary[];
  allTimeLowsCount: number;
  status: string;
  sourcesScanned?: number;
}

export interface RunLogEntry {
  id: string;
  timestamp: string;
  durationMs: number;
  modelsCount: number;
  storesCount: number;
  status: 'SUCCESS' | 'ERROR';
}

export type PriceRangeFilter = 'all' | 'under50' | '50to120' | '120to200' | 'over200';

export const formatPrice = (p: number) => {
  return new Intl.NumberFormat('is-IS').format(p) + ' kr.';
};

export const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('is-IS', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const getStoreBadgeColor = (store: string) => {
  const s = store.toLowerCase();
  if (s.includes('elko'))
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25';
  if (s.includes('nova'))
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25';
  if (s.includes('síminn') || s.includes('siminn'))
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25';
  if (s.includes('sýn') || s.includes('vodafone'))
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25';
  if (s.includes('emobi'))
    return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/25';
  if (s.includes('tölvulistinn'))
    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/25';
  if (s.includes('tölvutek'))
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25';
  if (s.includes('computer'))
    return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/25';
  if (s.includes('tölvutækni'))
    return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25';
  if (s.includes('mi búðin'))
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/25';
  if (s.includes('coolshop'))
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/25';
  if (s.includes('ormsson'))
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25';
  if (s.includes('lune'))
    return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:border-fuchsia-500/25';
  if (s.includes('macland'))
    return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30';
  return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/80';
};

export const getStoreDomain = (store: string): string => {
  const s = store.toLowerCase();
  if (s.includes('elko')) return 'elko.is';
  if (s.includes('nova')) return 'nova.is';
  if (s.includes('síminn') || s.includes('siminn')) return 'siminn.is';
  if (s.includes('sýn') || s.includes('vodafone')) return 'syn.is';
  if (s.includes('emobi')) return 'emobi.is';
  if (s.includes('mi búðin') || s.includes('mibudin')) return 'mibudin.is';
  if (s.includes('lune')) return 'lune.is';
  if (s.includes('macland')) return 'macland.is';
  if (s.includes('tölvulistinn')) return 'tl.is';
  if (s.includes('tölvutek')) return 'tolvutek.is';
  if (s.includes('computer')) return 'computer.is';
  if (s.includes('tölvutækni')) return 'tolvutaekni.is';
  if (s.includes('coolshop')) return 'coolshop.is';
  if (s.includes('ormsson')) return 'ormsson.is';
  if (s.includes('ofar')) return 'ofar.is';
  if (s.includes('heimilistæki')) return 'ht.is';
  if (s.includes('goshop')) return 'goshop.is';
  if (s.includes('tunglskin')) return 'tunglskin.is';
  return 'ja.is';
};

export const getStoreFavicon = (store: string): string | null => {
  const s = store.toLowerCase();
  if (s.includes('goshop')) return 'https://icon.horse/icon/goshop.is';
  if (s.includes('tunglskin')) return 'https://icon.horse/icon/tunglskin.is';
  const domain = getStoreDomain(store);
  if (domain === 'ja.is') return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};
