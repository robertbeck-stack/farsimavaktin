'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

interface PhoneItem {
  id: string;
  title: string;
  price: number;
  brand: string;
  priceTier: string;
  store: string;
  storeLogo?: string;
  url: string;
  image?: string;
}

interface BrandStat {
  brand: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface StoreStat {
  store: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface TierStat {
  tier: string;
  count: number;
}

interface MetaData {
  lastRun: string;
  durationMs: number;
  totalFound: number;
  storesCount: number;
  sourcesChecked: number;
  status: string;
  brandStats?: BrandStat[];
  storeStats?: StoreStat[];
  tierStats?: TierStat[];
}

interface RunLogEntry {
  id: string;
  timestamp: string;
  durationMs: number;
  phonesCount: number;
  storesCount: number;
  status: 'SUCCESS' | 'ERROR';
}

export default function Home() {
  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Allt');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [selectedTier, setSelectedTier] = useState('Allt');
  const [sortBy, setSortBy] = useState<'asc' | 'desc' | 'name'>('asc');
  const [activeTab, setActiveTab] = useState<'phones' | 'charts' | 'logs'>('phones');

  const fetchPhones = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/phones');
      if (!res.ok) throw new Error('Mistókst að sækja gögn');
      const data = await res.json();

      setPhones(data.phones || []);
      setStores(data.stores || []);
      setBrands(data.brands || []);
      setMeta(data.meta || null);

      // Record to execution logs
      const newEntry: RunLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: data.meta?.lastRun || new Date().toISOString(),
        durationMs: data.meta?.durationMs || 0,
        phonesCount: data.phones?.length || 0,
        storesCount: data.stores?.length || 0,
        status: 'SUCCESS',
      };

      setLogs((prev) => {
        const updated = [newEntry, ...prev.filter((l) => l.timestamp !== newEntry.timestamp)].slice(0, 10);
        try {
          localStorage.setItem('farsimar_run_logs', JSON.stringify(updated));
        } catch {
          // Ignore storage quota
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
    // Load cached logs from localStorage
    try {
      const saved = localStorage.getItem('farsimar_run_logs');
      if (saved) setLogs(JSON.parse(saved));
    } catch {
      // Ignore
    }
    fetchPhones();
  }, [fetchPhones]);

  const filteredPhones = useMemo(() => {
    let result = [...phones];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (selectedBrand !== 'Allt') {
      result = result.filter((p) => p.brand === selectedBrand);
    }

    if (selectedStore !== 'Allt') {
      result = result.filter((p) => p.store === selectedStore);
    }

    if (selectedTier !== 'Allt') {
      result = result.filter((p) => p.priceTier === selectedTier);
    }

    result.sort((a, b) => {
      if (sortBy === 'asc') return a.price - b.price;
      if (sortBy === 'desc') return b.price - a.price;
      return a.title.localeCompare(b.title, 'is');
    });

    return result;
  }, [phones, search, selectedBrand, selectedStore, selectedTier, sortBy]);

  const stats = useMemo(() => {
    if (!phones.length) return null;
    const prices = phones.map((p) => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: phones.length,
      storeCount: stores.length,
      brandCount: brands.length,
    };
  }, [phones, stores, brands]);

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
    switch (store.toLowerCase()) {
      case 'elko':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'mi búðin':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'sýn':
      case 'vodafone':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'coolshop':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Max value for chart bar width normalization
  const maxBrandAvg = Math.max(...(meta?.brandStats?.map((b) => b.avgPrice) || [1]));
  const maxBrandCount = Math.max(...(meta?.brandStats?.map((b) => b.count) || [1]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-xl font-bold">
              📱
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Farsímavaktin <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">Ísland 🇮🇸</span>
              </h1>
              <p className="text-xs text-slate-400">Verðsamanburður og greining á farsímum í rauntíma</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={() => fetchPhones(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-sm shadow-blue-500/20"
              title="Keyra uppfærslu og sækja nýjustu verð"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
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
              {refreshing ? 'Sæki gögn...' : 'Uppfæra'}
            </button>

            {/* GitHub Link */}
            <a
              href="https://github.com/robertbeck-stack/farsimavaktin"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('phones')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'phones'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📱</span> Vörulisti ({filteredPhones.length})
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'charts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📊</span> Línurit & Greining
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>⏱️</span> Keyrsluferill & Logs
            {meta && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        {/* Top Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Símar í vöktun</span>
              <p className="text-2xl font-bold text-white mt-1">{stats.count}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Lægsta verð</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{formatPrice(stats.min)}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Hæsta verð</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{formatPrice(stats.max)}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Síðast uppfært</span>
              <p className="text-sm font-bold text-cyan-400 mt-2 truncate">
                {meta ? formatDate(meta.lastRun) : 'Í vinnslu...'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: PHONES LIST & CATEGORIES */}
        {activeTab === 'phones' && (
          <div className="space-y-6">
            {/* Filter Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg shadow-black/20">
              {/* Search & Sort */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Leita að síma (t.d. iPhone 16, Galaxy S24, Pixel, Fold)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
                    >
                      Hreinsa
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="sort" className="text-xs text-slate-400 whitespace-nowrap">
                    Raða eftir:
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'asc' | 'desc' | 'name')}
                    className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="asc">Ódýrast fyrst</option>
                    <option value="desc">Dýrast fyrst</option>
                    <option value="name">Heiti (A-Ö)</option>
                  </select>
                </div>
              </div>

              {/* 1. Vörumerki / Flokkar (Brand Pills) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 mr-1 font-semibold">Framleiðandi:</span>
                {['Allt', ...brands].map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                      selectedBrand === b
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* 2. Verðflokkar (Price Tier Pills) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 mr-1 font-semibold">Verðbil:</span>
                {['Allt', 'Undir 60 þús.', '60 - 130 þús.', '130 - 240 þús.', '240 þús. og yfir'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                      selectedTier === tier
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              {/* 3. Verslanir (Store Pills) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-400 mr-1 font-semibold">Verslun:</span>
                {['Allt', ...stores].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStore(st)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                      selectedStore === st
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Count & Current Filter Indicators */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Sýni <strong className="text-white">{filteredPhones.length}</strong> af{' '}
                <strong className="text-white">{phones.length}</strong> símum
              </span>
              {(selectedBrand !== 'Allt' || selectedStore !== 'Allt' || selectedTier !== 'Allt' || search) && (
                <button
                  onClick={() => {
                    setSelectedBrand('Allt');
                    setSelectedStore('Allt');
                    setSelectedTier('Allt');
                    setSearch('');
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Endursetja allar síur
                </button>
              )}
            </div>

            {/* Phone Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4"
                  >
                    <div className="h-48 bg-slate-800/60 rounded-xl" />
                    <div className="h-4 bg-slate-800/60 rounded w-3/4" />
                    <div className="h-6 bg-slate-800/60 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-slate-900/40 border border-rose-900/40 rounded-2xl p-6">
                <p className="text-rose-400 font-semibold mb-2">Villa kom upp við að sækja síma</p>
                <p className="text-xs text-slate-400">{error}</p>
              </div>
            ) : filteredPhones.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
                <span className="text-4xl">🔍</span>
                <p className="text-slate-300 font-semibold mt-3">Engir símar fundust</p>
                <p className="text-xs text-slate-500 mt-1">
                  Prófaðu að breyta leitarorði eða velja annað vörumerki/verslun.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredPhones.map((phone) => (
                  <div
                    key={phone.id}
                    className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Store Badge & Brand Tag */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border font-semibold tracking-wide ${getStoreBadgeColor(
                            phone.store
                          )}`}
                        >
                          {phone.storeLogo && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={phone.storeLogo}
                              alt={phone.store}
                              className="w-3.5 h-3.5 object-contain rounded-xs"
                              loading="lazy"
                            />
                          )}
                          {phone.store}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {phone.brand}
                        </span>
                      </div>

                      {/* Phone Image */}
                      <div className="w-full h-48 bg-white/5 rounded-xl mb-4 flex items-center justify-center p-3 border border-slate-800/60 overflow-hidden relative">
                        {phone.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={phone.image}
                            alt={phone.title}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-4xl text-slate-700">📱</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-blue-400 transition mb-2">
                        {phone.title}
                      </h3>
                    </div>

                    <div className="pt-4 border-t border-slate-800/60 mt-4">
                      {/* Price */}
                      <div className="mb-3">
                        <span className="text-[11px] text-slate-400 block">Verð:</span>
                        <span className="text-xl font-extrabold text-emerald-400">
                          {formatPrice(phone.price)}
                        </span>
                      </div>

                      {/* Button */}
                      <a
                        href={phone.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm shadow-blue-500/20"
                      >
                        Skoða vöru
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHARTS & ANALYTICS (LÍNURIT) */}
        {activeTab === 'charts' && meta && (
          <div className="space-y-8">
            {/* Chart 1: Meðalverð eftir vörumerkjum */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <span>📊</span> Meðalverð og fjöldi eftir vörumerkjum
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Sýnir hvernig meðalverð á snjallsímum dreifist milli helstu framleiðenda.
              </p>

              <div className="space-y-4">
                {meta.brandStats?.map((b) => {
                  const widthPercent = Math.max(12, Math.round((b.avgPrice / maxBrandAvg) * 100));
                  return (
                    <div key={b.brand} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          {b.brand} <span className="text-slate-500 font-normal">({b.count} gerðir)</span>
                        </span>
                        <span className="font-bold text-emerald-400">{formatPrice(b.avgPrice)}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800/80 overflow-hidden flex">
                        <div
                          style={{ width: `${widthPercent}%` }}
                          className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Lægsta: {formatPrice(b.minPrice)}</span>
                        <span>Hæsta: {formatPrice(b.maxPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid of Chart 2 (Verðdreifing) and Chart 3 (Verslanir) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 2: Verðflokkar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <span>📈</span> Verðdreifing (Hversu margir símar í hverju verðbili)
                </h2>
                <p className="text-xs text-slate-400 mb-6">Fjöldi síma sem falla í hvert verðbil á markaðnum.</p>

                <div className="space-y-4">
                  {meta.tierStats?.map((t) => {
                    const widthPct = Math.max(8, Math.round((t.count / (meta.totalFound || 1)) * 100));
                    return (
                      <div key={t.tier} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">{t.tier}</span>
                          <span className="font-bold text-cyan-400">
                            {t.count} símar ({Math.round((t.count / meta.totalFound) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 3: Verslanir */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <span>🏪</span> Vöruframboð eftir verslunum
                </h2>
                <p className="text-xs text-slate-400 mb-6">Hvaða verslanir bjóða upp á flesta mismunandi síma.</p>

                <div className="space-y-4">
                  {meta.storeStats?.map((s) => {
                    const widthPct = Math.max(10, Math.round((s.count / maxBrandCount) * 100));
                    return (
                      <div key={s.store} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">{s.store}</span>
                          <span className="font-bold text-indigo-400">
                            {s.count} símar (meðalverð {formatPrice(s.avgPrice)})
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXECUTION LOGS (KEYRSLUFERILL) */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Live Status Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⏱️</span> Staða vöktunar og síðasta keyrsla
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upplýsingar um hvenær bakendinn keyrði síðast og sótti gögn frá verslunum.
                  </p>
                </div>

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

              {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Síðast keyrt</span>
                    <span className="text-sm font-bold text-emerald-400">{formatDate(meta.lastRun)}</span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Svarstími bakenda</span>
                    <span className="text-sm font-bold text-cyan-400">{meta.durationMs} ms</span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Heimildir skannaðar</span>
                    <span className="text-sm font-bold text-indigo-400">{meta.sourcesChecked} síður / straumar</span>
                  </div>
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] text-slate-400 block">Stöðukóði</span>
                    <span className="text-sm font-bold text-emerald-400">● 200 OK ({meta.status})</span>
                  </div>
                </div>
              )}
            </div>

            {/* History Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📋</span> Ferill síðustu keyrslna (Execution Log History)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <tr>
                      <th className="py-2.5 px-3">Tímasetning</th>
                      <th className="py-2.5 px-3">Staða</th>
                      <th className="py-2.5 px-3">Símar fundnir</th>
                      <th className="py-2.5 px-3">Verslanir</th>
                      <th className="py-2.5 px-3">Svarstími</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-200">{formatDate(log.timestamp)}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ● {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{log.phonesCount} símar</td>
                        <td className="py-2.5 px-3">{log.storesCount} verslanir</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-400">{log.durationMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Farsímavaktin. Vörugögn sótt sjálfvirkt úr íslenskum vörustraumum.</p>
        </div>
      </footer>
    </div>
  );
}
