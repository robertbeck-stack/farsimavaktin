'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

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

interface RunLogEntry {
  id: string;
  timestamp: string;
  durationMs: number;
  modelsCount: number;
  storesCount: number;
  status: 'SUCCESS' | 'ERROR';
}

type PriceRangeFilter = 'all' | 'under50' | '50to120' | '120to200' | 'over200';

export default function Home() {
  const [models, setModels] = useState<PhoneModelGroup[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme state (synced with <meta name="color-scheme">, system preference, and localStorage)
  const [isDark, setIsDark] = useState<boolean>(true);

  // Active view: 'list' | 'stores' | 'logs'
  const [activeView, setActiveView] = useState<'list' | 'stores' | 'logs'>('list');
  // Layout mode: 'grid' | 'rows'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'rows'>('grid');

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Allt');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [onlyMultiStore, setOnlyMultiStore] = useState(false);
  const [sortBy, setSortBy] = useState<'savings' | 'asc' | 'desc' | 'drop'>('savings');

  // Inline selected storage per model card/row
  const [cardStorageMap, setCardStorageMap] = useState<Record<string, string>>({});

  // Selected phone for detail modal / inspector
  const [selectedModel, setSelectedModel] = useState<PhoneModelGroup | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string>('');

  // Raw JSON & Summary Inspector modal
  const [rawJsonPayload, setRawJsonPayload] = useState<unknown>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [rawJsonTab, setRawJsonTab] = useState<'summary' | 'all' | 'meta' | 'sample'>('summary');
  const [rawSearchFilter, setRawSearchFilter] = useState('');
  const [copiedRaw, setCopiedRaw] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suppress transitions briefly during theme change to avoid color smearing
  const applyThemeWithTransitionSuppression = useCallback((nextDark: boolean, metaValue: string) => {
    const style = document.createElement('style');
    style.append(document.createTextNode('*,*::before,*::after{transition:none !important}'));
    document.head.append(style);

    const metaEl = document.querySelector('meta[name="color-scheme"]');
    if (metaEl) metaEl.setAttribute('content', metaValue);
    document.documentElement.classList.toggle('dark', nextDark);
    setIsDark(nextDark);

    void document.body.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => style.remove());
    });
  }, []);

  // Initialize and synchronize color scheme across system changes and tabs
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const syncFromStorageAndSystem = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('color-scheme');
      } catch {
        // Ignore blocked storage
      }
      const nextDark = stored === 'dark' || (stored !== 'light' && mql.matches);
      applyThemeWithTransitionSuppression(nextDark, stored ?? 'light dark');
    };

    syncFromStorageAndSystem();

    const onMqlChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('color-scheme');
      } catch {
        // Ignore
      }
      // Do NOT remove stored value if OS happens to match it; only update if following system default
      if (!stored) {
        applyThemeWithTransitionSuppression(mql.matches, 'light dark');
      }
    };

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        syncFromStorageAndSystem();
      }
    };

    mql.addEventListener('change', onMqlChange);
    window.addEventListener('storage', onStorageChange);
    return () => {
      mql.removeEventListener('change', onMqlChange);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [applyThemeWithTransitionSuppression]);

  const handleToggleTheme = () => {
    const target: 'light' | 'dark' = isDark ? 'light' : 'dark';
    const systemScheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    let metaContent = 'light dark';
    try {
      if (target === systemScheme) {
        localStorage.removeItem('color-scheme');
        metaContent = 'light dark';
      } else {
        localStorage.setItem('color-scheme', target);
        metaContent = target;
      }
    } catch {
      metaContent = target;
    }

    applyThemeWithTransitionSuppression(target === 'dark', metaContent);
  };

  const fetchPhones = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/phones');
      if (!res.ok) throw new Error('Mistókst að sækja gögn');
      const data = await res.json();

      // Synchronize client-side persistent catalog and price history ledger
      let syncedModels: PhoneModelGroup[] = data.models || [];
      try {
        localStorage.removeItem('farsimar_catalog_backup_v1');
        const savedCatalogRaw = localStorage.getItem('farsimar_catalog_backup_v2');
        const savedCatalog: Record<string, PhoneModelGroup> = savedCatalogRaw
          ? JSON.parse(savedCatalogRaw)
          : {};

        for (const m of data.models || []) {
          savedCatalog[m.id] = m;
        }

        const modelMapAll = new Map<string, PhoneModelGroup>();
        for (const m of Object.values(savedCatalog)) {
          modelMapAll.set(m.id, m);
        }
        for (const m of data.models || []) {
          modelMapAll.set(m.id, m);
        }

        const consolidated = Array.from(modelMapAll.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'is')
        );
        localStorage.setItem('farsimar_catalog_backup_v2', JSON.stringify(savedCatalog));

        const localHistoryRaw = localStorage.getItem('farsimar_price_history_v1');
        const localHistory: Record<string, PricePoint[]> = localHistoryRaw ? JSON.parse(localHistoryRaw) : {};
        const today = new Date().toISOString().slice(0, 10);

        syncedModels = consolidated.map((m: PhoneModelGroup) => {
          let hist =
            localHistory[m.id] && localHistory[m.id].length > (m.history?.length || 0)
              ? localHistory[m.id]
              : m.history && m.history.length > 0
              ? m.history
              : [{ date: today, price: m.lowestPrice }];

          const lastPoint = hist[hist.length - 1];
          if (!lastPoint) {
            hist = [{ date: today, price: m.lowestPrice }];
          } else if (lastPoint.date === today) {
            if (lastPoint.price !== m.lowestPrice) {
              lastPoint.price = m.lowestPrice;
            }
          } else {
            hist.push({ date: today, price: m.lowestPrice });
          }
          localHistory[m.id] = hist;

          const initial = hist[0]?.price || m.lowestPrice;
          const current = m.lowestPrice;
          const diff = current - initial;
          const pct = initial > 0 ? Math.round((diff / initial) * 100) : 0;
          const trend: 'DOWN' | 'UP' | 'SAME' = diff < 0 ? 'DOWN' : diff > 0 ? 'UP' : 'SAME';

          return {
            ...m,
            history: hist,
            trend,
            priceChangePercent: pct,
            priceChangeAmount: diff,
          };
        });

        localStorage.setItem('farsimar_price_history_v1', JSON.stringify(localHistory));
      } catch {
        syncedModels = data.models || [];
      }

      setModels(syncedModels);
      setMeta(data.meta || null);
      setRawJsonPayload(data);

      // Record to execution logs
      const newEntry: RunLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: data.meta?.lastRun || new Date().toISOString(),
        durationMs: data.meta?.durationMs || 0,
        modelsCount: data.models?.length || 0,
        storesCount: data.meta?.totalStores || 0,
        status: 'SUCCESS',
      };

      setLogs((prev) => {
        const updated = [newEntry, ...prev.filter((l) => l.timestamp !== newEntry.timestamp)].slice(0, 15);
        try {
          localStorage.setItem('farsimar_run_logs', JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Óþekkt villa');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('farsimar_run_logs');
      if (saved) setLogs(JSON.parse(saved));
    } catch {
      // Ignore
    }
    fetchPhones();
  }, [fetchPhones]);

  // Keyboard shortcuts: '/' focuses search, 'Escape' closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedModel) setSelectedModel(null);
        else if (showRawJsonModal) setShowRawJsonModal(false);
        return;
      }
      if (
        e.key === '/' &&
        !selectedModel &&
        !showRawJsonModal &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel, showRawJsonModal]);

  const handleSelectModel = (model: PhoneModelGroup, defaultStorage?: string) => {
    setSelectedModel(model);
    const chosen = defaultStorage || cardStorageMap[model.id];
    if (chosen && model.variants.some((v) => v.storage === chosen)) {
      setSelectedStorage(chosen);
    } else if (model.variants.length > 0) {
      setSelectedStorage(model.variants[0].storage);
    } else {
      setSelectedStorage('');
    }
  };

  const filteredModels = useMemo(() => {
    let result = [...models];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brand.toLowerCase().includes(q) ||
          m.variants.some((v) => v.storage.toLowerCase().includes(q)) ||
          m.stores.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (selectedBrand !== 'Allt') {
      result = result.filter((m) => m.brand === selectedBrand);
    }

    if (selectedStore !== 'Allt') {
      result = result.filter((m) => m.stores.includes(selectedStore));
    }

    if (onlyMultiStore) {
      result = result.filter((m) => m.storesCount >= 2);
    }

    if (priceRange !== 'all') {
      result = result.filter((m) => {
        if (priceRange === 'under50') return m.lowestPrice < 50000;
        if (priceRange === '50to120') return m.lowestPrice >= 50000 && m.lowestPrice <= 120000;
        if (priceRange === '120to200') return m.lowestPrice > 120000 && m.lowestPrice <= 200000;
        if (priceRange === 'over200') return m.lowestPrice > 200000;
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'savings') {
        if (b.maxSavings !== a.maxSavings) return b.maxSavings - a.maxSavings;
        return b.storesCount - a.storesCount;
      }
      if (sortBy === 'drop') return a.priceChangePercent - b.priceChangePercent;
      if (sortBy === 'asc') return a.lowestPrice - b.lowestPrice;
      if (sortBy === 'desc') return b.lowestPrice - a.lowestPrice;
      return a.name.localeCompare(b.name, 'is');
    });

    return result;
  }, [models, search, selectedBrand, selectedStore, onlyMultiStore, priceRange, sortBy]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('is-IS').format(p) + ' kr.';
  };

  const formatDate = (iso: string) => {
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

  const getStoreBadgeColor = (store: string) => {
    const s = store.toLowerCase();
    if (s.includes('elko')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25';
    if (s.includes('nova')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25';
    if (s.includes('síminn') || s.includes('siminn')) return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25';
    if (s.includes('sýn') || s.includes('vodafone')) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25';
    if (s.includes('emobi')) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/25';
    if (s.includes('tölvulistinn')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/25';
    if (s.includes('tölvutek')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25';
    if (s.includes('computer')) return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/25';
    if (s.includes('tölvutækni')) return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25';
    if (s.includes('mi búðin')) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/25';
    if (s.includes('coolshop')) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/25';
    if (s.includes('ormsson')) return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25';
    return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/80';
  };

  const getStoreFavicon = (store: string): string | null => {
    const s = store.toLowerCase();
    if (s.includes('elko')) return 'https://www.google.com/s2/favicons?domain=elko.is&sz=64';
    if (s.includes('nova')) return 'https://www.google.com/s2/favicons?domain=nova.is&sz=64';
    if (s.includes('síminn') || s.includes('siminn')) return 'https://www.google.com/s2/favicons?domain=siminn.is&sz=64';
    if (s.includes('sýn') || s.includes('vodafone')) return 'https://www.google.com/s2/favicons?domain=syn.is&sz=64';
    if (s.includes('emobi')) return 'https://www.google.com/s2/favicons?domain=emobi.is&sz=64';
    if (s.includes('mi búðin') || s.includes('mibudin')) return 'https://www.google.com/s2/favicons?domain=mibudin.is&sz=64';
    if (s.includes('tölvulistinn')) return 'https://www.google.com/s2/favicons?domain=tl.is&sz=64';
    if (s.includes('tölvutek')) return 'https://www.google.com/s2/favicons?domain=tolvutek.is&sz=64';
    if (s.includes('computer')) return 'https://www.google.com/s2/favicons?domain=computer.is&sz=64';
    if (s.includes('tölvutækni')) return 'https://www.google.com/s2/favicons?domain=tolvutaekni.is&sz=64';
    if (s.includes('coolshop')) return 'https://www.google.com/s2/favicons?domain=coolshop.is&sz=64';
    if (s.includes('ormsson')) return 'https://www.google.com/s2/favicons?domain=ormsson.is&sz=64';
    if (s.includes('ofar')) return 'https://www.google.com/s2/favicons?domain=ofar.is&sz=64';
    if (s.includes('heimilistæki')) return 'https://www.google.com/s2/favicons?domain=ht.is&sz=64';
    if (s.includes('goshop')) return 'https://icon.horse/icon/goshop.is';
    if (s.includes('tunglskin')) return 'https://icon.horse/icon/tunglskin.is';
    return null;
  };

  const currentVariant = useMemo(() => {
    if (!selectedModel) return null;
    return (
      selectedModel.variants.find((v) => v.storage === selectedStorage) ||
      selectedModel.variants[0]
    );
  }, [selectedModel, selectedStorage]);

  const summaryStats = useMemo(() => {
    const drops = models.filter((m) => m.trend === 'DOWN');
    const hikes = models.filter((m) => m.trend === 'UP');
    const unchanged = models.filter((m) => m.trend === 'SAME');

    const brandCounts: Record<string, number> = {};
    for (const m of models) {
      brandCounts[m.brand] = (brandCounts[m.brand] || 0) + 1;
    }
    const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);

    return {
      dropsCount: drops.length,
      hikesCount: hikes.length,
      unchangedCount: unchanged.length,
      sortedBrands,
      topSavings: meta?.topSavings || [],
      biggestDrops: meta?.biggestDrops || [],
      storeSummaries: meta?.storeSummaries || [],
    };
  }, [models, meta]);

  // Formatted Raw JSON string for modal inspector
  const rawFormattedJson = useMemo(() => {
    if (!rawJsonPayload) return '// Engin gögn hlaðin ennþá...';
    const payload = rawJsonPayload as { meta?: MetaData; models?: PhoneModelGroup[] };
    let targetData: unknown = payload;
    if (rawJsonTab === 'meta') {
      targetData = payload.meta || {};
    } else if (rawJsonTab === 'sample') {
      targetData = {
        info: 'Sýnishorn af fyrstu 10 símalíkönum úr skanna',
        sampleCount: Math.min(10, payload.models?.length || 0),
        models: (payload.models || []).slice(0, 10),
      };
    }

    const fullStr = JSON.stringify(targetData, null, 2);
    if (!rawSearchFilter.trim()) return fullStr;

    const q = rawSearchFilter.toLowerCase();
    const lines = fullStr.split('\n');
    const matchedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length - 1, i + 2);
        matchedLines.push(`// --- Lína ${i + 1} ---`);
        for (let j = start; j <= end; j++) {
          matchedLines.push(lines[j]);
        }
        matchedLines.push('');
        i = end;
      }
    }
    return matchedLines.length > 0
      ? matchedLines.join('\n')
      : `// Engar línur fundust með leitarorðinu "${rawSearchFilter}"`;
  }, [rawJsonPayload, rawJsonTab, rawSearchFilter]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawFormattedJson);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(rawJsonPayload || { meta, models }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farsimavaktin-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to render SVG Trend Chart inside modal
  const renderTrendSvg = (points: PricePoint[], width = 520, height = 110) => {
    if (!points || points.length === 0) return null;

    if (points.length === 1) {
      const p = points[0];
      const y = height / 2;
      return (
        <div className="relative py-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
            <line
              x1={20}
              y1={y}
              x2={width - 20}
              y2={y}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle cx={width / 2} cy={y} r={5} fill="#10b981" stroke="#064e3b" strokeWidth="2" />
          </svg>
          <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 px-1 tabular-nums">
            <span>Fyrsta skráning: {p.date}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Lægsta verð: {formatPrice(p.price)}
            </span>
          </div>
        </div>
      );
    }

    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = 20;

    const coords = points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.price - min) / range) * (height - padding * 2);
      return { x, y, price: p.price, date: p.date };
    });

    const pathD = coords.reduce((acc, c, i) => {
      return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, '');

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    const isDrop = points[points.length - 1].price < points[0].price;
    const isUp = points[points.length - 1].price > points[0].price;
    const strokeColor = isDrop ? '#10b981' : isUp ? '#f43f5e' : '#3b82f6';

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#grad-area)" />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === 0 || i === coords.length - 1 ? 4.5 : 3}
              fill={i === coords.length - 1 ? strokeColor : isDark ? '#09090b' : '#ffffff'}
              stroke={strokeColor}
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 px-1 tabular-nums">
          <span>Upphaf ({points[0].date}): {formatPrice(points[0].price)}</span>
          <span
            className={`font-semibold ${
              isDrop
                ? 'text-emerald-600 dark:text-emerald-400'
                : isUp
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            Nú ({points[points.length - 1].date}): {formatPrice(points[points.length - 1].price)}
          </span>
        </div>
      </div>
    );
  };

  const hasActiveFilters =
    selectedBrand !== 'Allt' ||
    selectedStore !== 'Allt' ||
    priceRange !== 'all' ||
    onlyMultiStore ||
    search.trim().length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200 relative overflow-x-hidden">
      {/* Ambient Subtle Top Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(16,185,129,0.08),rgba(59,130,246,0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(16,185,129,0.10),rgba(59,130,246,0.05),transparent)] z-0"
      />

      {/* Sticky Glass Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-white/[0.07] bg-white/85 dark:bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-500/10 border border-emerald-600/25 dark:border-emerald-500/30 flex items-center justify-center shadow-xs shrink-0">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Farsímavaktin
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  BEIN VÖKTUN
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                Rauntíma verðsamanburður á {models.length} símalíkönum hjá {meta?.totalStores || 10} íslenskum verslunum
              </p>
            </div>
          </div>

          {/* Segmented View Switcher, Theme Toggle & Refresh */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <nav
              aria-label="Aðalvalmynd"
              className="bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.08] p-1 rounded-xl flex items-center text-xs"
            >
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span>Vörur</span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums hidden sm:inline">
                  ({models.length})
                </span>
              </button>

              <button
                onClick={() => setActiveView('stores')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'stores'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <span>Verslanir</span>
              </button>

              <button
                onClick={() => setActiveView('logs')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'logs'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <span>Kerfisvakt</span>
              </button>
            </nav>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors duration-150 motion-safe:enabled:active:scale-[0.96]"
              title={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
              aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <span className="hidden md:inline">Ljóst</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <span className="hidden md:inline">Dökkt</span>
                </>
              )}
            </button>

            {/* Refresh Action */}
            <button
              onClick={() => fetchPhones(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] disabled:opacity-50"
              title="Sækja nýjustu verð"
            >
              <svg
                className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{refreshing ? 'Uppfæri...' : 'Uppfæra'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* VIEW 1: PRODUCT CATALOG & PRICE COMPARISON */}
        {activeView === 'list' && (
          <>
            {/* SPOTLIGHT BENTO: Top Price Differences / Savings Today */}
            {meta?.topSavings && meta.topSavings.length > 0 && (
              <section aria-label="Mestur verðmunur í dag" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      Mestur verðmunur á sama síma í dag
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    Sparaðu allt að{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatPrice(meta.topSavings[0]?.savings || 0)}
                    </strong>{' '}
                    með því að velja ódýrustu verslunina
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {meta.topSavings.map((item) => {
                    const model = models.find((m) => m.id === item.id);
                    const cheapFav = getStoreFavicon(item.cheapestStore);
                    const expFav = getStoreFavicon(item.expensiveStore);
                    return (
                      <div
                        key={`${item.id}-${item.variantStorage || ''}`}
                        onClick={() => model && handleSelectModel(model, item.variantStorage)}
                        className="group cursor-pointer rounded-2xl bg-white dark:bg-zinc-900/70 hover:bg-zinc-50/80 dark:hover:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.07] hover:border-emerald-500/50 dark:hover:border-emerald-500/40 p-3.5 transition-colors duration-150 flex flex-col justify-between shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 border border-zinc-200/70 dark:border-white/[0.05]">
                              {item.brand} {item.variantStorage ? `· ${item.variantStorage}` : ''}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/25 tabular-nums">
                              Sparar {formatPrice(item.savings)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {model?.image && (
                              <div className="w-10 h-10 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={model.image}
                                  alt={item.name}
                                  className="max-h-full max-w-full object-contain"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  {cheapFav && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={cheapFav}
                                      alt={item.cheapestStore}
                                      className="w-3.5 h-3.5 rounded-xs object-contain"
                                      loading="lazy"
                                    />
                                  )}
                                  {item.cheapestStore}
                                </span>
                                <span className="text-zinc-400 dark:text-zinc-600">vs</span>
                                <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                  {expFav && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={expFav}
                                      alt={item.expensiveStore}
                                      className="w-3 h-3 rounded-xs object-contain opacity-75"
                                      loading="lazy"
                                    />
                                  )}
                                  {item.expensiveStore}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 mt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-baseline justify-between tabular-nums">
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through">
                            {formatPrice(item.highestPrice)}
                          </span>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                            {formatPrice(item.lowestPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* COMMAND & FILTER BAR */}
            <section
              aria-label="Leit og síur"
              className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-3.5 shadow-xs dark:shadow-lg backdrop-blur-md"
            >
              {/* Row 1: Search Input + Store Select + Sort Select + Layout Switcher */}
              <div className="flex flex-col lg:flex-row gap-2.5">
                {/* Search Box with '/' shortcut */}
                <div className="relative flex-1">
                  <svg
                    className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Leita að síma, framleiðanda, verslun eða geymslu (t.d. iPhone 16 Pro, S25, Pixel, 256GB)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-white/[0.09] focus:border-emerald-500 dark:focus:border-emerald-500/60 rounded-xl pl-10 pr-14 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  {search ? (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[11px] font-medium"
                    >
                      Hreinsa
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-md pointer-events-none">
                      /
                    </kbd>
                  )}
                </div>

                {/* Controls Group */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  {/* Store Filter */}
                  <select
                    aria-label="Sía eftir verslun"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-white/[0.09] hover:border-zinc-300 dark:hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Allt">Allar verslanir ({meta?.totalStores || 10})</option>
                    {meta?.storesList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Sort Filter */}
                  <select
                    aria-label="Raða vörum"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'savings' | 'asc' | 'desc' | 'drop')}
                    className="bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-white/[0.09] hover:border-zinc-300 dark:hover:border-white/20 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="savings">Mestur sparnaður milli búða</option>
                    <option value="asc">Verð: Ódýrast fyrst</option>
                    <option value="desc">Verð: Dýrast fyrst</option>
                    <option value="drop">Mest lækkað yfir tíma</option>
                  </select>

                  {/* Grid vs Row View Switcher */}
                  <div
                    role="group"
                    aria-label="Útlit vörulista"
                    className="bg-zinc-100 dark:bg-zinc-950/90 border border-zinc-200 dark:border-white/[0.09] p-1 rounded-xl flex items-center shrink-0"
                  >
                    <button
                      onClick={() => setLayoutMode('grid')}
                      title="Spjaldayfirlit"
                      className={`p-1.5 rounded-lg transition-colors ${
                        layoutMode === 'grid'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setLayoutMode('rows')}
                      title="Þéttur línulisti"
                      className={`p-1.5 rounded-lg transition-colors ${
                        layoutMode === 'rows'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Brand Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {[
                  { id: 'Allt', label: 'Allir símar' },
                  { id: 'Apple', label: 'Apple' },
                  { id: 'Samsung', label: 'Samsung' },
                  { id: 'Xiaomi', label: 'Xiaomi' },
                  { id: 'Google', label: 'Google Pixel' },
                  { id: 'OnePlus', label: 'OnePlus' },
                  { id: 'Nothing', label: 'Nothing' },
                  { id: 'Motorola', label: 'Motorola' },
                  { id: 'OPPO', label: 'OPPO' },
                  { id: 'Nokia', label: 'Nokia / HMD' },
                  { id: 'Ulefone', label: 'Ulefone' },
                  { id: 'Aðrir', label: 'Aðrir' },
                ].map((b) => {
                  const count =
                    b.id === 'Allt' ? models.length : models.filter((m) => m.brand === b.id).length;
                  if (b.id !== 'Allt' && count === 0) return null;
                  const active = selectedBrand === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrand(b.id)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] border ${
                        active
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white font-semibold shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-950/70 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                          active
                            ? 'bg-white/20 dark:bg-zinc-900/15 text-white dark:text-zinc-900 font-bold'
                            : 'bg-zinc-200/70 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Price Range Quick-Filters & Multi-store Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] mr-1 shrink-0">Verðbil:</span>
                  {(
                    [
                      { id: 'all', label: 'Öll verð' },
                      { id: 'under50', label: '< 50 þús.' },
                      { id: '50to120', label: '50–120 þús.' },
                      { id: '120to200', label: '120–200 þús.' },
                      { id: 'over200', label: '200 þús.+' },
                    ] as { id: PriceRangeFilter; label: string }[]
                  ).map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => setPriceRange(pr.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                        priceRange === pr.id
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-white/[0.06] hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOnlyMultiStore((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                      onlyMultiStore
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/35'
                        : 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-white/[0.06] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        onlyMultiStore ? 'bg-blue-500 dark:bg-blue-400' : 'bg-zinc-400 dark:bg-zinc-600'
                      }`}
                    />
                    Í 2+ búðum ({models.filter((m) => m.storesCount >= 2).length})
                  </button>

                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSelectedBrand('Allt');
                        setSelectedStore('Allt');
                        setPriceRange('all');
                        setOnlyMultiStore(false);
                        setSearch('');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/25 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                    >
                      Hreinsa síur
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* RESULTS STATUS LINE */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <div className="flex items-center gap-2">
                <span>
                  Sýni <strong className="text-zinc-900 dark:text-white font-semibold tabular-nums">{filteredModels.length}</strong> af{' '}
                  <span className="tabular-nums">{models.length}</span> símalíkönum
                  {selectedBrand !== 'Allt' && ` · ${selectedBrand}`}
                  {selectedStore !== 'Allt' && ` · ${selectedStore}`}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Veldu geymslupláss beint á spjaldi eða smelltu til að opna fullan verðsamanburð
              </span>
            </div>

            {/* LOADING / ERROR / EMPTY STATES */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-white dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-white/[0.06] rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900/40 border border-rose-300 dark:border-rose-500/25 rounded-2xl p-6">
                <p className="text-rose-600 dark:text-rose-400 text-sm font-semibold">{error}</p>
                <button
                  onClick={() => fetchPhones(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-white"
                >
                  Reyna aftur
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-white/[0.06] rounded-2xl space-y-3">
                <p className="text-zinc-600 dark:text-zinc-300 text-sm font-medium">
                  Engir símar fundust með völdum síum
                </p>
                <button
                  onClick={() => {
                    setSelectedBrand('Allt');
                    setSelectedStore('Allt');
                    setPriceRange('all');
                    setOnlyMultiStore(false);
                    setSearch('');
                  }}
                  className="text-xs px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-200 font-medium transition-colors"
                >
                  Endurstilla allar síur
                </button>
              </div>
            ) : layoutMode === 'grid' ? (
              /* MODERN BENTO PRODUCT GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model, idx) => {
                  const activeStorage = cardStorageMap[model.id] || model.variants[0]?.storage || '';
                  const activeVariant =
                    model.variants.find((v) => v.storage === activeStorage) || model.variants[0];
                  const sortedOffers = activeVariant
                    ? [...activeVariant.offers].sort((a, b) => a.price - b.price)
                    : [];
                  const variantSavings =
                    sortedOffers.length >= 2
                      ? sortedOffers[sortedOffers.length - 1].price - sortedOffers[0].price
                      : 0;

                  return (
                    <article
                      key={model.id}
                      onClick={() => handleSelectModel(model, activeVariant?.storage)}
                      className={`group cursor-pointer rounded-2xl bg-white dark:bg-zinc-900/65 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/95 border border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/[0.16] p-4 flex flex-col justify-between transition-colors duration-150 shadow-xs ${
                        idx >= 12 ? 'deferred-phone-card' : ''
                      }`}
                    >
                      <div>
                        {/* Card Top: Studio Image Pedestal + Title + Storage Selector */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-16 h-16 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10 shadow-2xs">
                            {model.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={model.image}
                                alt={model.name}
                                className="max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                {model.brand}
                              </span>
                              {variantSavings > 0 ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25 tabular-nums">
                                  Sparar {formatPrice(variantSavings)}
                                </span>
                              ) : model.priceChangePercent < 0 ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25 tabular-nums">
                                  {model.priceChangePercent}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                                  {model.storesCount} {model.storesCount === 1 ? 'verslun' : 'verslanir'}
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {model.name}
                            </h3>

                            {/* Interactive Storage Pills right on the card */}
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {model.variants.map((v) => {
                                const isSelected = activeVariant?.storage === v.storage;
                                return (
                                  <button
                                    key={v.storage}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCardStorageMap((prev) => ({
                                        ...prev,
                                        [model.id]: v.storage,
                                      }));
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors border ${
                                      isSelected
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-white font-semibold'
                                        : 'bg-zinc-100 dark:bg-zinc-950/90 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200'
                                    }`}
                                  >
                                    {v.storage}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Direct Store Offers Comparison List inside Card */}
                        <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-white/[0.06] space-y-1.5">
                          {sortedOffers.slice(0, 3).map((offer, oIdx) => {
                            const fav = getStoreFavicon(offer.store) || offer.storeLogo;
                            const isCheapest = oIdx === 0;
                            return (
                              <a
                                key={offer.store}
                                href={offer.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors border ${
                                  isCheapest
                                    ? 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.14] border-emerald-200/80 dark:border-emerald-500/25 text-zinc-900 dark:text-white'
                                    : 'bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-950/60 dark:hover:bg-zinc-950 border-zinc-200/60 dark:border-white/[0.05] text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {fav && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={fav}
                                      alt={offer.store}
                                      className="w-4 h-4 rounded-xs object-contain shrink-0"
                                      loading="lazy"
                                    />
                                  )}
                                  <span className="font-medium truncate">{offer.store}</span>
                                  {isCheapest && sortedOffers.length > 1 && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                      Ódýrast
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                                  <span
                                    className={`font-bold ${
                                      isCheapest
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-zinc-800 dark:text-zinc-200'
                                    }`}
                                  >
                                    {formatPrice(offer.price)}
                                  </span>
                                  <svg className="w-3 h-3 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                  </svg>
                                </div>
                              </a>
                            );
                          })}

                          {sortedOffers.length > 3 && (
                            <div className="text-[11px] text-center text-zinc-500 dark:text-zinc-400 pt-0.5">
                              + {sortedOffers.length - 3} verslanir í viðbót
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                        <div className="tabular-nums">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                            Lægsta verð ({activeVariant?.storage}):
                          </span>
                          <span className="text-base font-extrabold text-zinc-900 dark:text-white">
                            {formatPrice(activeVariant?.lowestPrice || model.lowestPrice)}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white bg-zinc-100 dark:bg-zinc-800/80 group-hover:bg-zinc-200/80 dark:group-hover:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/[0.07] transition-colors">
                          <span>Skoða samanburð</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* COMPACT HIGH-DENSITY ROW LIST VIEW */
              <div className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.08] overflow-hidden divide-y divide-zinc-100 dark:divide-white/[0.06] shadow-xs">
                {filteredModels.map((model, idx) => {
                  const activeStorage = cardStorageMap[model.id] || model.variants[0]?.storage || '';
                  const activeVariant =
                    model.variants.find((v) => v.storage === activeStorage) || model.variants[0];
                  const sortedOffers = activeVariant
                    ? [...activeVariant.offers].sort((a, b) => a.price - b.price)
                    : [];
                  const variantSavings =
                    sortedOffers.length >= 2
                      ? sortedOffers[sortedOffers.length - 1].price - sortedOffers[0].price
                      : 0;

                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model, activeVariant?.storage)}
                      className={`p-3.5 sm:px-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/95 cursor-pointer transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                        idx >= 18 ? 'deferred-phone-row' : ''
                      }`}
                    >
                      {/* Left: White Studio Thumbnail + Title + Storage Pills + Store Chips */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10">
                          {model.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={model.image}
                              alt={model.name}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              {model.brand}
                            </span>
                            {variantSavings > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/25 tabular-nums">
                                Sparar {formatPrice(variantSavings)}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {model.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {model.variants.map((v) => {
                              const isSelected = activeVariant?.storage === v.storage;
                              return (
                                <button
                                  key={v.storage}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardStorageMap((prev) => ({
                                      ...prev,
                                      [model.id]: v.storage,
                                    }));
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors border ${
                                    isSelected
                                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-white font-semibold'
                                      : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200'
                                  }`}
                                >
                                  {v.storage}
                                </button>
                              );
                            })}

                            <span className="text-zinc-300 dark:text-zinc-700 text-xs mx-0.5">·</span>

                            {sortedOffers.slice(0, 4).map((offer, oIdx) => {
                              const fav = getStoreFavicon(offer.store);
                              return (
                                <span
                                  key={offer.store}
                                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border tabular-nums ${
                                    oIdx === 0
                                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-medium'
                                      : 'bg-zinc-50 dark:bg-zinc-950/90 border-zinc-200/80 dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  {fav && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={fav}
                                      alt={offer.store}
                                      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                                      loading="lazy"
                                    />
                                  )}
                                  <span>{offer.store}</span>
                                  <span className="text-zinc-500 dark:text-zinc-400">{formatPrice(offer.price)}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Lowest Price & Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1 border-t sm:border-t-0 border-zinc-100 dark:border-white/[0.06] pt-2 sm:pt-0 tabular-nums">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                            Lægsta verð ({activeVariant?.storage}):
                          </span>
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatPrice(activeVariant?.lowestPrice || model.lowestPrice)}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white inline-flex items-center gap-1">
                          <span>Allar verslanir ({sortedOffers.length})</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: VERSLANAGREINING & VERÐBREYTINGAR PER BÚÐ */}
        {activeView === 'stores' && (
          <div className="space-y-6">
            {/* Store Analytics Header */}
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs dark:shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                    Verslanagreining og verðstaða á markaði
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Samanburður á því hvaða verslanir bjóða oftast lægsta verðið og hvernig verð hreyfast á milli daga.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {meta?.totalStores || 0} verslanir virkar
                  </span>
                </div>
              </div>

              {/* KPI Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-100 dark:border-white/[0.07] text-xs tabular-nums">
                <div className="bg-zinc-50 dark:bg-zinc-950/90 p-4 rounded-xl border border-zinc-200/70 dark:border-white/[0.07]">
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Flest lægstu verð á markaðnum</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-2">
                    {getStoreFavicon(meta?.storeSummaries?.[0]?.store || 'Nova') && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={getStoreFavicon(meta?.storeSummaries?.[0]?.store || 'Nova')!}
                        alt={meta?.storeSummaries?.[0]?.store || 'Nova'}
                        className="w-4 h-4 rounded-xs object-contain shrink-0"
                        loading="lazy"
                      />
                    )}
                    {meta?.storeSummaries?.[0]?.store || 'Nova'} ({meta?.storeSummaries?.[0]?.cheapestCount || 0} símar)
                  </span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/90 p-4 rounded-xl border border-zinc-200/70 dark:border-white/[0.07]">
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Heildarverðlækkanir í dag</span>
                  <span className="text-sm sm:text-base font-bold text-cyan-600 dark:text-cyan-400 mt-1.5 block">
                    {meta?.storeSummaries?.reduce((acc, s) => acc + s.dropsCount, 0) || 0} símar lækkuðu
                  </span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/90 p-4 rounded-xl border border-zinc-200/70 dark:border-white/[0.07]">
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Heildarverðhækkanir í dag</span>
                  <span className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 mt-1.5 block">
                    {meta?.storeSummaries?.reduce((acc, s) => acc + s.hikesCount, 0) || 0} símar hækkuðu
                  </span>
                </div>
              </div>
            </div>

            {/* Stores Scoreboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(meta?.storeSummaries || []).map((st) => {
                const isLeader =
                  st.cheapestCount > 0 &&
                  st.cheapestCount === (meta?.storeSummaries?.[0]?.cheapestCount || 0);
                return (
                  <div
                    key={st.store}
                    className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.15] rounded-2xl p-5 shadow-xs dark:shadow-md flex flex-col justify-between space-y-4 transition-colors"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border font-bold ${getStoreBadgeColor(st.store)}`}>
                            {getStoreFavicon(st.store) && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={getStoreFavicon(st.store)!}
                                alt={st.store}
                                className="w-4 h-4 rounded-xs object-contain shrink-0"
                                loading="lazy"
                              />
                            )}
                            {st.store}
                          </span>
                          {isLeader && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                              Verðleiðtogi
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                          {st.totalPhones} símar í boði
                        </span>
                      </div>

                      {/* Store Metrics */}
                      <div className="grid grid-cols-2 gap-2.5 text-xs mb-3 tabular-nums">
                        <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Lægst verð á markaði</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                            Í {st.cheapestCount} líkönum
                          </span>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Heildarbreyting í dag</span>
                          <span
                            className={`text-sm font-bold mt-0.5 block ${
                              st.netChangeAmount < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : st.netChangeAmount > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {st.netChangeAmount < 0
                              ? `-${formatPrice(Math.abs(st.netChangeAmount))}`
                              : st.netChangeAmount > 0
                              ? `+${formatPrice(st.netChangeAmount)}`
                              : 'Óbreytt verð'}
                          </span>
                        </div>
                      </div>

                      {/* Daily Changes Breakdown */}
                      <div className="flex items-center justify-between text-[11px] px-3 py-2 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200/60 dark:border-white/[0.05] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {st.dropsCount} lækkanir
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          {st.hikesCount} hækkanir
                        </span>
                        <span className="text-zinc-500">
                          {st.unchangedCount} óbreytt
                        </span>
                      </div>

                      {/* Biggest Drop at Store */}
                      {st.biggestDrop && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/20 text-xs tabular-nums">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block mb-0.5">
                            Mesta lækkun dagsins hjá {st.store}:
                          </span>
                          <div className="flex items-baseline justify-between text-zinc-800 dark:text-zinc-200">
                            <span className="font-semibold line-clamp-1 mr-2">{st.biggestDrop.modelName}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              -{formatPrice(st.biggestDrop.dropAmount)} (-{st.biggestDrop.dropPercent}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSelectedStore(st.store);
                        setActiveView('list');
                      }}
                      className="w-full text-xs font-semibold py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-900 dark:hover:bg-white text-zinc-800 dark:text-zinc-200 hover:text-white dark:hover:text-zinc-950 border border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-150 motion-safe:enabled:active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <span>Skoða alla síma hjá {st.store} ({st.totalPhones})</span>
                      <span>→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: LOGS & KEYRSLUFERILL */}
        {activeView === 'logs' && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                    Vöktunarstaða og keyrsluferill
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Rauntímayfirlit yfir gagnasöfnun úr 43 vörustraumum hjá íslenskum verslunum.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setRawJsonTab('summary');
                      setShowRawJsonModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] transition-colors"
                  >
                    <span>Skoða samantekt & JSON</span>
                  </button>

                  <button
                    onClick={() => fetchPhones(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    <svg
                      className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {refreshing ? 'Keyri uppfærslu...' : 'Keyra uppfærslu núna'}
                  </button>
                </div>
              </div>

              {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-100 dark:border-white/[0.07] tabular-nums">
                  <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Síðast keyrt</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {formatDate(meta.lastRun)}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Svarstími bakenda</span>
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5 block">
                      {meta.durationMs} ms
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Símar / Verslanir</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block">
                      {meta.totalModels} líkön / {meta.totalStores} búðir
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-200/70 dark:border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Stöðukóði</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ● 200 OK ({meta.status})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Active Connected Stores */}
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs dark:shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Tengdar verslanir í vöktun ({meta?.totalStores || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {meta?.storesList.map((st) => (
                  <span
                    key={st}
                    className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border font-semibold ${getStoreBadgeColor(st)}`}
                  >
                    {getStoreFavicon(st) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={getStoreFavicon(st)!}
                        alt={st}
                        className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <span>●</span>
                    )}
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Ferill síðustu keyrslna
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Smelltu á línu til að opna framkvæmdasamantekt eða skoða JSON hrágögn
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRawJsonTab('summary');
                    setShowRawJsonModal(true);
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] transition-colors"
                >
                  Opna samantekt
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60">
                    <tr>
                      <th className="py-2.5 px-3">Tímasetning</th>
                      <th className="py-2.5 px-3">Staða</th>
                      <th className="py-2.5 px-3">Símar fundnir</th>
                      <th className="py-2.5 px-3">Verslanir</th>
                      <th className="py-2.5 px-3">Svarstími</th>
                      <th className="py-2.5 px-3 text-right">Aðgerð</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06] text-zinc-700 dark:text-zinc-300">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => {
                          setRawJsonTab('summary');
                          setShowRawJsonModal(true);
                        }}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3 font-mono text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                            ● {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">
                          {log.modelsCount} líkön
                        </td>
                        <td className="py-2.5 px-3">{log.storesCount} verslanir</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">{log.durationMs} ms</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRawJsonTab('summary');
                              setShowRawJsonModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-900 dark:group-hover:bg-white text-[11px] font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-zinc-950 transition-colors"
                          >
                            Samantekt →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: PHONE COMPARISON & PRICE HISTORY INSPECTOR */}
        {selectedModel && (
          <div
            onClick={() => setSelectedModel(null)}
            className="modal-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-phone-title"
              className="modal-scroll-container bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 bg-white rounded-xl p-1.5 outline-1 -outline-offset-1 outline-black/10 flex items-center justify-center overflow-hidden shrink-0">
                    {selectedModel.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedModel.image}
                        alt={selectedModel.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">📱</span>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {selectedModel.brand}
                      </span>
                      {selectedModel.maxSavings > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/25 tabular-nums">
                          Allt að {formatPrice(selectedModel.maxSavings)} verðmunur
                        </span>
                      )}
                    </div>
                    <h2 id="modal-phone-title" className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
                      {selectedModel.name}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedModel(null)}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors shrink-0"
                >
                  ✕ Loka
                </button>
              </div>

              {/* 1. Storage Variant Selector */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                  Veldu geymslupláss til að bera saman nákvæmlega sömu útgáfu:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedModel.variants.map((v) => {
                    const active = selectedStorage === v.storage;
                    return (
                      <button
                        key={v.storage}
                        onClick={() => setSelectedStorage(v.storage)}
                        className={`text-xs px-3.5 py-2 rounded-xl border font-semibold transition-colors flex items-center gap-2 tabular-nums ${
                          active
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/20'
                        }`}
                      >
                        <span>{v.storage}</span>
                        <span className={`text-[11px] font-normal ${active ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          frá {formatPrice(v.lowestPrice)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Store Offers Comparison for Selected Storage */}
              {currentVariant && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Verðsamanburður fyrir {selectedModel.name} ({currentVariant.storage})
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {currentVariant.offers.length}{' '}
                      {currentVariant.offers.length === 1 ? 'verslun' : 'verslanir'}
                    </span>
                  </div>

                  <div className="border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-white/[0.06] bg-zinc-50/70 dark:bg-zinc-950/90">
                    {[...currentVariant.offers]
                      .sort((a, b) => a.price - b.price)
                      .map((offer, idx) => {
                        const isCheapest = idx === 0;
                        const diff = offer.price - currentVariant.lowestPrice;
                        const fav = getStoreFavicon(offer.store) || offer.storeLogo;
                        return (
                          <div
                            key={offer.store}
                            className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                              isCheapest
                                ? 'bg-emerald-50/70 dark:bg-emerald-500/[0.06]'
                                : 'hover:bg-white dark:hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {fav && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={fav}
                                  alt={offer.store}
                                  className="w-5 h-5 rounded-xs object-contain shrink-0"
                                  loading="lazy"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                                    {offer.store}
                                  </span>
                                  {isCheapest && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      Lægsta verð
                                    </span>
                                  )}
                                </div>
                                {!isCheapest && (
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                                    +{formatPrice(diff)} dýrara en ódýrasta boð
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 tabular-nums">
                              <span
                                className={`text-sm sm:text-base font-extrabold ${
                                  isCheapest
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-zinc-900 dark:text-zinc-100'
                                }`}
                              >
                                {formatPrice(offer.price)}
                              </span>

                              <a
                                href={offer.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs px-3.5 py-2 rounded-xl font-semibold transition-colors inline-flex items-center gap-1.5 ${
                                  isCheapest
                                    ? 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950'
                                    : 'bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                                }`}
                              >
                                <span>Skoða í búð</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 3. Historical Price Trend Chart */}
              <div className="bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-white/[0.07] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Verðþróun yfir tíma
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px] tabular-nums">
                    Lægsta skráða verð:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatPrice(selectedModel.lowestPrice)}
                    </strong>
                  </span>
                </div>

                {renderTrendSvg(selectedModel.history, 520, 105)}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: EXECUTIVE SUMMARY & RAW JSON INSPECTOR */}
        {showRawJsonModal && (
          <div
            onClick={() => setShowRawJsonModal(false)}
            className="modal-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/85 backdrop-blur-md"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Framkvæmdasamantekt og hrágögn"
              className="modal-scroll-container bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-950/80">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    {rawJsonTab === 'summary' ? 'Framkvæmdasamantekt skanna' : 'JSON Hrágögn úr bakenda'}
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                    {meta?.lastRun ? `Keyrt: ${formatDate(meta.lastRun)}` : ''} · {meta?.totalModels || models.length} líkön · {meta?.durationMs || 0} ms svarstími
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
                  >
                    {copiedRaw ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Afritað</span>
                    ) : (
                      <span>Afrita JSON</span>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
                  >
                    <span className="hidden sm:inline">Sækja .json</span>
                  </button>

                  <button
                    onClick={() => setShowRawJsonModal(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sub-bar: Tabs & Filter */}
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.07] bg-zinc-100/60 dark:bg-zinc-950/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.07] overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setRawJsonTab('summary')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                      rawJsonTab === 'summary'
                        ? 'bg-white dark:bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Samantekt
                  </button>
                  <button
                    onClick={() => setRawJsonTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                      rawJsonTab === 'all'
                        ? 'bg-white dark:bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Allur JSON pakki
                  </button>
                  <button
                    onClick={() => setRawJsonTab('meta')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                      rawJsonTab === 'meta'
                        ? 'bg-white dark:bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Meta & Kerfi
                  </button>
                  <button
                    onClick={() => setRawJsonTab('sample')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                      rawJsonTab === 'sample'
                        ? 'bg-white dark:bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Sýnishorn
                  </button>
                </div>

                {rawJsonTab !== 'summary' && (
                  <div className="relative flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Sía línur í JSON..."
                      value={rawSearchFilter}
                      onChange={(e) => setRawSearchFilter(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.09] rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Modal Body */}
              {rawJsonTab === 'summary' ? (
                <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-auto bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 tabular-nums">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-3.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Svarstími</span>
                      <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                        {meta?.durationMs || 0} ms
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        {meta?.sourcesScanned || 43} gagnastraumar
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-3.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Símalíkön</span>
                      <span className="text-xl font-bold text-zinc-900 dark:text-white">
                        {meta?.totalModels || models.length}
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        {meta?.totalVariants || 0} útfærslur
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-3.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Verðlækkanir</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {summaryStats.dropsCount}
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        {summaryStats.unchangedCount} óbreytt
                      </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-3.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Verslanir</span>
                      <span className="text-xl font-bold text-zinc-900 dark:text-white">
                        {meta?.totalStores || 0}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                        ● 100% tengdar
                      </span>
                    </div>
                  </div>

                  {/* Store Breakdown */}
                  {summaryStats.storeSummaries.length > 0 && (
                    <div className="bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-4">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mb-3">
                        Samantekt eftir verslunum
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {summaryStats.storeSummaries.map((st) => (
                          <div
                            key={st.store}
                            className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-white/[0.06] rounded-xl p-3 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getStoreBadgeColor(st.store)}`}>
                                {getStoreFavicon(st.store) && (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={getStoreFavicon(st.store)!}
                                    alt={st.store}
                                    className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                                    loading="lazy"
                                  />
                                )}
                                {st.store}
                              </span>
                              <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                                {st.totalPhones} símar
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-zinc-500 dark:text-zinc-400">Lægsta verð:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {st.cheapestCount} sinnum
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 flex-1 overflow-auto bg-zinc-950 font-mono text-[11px] leading-relaxed text-emerald-400/95">
                  <pre className="whitespace-pre overflow-x-auto">{rawFormattedJson}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Minimal Modern Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-white/[0.06] mt-16 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Farsímavaktin — Rauntíma verðsamanburður á farsímum á Íslandi.</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Gögn sótt beint úr vörustraumum ELKO, Nova, Símans, Sýnar, Emobi, Tölvulistans o.fl.
          </p>
        </div>
      </footer>
    </div>
  );
}
