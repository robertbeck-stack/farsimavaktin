'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

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
  brand: 'Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'OnePlus' | 'Ulefone' | 'Motorola' | 'Aðrir';
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

export default function Home() {
  const [models, setModels] = useState<PhoneModelGroup[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view: 'list' | 'stores' | 'logs'
  const [activeView, setActiveView] = useState<'list' | 'stores' | 'logs'>('list');

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Allt');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [sortBy, setSortBy] = useState<'drop' | 'asc' | 'desc' | 'savings'>('drop');

  // Selected phone for detail modal / inspector
  const [selectedModel, setSelectedModel] = useState<PhoneModelGroup | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string>('');

  // Raw JSON Inspector modal
  const [rawJsonPayload, setRawJsonPayload] = useState<any>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [rawJsonTab, setRawJsonTab] = useState<'all' | 'meta' | 'sample'>('all');
  const [rawSearchFilter, setRawSearchFilter] = useState('');
  const [copiedRaw, setCopiedRaw] = useState(false);

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
        const savedCatalogRaw = localStorage.getItem('farsimar_catalog_backup_v1');
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

        const consolidated = Array.from(modelMapAll.values());
        localStorage.setItem('farsimar_catalog_backup_v1', JSON.stringify(savedCatalog));

        const localHistoryRaw = localStorage.getItem('farsimar_price_history_v1');
        const localHistory: Record<string, PricePoint[]> = localHistoryRaw ? JSON.parse(localHistoryRaw) : {};
        const today = new Date().toISOString().slice(0, 10);

        syncedModels = consolidated.map((m: PhoneModelGroup) => {
          let hist = localHistory[m.id] && localHistory[m.id].length > (m.history?.length || 0)
            ? localHistory[m.id]
            : (m.history && m.history.length > 0 ? m.history : [{ date: today, price: m.lowestPrice }]);

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

  const handleSelectModel = (model: PhoneModelGroup, defaultStorage?: string) => {
    setSelectedModel(model);
    if (defaultStorage && model.variants.some((v) => v.storage === defaultStorage)) {
      setSelectedStorage(defaultStorage);
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
          m.variants.some((v) => v.storage.toLowerCase().includes(q))
      );
    }

    if (selectedBrand !== 'Allt') {
      result = result.filter((m) => m.brand === selectedBrand);
    }

    if (selectedStore !== 'Allt') {
      result = result.filter((m) => m.stores.includes(selectedStore));
    }

    result.sort((a, b) => {
      if (sortBy === 'drop') return a.priceChangePercent - b.priceChangePercent;
      if (sortBy === 'asc') return a.lowestPrice - b.lowestPrice;
      if (sortBy === 'desc') return b.lowestPrice - a.lowestPrice;
      if (sortBy === 'savings') return b.maxSavings - a.maxSavings;
      return a.name.localeCompare(b.name, 'is');
    });

    return result;
  }, [models, search, selectedBrand, selectedStore, sortBy]);

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
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStoreBadgeColor = (store: string) => {
    const s = store.toLowerCase();
    if (s.includes('elko')) return 'bg-blue-950 text-blue-300 border-blue-800';
    if (s.includes('nova')) return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (s.includes('síminn') || s.includes('siminn')) return 'bg-sky-950 text-sky-300 border-sky-800';
    if (s.includes('sýn') || s.includes('vodafone')) return 'bg-rose-950 text-rose-300 border-rose-800';
    if (s.includes('emobi')) return 'bg-teal-950 text-teal-300 border-teal-800';
    if (s.includes('tölvulistinn')) return 'bg-indigo-950 text-indigo-300 border-indigo-800';
    if (s.includes('tölvutek')) return 'bg-amber-950 text-amber-300 border-amber-800';
    if (s.includes('computer')) return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    if (s.includes('tölvutækni')) return 'bg-violet-950 text-violet-300 border-violet-800';
    if (s.includes('mi búðin')) return 'bg-orange-950 text-orange-300 border-orange-800';
    if (s.includes('coolshop')) return 'bg-purple-950 text-purple-300 border-purple-800';
    if (s.includes('ormsson')) return 'bg-sky-950 text-sky-300 border-sky-800';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const currentVariant = useMemo(() => {
    if (!selectedModel) return null;
    return (
      selectedModel.variants.find((v) => v.storage === selectedStorage) ||
      selectedModel.variants[0]
    );
  }, [selectedModel, selectedStorage]);

  const rawFormattedJson = useMemo(() => {
    let target = rawJsonPayload;
    if (!target) {
      if (meta && models.length > 0) {
        target = { meta, models };
      } else {
        return 'Engin hrágögn tiltæk enn. Smelltu á "Keyra uppfærslu" til að sækja gögn.';
      }
    }

    if (rawJsonTab === 'meta') {
      target = target.meta || meta;
    } else if (rawJsonTab === 'sample') {
      target = {
        meta: target.meta || meta,
        sampleCount: 3,
        sampleModels: (target.models || models || []).slice(0, 3),
      };
    }

    const fullStr = JSON.stringify(target, null, 2);
    if (!rawSearchFilter.trim()) return fullStr;

    const query = rawSearchFilter.toLowerCase();
    const lines = fullStr.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(query));
    if (matched.length === 0) {
      return `Engin lína fannst sem inniheldur "${rawSearchFilter}".`;
    }
    return matched.join('\n');
  }, [rawJsonPayload, meta, models, rawJsonTab, rawSearchFilter]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawFormattedJson);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataToDownload = rawJsonPayload || { meta, models };
    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farsimavaktin-raw-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // SVG Line Chart generation for price history
  const renderTrendSvg = (points: PricePoint[], width = 360, height = 120) => {
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
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <circle cx={width / 2} cy={y} r={6} fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          </svg>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
            <span>Fyrsta skráning: {p.date}</span>
            <span className="font-semibold text-blue-400">Grunnverð: {formatPrice(p.price)}</span>
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
    const strokeColor = isDrop ? '#10b981' : isUp ? '#f43f5e' : '#6366f1';

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#grad-area)" />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === 0 || i === coords.length - 1 ? 5 : 3}
              fill={i === coords.length - 1 ? (isDrop ? '#34d399' : isUp ? '#fb7185' : '#818cf8') : '#1e293b'}
              stroke={strokeColor}
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 px-1">
          <span>{points[0].date} ({formatPrice(points[0].price)})</span>
          <span className={`font-semibold ${isDrop ? 'text-emerald-400' : isUp ? 'text-rose-400' : 'text-blue-400'}`}>
            Nú: {points[points.length - 1].date} ({formatPrice(points[points.length - 1].price)})
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📉</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight text-white">FARSÍMAVAKTIN</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  LIVE TREND
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Verðþróun og samanburður á farsímum á Íslandi</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher: Vörulisti vs Verslanagreining vs Logs */}
            <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-lg flex items-center text-xs">
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeView === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Vörur ({models.length})
              </button>
              <button
                onClick={() => setActiveView('stores')}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  activeView === 'stores'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏪 Verslanir</span>
                {meta?.storeSummaries && meta.storeSummaries.some((s) => s.dropsCount > 0) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveView('logs')}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  activeView === 'logs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⏱️ Logs</span>
                {meta && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* Quick Status / Refresh */}
            <button
              onClick={() => fetchPhones(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition disabled:opacity-50"
              title="Keyra nýja uppfærslu"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Sæki...' : 'Keyra'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* VIEW 1: PHONES & TRENDS */}
        {activeView === 'list' && (
          <>
            {/* TREND SPOTLIGHT: Real Price Drops or Top Savings between stores */}
            {meta?.biggestDrops && meta.biggestDrops.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400">📉</span> MEST LÆKKAÐ YFIR TÍMA (RAUNVERULEG LÆKKUN)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {meta.allTimeLowsCount} símar hafa lækkað í verði frá upphafi mælinga
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {meta.biggestDrops.map((drop) => {
                    const model = models.find((m) => m.id === drop.id);
                    return (
                      <div
                        key={drop.id}
                        onClick={() => model && handleSelectModel(model)}
                        className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-3 transition shadow-sm hover:shadow-md flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {drop.brand}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/80">
                              📉 {drop.dropPercent}%
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-100 line-clamp-1 group-hover:text-blue-400 transition">
                            {drop.name}
                          </h4>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-500 line-through">
                            {formatPrice(drop.oldPrice)}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-400">
                            {formatPrice(drop.currentPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : meta?.topSavings && meta.topSavings.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="text-amber-400">💰</span> MESTUR VERÐMUNUR MILLI BÚÐA Í DAG (SPARNAÐUR)
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Berðu saman verslanir og sparaðu allt að {formatPrice(meta.topSavings[0]?.savings || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {meta.topSavings.map((item) => {
                    const model = models.find((m) => m.id === item.id);
                    return (
                      <div
                        key={`${item.id}-${item.variantStorage || ''}`}
                        onClick={() => model && handleSelectModel(model, item.variantStorage)}
                        className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-3 transition shadow-sm hover:shadow-md flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.brand}
                            </span>
                            <span className="text-xs font-extrabold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800/80">
                              💰 Sparar {formatPrice(item.savings)}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-100 line-clamp-1 group-hover:text-blue-400 transition">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Ódýrast hjá <strong className="text-emerald-400">{item.cheapestStore}</strong> (vs {item.expensiveStore})
                          </span>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-500 line-through">
                            {formatPrice(item.highestPrice)}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-400">
                            {formatPrice(item.lowestPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* COMPACT FILTER BAR */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-md">
              {/* Brand Tabs (Flokkar eftir framleiðanda: Apple sér, Samsung sér o.fl.) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-semibold mr-1 shrink-0">Flokkur:</span>
                {[
                  { id: 'Allt', label: 'Allir símar', icon: '📱' },
                  { id: 'Apple', label: 'Apple iPhone', icon: '🍏' },
                  { id: 'Samsung', label: 'Samsung Galaxy', icon: '🌌' },
                  { id: 'Xiaomi', label: 'Xiaomi / Redmi', icon: '⚡' },
                  { id: 'Google', label: 'Google Pixel', icon: '🔍' },
                  { id: 'OnePlus', label: 'OnePlus', icon: '🔴' },
                  { id: 'Motorola', label: 'Motorola', icon: 'Ⓜ️' },
                  { id: 'Ulefone', label: 'Ulefone Vinnusímar', icon: '🛡️' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(b.id)}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold transition ${
                      selectedBrand === b.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>

              {/* Search, Store, Sort Row */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/60 text-xs">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Leita að líkani (t.d. iPhone 16 Pro, Galaxy S24, Pixel 9, 256GB)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 text-[10px]"
                    >
                      X
                    </button>
                  )}
                </div>

                {/* Store Filter */}
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="Allt">Allar búðir ({meta?.totalStores || 0})</option>
                  {meta?.storesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Sort Filter */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'drop' | 'asc' | 'desc' | 'savings')}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="drop">📉 Mest lækkað (Trend)</option>
                  <option value="asc">Ódýrast fyrst</option>
                  <option value="desc">Dýrast fyrst</option>
                  <option value="savings">💰 Mestur verðmunur milli búða</option>
                </select>
              </div>
            </div>

            {/* RESULTS HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Sýni <strong className="text-white">{filteredModels.length}</strong> símalíkön
                  {selectedBrand !== 'Allt' && ` í flokknum ${selectedBrand}`}
                  {selectedStore !== 'Allt' && ` hjá ${selectedStore}`}
                </span>
                {(selectedBrand !== 'Allt' || selectedStore !== 'Allt' || search) && (
                  <button
                    onClick={() => {
                      setSelectedBrand('Allt');
                      setSelectedStore('Allt');
                      setSearch('');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 hover:bg-blue-900 transition"
                  >
                    ✕ Hreinsa síur
                  </button>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                Smelltu á síma til að sjá undirtegundir, verðþróun og búðir
              </span>
            </div>

            {/* COMPACT PHONE TABLE / LIST */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-slate-900/40 border border-rose-900/40 rounded-xl p-4">
                <p className="text-rose-400 text-sm font-semibold">{error}</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/20 border border-slate-800 rounded-xl">
                <p className="text-slate-400 text-xs">Engir símar fundust sem passa við síur.</p>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className="p-3 sm:px-4 hover:bg-slate-900 cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Image & Title */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 bg-slate-950 rounded-lg p-1 border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
                        {model.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={model.image}
                            alt={model.name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-lg">📱</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {model.brand}
                          </span>
                          {model.priceChangePercent < 0 ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60">
                              📉 {model.priceChangePercent}%
                            </span>
                          ) : model.priceChangePercent > 0 ? (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800/60">
                              📈 +{model.priceChangePercent}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 font-medium">
                              ● Óbreytt verð
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-blue-400 transition">
                          {model.name}
                        </h3>

                        {/* Storage badges & stores */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {model.variants.map((v) => (
                            <span
                              key={v.storage}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400"
                            >
                              {v.storage}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-500 ml-1">
                            • {model.stores.slice(0, 4).join(', ')}
                            {model.stores.length > 4 && ` +${model.stores.length - 4}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Prices & Difference */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">Lægsta verð:</span>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-400">
                        {formatPrice(model.lowestPrice)}
                      </div>
                      {model.maxSavings > 0 ? (
                        <span className="text-[10px] font-semibold text-cyan-400 block">
                          Sparar allt að {formatPrice(model.maxSavings)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 block">
                          {model.storesCount} {model.storesCount === 1 ? 'búð' : 'búðir'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: VERSLANAGREINING & VERÐBREYTINGAR PER BÚÐ */}
        {activeView === 'stores' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Store Analytics Header */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🏪</span> Verslanagreining og Verðbreytingar dagsins
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fylgstu með hvaða verslanir eru að lækka eða hækka verð í dag og hver býður ódýrustu símana á markaðnum.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    {meta?.totalStores || 0} verslanir virkar
                  </span>
                </div>
              </div>

              {/* KPI Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Flest lægstu verð á markaðnum</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">
                    {meta?.storeSummaries?.[0]?.store || 'Nova'} ({meta?.storeSummaries?.[0]?.cheapestCount || 0} símar)
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Heildarverðlækkanir í dag</span>
                  <span className="text-sm font-bold text-cyan-400 mt-1 block">
                    {meta?.storeSummaries?.reduce((acc, s) => acc + s.dropsCount, 0) || 0} símar lækkuðu
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Heildarverðhækkanir í dag</span>
                  <span className="text-sm font-bold text-rose-400 mt-1 block">
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
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-3 py-1 rounded-lg border font-bold ${getStoreBadgeColor(st.store)}`}>
                            {st.store}
                          </span>
                          {isLeader && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              🏆 Verðleiðtogi
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-mono">
                          {st.totalPhones} símar í boði
                        </span>
                      </div>

                      {/* Store Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block">Lægst verð á markaði</span>
                          <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                            ★ Í {st.cheapestCount} líkönum
                          </span>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block">Heildarbreyting í dag</span>
                          <span
                            className={`text-xs font-bold mt-0.5 block ${
                              st.netChangeAmount < 0
                                ? 'text-emerald-400'
                                : st.netChangeAmount > 0
                                ? 'text-rose-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {st.netChangeAmount < 0
                              ? `📉 -${formatPrice(Math.abs(st.netChangeAmount))}`
                              : st.netChangeAmount > 0
                              ? `📈 +${formatPrice(st.netChangeAmount)}`
                              : '● Óbreytt verð'}
                          </span>
                        </div>
                      </div>

                      {/* Daily Changes Breakdown */}
                      <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          📉 {st.dropsCount} lækkanir
                        </span>
                        <span className="flex items-center gap-1 text-rose-400 font-medium">
                          📈 {st.hikesCount} hækkanir
                        </span>
                        <span className="text-slate-500">
                          {st.unchangedCount} óbreytt
                        </span>
                      </div>

                      {/* Biggest Drop at Store */}
                      {st.biggestDrop && (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs">
                          <span className="text-[10px] text-emerald-300 font-bold block mb-0.5">
                            Mesta lækkun dagsins hjá {st.store}:
                          </span>
                          <div className="flex items-baseline justify-between text-slate-200">
                            <span className="font-semibold line-clamp-1 mr-2">{st.biggestDrop.modelName}</span>
                            <span className="text-emerald-400 font-extrabold shrink-0">
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
                      className="w-full text-xs font-semibold py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 hover:border-blue-500 transition flex items-center justify-center gap-1.5"
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
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Status Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⏱️</span> Vöktunarstaða og síðasta keyrsla
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upplýsingar um hvenær bakendinn keyrði síðast og sótti gögn frá verslunum.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowRawJsonModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
                  >
                    <span>📦</span>
                    <span>Skoða hrágögn (Raw JSON)</span>
                  </button>

                  <button
                    onClick={() => fetchPhones(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
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
                    {refreshing ? 'Keyri uppfærslu núna...' : 'Keyra uppfærslu núna'}
                  </button>
                </div>
              </div>

              {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Síðast keyrt</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatDate(meta.lastRun)}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Svarstími bakenda</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">{meta.durationMs} ms</span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Símar / Verslanir</span>
                    <span className="text-sm font-bold text-indigo-400">
                      {meta.totalModels} líkön / {meta.totalStores} búðir
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Stöðukóði</span>
                    <span className="text-sm font-bold text-emerald-400">● 200 OK ({meta.status})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Active Connected Stores */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏪</span> Tengdar verslanir í vöktun ({meta?.totalStores || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {meta?.storesList.map((st) => (
                  <span
                    key={st}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${getStoreBadgeColor(st)}`}
                  >
                    ● {st}
                  </span>
                ))}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📋</span> Ferill síðustu keyrslna (Execution Log History)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Smelltu á hvaða línu sem er til að skoða hrágögn (Raw JSON)
                  </p>
                </div>
                <button
                  onClick={() => setShowRawJsonModal(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  🔍 Skoða hrágögn
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <tr>
                      <th className="py-2.5 px-3">Tímasetning</th>
                      <th className="py-2.5 px-3">Staða</th>
                      <th className="py-2.5 px-3">Símar fundnir</th>
                      <th className="py-2.5 px-3">Verslanir</th>
                      <th className="py-2.5 px-3">Svarstími</th>
                      <th className="py-2.5 px-3 text-right">Hrágögn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setShowRawJsonModal(true)}
                        className="hover:bg-slate-800/50 cursor-pointer transition group"
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-200 group-hover:text-blue-400 transition">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ● {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{log.modelsCount} líkön</td>
                        <td className="py-2.5 px-3">{log.storesCount} verslanir</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-400">{log.durationMs} ms</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRawJsonModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 group-hover:bg-blue-600 text-[11px] font-medium text-slate-300 group-hover:text-white transition"
                          >
                            <span>🔍</span> Skoða JSON
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

        {/* MODAL / INSPECTOR: Undirtegundir, Verð eftir búðum og Verðþróunargraf */}
        {selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {selectedModel.brand}
                      </span>
                      {selectedModel.priceChangePercent < 0 ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          📉 {selectedModel.priceChangePercent}% ({formatPrice(Math.abs(selectedModel.priceChangeAmount))} lækkun)
                        </span>
                      ) : selectedModel.priceChangePercent > 0 ? (
                        <span className="text-xs font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                          📈 +{selectedModel.priceChangePercent}% (+{formatPrice(selectedModel.priceChangeAmount)} hækkun)
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                          ● Verð óbreytt frá {selectedModel.history[0]?.date || 'í dag'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white">{selectedModel.name}</h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedModel(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                >
                  ✕ Loka
                </button>
              </div>

              {/* 1. VERÐÞRÓUNAR GRAF (Trend chart over time) */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>📈</span> Verðþróun yfir tíma (Saga)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Lægsta verð: <strong className="text-emerald-400">{formatPrice(selectedModel.lowestPrice)}</strong>
                  </span>
                </div>

                {renderTrendSvg(selectedModel.history, 500, 110)}
              </div>

              {/* 2. UNDIRTEGUNDIR (Variants / Storage selection) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Veldu undirtegund / geymslupláss:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedModel.variants.map((v) => (
                    <button
                      key={v.storage}
                      onClick={() => setSelectedStorage(v.storage)}
                      className={`text-xs px-3 py-2 rounded-xl border font-bold transition flex items-center gap-2 ${
                        selectedStorage === v.storage
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span>{v.storage}</span>
                      <span className="text-[11px] font-normal opacity-80">({formatPrice(v.lowestPrice)})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. VERÐ EFTIR BÚÐUM (Store Comparison for chosen variant) */}
              {currentVariant && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      Verð á {selectedModel.name} ({currentVariant.storage}) eftir verslunum:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentVariant.offers.length} {currentVariant.offers.length === 1 ? 'verslun býður' : 'verslanir bjóða'}
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950">
                    {currentVariant.offers
                      .sort((a, b) => a.price - b.price)
                      .map((offer, idx) => {
                        const isCheapest = idx === 0;
                        const diff = offer.price - currentVariant.lowestPrice;
                        return (
                          <div
                            key={offer.store}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              {offer.storeLogo && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={offer.storeLogo}
                                  alt={offer.store}
                                  className="w-5 h-5 object-contain"
                                  loading="lazy"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white block">{offer.store}</span>
                                  {typeof offer.priceChange === 'number' && offer.priceChange < 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      📉 -{formatPrice(Math.abs(offer.priceChange))}
                                    </span>
                                  )}
                                  {typeof offer.priceChange === 'number' && offer.priceChange > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                      📈 +{formatPrice(offer.priceChange)}
                                    </span>
                                  )}
                                </div>
                                {isCheapest ? (
                                  <span className="text-[10px] font-bold text-emerald-400">
                                    ★ Lægsta boðna verð
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-400 font-medium">
                                    +{formatPrice(diff)} dýrara
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`text-sm font-extrabold ${
                                  isCheapest ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                              >
                                {formatPrice(offer.price)}
                              </span>

                              <a
                                href={offer.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1 ${
                                  isCheapest
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                              >
                                Fara í búð
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RAW JSON MODAL / INSPECTOR */}
        {showRawJsonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/80">
                <div className="flex items-center gap-3">
                  <span className="text-xl p-2 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 font-mono">
                    {'{ }'}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      Hrágögn úr skanna <span className="text-xs font-mono text-slate-400 font-normal hidden sm:inline">(Raw JSON Payload)</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {meta?.lastRun ? `Keyrt: ${formatDate(meta.lastRun)}` : ''} · {meta?.totalModels || 0} líkön · {meta?.durationMs || 0} ms svarstími
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    {copiedRaw ? (
                      <>
                        <span className="text-emerald-400">✓</span>
                        <span className="text-emerald-400 font-bold">Afritað!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Afrita JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    <span>⬇️</span>
                    <span className="hidden sm:inline">Sækja .json</span>
                  </button>

                  <a
                    href="/api/phones"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    <span>🔗</span>
                    <span className="hidden sm:inline">/api/phones</span>
                  </a>

                  <button
                    onClick={() => setShowRawJsonModal(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sub-bar: Tabs & Filter */}
              <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setRawJsonTab('all')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      rawJsonTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Allur JSON pakki
                  </button>
                  <button
                    onClick={() => setRawJsonTab('meta')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      rawJsonTab === 'meta' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Aðeins Meta & Kerfi
                  </button>
                  <button
                    onClick={() => setRawJsonTab('sample')}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      rawJsonTab === 'sample' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sýnishorn af líkönum
                  </button>
                </div>

                {/* Filter input */}
                <div className="relative flex-1 sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Sía línur í JSON (t.d. Pixel, Nova, price)..."
                    value={rawSearchFilter}
                    onChange={(e) => setRawSearchFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {rawSearchFilter && (
                    <button
                      onClick={() => setRawSearchFilter('')}
                      className="absolute right-2 top-1 text-slate-400 hover:text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>

              {/* Code viewer */}
              <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-[11px] leading-relaxed text-emerald-400/95 selection:bg-blue-700 selection:text-white">
                <pre className="whitespace-pre overflow-x-auto">{rawFormattedJson}</pre>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Línufjöldi: <strong className="text-white">{rawFormattedJson.split('\n').length}</strong> línur
                </span>
                <span className="text-slate-500">
                  {rawSearchFilter ? `(Síað eftir: "${rawSearchFilter}")` : 'Öll gögn sýnd eins og þau berast úr bakenda'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Farsímavaktin. Vörugögn og verðsöguþróun úr íslenskum vörustraumum.</p>
        </div>
      </footer>
    </div>
  );
}
