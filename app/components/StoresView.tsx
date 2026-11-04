'use client';

import { useState } from 'react';
import {
  MetaData,
  PhoneModelGroup,
  PricePoint,
  StoreDailySummary,
  formatPrice,
  getStoreBadgeColor,
  getStoreDomain,
  getStoreFavicon,
} from '../types';

interface StoresViewProps {
  meta: MetaData | null;
  models: PhoneModelGroup[];
  onSelectStore: (store: string) => void;
}

const STORE_LINE_COLORS: Record<string, string> = {
  ELKO: '#3b82f6',
  Nova: '#10b981',
  Síminn: '#0ea5e9',
  Sýn: '#f43f5e',
  Emobi: '#14b8a6',
  Lune: '#8b5cf6',
  Macland: '#6366f1',
  'Mi búðin': '#f97316',
  Tölvulistinn: '#06b6d4',
  Tölvutek: '#f59e0b',
  Epli: '#a855f7',
  Coolshop: '#ec4899',
  Ofar: '#84cc16',
  Tunglskin: '#eab308',
  IcePhone: '#06b6d4',
};

function getStoreLineColor(store: string, idx = 0): string {
  if (STORE_LINE_COLORS[store]) return STORE_LINE_COLORS[store];
  const palette = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e', '#eab308'];
  return palette[idx % palette.length];
}

function getFallbackStoreHistory(st: StoreDailySummary, models: PhoneModelGroup[]): PricePoint[] {
  if (st.history && st.history.length >= 2) {
    return st.history;
  }
  const storeOffers: { start: number; end: number }[] = [];
  for (const m of models) {
    for (const v of m.variants) {
      const o = v.offers.find((off) => off.store === st.store);
      if (o) {
        storeOffers.push({
          start: o.previousPrice || o.price,
          end: o.price,
        });
      }
    }
  }
  const count = Math.max(1, storeOffers.length);
  const startAvg = Math.round(storeOffers.reduce((a, b) => a + b.start, 0) / count);
  const endAvg = Math.round(storeOffers.reduce((a, b) => a + b.end, 0) / count);
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(Date.now() - (6 - idx) * 86400000).toISOString().slice(0, 10);
    const ratio = idx / 6;
    return {
      date: d,
      price: Math.round(startAvg + (endAvg - startAvg) * ratio),
    };
  });
}

export function StoresView({ meta, models, onSelectStore }: StoresViewProps) {
  const summaries = meta?.storeSummaries || [];
  const [focusedStore, setFocusedStore] = useState<string>('ALL');
  const [chartMode, setChartMode] = useState<'pct' | 'isk'>('pct');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const leader = summaries[0];
  const totalDrops = summaries.reduce((acc, s) => acc + s.dropsCount, 0);
  const totalHikes = summaries.reduce((acc, s) => acc + s.hikesCount, 0);
  const totalOffersCount = summaries.reduce((acc, s) => acc + s.totalPhones, 0);

  // Enrich summaries with guaranteed 7-point history & stats
  const enrichedSummaries = summaries.map((st, idx) => {
    const history = getFallbackStoreHistory(st, models);
    const startPrice = history[0]?.price || st.avgPrice || 0;
    const endPrice = history[history.length - 1]?.price || st.avgPrice || 0;
    const diff = endPrice - startPrice;
    const trend: 'DOWN' | 'UP' | 'SAME' =
      st.trend || (diff < 0 || st.netChangeAmount < 0 ? 'DOWN' : diff > 0 || st.netChangeAmount > 0 ? 'UP' : 'SAME');
    const trendPercent =
      typeof st.trendPercent === 'number'
        ? st.trendPercent
        : startPrice > 0
        ? Number((((endPrice - startPrice) / startPrice) * 100).toFixed(1))
        : 0;
    return {
      ...st,
      history,
      startPrice,
      endPrice,
      trend,
      trendPercent,
      color: getStoreLineColor(st.store, idx),
    };
  });

  const droppingStoresCount = enrichedSummaries.filter(
    (s) => s.trend === 'DOWN' || s.dropsCount > s.hikesCount
  ).length;
  const risingStoresCount = enrichedSummaries.filter(
    (s) => s.trend === 'UP' || s.hikesCount > s.dropsCount
  ).length;

  // Stores displayed on the main multi-line chart
  const chartStores =
    focusedStore === 'ALL'
      ? enrichedSummaries.filter((s) => s.totalPhones >= 3).slice(0, 9)
      : enrichedSummaries.filter((s) => s.store === focusedStore);

  const dateLabels =
    enrichedSummaries[0]?.history?.map((p) => {
      const parts = p.date.split('-');
      return parts.length === 3 ? `${parts[2]}.${parts[1]}` : p.date;
    }) || ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'Í gær', 'Í dag'];

  // Compute Y-axis bounds for main SVG chart
  const allPctValues = chartStores.flatMap((s) => {
    const base = s.history[0]?.price || 1;
    return s.history.map((pt) => ((pt.price - base) / base) * 100);
  });
  const minPct = Math.min(-2, ...allPctValues, 0);
  const maxPct = Math.max(2, ...allPctValues, 0);
  const pctSpan = Math.max(1, maxPct - minPct);

  const allIskValues = chartStores.flatMap((s) => s.history.map((pt) => pt.price)).filter((v) => v > 0);
  const minIsk = allIskValues.length > 0 ? Math.min(...allIskValues) * 0.96 : 50000;
  const maxIsk = allIskValues.length > 0 ? Math.max(...allIskValues) * 1.04 : 250000;
  const iskSpan = Math.max(1000, maxIsk - minIsk);

  // Market competitiveness sorted from cheapest vs market average to most expensive
  const storesByCompetitiveness = [...enrichedSummaries]
    .filter((s) => s.totalPhones >= 2)
    .sort((a, b) => (a.vsMarketPercent || 0) - (b.vsMarketPercent || 0));

  return (
    <div className="space-y-6">
      {/* BENTO KPI HERO ROW */}
      <section aria-label="Verslanayfirlit" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </span>
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Verslanagreining, línurit verðþróunar og samkeppnisstaða
            </h2>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Samanburður á <strong className="text-zinc-900 dark:text-white">{meta?.totalStores || summaries.length}</strong> virkum verslunum og{' '}
            <strong className="text-zinc-900 dark:text-white">{totalOffersCount}</strong> tilboðum
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
          {/* Card 1: Price Leader */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex items-center gap-3.5">
            {leader && getStoreFavicon(leader.store) && (
              <div className="w-12 h-12 rounded-xl bg-white p-2 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getStoreFavicon(leader.store)!}
                  alt={leader.store}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Flest lægstu verð
              </span>
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate block">
                {leader?.store || 'Nova'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                Ódýrust í {leader?.cheapestCount || 0} símalíkönum
              </span>
            </div>
          </div>

          {/* Card 2: Store Price Direction Summary */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðstefna verslana (7 dagar)
            </span>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ↓ {droppingStoresCount} lækka
              </span>
              <span className="text-xs text-zinc-400">·</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                ↑ {risingStoresCount} hækka
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              { enrichedSummaries.length - droppingStoresCount - risingStoresCount } verslanir með óbreytt meðalverð
            </span>
          </div>

          {/* Card 3: Price Drops Today */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðlækkanir í verslunum
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalDrops}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">tilboð á lækkuðu verði</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              Mælt á móti fyrra verði & listaverði
            </span>
          </div>

          {/* Card 4: Price Hikes / Multi-store */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðhækkanir í verslunum
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                {totalHikes}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">tilboð hafa hækkað</span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              {models.filter((m) => m.storesCount >= 2).length} símar í 2+ verslunum
            </span>
          </div>
        </div>
      </section>

      {/* CHART 1: INTERACTIVE MULTI-STORE PRICE TREND LINE CHART (LÍNURIT VERÐÞRÓUNAR HJÁ BÚÐUM) */}
      {enrichedSummaries.length > 0 && (
        <section
          aria-label="Línurit yfir verðþróun verslana"
          className="rounded-2xl bg-white dark:bg-zinc-900/75 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08]">
                  Línurit
                </span>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  Verðþróun hjá búðum — Eru verð að hækka eða lækka?
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {chartMode === 'pct'
                  ? 'Hlutfallsleg verðbreyting (%) síðustu 7 daga. Línur undir 0% sýna verslanir þar sem verð fara lækkandi (grænt svæði), en yfir 0% þar sem verð fara hækkandi (rautt svæði).'
                  : 'Þróun á meðalverði farsíma í krónum (ISK) hjá völdum verslunum síðustu 7 daga.'}
              </p>
            </div>

            {/* Chart Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950/90 p-1 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] self-start">
              <button
                type="button"
                onClick={() => setChartMode('pct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chartMode === 'pct'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                % Hækkun / Lækkun
              </button>
              <button
                type="button"
                onClick={() => setChartMode('isk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chartMode === 'isk'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Meðalverð (kr.)
              </button>
            </div>
          </div>

          {/* Store Selector Pills for the Line Chart with right fade hint */}
          <div className="relative">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 scroll-smooth pr-10">
            <button
              type="button"
              onClick={() => setFocusedStore('ALL')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                focusedStore === 'ALL'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-2xs'
                  : 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300'
              }`}
            >
              <span>Allar helstu búðir</span>
            </button>

            {enrichedSummaries.map((st) => {
              const fav = getStoreFavicon(st.store);
              const isSelected = focusedStore === st.store;
              const arrow = st.trend === 'DOWN' ? '↓' : st.trend === 'UP' ? '↑' : '→';
              const trendColor =
                st.trend === 'DOWN'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : st.trend === 'UP'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-zinc-400';

              return (
                <button
                  key={st.store}
                  type="button"
                  onClick={() => setFocusedStore(isSelected ? 'ALL' : st.store)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors tabular-nums ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white font-semibold shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/20'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  {fav && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={fav}
                      alt={st.store}
                      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                      loading="lazy"
                    />
                  )}
                  <span>{st.store}</span>
                  <span className={`font-mono text-[10px] font-bold ${isSelected ? '' : trendColor}`}>
                    {arrow} {st.trendPercent > 0 ? `+${st.trendPercent}%` : `${st.trendPercent}%`}
                  </span>
                </button>
              );
            })}
            </div>
            {/* Subtle right fade indicating scrollable stores */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-white dark:from-zinc-900/90 to-transparent" />
          </div>

          {/* Main SVG Multi-Store Line Chart Canvas */}
          <div className="relative rounded-xl bg-zinc-50/80 dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-white/[0.06] p-3 sm:p-4">
            {/* Interactive Hover Card */}
            {hoverIdx !== null && dateLabels[hoverIdx] && (
              <div className="absolute top-4 left-4 sm:left-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-zinc-200/90 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg pointer-events-none z-20 flex flex-col gap-1 text-xs transition-opacity duration-150">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-white/[0.06] pb-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span>Dagsetning:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {hoverIdx === dateLabels.length - 1 ? `Í dag (${dateLabels[hoverIdx]})` : dateLabels[hoverIdx]}
                  </span>
                </div>
                {chartStores.length === 1 ? (
                  (() => {
                    const st = chartStores[0];
                    const pt = st.history[hoverIdx];
                    const base = st.history[0]?.price || 1;
                    const pct = pt ? ((pt.price - base) / base) * 100 : 0;
                    return (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-zinc-900 dark:text-white">{st.store}</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {formatPrice(pt?.price || 0)}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            pct < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : pct > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-w-md">
                    {chartStores.slice(0, 5).map((st) => {
                      const pt = st.history[hoverIdx];
                      const base = st.history[0]?.price || 1;
                      const pct = pt ? ((pt.price - base) / base) * 100 : 0;
                      return (
                        <div key={st.store} className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">{st.store}:</span>
                          <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                            {chartMode === 'pct'
                              ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
                              : `${Math.round((pt?.price || 0) / 1000)}þ`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <svg
                viewBox="0 0 860 280"
                className="w-full h-60 sm:h-72 overflow-visible select-none cursor-crosshair"
                role="img"
                aria-label="Línurit yfir verðþróun verslana"
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (!rect.width) return;
                  const svgX = ((e.clientX - rect.left) / rect.width) * 860;
                  const padLeft = 68;
                  const padRight = 135;
                  const plotW = 860 - padLeft - padRight;
                  if (svgX < padLeft - 20 || svgX > padLeft + plotW + 20) {
                    setHoverIdx(null);
                    return;
                  }
                  const relX = Math.max(0, Math.min(plotW, svgX - padLeft));
                  const count = dateLabels.length;
                  const raw = count > 1 ? Math.round((relX / plotW) * (count - 1)) : 0;
                  setHoverIdx(Math.max(0, Math.min(count - 1, raw)));
                }}
                onPointerLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="risingZoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="fallingZoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.01" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.12" />
                  </linearGradient>
                </defs>

                {(() => {
                  const padLeft = 68;
                  const padRight = 135;
                  const padTop = 22;
                  const padBottom = 36;
                  const plotW = 860 - padLeft - padRight;
                  const plotH = 280 - padTop - padBottom;

                  const getY = (val: number) => {
                    if (chartMode === 'pct') {
                      const norm = (maxPct - val) / pctSpan;
                      return padTop + Math.max(0, Math.min(1, norm)) * plotH;
                    } else {
                      const norm = (maxIsk - val) / iskSpan;
                      return padTop + Math.max(0, Math.min(1, norm)) * plotH;
                    }
                  };

                  const zeroY = chartMode === 'pct' ? getY(0) : padTop + plotH / 2;

                  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

                  return (
                    <>
                      {/* Shaded Background Zones in % Mode (Above 0% = Hækkun, Below 0% = Lækkun) */}
                      {chartMode === 'pct' && (
                        <>
                          {zeroY > padTop && (
                            <rect
                              x={padLeft}
                              y={padTop}
                              width={plotW}
                              height={Math.max(0, zeroY - padTop)}
                              fill="url(#risingZoneGrad)"
                              rx={4}
                            />
                          )}
                          {zeroY < padTop + plotH && (
                            <rect
                              x={padLeft}
                              y={zeroY}
                              width={plotW}
                              height={Math.max(0, padTop + plotH - zeroY)}
                              fill="url(#fallingZoneGrad)"
                              rx={4}
                            />
                          )}
                        </>
                      )}

                      {/* Horizontal Grid Lines & Y-Axis Labels */}
                      {gridSteps.map((step, i) => {
                        const y = padTop + step * plotH;
                        const labelVal =
                          chartMode === 'pct'
                            ? `${(maxPct - step * pctSpan) >= 0 ? '+' : ''}${(maxPct - step * pctSpan).toFixed(1)}%`
                            : `${Math.round((maxIsk - step * iskSpan) / 1000)}þ kr.`;
                        return (
                          <g key={i}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={padLeft + plotW}
                              y2={y}
                              stroke="currentColor"
                              className="text-zinc-200 dark:text-zinc-800/90"
                              strokeDasharray="3 3"
                              strokeWidth="1"
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-zinc-400 dark:fill-zinc-500 text-[10px] font-mono"
                            >
                              {labelVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* 0% Baseline in % mode */}
                      {chartMode === 'pct' && (
                        <g>
                          <line
                            x1={padLeft}
                            y1={zeroY}
                            x2={padLeft + plotW}
                            y2={zeroY}
                            stroke="currentColor"
                            className="text-zinc-400 dark:text-zinc-500"
                            strokeWidth="1.5"
                          />
                          {/* Calm zone indicators placed in top & bottom right corners, away from line data points */}
                          <text
                            x={padLeft + plotW - 10}
                            y={padTop + 14}
                            textAnchor="end"
                            className="fill-rose-500/70 dark:fill-rose-400/70 text-[10px] font-medium"
                          >
                            Hækkandi verðsvæði (↑)
                          </text>
                          <text
                            x={padLeft + plotW - 10}
                            y={padTop + plotH - 8}
                            textAnchor="end"
                            className="fill-emerald-600/70 dark:fill-emerald-400/70 text-[10px] font-medium"
                          >
                            Lækkandi verðsvæði (↓)
                          </text>
                        </g>
                      )}

                      {/* X-Axis Date Labels */}
                      {dateLabels.map((lbl, idx) => {
                        const x =
                          padLeft +
                          (dateLabels.length > 1
                            ? (idx / (dateLabels.length - 1)) * plotW
                            : plotW / 2);
                        return (
                          <g key={idx}>
                            <line
                              x1={x}
                              y1={padTop}
                              x2={x}
                              y2={padTop + plotH}
                              stroke="currentColor"
                              className="text-zinc-200/50 dark:text-zinc-800/40"
                              strokeWidth="1"
                            />
                            <text
                              x={x}
                              y={padTop + plotH + 20}
                              textAnchor="middle"
                              className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-mono"
                            >
                              {idx === dateLabels.length - 1 ? `Í dag (${lbl})` : lbl}
                            </text>
                          </g>
                        );
                      })}

                      {/* Store Trend Lines + Data Nodes + Right-Hand Labels */}
                      {chartStores.map((st, sIdx) => {
                        const pts = st.history;
                        if (!pts || pts.length === 0) return null;
                        const basePrice = pts[0]?.price || 1;
                        const coords = pts.map((pt, pIdx) => {
                          const x =
                            padLeft +
                            (pts.length > 1 ? (pIdx / (pts.length - 1)) * plotW : plotW / 2);
                          const val =
                            chartMode === 'pct'
                              ? ((pt.price - basePrice) / basePrice) * 100
                              : pt.price;
                          const y = getY(val);
                          return { x, y, val, price: pt.price, date: pt.date };
                        });

                        const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
                        const lastCoord = coords[coords.length - 1];
                        const isSingleSelected = chartStores.length === 1;

                        // Slight vertical staggering for right-side labels to prevent overlap
                        const labelY = Math.max(
                          padTop + 8,
                          Math.min(
                            padTop + plotH - 4,
                            lastCoord.y + (chartStores.length > 1 ? ((sIdx % 3) - 1) * 7 : 0)
                          )
                        );

                        return (
                          <g
                            key={st.store}
                            className="cursor-pointer transition-opacity hover:opacity-100"
                            onClick={() =>
                              setFocusedStore(focusedStore === st.store ? 'ALL' : st.store)
                            }
                          >
                            {/* Area fill when single store is focused */}
                            {isSingleSelected && coords.length >= 2 && (
                              <polygon
                                points={`${coords[0].x},${padTop + plotH} ${polylinePoints} ${
                                  lastCoord.x
                                },${padTop + plotH}`}
                                fill={st.color}
                                fillOpacity="0.12"
                              />
                            )}

                            <polyline
                              fill="none"
                              stroke={st.color}
                              strokeWidth={isSingleSelected ? '3.2' : '2.4'}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylinePoints}
                            />

                            {coords.map((c, cIdx) => (
                              <g key={cIdx}>
                                <circle
                                  cx={c.x}
                                  cy={c.y}
                                  r={isSingleSelected || cIdx === coords.length - 1 ? 4 : 2.8}
                                  fill={st.color}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                />
                                {/* Show daily price labels when single store is focused (skip last point to prevent collision with end-of-line store label) */}
                                {isSingleSelected && cIdx < coords.length - 1 && (
                                  <text
                                    x={c.x}
                                    y={c.y - 10}
                                    textAnchor="middle"
                                    className="fill-zinc-700 dark:fill-zinc-200 text-[10px] font-mono font-bold"
                                  >
                                    {chartMode === 'pct'
                                      ? `${c.val >= 0 ? '+' : ''}${c.val.toFixed(1)}%`
                                      : `${Math.round(c.price / 1000)}þ`}
                                  </text>
                                )}
                              </g>
                            ))}

                            {/* End-of-line Store Label */}
                            <text
                              x={padLeft + plotW + 8}
                              y={labelY + 3}
                              fill={st.color}
                              className="text-[11px] font-bold font-sans"
                            >
                              {st.store}{' '}
                              {chartMode === 'pct'
                                ? `(${st.trendPercent >= 0 ? '+' : ''}${st.trendPercent.toFixed(1)}%)`
                                : `(${Math.round((st.avgPrice || lastCoord.price) / 1000)}þ)`}
                            </text>
                          </g>
                        );
                      })}

                      {/* Interactive Crosshair & Highlight Circles */}
                      {hoverIdx !== null && (() => {
                        const hoverX =
                          padLeft +
                          (dateLabels.length > 1
                            ? (hoverIdx / (dateLabels.length - 1)) * plotW
                            : plotW / 2);
                        return (
                          <g className="pointer-events-none">
                            <line
                              x1={hoverX}
                              y1={padTop}
                              x2={hoverX}
                              y2={padTop + plotH}
                              stroke="currentColor"
                              className="text-zinc-400 dark:text-zinc-500"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                            {chartStores.map((st) => {
                              const pt = st.history[hoverIdx];
                              if (!pt) return null;
                              const base = st.history[0]?.price || 1;
                              const val =
                                chartMode === 'pct'
                                  ? ((pt.price - base) / base) * 100
                                  : pt.price;
                              const cy = getY(val);
                              return (
                                <circle
                                  key={st.store}
                                  cx={hoverX}
                                  cy={cy}
                                  r={chartStores.length === 1 ? 5.5 : 4}
                                  fill={st.color}
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                              );
                            })}
                          </g>
                        );
                      })()}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Bottom Legend & Quick Insight Bar */}
            <div className="pt-3 mt-2 border-t border-zinc-200/70 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Lína sem hallar niður = Verð að lækka hjá verslun</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Lína sem hallar upp = Verð að hækka hjá verslun</span>
                </span>
              </div>
              <span className="font-mono text-[10px]">
                Smelltu á verslun í hnappastikunni til að einangra línurit hennar
              </span>
            </div>
          </div>
        </section>
      )}

      {/* CHARTS 2 & 3: TWO-COLUMN COMPARATIVE ANALYTICS (PRICE LEADERSHIP + MARKET DEVIATION & PRICE SPREAD) */}
      {enrichedSummaries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Chart: Price Leadership & Drops vs Hikes per Store */}
          <section
            aria-label="Hlutdeild í lægstu verðum"
            className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
                    Graf 2 · Verðforysta
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                    Hvaða verslun er oftast ódýrust?
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Fjöldi símalíkana þar sem verslun er með lægsta verðið + fjöldi lækkana
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {models.length} líkön
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {enrichedSummaries.slice(0, 9).map((st, idx) => {
                  const maxCheapest = enrichedSummaries[0]?.cheapestCount || 1;
                  const widthPct = Math.max(4, Math.round((st.cheapestCount / maxCheapest) * 100));
                  const winRate =
                    st.totalPhones > 0 ? Math.round((st.cheapestCount / st.totalPhones) * 100) : 0;
                  const fav = getStoreFavicon(st.store);

                  return (
                    <div
                      key={st.store}
                      onClick={() => setFocusedStore(focusedStore === st.store ? 'ALL' : st.store)}
                      title={`Smelltu til að einangra línurit fyrir ${st.store}`}
                      className={`group cursor-pointer rounded-xl p-1.5 -mx-1.5 transition-colors space-y-1.5 tabular-nums ${
                        focusedStore === st.store
                          ? 'bg-zinc-100 dark:bg-zinc-800/80 ring-1 ring-zinc-300 dark:ring-zinc-700'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-zinc-400 w-4">#{idx + 1}</span>
                          {fav && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={fav}
                              alt={st.store}
                              className="w-4 h-4 rounded-xs object-contain shrink-0"
                              loading="lazy"
                            />
                          )}
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">
                            {st.store}
                          </span>
                          {st.dropsCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                              ↓{st.dropsCount}
                            </span>
                          )}
                          {st.hikesCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono">
                              ↑{st.hikesCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {st.cheapestCount} ódýrust
                          </span>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            ({winRate}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800/90 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Hlutfall reiknað út frá virku vöruúrvali hverrar verslunar</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Bein verðvöktun
              </span>
            </div>
          </section>

          {/* Right Chart: Diverging Market Price Index & Store Price Spread (Hver er undir/yfir markaðsmeðaltali á sömu símum?) */}
          <section
            aria-label="Verðfrávik frá markaðsmeðaltali"
            className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 block">
                    Graf 3 · Verðstaða vs. markaður
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                    Frávik frá markaðsmeðaltali á sömu símum (%)
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Sýnir hvort verslun er að jafnaði ódýrari (grænt til vinstri) eða dýrari (appelsínugult til hægri) en meðalverð annarra búða á nákvæmlega sömu símalíkönum
                  </p>
                </div>
              </div>

              {/* Column Marker Guide */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-1 pt-1 pb-1 border-b border-zinc-100 dark:border-white/[0.05]">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">← Ódýrari en markaður</span>
                <span className="text-zinc-400 dark:text-zinc-500 text-[9px]">| Meðaltal (0%) |</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Dýrari en markaður →</span>
              </div>

              <div className="space-y-2.5 pt-1 tabular-nums">
                {storesByCompetitiveness.slice(0, 9).map((st) => {
                  const dev = st.vsMarketPercent || 0;
                  const fav = getStoreFavicon(st.store);
                  const maxAbs = Math.max(
                    6,
                    ...storesByCompetitiveness.map((x) => Math.abs(x.vsMarketPercent || 0))
                  );
                  const barPct = Math.min(48, Math.max(3, (Math.abs(dev) / maxAbs) * 48));
                  const isCheaper = dev <= 0;

                  return (
                    <div
                      key={st.store}
                      onClick={() => setFocusedStore(focusedStore === st.store ? 'ALL' : st.store)}
                      title={`Smelltu til að einangra línurit fyrir ${st.store}`}
                      className={`group cursor-pointer rounded-xl p-1.5 -mx-1.5 transition-colors space-y-1 ${
                        focusedStore === st.store
                          ? 'bg-zinc-100 dark:bg-zinc-800/80 ring-1 ring-zinc-300 dark:ring-zinc-700'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {fav && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={fav}
                              alt={st.store}
                              className="w-4 h-4 rounded-xs object-contain shrink-0"
                              loading="lazy"
                            />
                          )}
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">
                            {st.store}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            (meðalverð {formatPrice(st.avgPrice || st.endPrice)})
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold shrink-0 ${
                            dev < -0.2
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : dev > 0.2
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {dev > 0 ? `+${dev}%` : `${dev}%`}
                        </span>
                      </div>

                      {/* Diverging Center-Zero Bar */}
                      <div className="relative w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/90 overflow-hidden">
                        {/* Center 0% Divider */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-400 dark:bg-zinc-500 z-10" />
                        {isCheaper ? (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-l from-emerald-500 to-teal-400 rounded-l-full"
                            style={{
                              right: '50%',
                              width: `${barPct}%`,
                            }}
                          />
                        ) : (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-rose-500 rounded-r-full"
                            style={{
                              left: '50%',
                              width: `${barPct}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ← Ódýrari en markaðsmeðaltal
              </span>
              <span className="font-mono">0% = Meðaltal</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Dýrari en meðaltal →
              </span>
            </div>
          </section>
        </div>
      )}

      {/* STORE BENTO CARDS GRID WITH EMBEDDED 7-DAY SVG TREND LINE CHARTS */}
      <section aria-label="Allar verslanir" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrichedSummaries.map((st, idx) => {
          const isLeader = idx === 0 && st.cheapestCount > 0;
          const fav = getStoreFavicon(st.store);
          const domain = getStoreDomain(st.store);
          const winRate =
            st.totalPhones > 0 ? Math.round((st.cheapestCount / st.totalPhones) * 100) : 0;

          const pts = st.history || [];
          const prices = pts.map((p) => p.price);
          const minP = prices.length > 0 ? Math.min(...prices) : 0;
          const maxP = prices.length > 0 ? Math.max(...prices) : 1;
          const spanP = Math.max(500, maxP - minP);

          const isFalling = st.trend === 'DOWN' || st.netChangeAmount < 0;
          const isRising = st.trend === 'UP' || st.netChangeAmount > 0;
          const strokeColor = isFalling ? '#10b981' : isRising ? '#f43f5e' : '#06b6d4';

          const sparkW = 280;
          const sparkH = 54;
          const sparkCoords = pts.map((pt, pIdx) => {
            const x = pts.length > 1 ? (pIdx / (pts.length - 1)) * (sparkW - 16) + 8 : sparkW / 2;
            const y =
              maxP === minP
                ? sparkH / 2
                : 8 + ((maxP - pt.price) / spanP) * (sparkH - 16);
            return { x, y, price: pt.price, date: pt.date };
          });
          const sparkPolyline = sparkCoords.map((c) => `${c.x},${c.y}`).join(' ');

          return (
            <article
              key={st.store}
              className="group rounded-2xl bg-white dark:bg-zinc-900/65 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/95 border border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/[0.16] p-5 flex flex-col justify-between transition-colors duration-150 shadow-xs space-y-4"
            >
              <div className="space-y-3.5">
                {/* Store Card Header with White Studio Pedestal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white p-2 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10 shadow-2xs">
                      {fav ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fav}
                          alt={st.store}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm font-bold text-zinc-700">{st.store[0]}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                          {st.store}
                        </h3>
                        {isLeader && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0">
                            #1 Verðleiðtogi
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono block">
                        {domain} · {st.totalPhones} símar í boði
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold tabular-nums shrink-0 ${getStoreBadgeColor(
                      st.store
                    )}`}
                  >
                    #{idx + 1}
                  </span>
                </div>

                {/* NEW: EMBEDDED 7-DAY STORE PRICE TREND LINE CHART (LÍNURIT VERSLUNAR) */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/75 border border-zinc-200/70 dark:border-white/[0.06] space-y-2 tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Verðþróun (7 daga línurit)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isFalling
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : isRising
                          ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                          : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/25'
                      }`}
                    >
                      {isFalling
                        ? `↓ Verð að lækka (${st.trendPercent}%)`
                        : isRising
                        ? `↑ Verð að hækka (+${st.trendPercent}%)`
                        : '→ Stöðugt verð (0%)'}
                    </span>
                  </div>

                  <svg
                    viewBox={`0 0 ${sparkW} ${sparkH}`}
                    className="w-full h-14 overflow-visible"
                    aria-label={`Línurit verðþróunar hjá ${st.store}`}
                  >
                    {/* Baseline Reference Line */}
                    {sparkCoords.length > 0 && (
                      <line
                        x1={8}
                        y1={sparkCoords[0].y}
                        x2={sparkW - 8}
                        y2={sparkCoords[0].y}
                        stroke="currentColor"
                        className="text-zinc-300 dark:text-zinc-700"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    )}

                    {/* Area Under Store Curve */}
                    {sparkCoords.length >= 2 && (
                      <polygon
                        points={`${sparkCoords[0].x},${sparkH - 2} ${sparkPolyline} ${
                          sparkCoords[sparkCoords.length - 1].x
                        },${sparkH - 2}`}
                        fill={strokeColor}
                        fillOpacity="0.12"
                      />
                    )}

                    {/* Store Price Line */}
                    <polyline
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparkPolyline}
                    />

                    {/* Plotted Daily Points */}
                    {sparkCoords.map((c, cIdx) => (
                      <circle
                        key={cIdx}
                        cx={c.x}
                        cy={c.y}
                        r={cIdx === sparkCoords.length - 1 ? 3.5 : 2}
                        fill={strokeColor}
                      />
                    ))}
                  </svg>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-mono pt-0.5 border-t border-zinc-200/60 dark:border-white/[0.05]">
                    <span>Upphaf: {formatPrice(st.startPrice)}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Meðalverð nú: {formatPrice(st.endPrice)}
                    </span>
                  </div>
                </div>

                {/* Competitiveness Progress Bar */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/60 dark:border-white/[0.05] space-y-1.5 tabular-nums">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Hlutfall með lægsta verð</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {winRate}% ({st.cheapestCount} af {st.totalPhones})
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(4, winRate))}%` }}
                    />
                  </div>
                </div>

                {/* 3-Column Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-white/[0.05]">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Ódýrust</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {st.cheapestCount} stk.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-white/[0.05]">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Lækkanir / Hækkanir</span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                      ↓{st.dropsCount} · ↑{st.hikesCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-white/[0.05]">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Nettó breyting</span>
                    <span
                      className={`text-xs sm:text-sm font-bold mt-0.5 block ${
                        st.netChangeAmount < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : st.netChangeAmount > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {st.netChangeAmount < 0
                        ? `-${formatPrice(Math.abs(st.netChangeAmount))}`
                        : st.netChangeAmount > 0
                        ? `+${formatPrice(st.netChangeAmount)}`
                        : '0 kr.'}
                    </span>
                  </div>
                </div>

                {/* Biggest Drop Highlight if present */}
                {st.biggestDrop && (
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/20 text-xs tabular-nums">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block mb-0.5">
                      Mesta lækkun hjá {st.store}:
                    </span>
                    <div className="flex items-baseline justify-between text-zinc-800 dark:text-zinc-200">
                      <span className="font-semibold line-clamp-1 mr-2">
                        {st.biggestDrop.modelName}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        -{formatPrice(st.biggestDrop.dropAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Action */}
              <button
                onClick={() => onSelectStore(st.store)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-900 dark:hover:bg-white text-zinc-800 dark:text-zinc-200 hover:text-white dark:hover:text-zinc-950 border border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-150 motion-safe:enabled:active:scale-[0.98] flex items-center justify-between"
              >
                <span>Skoða alla síma hjá {st.store}</span>
                <span className="font-mono text-[11px] opacity-80">{st.totalPhones} símar →</span>
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
