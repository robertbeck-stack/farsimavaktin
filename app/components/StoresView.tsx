'use client';

import {
  MetaData,
  PhoneModelGroup,
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

export function StoresView({ meta, models, onSelectStore }: StoresViewProps) {
  const summaries = meta?.storeSummaries || [];
  const leader = summaries[0];
  const totalDrops = summaries.reduce((acc, s) => acc + s.dropsCount, 0);
  const totalHikes = summaries.reduce((acc, s) => acc + s.hikesCount, 0);
  const totalOffersCount = summaries.reduce((acc, s) => acc + s.totalPhones, 0);

  return (
    <div className="space-y-6">
      {/* BENTO KPI HERO ROW */}
      <section aria-label="Verslanayfirlit" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </span>
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Verslanagreining og samkeppnisstaða á Íslandi
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
              <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white truncate block">
                {leader?.store || 'Nova'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                Ódýrust í {leader?.cheapestCount || 0} símalíkönum
              </span>
            </div>
          </div>

          {/* Card 2: Active Stores & Offers */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Heildarfjöldi tilboða í vöktun
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white">
                {totalOffersCount}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">virkar vörulínur</span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              Í {meta?.totalStores || summaries.length} íslenskum vefverslunum
            </span>
          </div>

          {/* Card 3: Price Drops Today */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðlækkanir í dag
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {totalDrops}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">tilboð lækkuðu</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              Bein verðvöktun á öllum stærðum
            </span>
          </div>

          {/* Card 4: Price Hikes / Stability */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Verðhækkanir í dag
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {totalHikes}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">tilboð hækkuðu</span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              {models.filter((m) => m.storesCount >= 2).length} símar í 2+ verslunum
            </span>
          </div>
        </div>
      </section>

      {/* PRICE LEADERSHIP BAR CHART BENTO */}
      {summaries.length > 0 && (
        <section
          aria-label="Hlutdeild í lægstu verðum"
          className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                Verðforysta eftir verslunum (Hver er oftast ódýrust?)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Fjöldi símalíkana þar sem viðkomandi verslun býður lægsta verðið á markaðnum í dag
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              Miðað við {models.length} símalíkön
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
            {summaries.slice(0, 8).map((st, idx) => {
              const maxCheapest = summaries[0]?.cheapestCount || 1;
              const widthPct = Math.max(4, Math.round((st.cheapestCount / maxCheapest) * 100));
              const winRate =
                st.totalPhones > 0 ? Math.round((st.cheapestCount / st.totalPhones) * 100) : 0;
              const fav = getStoreFavicon(st.store);

              return (
                <div key={st.store} className="space-y-1.5 tabular-nums">
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
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {st.cheapestCount} ódýrust
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        ({winRate}% af sínu úrvali)
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
        </section>
      )}

      {/* STORE BENTO CARDS GRID (3-COLUMN MODERN DESIGN) */}
      <section aria-label="Allar verslanir" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((st, idx) => {
          const isLeader = idx === 0 && st.cheapestCount > 0;
          const fav = getStoreFavicon(st.store);
          const domain = getStoreDomain(st.store);
          const winRate =
            st.totalPhones > 0 ? Math.round((st.cheapestCount / st.totalPhones) * 100) : 0;

          return (
            <article
              key={st.store}
              className="group rounded-2xl bg-white dark:bg-zinc-900/65 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/95 border border-zinc-200/80 dark:border-white/[0.07] hover:border-zinc-300 dark:hover:border-white/[0.16] p-5 flex flex-col justify-between transition-colors duration-150 shadow-xs space-y-4"
            >
              <div className="space-y-4">
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
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Lækkanir</span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                      {st.dropsCount} stk.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-white/[0.05]">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Nettó í dag</span>
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
