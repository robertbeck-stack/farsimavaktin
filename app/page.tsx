'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  PhoneModelGroup,
  MetaData,
  RunLogEntry,
  PricePoint,
  PriceRangeFilter,
} from './types';
import { ProductsView } from './components/ProductsView';
import { StoresView } from './components/StoresView';
import { SystemLogsView } from './components/SystemLogsView';
import { PhoneComparisonModal, ScanInspectorModal } from './components/Modals';

export default function Home() {
  const [models, setModels] = useState<PhoneModelGroup[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme state (synced with <meta name="color-scheme">, system preference, and localStorage)
  const [isDark, setIsDark] = useState<boolean>(true);

  // Active view: 'list' | 'stores' | 'logs'
  const [activeView, setActiveView] = useState<'list' | 'stores' | 'logs'>('list');
  // Layout mode: 'grid' | 'rows'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'rows'>('grid');

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Allt');
  const [selectedStore, setSelectedStore] = useState('Allt');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [onlyMultiStore, setOnlyMultiStore] = useState(false);
  const [sortBy, setSortBy] = useState<'savings' | 'asc' | 'desc' | 'drop'>('savings');

  // Inline selected storage per model card/row
  const [cardStorageMap, setCardStorageMap] = useState<Record<string, string>>({});

  // Selected phone for detail modal / inspector
  const [selectedModel, setSelectedModel] = useState<PhoneModelGroup | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string>('');

  // Raw JSON & Summary Inspector modal
  const [rawJsonPayload, setRawJsonPayload] = useState<unknown>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [rawJsonTab, setRawJsonTab] = useState<'summary' | 'all' | 'meta' | 'sample'>('summary');
  const [rawSearchFilter, setRawSearchFilter] = useState('');
  const [copiedRaw, setCopiedRaw] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suppress transitions briefly during theme change to avoid color smearing
  const applyThemeWithTransitionSuppression = useCallback((nextDark: boolean, metaValue: string) => {
    const style = document.createElement('style');
    style.append(document.createTextNode('*,*::before,*::after{transition:none !important}'));
    document.head.append(style);

    const metaEl = document.querySelector('meta[name="color-scheme"]');
    if (metaEl) metaEl.setAttribute('content', metaValue);
    document.documentElement.classList.toggle('dark', nextDark);
    setIsDark(nextDark);

    void document.body.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => style.remove());
    });
  }, []);

  // Initialize and synchronize color scheme across system changes and tabs
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const syncFromStorageAndSystem = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('color-scheme');
      } catch {
        // Ignore blocked storage
      }
      const nextDark = stored === 'dark' || (stored !== 'light' && mql.matches);
      applyThemeWithTransitionSuppression(nextDark, stored ?? 'light dark');
    };

    syncFromStorageAndSystem();

    const onMqlChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('color-scheme');
      } catch {
        // Ignore
      }
      if (!stored) {
        applyThemeWithTransitionSuppression(mql.matches, 'light dark');
      }
    };

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        syncFromStorageAndSystem();
      }
    };

    mql.addEventListener('change', onMqlChange);
    window.addEventListener('storage', onStorageChange);
    return () => {
      mql.removeEventListener('change', onMqlChange);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [applyThemeWithTransitionSuppression]);

  const handleToggleTheme = () => {
    const target: 'light' | 'dark' = isDark ? 'light' : 'dark';
    const systemScheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    let metaContent = 'light dark';
    try {
      if (target === systemScheme) {
        localStorage.removeItem('color-scheme');
        metaContent = 'light dark';
      } else {
        localStorage.setItem('color-scheme', target);
        metaContent = target;
      }
    } catch {
      metaContent = target;
    }

    applyThemeWithTransitionSuppression(target === 'dark', metaContent);
  };

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
        localStorage.removeItem('farsimar_catalog_backup_v1');
        const savedCatalogRaw = localStorage.getItem('farsimar_catalog_backup_v2');
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

        const consolidated = Array.from(modelMapAll.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'is')
        );
        localStorage.setItem('farsimar_catalog_backup_v2', JSON.stringify(savedCatalog));

        const localHistoryRaw = localStorage.getItem('farsimar_price_history_v1');
        const localHistory: Record<string, PricePoint[]> = localHistoryRaw
          ? JSON.parse(localHistoryRaw)
          : {};
        const today = new Date().toISOString().slice(0, 10);

        syncedModels = consolidated.map((m: PhoneModelGroup) => {
          let hist =
            localHistory[m.id] && localHistory[m.id].length > (m.history?.length || 0)
              ? localHistory[m.id]
              : m.history && m.history.length > 0
              ? m.history
              : [{ date: today, price: m.lowestPrice }];

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

  // Keyboard shortcuts: '/' focuses search, 'Escape' closes modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedModel) setSelectedModel(null);
        else if (showRawJsonModal) setShowRawJsonModal(false);
        return;
      }
      if (
        e.key === '/' &&
        !selectedModel &&
        !showRawJsonModal &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel, showRawJsonModal]);

  const handleSelectModel = (model: PhoneModelGroup, defaultStorage?: string) => {
    setSelectedModel(model);
    const chosen = defaultStorage || cardStorageMap[model.id];
    if (chosen && model.variants.some((v) => v.storage === chosen)) {
      setSelectedStorage(chosen);
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
          m.variants.some((v) => v.storage.toLowerCase().includes(q)) ||
          m.stores.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (selectedBrand !== 'Allt') {
      result = result.filter((m) => m.brand === selectedBrand);
    }

    if (selectedStore !== 'Allt') {
      result = result.filter((m) => m.stores.includes(selectedStore));
    }

    if (onlyMultiStore) {
      result = result.filter((m) => m.storesCount >= 2);
    }

    if (priceRange !== 'all') {
      result = result.filter((m) => {
        if (priceRange === 'under50') return m.lowestPrice < 50000;
        if (priceRange === '50to120') return m.lowestPrice >= 50000 && m.lowestPrice <= 120000;
        if (priceRange === '120to200') return m.lowestPrice > 120000 && m.lowestPrice <= 200000;
        if (priceRange === 'over200') return m.lowestPrice > 200000;
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'savings') {
        if (b.maxSavings !== a.maxSavings) return b.maxSavings - a.maxSavings;
        return b.storesCount - a.storesCount;
      }
      if (sortBy === 'drop') return a.priceChangePercent - b.priceChangePercent;
      if (sortBy === 'asc') return a.lowestPrice - b.lowestPrice;
      if (sortBy === 'desc') return b.lowestPrice - a.lowestPrice;
      return a.name.localeCompare(b.name, 'is');
    });

    return result;
  }, [models, search, selectedBrand, selectedStore, onlyMultiStore, priceRange, sortBy]);

  const currentVariant = useMemo(() => {
    if (!selectedModel) return null;
    return (
      selectedModel.variants.find((v) => v.storage === selectedStorage) ||
      selectedModel.variants[0]
    );
  }, [selectedModel, selectedStorage]);

  const rawFormattedJson = useMemo(() => {
    if (!rawJsonPayload) return '// Engin gögn hlaðin ennþá...';
    const payload = rawJsonPayload as { meta?: MetaData; models?: PhoneModelGroup[] };
    let targetData: unknown = payload;
    if (rawJsonTab === 'meta') {
      targetData = payload.meta || {};
    } else if (rawJsonTab === 'sample') {
      targetData = {
        info: 'Sýnishorn af fyrstu 10 símalíkönum úr skanna',
        sampleCount: Math.min(10, payload.models?.length || 0),
        models: (payload.models || []).slice(0, 10),
      };
    }

    const fullStr = JSON.stringify(targetData, null, 2);
    if (!rawSearchFilter.trim()) return fullStr;

    const q = rawSearchFilter.toLowerCase();
    const lines = fullStr.split('\n');
    const matchedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length - 1, i + 2);
        matchedLines.push(`// --- Lína ${i + 1} ---`);
        for (let j = start; j <= end; j++) {
          matchedLines.push(lines[j]);
        }
        matchedLines.push('');
        i = end;
      }
    }
    return matchedLines.length > 0
      ? matchedLines.join('\n')
      : `// Engar línur fundust með leitarorðinu "${rawSearchFilter}"`;
  }, [rawJsonPayload, rawJsonTab, rawSearchFilter]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawFormattedJson);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(rawJsonPayload || { meta, models }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farsimavaktin-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200 relative overflow-x-hidden">
      {/* Ambient Subtle Top Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(16,185,129,0.08),rgba(59,130,246,0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(16,185,129,0.10),rgba(59,130,246,0.05),transparent)] z-0"
      />

      {/* Sticky Glass Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-white/[0.07] bg-white/85 dark:bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-500/10 border border-emerald-600/25 dark:border-emerald-500/30 flex items-center justify-center shadow-xs shrink-0">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Farsímavaktin
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  BEIN VÖKTUN
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                Rauntíma verðsamanburður á {models.length} símalíkönum hjá {meta?.totalStores || 10} íslenskum verslunum
              </p>
            </div>
          </div>

          {/* Segmented View Switcher, Theme Toggle & Refresh */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <nav
              aria-label="Aðalvalmynd"
              className="bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.08] p-1 rounded-xl flex items-center text-xs"
            >
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span>Vörur</span>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums hidden sm:inline">
                  ({models.length})
                </span>
              </button>

              <button
                onClick={() => setActiveView('stores')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'stores'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <span>Verslanir</span>
              </button>

              <button
                onClick={() => setActiveView('logs')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] flex items-center gap-1.5 ${
                  activeView === 'logs'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs ring-1 ring-zinc-900/5 dark:ring-white/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <span>Kerfisvakt</span>
              </button>
            </nav>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors duration-150 motion-safe:enabled:active:scale-[0.96]"
              title={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
              aria-label={isDark ? 'Skipta yfir í ljóst þema' : 'Skipta yfir í dökkt þema'}
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <span className="hidden md:inline">Ljóst</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <span className="hidden md:inline">Dökkt</span>
                </>
              )}
            </button>

            {/* Refresh Action */}
            <button
              onClick={() => fetchPhones(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs transition-colors duration-150 motion-safe:enabled:active:scale-[0.96] disabled:opacity-50"
              title="Sækja nýjustu verð"
            >
              <svg
                className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{refreshing ? 'Uppfæri...' : 'Uppfæra'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeView === 'list' && (
          <ProductsView
            models={models}
            filteredModels={filteredModels}
            meta={meta}
            loading={loading}
            error={error}
            search={search}
            setSearch={setSearch}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onlyMultiStore={onlyMultiStore}
            setOnlyMultiStore={setOnlyMultiStore}
            sortBy={sortBy}
            setSortBy={setSortBy}
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            cardStorageMap={cardStorageMap}
            setCardStorageMap={setCardStorageMap}
            handleSelectModel={handleSelectModel}
            fetchPhones={fetchPhones}
            searchInputRef={searchInputRef}
          />
        )}

        {activeView === 'stores' && (
          <StoresView
            meta={meta}
            models={models}
            onSelectStore={(st) => {
              setSelectedStore(st);
              setActiveView('list');
            }}
          />
        )}

        {activeView === 'logs' && (
          <SystemLogsView
            meta={meta}
            models={models}
            logs={logs}
            refreshing={refreshing}
            onRefresh={() => fetchPhones(true)}
            onOpenInspector={(tab) => {
              setRawJsonTab(tab);
              setShowRawJsonModal(true);
            }}
          />
        )}

        {selectedModel && (
          <PhoneComparisonModal
            selectedModel={selectedModel}
            selectedStorage={selectedStorage}
            setSelectedStorage={setSelectedStorage}
            currentVariant={currentVariant}
            isDark={isDark}
            onClose={() => setSelectedModel(null)}
          />
        )}

        {showRawJsonModal && (
          <ScanInspectorModal
            meta={meta}
            models={models}
            rawJsonTab={rawJsonTab}
            setRawJsonTab={setRawJsonTab}
            rawSearchFilter={rawSearchFilter}
            setRawSearchFilter={setRawSearchFilter}
            rawFormattedJson={rawFormattedJson}
            copiedRaw={copiedRaw}
            onCopyJson={handleCopyJson}
            onDownloadJson={handleDownloadJson}
            onClose={() => setShowRawJsonModal(false)}
          />
        )}
      </main>

      {/* Minimal Modern Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-white/[0.06] mt-16 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Farsímavaktin — Rauntíma verðsamanburður á farsímum á Íslandi.</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Gögn sótt beint úr vörustraumum ELKO, Nova, Símans, Sýnar, Emobi, Tölvulistans o.fl.
          </p>
        </div>
      </footer>
    </div>
  );
}
