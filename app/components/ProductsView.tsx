'use client';

import { RefObject } from 'react';
import {
  PhoneModelGroup,
  MetaData,
  PriceRangeFilter,
  formatPrice,
  getStoreFavicon,
} from '../types';

interface ProductsViewProps {
  models: PhoneModelGroup[];
  filteredModels: PhoneModelGroup[];
  meta: MetaData | null;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  selectedBrand: string;
  setSelectedBrand: (v: string) => void;
  selectedStore: string;
  setSelectedStore: (v: string) => void;
  priceRange: PriceRangeFilter;
  setPriceRange: (v: PriceRangeFilter) => void;
  onlyMultiStore: boolean;
  setOnlyMultiStore: (v: boolean | ((p: boolean) => boolean)) => void;
  sortBy: 'savings' | 'asc' | 'desc' | 'drop';
  setSortBy: (v: 'savings' | 'asc' | 'desc' | 'drop') => void;
  layoutMode: 'grid' | 'rows';
  setLayoutMode: (v: 'grid' | 'rows') => void;
  cardStorageMap: Record<string, string>;
  setCardStorageMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSelectModel: (model: PhoneModelGroup, defaultStorage?: string) => void;
  fetchPhones: (isRefresh?: boolean) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function ProductsView({
  models,
  filteredModels,
  meta,
  loading,
  error,
  search,
  setSearch,
  selectedBrand,
  setSelectedBrand,
  selectedStore,
  setSelectedStore,
  priceRange,
  setPriceRange,
  onlyMultiStore,
  setOnlyMultiStore,
  sortBy,
  setSortBy,
  layoutMode,
  setLayoutMode,
  cardStorageMap,
  setCardStorageMap,
  handleSelectModel,
  fetchPhones,
  searchInputRef,
}: ProductsViewProps) {
  const hasActiveFilters =
    selectedBrand !== 'Allt' ||
    selectedStore !== 'Allt' ||
    priceRange !== 'all' ||
    onlyMultiStore ||
    search.trim().length > 0;

  return (
    <div className="space-y-6">
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
    </div>
  );
}
