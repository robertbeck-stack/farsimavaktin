'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

export interface StoreOffer {
  store: string;
  storeLogo?: string;
  price: number;
  url: string;
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
  brand: 'Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'OnePlus' | 'Ulefone' | 'Aðrir';
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
  allTimeLowsCount: number;
  status: string;
}

export default function Home() {
  const [models, setModels] = useState<PhoneModelGroup[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Allt');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [sortBy, setSortBy] = useState<'drop' | 'asc' | 'desc' | 'savings'>('drop');

  // Selected phone for detail modal / inspector
  const [selectedModel, setSelectedModel] = useState<PhoneModelGroup | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string>('');

  const fetchPhones = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/phones');
      if (!res.ok) throw new Error('Mistókst að sækja gögn');
      const data = await res.json();

      setModels(data.models || []);
      setMeta(data.meta || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Óþekkt villa');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPhones();
  }, [fetchPhones]);

  // Open modal and pre-select first variant
  const handleSelectModel = (model: PhoneModelGroup) => {
    setSelectedModel(model);
    if (model.variants.length > 0) {
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
    if (s.includes('sýn') || s.includes('vodafone')) return 'bg-rose-950 text-rose-300 border-rose-800';
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

  // SVG Line Chart generation for price history
  const renderTrendSvg = (points: PricePoint[], width = 360, height = 120) => {
    if (!points || points.length < 2) return null;
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
    const strokeColor = isDrop ? '#10b981' : '#6366f1';
    const fillColor = isDrop ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)';

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
              fill={i === coords.length - 1 ? '#34d399' : '#1e293b'}
              stroke={strokeColor}
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 px-1">
          <span>{points[0].date} ({formatPrice(points[0].price)})</span>
          <span className="font-semibold text-emerald-400">
            Nú: {points[points.length - 1].date} ({formatPrice(points[points.length - 1].price)})
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Compact Bar */}
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

          <div className="flex items-center gap-3">
            {meta && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 border-r border-slate-800 pr-3">
                <span>Síðast keyrt:</span>
                <strong className="text-emerald-400 font-mono">{formatDate(meta.lastRun)}</strong>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{meta.totalModels} símalíkön</span>
              </div>
            )}

            <button
              onClick={() => fetchPhones(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Uppfæri...' : 'Keyra'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TREND SPOTLIGHT: Biggest Price Drops (Mest lækkað í verði) */}
        {meta?.biggestDrops && meta.biggestDrops.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">🔥</span> MEST LÆKKAÐ Í VERÐI (TREND)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {meta.allTimeLowsCount} símar á sögulegu lágmarksverði
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
        )}

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
              <option value="Allt">Allar búðir</option>
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
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Sýni <strong className="text-white">{filteredModels.length}</strong> símalíkön
            {selectedBrand !== 'Allt' && ` í flokknum ${selectedBrand}`}
          </span>
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
                      {model.priceChangePercent < 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60">
                          📉 {model.priceChangePercent}%
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-blue-400 transition">
                      {model.name}
                    </h3>

                    {/* Storage badges */}
                    <div className="flex items-center gap-1 mt-1">
                      {model.variants.map((v) => (
                        <span
                          key={v.storage}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          {v.storage}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-500 ml-1">
                        • {model.stores.join(', ')}
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
                      {selectedModel.priceChangePercent < 0 && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          📉 {selectedModel.priceChangePercent}% frá upphafi
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white">{selectedModel.name}</h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedModel(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs"
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
                                <span className="text-xs font-bold text-white block">{offer.store}</span>
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
