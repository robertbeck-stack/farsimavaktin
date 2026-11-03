'use client';

import { useEffect, useState, useMemo } from 'react';

interface PhoneItem {
  id: string;
  title: string;
  price: number;
  store: string;
  storeLogo?: string;
  url: string;
  image?: string;
}

export default function Home() {
  const [phones, setPhones] = useState<PhoneItem[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [sortBy, setSortBy] = useState<'asc' | 'desc' | 'name'>('asc');

  useEffect(() => {
    async function loadPhones() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/phones');
        if (!res.ok) throw new Error('Mistókst að sækja gögn');
        const data = await res.json();
        setPhones(data.phones || []);
        setStores(data.stores || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Óþekkt villa');
      } finally {
        setLoading(false);
      }
    }
    loadPhones();
  }, []);

  const filteredPhones = useMemo(() => {
    let result = [...phones];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (selectedStore !== 'Allt') {
      result = result.filter((p) => p.store === selectedStore);
    }

    result.sort((a, b) => {
      if (sortBy === 'asc') return a.price - b.price;
      if (sortBy === 'desc') return b.price - a.price;
      return a.title.localeCompare(b.title, 'is');
    });

    return result;
  }, [phones, search, selectedStore, sortBy]);

  const stats = useMemo(() => {
    if (!phones.length) return null;
    const prices = phones.map((p) => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: phones.length,
      storeCount: stores.length,
    };
  }, [phones, stores]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('is-IS').format(p) + ' kr.';
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
              <p className="text-xs text-slate-400">Verðsamanburður á farsímum í rauntíma</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">Farsímar í vöktun</span>
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
              <span className="text-xs text-slate-400 font-medium">Virkar verslanir</span>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.storeCount}</p>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Leita að síma (t.d. iPhone 16, Galaxy S24, Xiaomi, Fold)..."
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

            {/* Sort Dropdown */}
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

          {/* Store Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <span className="text-xs text-slate-400 mr-1">Verslanir:</span>
            {['Allt', ...stores].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStore(st)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                  selectedStore === st
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Sýni <strong className="text-white">{filteredPhones.length}</strong> af{' '}
            <strong className="text-white">{phones.length}</strong> símum
          </span>
          {search && (
            <span>
              Leitarniðurstöður fyrir: &ldquo;<span className="text-blue-400">{search}</span>&rdquo;
            </span>
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
                <div className="h-44 bg-slate-800/60 rounded-xl" />
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
              Prófaðu að breyta leitarorði eða velja aðra verslun.
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
                  {/* Store Badge with Logo */}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
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
