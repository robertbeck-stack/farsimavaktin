'use client';

import {
  PhoneModelGroup,
  PhoneVariant,
  PricePoint,
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

export function PhoneComparisonModal({
  selectedModel,
  selectedStorage,
  setSelectedStorage,
  currentVariant,
  isDark,
  onClose,
}: PhoneModalProps) {
  const renderTrendSvg = (points: PricePoint[], width = 520, height = 105) => {
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
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
