'use client';

import { useState, useMemo } from 'react';
import {
  PhoneModelGroup,
  PhoneVariant,
  MetaData,
  StoreDailySummary,
  formatPrice,
  formatDate,
  getStoreFavicon,
  getStoreBadgeColor,
} from '../types';

interface PhoneModalProps {
  selectedModel: PhoneModelGroup;
  selectedStorage: string;
  setSelectedStorage: (v: string) => void;
  currentVariant: PhoneVariant | null;
  isDark: boolean;
  onClose: () => void;
}


const STORE_LINE_COLORS: Record<string, string> = {
  ELKO: '#3b82f6',
  Nova: '#10b981',
  'Síminn': '#0ea5e9',
  'Sýn': '#f43f5e',
  Emobi: '#14b8a6',
  Lune: '#8b5cf6',
  Macland: '#6366f1',
  'Mi búðin': '#f97316',
  'Tölvulistinn': '#06b6d4',
  'Tölvutek': '#f59e0b',
  Epli: '#a855f7',
  Coolshop: '#ec4899',
  'Ófar': '#84cc16',
  Tunglskin: '#eab308',
  IcePhone: '#06b6d4',
};

function getStoreColor(store: string, idx = 0): string {
  if (STORE_LINE_COLORS[store]) return STORE_LINE_COLORS[store];
  const palette = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e', '#eab308'];
  return palette[idx % palette.length];
}

export function PhoneComparisonModal({
  selectedModel,
  selectedStorage,
  setSelectedStorage,
  currentVariant,
  isDark,
  onClose,
}: PhoneModalProps) {
  const [hoverTrendIdx, setHoverTrendIdx] = useState<number | null>(null);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');

  const historyPrices = (selectedModel.history || []).map((p) => p.price);
  const allTimeLowest =
    historyPrices.length > 0 ? Math.min(...historyPrices) : selectedModel.lowestPrice;

  const offers = useMemo(() => currentVariant?.offers || [], [currentVariant?.offers]);
  const isFilterValid = selectedStoreFilter === 'ALL' || offers.some((o) => o.store === selectedStoreFilter);
  const effectiveStoreFilter = isFilterValid ? selectedStoreFilter : 'ALL';

  // Compute all unique sorted dates across the model history and all store offers
  const allDates = useMemo(() => {
    const set = new Set<string>();
    if (selectedModel.history) {
      for (const p of selectedModel.history) set.add(p.date);
    }
    for (const o of offers) {
      if (o.history) {
        for (const p of o.history) set.add(p.date);
      }
    }
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : [new Date().toISOString().slice(0, 10)];
  }, [selectedModel.history, offers]);

  // Compute store series with normalized coordinate mappings
  const storeSeries = useMemo(() => {
    if (offers.length === 0) {
      return [
        {
          store: 'Markaðslægsta',
          color: '#10b981',
          points: selectedModel.history || [],
          currentPrice: selectedModel.lowestPrice,
          storeLogo: undefined,
        },
      ];
    }
    return offers.map((o, idx) => {
      const color = getStoreColor(o.store, idx);
      const points =
        o.history && o.history.length > 0
          ? o.history
          : o.previousPrice && o.previousPrice !== o.price
          ? [
              { date: allDates[Math.max(0, allDates.length - 2)] || 'Fyrri', price: o.previousPrice },
              { date: allDates[allDates.length - 1] || 'Í dag', price: o.price },
            ]
          : [{ date: allDates[allDates.length - 1] || 'Í dag', price: o.price }];
      return {
        store: o.store,
        color,
        points,
        currentPrice: o.price,
        storeLogo: o.storeLogo,
      };
    });
  }, [offers, allDates, selectedModel]);

  const visibleSeries =
    effectiveStoreFilter === 'ALL'
      ? storeSeries
      : storeSeries.filter((s) => s.store === effectiveStoreFilter);

  const allVisiblePrices = visibleSeries.flatMap((s) => s.points.map((p) => p.price));
  const minPrice = allVisiblePrices.length > 0 ? Math.min(...allVisiblePrices) : selectedModel.lowestPrice;
  const maxPrice = allVisiblePrices.length > 0 ? Math.max(...allVisiblePrices) : selectedModel.lowestPrice;
  const priceSpan = maxPrice - minPrice;
  const yPadding = priceSpan > 0 ? priceSpan * 0.14 : Math.max(1000, minPrice * 0.08);
  const yMin = Math.max(0, minPrice - yPadding);
  const yMax = maxPrice + yPadding;
  const yRange = Math.max(1, yMax - yMin);

  const width = 540;
  const height = 135;
  const padX = 36;
  const padY = 22;

  const getX = (dateStr: string) => {
    const idx = allDates.indexOf(dateStr);
    if (idx === -1) return padX;
    return padX + (idx / Math.max(1, allDates.length - 1)) * (width - padX * 2);
  };

  const getY = (price: number) => {
    return height - padY - ((price - yMin) / yRange) * (height - padY * 2);
  };

  const storesOnHoverDate = useMemo(() => {
    if (hoverTrendIdx === null || hoverTrendIdx >= allDates.length) return [];
    const targetDate = allDates[hoverTrendIdx];
    const results: Array<{ store: string; price: number; color: string; fav?: string }> = [];
    for (let idx = 0; idx < offers.length; idx++) {
      const o = offers[idx];
      const hist = o.history || [];
      const match = hist.find((p) => p.date === targetDate);
      const price = match ? match.price : hist.length === 1 && hist[0].date === targetDate ? hist[0].price : null;
      if (price !== null) {
        results.push({
          store: o.store,
          price,
          color: getStoreColor(o.store, idx),
          fav: getStoreFavicon(o.store) || o.storeLogo,
        });
      }
    }
    return results.sort((a, b) => a.price - b.price);
  }, [hoverTrendIdx, allDates, offers]);

  const renderMultiStoreTrendSvg = () => {
    const isSingleSeries = visibleSeries.length === 1;
    const singleSeries = visibleSeries[0];

    return (
      <div className="relative">
        {/* Floating Multi-Store Hover Tooltip */}
        {hoverTrendIdx !== null && storesOnHoverDate.length > 0 && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-zinc-950/95 dark:bg-zinc-900/95 text-white text-xs rounded-xl shadow-2xl border border-white/10 px-3 py-2 pointer-events-none z-30 backdrop-blur-md min-w-[210px] max-w-[280px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5">
              <span className="font-mono font-bold text-zinc-300">
                {allDates[hoverTrendIdx]} {hoverTrendIdx === allDates.length - 1 ? '(Í dag)' : ''}
              </span>
              <span className="text-[10px] text-zinc-400">Verðsamanburður</span>
            </div>
            <div className="space-y-1">
              {storesOnHoverDate.map((st, i) => (
                <div key={st.store} className="flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="truncate">{st.store}:</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <span className="font-bold">{formatPrice(st.price)}</span>
                    {i === 0 && storesOnHoverDate.length > 1 && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1 rounded">Lægst</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-32 sm:h-36 overflow-visible select-none cursor-crosshair"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (!rect.width) return;
            const svgX = ((e.clientX - rect.left) / rect.width) * width;
            const relX = Math.max(0, Math.min(width - padX * 2, svgX - padX));
            const rawIdx = Math.round((relX / (width - padX * 2)) * (allDates.length - 1));
            setHoverTrendIdx(Math.max(0, Math.min(allDates.length - 1, rawIdx)));
          }}
          onPointerLeave={() => setHoverTrendIdx(null)}
        >
          <defs>
            <linearGradient id="single-grad-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={singleSeries?.color || '#10b981'} stopOpacity="0.22" />
              <stop offset="100%" stopColor={singleSeries?.color || '#10b981'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference price grid lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="currentColor"
            className="text-zinc-200 dark:text-zinc-800"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="currentColor"
            className="text-zinc-200 dark:text-zinc-800"
            strokeDasharray="2 3"
            strokeWidth="1"
          />

          {/* Y axis price labels */}
          <text
            x={padX - 4}
            y={padY + 3}
            textAnchor="end"
            className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono select-none"
          >
            {formatPrice(maxPrice)}
          </text>
          <text
            x={padX - 4}
            y={height - padY + 3}
            textAnchor="end"
            className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono select-none"
          >
            {formatPrice(minPrice)}
          </text>

          {/* Interactive vertical crosshair on hover */}
          {hoverTrendIdx !== null && (
            <line
              x1={getX(allDates[hoverTrendIdx])}
              y1={padY - 4}
              x2={getX(allDates[hoverTrendIdx])}
              y2={height - padY + 4}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-500 pointer-events-none"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Render lines for all visible store series */}
          {visibleSeries.map((s) => {
            const coords = s.points
              .map((p) => ({
                x: getX(p.date),
                y: getY(p.price),
                date: p.date,
                price: p.price,
              }))
              .filter((c) => !isNaN(c.x) && !isNaN(c.y));

            if (coords.length === 0) return null;

            const pathD = coords.reduce((acc, c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`), '');
            const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;
            const isDimmed = effectiveStoreFilter !== 'ALL' && effectiveStoreFilter !== s.store;
            const lastCoord = coords[coords.length - 1];

            return (
              <g key={s.store} opacity={isDimmed ? 0.15 : 1} className="transition-opacity">
                {isSingleSeries && coords.length > 1 && (
                  <path d={areaD} fill="url(#single-grad-area)" />
                )}

                {coords.length > 1 && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={effectiveStoreFilter === s.store ? 3.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Point circles */}
                {coords.map((c) => {
                  const dateIdx = allDates.indexOf(c.date);
                  const isHovered = hoverTrendIdx === dateIdx;
                  return (
                    <circle
                      key={`${s.store}-${c.date}`}
                      cx={c.x}
                      cy={c.y}
                      r={isHovered ? 5.5 : coords.length === 1 ? 5 : 3.5}
                      fill={isHovered ? s.color : isDark ? '#09090b' : '#ffffff'}
                      stroke={s.color}
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all"
                    />
                  );
                })}

                {/* End line store label in multi-store mode */}
                {visibleSeries.length > 1 && lastCoord && (
                  <text
                    x={Math.min(width - 6, lastCoord.x + 5)}
                    y={Math.max(padY + 4, Math.min(height - padY - 3, lastCoord.y + 3))}
                    fill={s.color}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    className="select-none pointer-events-none"
                  >
                    {s.store}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* X Axis Date Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 px-3 tabular-nums border-t border-zinc-100 dark:border-white/[0.06] pt-1.5">
          {allDates.map((d, i) => {
            const parts = d.split('-');
            const label = parts.length === 3 ? `${parts[2]}.${parts[1]}` : d;
            const isToday = i === allDates.length - 1;
            return (
              <span
                key={d}
                className={
                  hoverTrendIdx === i
                    ? 'text-zinc-950 dark:text-white font-bold underline decoration-zinc-400'
                    : isToday
                    ? 'font-semibold text-zinc-700 dark:text-zinc-300'
                    : ''
                }
              >
                {isToday ? `Í dag (${label})` : label}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
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
            onClick={onClose}
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
                  <span
                    className={`text-[11px] font-normal ${
                      active ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
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
        <div className="bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-white/[0.07] rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Verðþróun yfir tíma
              </span>
              {offers.length > 1 && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  ({offers.length} verslanir)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] tabular-nums">
              {allTimeLowest < selectedModel.lowestPrice && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  Lægsta verð í sögu:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatPrice(allTimeLowest)}
                  </strong>
                </span>
              )}
              <span className="text-zinc-500 dark:text-zinc-400">
                Verð núna:{' '}
                <strong className="text-zinc-900 dark:text-white font-semibold">
                  {formatPrice(selectedModel.lowestPrice)}
                </strong>
              </span>
            </div>
          </div>

          {/* Store Filter Pills when multiple stores sell this variant */}
          {offers.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedStoreFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  effectiveStoreFilter === 'ALL'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span>Allar verslanir ({offers.length})</span>
              </button>
              {offers.map((o, idx) => {
                const isSelected = effectiveStoreFilter === o.store;
                const color = getStoreColor(o.store, idx);
                const fav = getStoreFavicon(o.store) || o.storeLogo;
                return (
                  <button
                    key={o.store}
                    type="button"
                    onClick={() => setSelectedStoreFilter(isSelected ? 'ALL' : o.store)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 tabular-nums ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white ring-2 shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    style={isSelected ? { outlineColor: color, borderColor: color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {fav && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fav} alt={o.store} className="w-3.5 h-3.5 rounded-xs object-contain" />
                    )}
                    <span>{o.store}</span>
                    <span className="text-[11px] font-normal opacity-75">{formatPrice(o.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {renderMultiStoreTrendSvg()}

          {offers.length > 1 && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
              Hver lína sýnir verðþróun hjá sinni verslun. Smelltu á verslunarhnapp til að einangra eða renndu yfir línuritið til að bera saman verð hvers dags.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ScanInspectorModalProps {
  meta: MetaData | null;
  models: PhoneModelGroup[];
  rawJsonTab: 'summary' | 'all' | 'meta' | 'sample';
  setRawJsonTab: (v: 'summary' | 'all' | 'meta' | 'sample') => void;
  rawSearchFilter: string;
  setRawSearchFilter: (v: string) => void;
  rawFormattedJson: string;
  copiedRaw: boolean;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onClose: () => void;
}

export function ScanInspectorModal({
  meta,
  models,
  rawJsonTab,
  setRawJsonTab,
  rawSearchFilter,
  setRawSearchFilter,
  rawFormattedJson,
  copiedRaw,
  onCopyJson,
  onDownloadJson,
  onClose,
}: ScanInspectorModalProps) {
  const dropsCount = models.filter((m) => m.trend === 'DOWN').length;
  const unchangedCount = models.filter((m) => m.trend === 'SAME').length;
  const storeSummaries: StoreDailySummary[] = meta?.storeSummaries || [];

  return (
    <div
      onClick={onClose}
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
              onClick={onCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              {copiedRaw ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Afritað</span>
              ) : (
                <span>Afrita JSON</span>
              )}
            </button>

            <button
              onClick={onDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              <span className="hidden sm:inline">Sækja .json</span>
            </button>

            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sub-bar: Tabs & Filter */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.07] bg-zinc-100/60 dark:bg-zinc-950/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.07] overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'summary', label: 'Samantekt' },
                { id: 'all', label: 'Allur JSON pakki' },
                { id: 'meta', label: 'Meta & Kerfi' },
                { id: 'sample', label: 'Sýnishorn' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setRawJsonTab(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  rawJsonTab === t.id
                    ? 'bg-white dark:bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
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
                  {dropsCount}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  {unchangedCount} óbreytt
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
            {storeSummaries.length > 0 && (
              <div className="bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.07] rounded-xl p-4">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mb-3">
                  Samantekt eftir verslunum
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {storeSummaries.map((st) => (
                    <div
                      key={st.store}
                      className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-white/[0.06] rounded-xl p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getStoreBadgeColor(
                            st.store
                          )}`}
                        >
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
  );
}
