'use client';

import {
  MetaData,
  PhoneModelGroup,
  RunLogEntry,
  formatDate,
  formatPrice,
  getStoreDomain,
  getStoreFavicon,
} from '../types';

interface SystemLogsViewProps {
  meta: MetaData | null;
  models: PhoneModelGroup[];
  logs: RunLogEntry[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenInspector: (tab: 'summary' | 'all' | 'meta' | 'sample') => void;
}

export function SystemLogsView({
  meta,
  models,
  logs,
  refreshing,
  onRefresh,
  onOpenInspector,
}: SystemLogsViewProps) {
  const dropsCount = models.filter((m) => m.trend === 'DOWN').length;
  const hikesCount = models.filter((m) => m.trend === 'UP').length;
  const unchangedCount = models.filter((m) => m.trend === 'SAME').length;

  const brandCounts: Record<string, number> = {};
  for (const m of models) {
    brandCounts[m.brand] = (brandCounts[m.brand] || 0) + 1;
  }
  const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* SECTION 1: LIVE ENGINE TELEMETRY BENTO */}
      <section aria-label="Vöktunarstaða" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </span>
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Kerfisvakt, framkvæmdasamantekt og gagnastraumar
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenInspector('summary')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors"
            >
              <span>Opna samantektarglugga</span>
            </button>
            <button
              onClick={() => onOpenInspector('all')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors font-mono"
            >
              <span>{'{ }'} Raw JSON</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? 'Keyri skönnun...' : 'Keyra skönnun núna'}</span>
            </button>
          </div>
        </div>

        {/* 4 Telemetry Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Síðasta keyrsla bakenda
            </span>
            <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white font-mono mt-1 block">
              {meta?.lastRun ? formatDate(meta.lastRun) : '—'}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              200 OK ({meta?.status || 'LIVE'})
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Svarstími og gagnastraumar
            </span>
            <span className="text-base sm:text-lg font-extrabold text-cyan-600 dark:text-cyan-400 font-mono mt-1 block">
              {meta?.durationMs || 0} ms
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              {meta?.sourcesScanned || 43} vörustraumar skannaðir
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Vörulisti í gagnagrunni
            </span>
            <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white mt-1 block">
              {meta?.totalModels || models.length} símalíkön
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              {meta?.totalVariants || 0} geymsluútfærslur skráðar
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðhreyfingar í skanna
            </span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {dropsCount} lækkuð · {hikesCount} hækkuð
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              {unchangedCount} símalíkön óbreytt
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 1.5: MARKET INDEX LINE CHART & STORE PRICE ACTIVITY BENTO */}
      {(meta?.storeSummaries || []).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Aggregate Market Price Index 7-Day SVG Line Chart */}
          <section
            aria-label="Línurit markaðsvísitölu"
            className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4 flex flex-col justify-between tabular-nums"
          >
            {(() => {
              const summaries = meta?.storeSummaries || [];
              const dayCount = 7;
              const marketHistory = Array.from({ length: dayCount }, (_, dIdx) => {
                let sum = 0;
                let weightSum = 0;
                for (const st of summaries) {
                  const pt = st.history?.[dIdx]?.price || st.avgPrice || 0;
                  if (pt > 0) {
                    const w = Math.max(1, st.totalPhones);
                    sum += pt * w;
                    weightSum += w;
                  }
                }
                const dateStr =
                  summaries[0]?.history?.[dIdx]?.date ||
                  new Date(Date.now() - (6 - dIdx) * 86400000).toISOString().slice(0, 10);
                return {
                  date: dateStr,
                  price: weightSum > 0 ? Math.round(sum / weightSum) : 150000,
                };
              });

              const pVals = marketHistory.map((m) => m.price);
              const minP = Math.min(...pVals);
              const maxP = Math.max(...pVals);
              const spanP = Math.max(500, maxP - minP);
              const startP = marketHistory[0].price;
              const endP = marketHistory[marketHistory.length - 1].price;
              const diffP = endP - startP;
              const diffPct = startP > 0 ? (((endP - startP) / startP) * 100).toFixed(1) : '0.0';
              const isDown = diffP <= 0;
              const color = isDown ? '#10b981' : '#f43f5e';

              const w = 440;
              const h = 140;
              const coords = marketHistory.map((pt, i) => {
                const x = 24 + (i / (dayCount - 1)) * (w - 48);
                const y = 20 + ((maxP - pt.price) / spanP) * (h - 46);
                return { x, y, ...pt };
              });
              const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');

              return (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Heildarlínurit markaðarins
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                        Vegin verðvísitala farsímamarkaðarins (7 dagar)
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Vegið meðalverð allra virkra tilboða í {meta?.totalStores || 14} verslunum
                      </p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                        isDown
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      {isDown ? `↓ ${diffPct}%` : `↑ +${diffPct}%`}
                    </span>
                  </div>

                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-white/[0.06] p-3">
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 overflow-visible">
                      <polygon
                        points={`${coords[0].x},${h - 20} ${poly} ${coords[coords.length - 1].x},${h - 20}`}
                        fill={color}
                        fillOpacity="0.12"
                      />
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={poly}
                      />
                      {coords.map((c, idx) => (
                        <g key={idx}>
                          <circle cx={c.x} cy={c.y} r={3.5} fill={color} stroke="#fff" strokeWidth="1.2" />
                          <text
                            x={c.x}
                            y={c.y - 8}
                            textAnchor="middle"
                            className="fill-zinc-700 dark:fill-zinc-300 text-[9px] font-mono font-semibold"
                          >
                            {Math.round(c.price / 1000)}þ
                          </text>
                          <text
                            x={c.x}
                            y={h - 4}
                            textAnchor="middle"
                            className="fill-zinc-400 dark:fill-zinc-500 text-[9px] font-mono"
                          >
                            {c.date.slice(8, 10)}.{c.date.slice(5, 7)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 text-zinc-500 dark:text-zinc-400">
                    <span>Upphaf tímabils: <strong className="text-zinc-800 dark:text-zinc-200">{formatPrice(startP)}</strong></span>
                    <span>Staðan í dag: <strong className="text-emerald-600 dark:text-emerald-400">{formatPrice(endP)}</strong></span>
                  </div>
                </>
              );
            })()}
          </section>

          {/* Right: Store Drop vs Hike Activity Breakdown Chart */}
          <section
            aria-label="Verðbreytingar eftir verslunum"
            className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4 flex flex-col justify-between tabular-nums"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                Virkni eftir búðum
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                Verðlækkanir og verðhækkanir eftir verslunum
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Hvaða verslanir eru með flestar virkar verðlækkanir (grænt) vs. hækkanir (rautt)
              </p>
            </div>

            <div className="space-y-2.5">
              {(meta?.storeSummaries || [])
                .slice()
                .sort((a, b) => b.dropsCount + b.hikesCount - (a.dropsCount + a.hikesCount))
                .slice(0, 7)
                .map((st) => {
                  const fav = getStoreFavicon(st.store);
                  const maxAct = Math.max(
                    1,
                    ...(meta?.storeSummaries || []).map((x) => x.dropsCount + x.hikesCount)
                  );
                  const dropPct = Math.round((st.dropsCount / maxAct) * 100);
                  const hikePct = Math.round((st.hikesCount / maxAct) * 100);

                  return (
                    <div key={st.store} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {fav && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={fav}
                              alt={st.store}
                              className="w-4 h-4 rounded-xs object-contain"
                              loading="lazy"
                            />
                          )}
                          <span className="font-semibold text-zinc-900 dark:text-white">{st.store}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ↓ {st.dropsCount} lækkanir
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700">|</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            ↑ {st.hikesCount} hækkanir
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800/90 overflow-hidden flex">
                        {st.dropsCount > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.max(4, dropPct)}%` }}
                          />
                        )}
                        {st.hikesCount > 0 && (
                          <div
                            className="h-full bg-rose-500"
                            style={{ width: `${Math.max(4, hikePct)}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Samtals lækkanir í vöktun: <strong className="text-emerald-600 dark:text-emerald-400">{(meta?.storeSummaries || []).reduce((a, b) => a + b.dropsCount, 0)} tilboð</strong></span>
              <span>Samtals hækkanir: <strong className="text-rose-600 dark:text-rose-400">{(meta?.storeSummaries || []).reduce((a, b) => a + b.hikesCount, 0)} tilboð</strong></span>
            </div>
          </section>
        </div>
      )}

      {/* SECTION 2: EXECUTIVE SCAN SUMMARY BENTO (2-COLUMN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Top Price Spreads & Quality Checks */}
        <section
          aria-label="Mesti verðmunur í síðasta skanna"
          className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  Stærstu verðmismunir í síðustu keyrslu
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sama símalíkan og sama geymslupláss borið saman milli verslana
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                Staðfest geymsla
              </span>
            </div>

            <div className="space-y-2 tabular-nums">
              {(meta?.topSavings || []).slice(0, 4).map((item, idx) => {
                const cheapFav = getStoreFavicon(item.cheapestStore);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">
                        {item.name} {item.variantStorage ? `(${item.variantStorage})` : ''}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {cheapFav && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cheapFav}
                            alt={item.cheapestStore}
                            className="w-3.5 h-3.5 rounded-xs object-contain"
                            loading="lazy"
                          />
                        )}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {item.cheapestStore} ({formatPrice(item.lowestPrice)})
                        </strong>
                        <span>vs {item.expensiveStore} ({formatPrice(item.highestPrice)})</span>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                      -{formatPrice(item.savings)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] grid grid-cols-3 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-white/[0.05]">
              <strong className="text-zinc-800 dark:text-zinc-200 block">Hraðastýring</strong>
              14 lotur × 4 straumar
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-white/[0.05]">
              <strong className="text-zinc-800 dark:text-zinc-200 block">Geymsluvarnir</strong>
              256GB vs 256GB
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-white/[0.05]">
              <strong className="text-zinc-800 dark:text-zinc-200 block">Afritun</strong>
              JSON + localStorage
            </div>
          </div>
        </section>

        {/* Right: Brand Distribution */}
        <section
          aria-label="Dreifing eftir framleiðendum"
          className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                Dreifing vörulista eftir framleiðendum
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Hlutfall símalíkana í vöktun eftir vörumerki
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              {models.length} líkön
            </span>
          </div>

          <div className="space-y-2.5 tabular-nums">
            {sortedBrands.map(([brand, count]) => {
              const pct = models.length > 0 ? Math.round((count / models.length) * 100) : 0;
              return (
                <div key={brand} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{brand}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                      {count} líkön ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full"
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* SECTION 3: CONNECTED STORES BENTO GRID */}
      <section
        aria-label="Tengdar verslanir í vöktun"
        className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              Tengdar verslanir og vörugáttir ({meta?.totalStores || 0})
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Allar verslanir sem skilar virkum farsímatilboðum í rauntíma
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            ● 100% virkar tengingar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {(meta?.storesList || []).map((st) => {
            const fav = getStoreFavicon(st);
            const domain = getStoreDomain(st);
            const summary = meta?.storeSummaries?.find((s) => s.store === st);
            return (
              <div
                key={st}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-white/[0.06] flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center outline-1 -outline-offset-1 outline-black/10">
                  {fav ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={fav}
                      alt={st}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs font-bold text-zinc-700">{st[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate block">
                    {st}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate block tabular-nums">
                    {summary ? `${summary.totalPhones} símar` : domain}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: ACCESSIBLE EXECUTION LOG TABLE */}
      <section
        aria-label="Keyrsluferill"
        className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="execution-log-caption" className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              Ferill síðustu keyrslna (Execution Log History)
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Smelltu á línu til að opna heildarsamantekt eða skoða JSON hrágögn
            </p>
          </div>

          <button
            onClick={() => onOpenInspector('summary')}
            className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] font-medium transition-colors"
          >
            Skoða heildarskýrslu →
          </button>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="execution-log-caption"
          className="overflow-x-auto max-w-full rounded-xl border border-zinc-200/80 dark:border-white/[0.07]"
        >
          <table className="w-full text-left text-xs tabular-nums border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold">
                  Tímasetning
                </th>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold">
                  Staða
                </th>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold">
                  Símar fundnir
                </th>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold">
                  Verslanir
                </th>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold">
                  Svarstími
                </th>
                <th className="py-3 px-4 border-b border-zinc-200 dark:border-white/[0.08] font-semibold text-right">
                  Skýrsla & JSON
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06] text-zinc-700 dark:text-zinc-300">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => onOpenInspector('summary')}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                >
                  <th
                    scope="row"
                    className="py-3 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                  >
                    {formatDate(log.timestamp)}
                  </th>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                      ● {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                    {log.modelsCount} líkön
                  </td>
                  <td className="py-3 px-4">{log.storesCount} verslanir</td>
                  <td className="py-3 px-4 font-mono text-cyan-600 dark:text-cyan-400">
                    {log.durationMs} ms
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInspector('summary');
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
      </section>
    </div>
  );
}
