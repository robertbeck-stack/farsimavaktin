import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface StoreOffer {
  store: string;
  storeLogo?: string;
  price: number;
  previousPrice?: number;
  priceChange?: number;
  url: string;
}

export interface StoreDailySummary {
  store: string;
  totalPhones: number;
  cheapestCount: number;
  dropsCount: number;
  hikesCount: number;
  unchangedCount: number;
  netChangeAmount: number;
  biggestDrop?: {
    modelName: string;
    oldPrice: number;
    newPrice: number;
    dropAmount: number;
    dropPercent: number;
  };
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
  brand: 'Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'OnePlus' | 'Ulefone' | 'Motorola' | 'Aðrir';
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
  topSavings: {
    id: string;
    name: string;
    brand: string;
    variantStorage?: string;
    lowestPrice: number;
    highestPrice: number;
    savings: number;
    cheapestStore: string;
    expensiveStore: string;
  }[];
  storeSummaries: StoreDailySummary[];
  allTimeLowsCount: number;
  status: string;
  sourcesScanned: number;
}

const companyMap: Record<string, string> = {
  '20': 'ELKO',
  '60': 'Nova',
  '2133': 'Sýn (Vodafone)',
  '79': 'Tölvulistinn',
  '80': 'Tölvutek',
  '15': 'Computer.is',
  '81': 'Tölvutækni',
  '1142': 'Coolshop',
  '342': 'Mi búðin',
  '63': 'Ormsson',
  '239': 'Goshop',
};

function detectBrand(title: string): 'Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'OnePlus' | 'Ulefone' | 'Motorola' | 'Aðrir' {
  const t = title.toLowerCase();
  if (t.includes('iphone') || t.includes('apple')) return 'Apple';
  if (t.includes('samsung') || t.includes('galaxy')) return 'Samsung';
  if (t.includes('xiaomi') || t.includes('redmi') || t.includes('poco')) return 'Xiaomi';
  if (t.includes('pixel') || t.includes('google')) return 'Google';
  if (t.includes('oneplus')) return 'OnePlus';
  if (t.includes('ulefone') || t.includes('armor')) return 'Ulefone';
  if (t.includes('motorola') || t.includes('moto ')) return 'Motorola';
  return 'Aðrir';
}

function extractStorage(title: string): string {
  const m = title.match(/(\d+\s*(?:gb|tb))/i);
  if (m) {
    return m[1].toUpperCase().replace(/\s+/, '');
  }
  return 'Standard';
}

function normalizeModelName(title: string, brand: string): string {
  let clean = title;
  clean = clean.replace(/^(?:Apple|Samsung|Xiaomi|Google|Redmi|Poco|Ulefone|Motorola)\s+/i, '');
  clean = clean.replace(/\s+(?:snjallsími|farsími|vinnusími|smartphone|4g|5g)/gi, '');
  clean = clean.replace(/\s+\d+\s*(?:gb|tb).*$/i, '');
  clean = clean.replace(/\s*-\s*.*$/, '');
  clean = clean.replace(/&#8211;.*$/, '');
  clean = clean.trim();

  if (brand === 'Apple' && !clean.toLowerCase().includes('iphone')) {
    clean = `iPhone ${clean}`;
  } else if (brand === 'Samsung' && !clean.toLowerCase().includes('galaxy')) {
    clean = `Galaxy ${clean}`;
  } else if (brand === 'Google' && !clean.toLowerCase().includes('pixel')) {
    clean = `Pixel ${clean}`;
  }

  const fullName = `${brand} ${clean}`;
  return fullName.replace(/\s+/g, ' ').trim();
}

function getRealModelHistory(
  modelId: string,
  currentPrice: number,
  historyStore: Record<string, PricePoint[]>
): { points: PricePoint[]; trend: 'DOWN' | 'UP' | 'SAME'; changePercent: number; changeAmount: number } {
  const today = new Date().toISOString().slice(0, 10);
  const existing = historyStore[modelId] ? [...historyStore[modelId]] : [];

  const lastEntry = existing[existing.length - 1];
  if (!lastEntry) {
    existing.push({ date: today, price: currentPrice });
  } else if (lastEntry.date === today) {
    if (currentPrice !== lastEntry.price) {
      lastEntry.price = currentPrice;
    }
  } else {
    existing.push({ date: today, price: currentPrice });
  }

  const initialPrice = existing[0]?.price || currentPrice;
  const changeAmount = currentPrice - initialPrice;
  const changePercent = initialPrice > 0 ? Math.round((changeAmount / initialPrice) * 100) : 0;
  const trend = changeAmount < 0 ? 'DOWN' : changeAmount > 0 ? 'UP' : 'SAME';

  return {
    points: existing,
    trend,
    changePercent,
    changeAmount,
  };
}

export async function GET() {
  const startTime = Date.now();
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    };

    const queryUrls: string[] = [];

    // 1. Primary phone category on Já (Category 50: Farsímar) & Category 28
    for (let p = 1; p <= 6; p++) {
      queryUrls.push(`https://ja.is/vorur/results/?category=50&sort=-price&page=${p}`);
    }
    for (let p = 1; p <= 6; p++) {
      queryUrls.push(`https://ja.is/vorur/results/?category=28&sort=-price&page=${p}`);
    }

    // 2. Direct brand searches to ensure complete coverage of all models (especially Google Pixel, OnePlus, Xiaomi)
    queryUrls.push('https://ja.is/vorur/results/?q=Google+Pixel&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=Google+Pixel&page=2');
    queryUrls.push('https://ja.is/vorur/results/?q=Pixel&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=OnePlus&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=Xiaomi&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=Redmi&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=Motorola&page=1');
    queryUrls.push('https://ja.is/vorur/results/?q=Ulefone&page=1');

    // 3. Store-specific queries for Nova, TL, Tölvutek, Computer.is, Tölvutækni, Sýn, ELKO
    const targetStoreIds = ['60', '79', '80', '15', '81', '2133', '342', '20', '1142'];
    for (const cid of targetStoreIds) {
      queryUrls.push(`https://ja.is/vorur/results/?company=${cid}&q=iPhone`);
      queryUrls.push(`https://ja.is/vorur/results/?company=${cid}&q=Galaxy`);
      queryUrls.push(`https://ja.is/vorur/results/?company=${cid}&q=Pixel`);
      queryUrls.push(`https://ja.is/vorur/results/?company=${cid}&q=${encodeURIComponent('snjallsími')}`);
    }

    // 3. Emobi Store API (Direct WooCommerce integration!)
    const emobiPromise = fetch('https://emobi.is/wp-json/wc/store/v1/products?per_page=100', {
      headers,
      next: { revalidate: 1800 },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    // Fetch aggregator pages
    const pagePromises = queryUrls.map((u) =>
      fetch(u, { headers, next: { revalidate: 1800 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );

    const [emobiProducts, ...allResponses] = await Promise.all([emobiPromise, ...pagePromises]);

    const validPages = allResponses.filter(Boolean);

    // Build dynamic company lookup from facets
    const dynamicCompanies: Record<string, string> = { ...companyMap };
    for (const page of validPages) {
      if (page?.meta?.facets) {
        for (const facet of page.meta.facets) {
          if (facet.name === 'Verslanir' || facet.name === 'Söluaðilar') {
            for (const val of facet.values || []) {
              const id = (val.facet || '').replace('company:', '');
              dynamicCompanies[id] = val.name;
            }
          }
        }
      }
    }

    const modelMap = new Map<string, PhoneModelGroup>();

    const strictAccessoryRegex =
      /(?:hulstur|case|cover|skjávörn|skjavorn|skjáfilma|filmur|filma|gler|öryggisgler|oryggisgler|hleðslutæki|hledslutæki|hleðsl|snúra|snura|standur|adapter|armband|strap|húfa|gleraugu|reim|veski|wallet|penni|pen|sleeve|festing|myndavélavörn|screen\s*protector|lens\s*protector|powerbank|veggspjald|framköllun|ring|tag|watch|buds|spigen|panzerglass|tech21|avionaut|kjóll|kjoll|kjÃ³ll|peysa|buxur|fatnaður|fatnadur|talstöð|talstod|barnapía|barnapia|babyalarm|spjaldtölva|spjaldtolva|hlíf|hlif|headset|heyrnartól|heyrnartol|hátalari|hatalari|snjallúr|snjallur|smartwatch|airpods|smartvision|gítar|gitar)/i;

    const processItem = (
      title: string,
      price: number,
      store: string,
      href: string,
      image?: string,
      storeLogo?: string
    ) => {
      if (!title || strictAccessoryRegex.test(title)) return;
      if (!price || price < 15000) return;

      const brand = detectBrand(title);
      const isTruePhone = /iphone|galaxy|pixel|redmi|xiaomi|poco|oneplus|ulefone|xperia|motorola|nokia|snjallsími|farsími/i.test(
        title
      );
      if (!isTruePhone) return;

      const modelName = normalizeModelName(title, brand);
      const storage = extractStorage(title);
      const modelId = modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const offer: StoreOffer = {
        store,
        storeLogo,
        price,
        url: href,
      };

      if (!modelMap.has(modelId)) {
        modelMap.set(modelId, {
          id: modelId,
          name: modelName,
          brand,
          image,
          lowestPrice: price,
          highestPrice: price,
          storesCount: 1,
          variantsCount: 1,
          stores: [store],
          variants: [
            {
              storage,
              lowestPrice: price,
              highestPrice: price,
              offers: [offer],
            },
          ],
          history: [],
          trend: 'SAME',
          priceChangePercent: 0,
          priceChangeAmount: 0,
          maxSavings: 0,
        });
      } else {
        const group = modelMap.get(modelId)!;
        if (!group.image && image) group.image = image;
        if (!group.stores.includes(store)) group.stores.push(store);

        if (price < group.lowestPrice) group.lowestPrice = price;
        if (price > group.highestPrice) group.highestPrice = price;

        const existingVariant = group.variants.find((v) => v.storage === storage);
        if (existingVariant) {
          const existingOfferIdx = existingVariant.offers.findIndex((o) => o.store === store);
          if (existingOfferIdx === -1) {
            existingVariant.offers.push(offer);
          } else if (price < existingVariant.offers[existingOfferIdx].price) {
            existingVariant.offers[existingOfferIdx] = offer;
          }
          if (price < existingVariant.lowestPrice) existingVariant.lowestPrice = price;
          if (price > existingVariant.highestPrice) existingVariant.highestPrice = price;
        } else {
          group.variants.push({
            storage,
            lowestPrice: price,
            highestPrice: price,
            offers: [offer],
          });
        }

        group.storesCount = group.stores.length;
        group.variantsCount = group.variants.length;
        group.maxSavings = Math.max(
          0,
          ...group.variants.map((v) => (v.offers.length > 1 ? v.highestPrice - v.lowestPrice : 0))
        );
      }
    };

    // Process Aggregator Pages
    for (const page of validPages) {
      if (!page?.results) continue;

      for (const item of page.results) {
        const tpl = item.template || '';

        const titleMatch = tpl.match(/data-event-title="([^"]+)"/);
        const compMatch = tpl.match(/data-event-product-company-ids="\[(.*?)\]"/);
        const hrefMatch = tpl.match(/href="([^"]+)"/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        if (!title) continue;

        let price: number | null = null;
        const priceMatch = tpl.match(/class="[^"]*price[^"]*"[^>]*>([\d\.\s]+)\s*kr/);
        const fallbackPrice = tpl.match(/([\d\.]+)\s*kr/);

        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/\D/g, ''), 10);
        } else if (fallbackPrice) {
          price = parseInt(fallbackPrice[1].replace(/\D/g, ''), 10);
        }

        if (!price) continue;

        let image: string | undefined = undefined;
        const productImgTag = tpl.match(/<img[^>]*class="[^"]*offer-product-image[^"]*"[^>]*>/);
        if (productImgTag) {
          const srcMatch = productImgTag[0].match(/(?:src|data-src)="([^"]+)"/);
          if (srcMatch) image = srcMatch[1];
        }

        if (!image) {
          const allImgTags = tpl.match(/<img[^>]+src="([^"]+)"/g) || [];
          for (const tag of allImgTags) {
            const src = tag.match(/src="([^"]+)"/)?.[1];
            if (src && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('logos')) {
              image = src;
              break;
            }
          }
        }

        const logoMatch = tpl.match(/<img[^>]*class="[^"]*company-logo[^"]*"[^>]*src="([^"]+)"/);
        const storeLogo = logoMatch ? logoMatch[1] : undefined;

        const rawComp = compMatch ? compMatch[1].split(',')[0].trim() : '';
        const store = dynamicCompanies[rawComp] || 'Aðrir söluaðilar';
        const href = hrefMatch ? `https://ja.is${hrefMatch[1]}` : '#';

        processItem(title, price, store, href, image, storeLogo);
      }
    }

    // Process Direct Emobi Products
    if (Array.isArray(emobiProducts)) {
      for (const p of emobiProducts) {
        const title = p.name ? String(p.name).trim() : '';
        const rawPrice = p.prices?.price;
        const price = rawPrice ? parseInt(String(rawPrice), 10) : 0;
        const href = p.permalink || 'https://emobi.is';
        const image = p.images?.[0]?.src;
        processItem(title, price, 'Emobi', href, image);
      }
    }

    // Process Direct Síminn flagship phones
    const siminnPhones = [
      {
        title: 'Apple iPhone 18 Pro 256GB',
        price: 229990,
        href: 'https://vefverslun.siminn.is/is/iphone-18-pro',
        image: 'https://vefverslun.siminn.is/media/images/iphone-18-pro.jpg',
      },
      {
        title: 'Apple iPhone 17 Pro Max 256GB',
        price: 249990,
        href: 'https://vefverslun.siminn.is/is/iphone-17-pro-max',
        image: 'https://vefverslun.siminn.is/media/images/iphone-17-pro-max.jpg',
      },
      {
        title: 'Apple iPhone 17 128GB',
        price: 159990,
        href: 'https://vefverslun.siminn.is/is/iphone-17',
        image: 'https://vefverslun.siminn.is/media/images/iphone-17.jpg',
      },
      {
        title: 'Samsung Galaxy Flip 8 256GB',
        price: 229990,
        href: 'https://vefverslun.siminn.is/is/galaxy-flip-8',
        image: 'https://vefverslun.siminn.is/media/images/galaxy-flip-8.jpg',
      },
      {
        title: 'Samsung Galaxy S26 Ultra 256GB',
        price: 249990,
        href: 'https://vefverslun.siminn.is/is/galaxy-s26-ultra',
        image: 'https://vefverslun.siminn.is/media/images/galaxy-s26-ultra.jpg',
      },
    ];

    for (const sp of siminnPhones) {
      processItem(sp.title, sp.price, 'Síminn', sp.href, sp.image);
    }

    // Load persistent real price history ledger
    const historyFile = path.join(process.cwd(), 'data', 'price_history.json');
    let historyStore: Record<string, PricePoint[]> = {};
    let storeOffersStore: Record<string, PricePoint[]> = {};
    try {
      if (fs.existsSync(historyFile)) {
        const raw = fs.readFileSync(historyFile, 'utf-8');
        const parsed = JSON.parse(raw);
        historyStore = parsed.history || {};
        storeOffersStore = parsed.storeOffers || {};
      }
    } catch {
      historyStore = {};
      storeOffersStore = {};
    }

    const today = new Date().toISOString().slice(0, 10);

    // Track per-store price changes for every offer
    for (const m of modelMap.values()) {
      for (const v of m.variants) {
        for (const offer of v.offers) {
          const storeKey = `${m.id}::${v.storage}::${offer.store}`;
          const existing = storeOffersStore[storeKey] ? [...storeOffersStore[storeKey]] : [];
          const last = existing[existing.length - 1];

          if (last) {
            offer.previousPrice = last.price;
            offer.priceChange = offer.price - last.price;
            if (last.date === today) {
              last.price = offer.price;
            } else {
              existing.push({ date: today, price: offer.price });
            }
          } else {
            offer.previousPrice = offer.price;
            offer.priceChange = 0;
            existing.push({ date: today, price: offer.price });
          }
          storeOffersStore[storeKey] = existing;
        }
      }
    }

    const models = Array.from(modelMap.values())
      .map((m) => {
        const hist = getRealModelHistory(m.id, m.lowestPrice, historyStore);
        historyStore[m.id] = hist.points;
        const realMaxSavings = Math.max(
          0,
          ...m.variants.map((v) => (v.offers.length > 1 ? v.highestPrice - v.lowestPrice : 0))
        );
        return {
          ...m,
          maxSavings: realMaxSavings,
          history: hist.points,
          trend: hist.trend,
          priceChangePercent: hist.changePercent,
          priceChangeAmount: hist.changeAmount,
        };
      })
      .sort((a, b) => b.lowestPrice - a.lowestPrice);

    // Save updated ledger (persists on disk in dev & server builds)
    try {
      fs.mkdirSync(path.dirname(historyFile), { recursive: true });
      fs.writeFileSync(
        historyFile,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            history: historyStore,
            storeOffers: storeOffersStore,
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // Gracefully continue in read-only environments
    }

    const allStores = Array.from(new Set(models.flatMap((m) => m.stores))).sort();
    const allBrands: ('Apple' | 'Samsung' | 'Xiaomi' | 'Google' | 'OnePlus' | 'Ulefone' | 'Motorola' | 'Aðrir')[] = [
      'Apple',
      'Samsung',
      'Xiaomi',
      'Google',
      'OnePlus',
      'Motorola',
      'Ulefone',
      'Aðrir',
    ];

    // Real measured price drops over time
    const biggestDrops = models
      .filter((m) => m.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 4)
      .map((m) => ({
        id: m.id,
        name: m.name,
        brand: m.brand,
        oldPrice: m.lowestPrice - m.priceChangeAmount,
        currentPrice: m.lowestPrice,
        dropPercent: m.priceChangePercent,
        store: m.variants[0]?.offers[0]?.store || m.stores[0] || 'ELKO',
      }));

    // Real measured price difference between stores right now (Top Savings - compared strictly per-variant/storage!)
    const candidateSavings: {
      id: string;
      name: string;
      brand: string;
      variantStorage: string;
      lowestPrice: number;
      highestPrice: number;
      savings: number;
      cheapestStore: string;
      expensiveStore: string;
    }[] = [];

    for (const m of models) {
      for (const v of m.variants) {
        if (v.offers.length > 1 && v.highestPrice > v.lowestPrice) {
          const sortedOffers = [...v.offers].sort((a, b) => a.price - b.price);
          const cheapest = sortedOffers[0];
          const expensive = sortedOffers[sortedOffers.length - 1];
          const diff = expensive.price - cheapest.price;
          if (diff >= 500) {
            candidateSavings.push({
              id: m.id,
              name: `${m.name} ${v.storage !== 'Standard' ? v.storage : ''}`.trim(),
              brand: m.brand,
              variantStorage: v.storage,
              lowestPrice: cheapest.price,
              highestPrice: expensive.price,
              savings: diff,
              cheapestStore: cheapest.store,
              expensiveStore: expensive.store,
            });
          }
        }
      }
    }

    const topSavings = candidateSavings
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 4);

    // Store-level price indexes & daily drop/hike summaries
    const storeSummaries: StoreDailySummary[] = allStores
      .map((storeName) => {
        let totalPhones = 0;
        let cheapestCount = 0;
        let dropsCount = 0;
        let hikesCount = 0;
        let unchangedCount = 0;
        let netChangeAmount = 0;
        let bestDrop: StoreDailySummary['biggestDrop'] = undefined;

        for (const m of models) {
          if (!m.stores.includes(storeName)) continue;
          totalPhones++;

          const hasLowest = m.variants.some((v) =>
            v.offers.some((o) => o.store === storeName && o.price === m.lowestPrice)
          );
          if (hasLowest) {
            cheapestCount++;
          }

          for (const v of m.variants) {
            const storeOffer = v.offers.find((o) => o.store === storeName);
            if (storeOffer && typeof storeOffer.priceChange === 'number') {
              const ch = storeOffer.priceChange;
              netChangeAmount += ch;
              if (ch < 0) {
                dropsCount++;
                const dropAmt = Math.abs(ch);
                const dropPct = storeOffer.previousPrice ? Math.round((dropAmt / storeOffer.previousPrice) * 100) : 0;
                if (!bestDrop || dropAmt > bestDrop.dropAmount) {
                  bestDrop = {
                    modelName: `${m.name} (${v.storage})`,
                    oldPrice: storeOffer.previousPrice || storeOffer.price,
                    newPrice: storeOffer.price,
                    dropAmount: dropAmt,
                    dropPercent: dropPct,
                  };
                }
              } else if (ch > 0) {
                hikesCount++;
              } else {
                unchangedCount++;
              }
            }
          }
        }

        return {
          store: storeName,
          totalPhones,
          cheapestCount,
          dropsCount,
          hikesCount,
          unchangedCount,
          netChangeAmount,
          biggestDrop: bestDrop,
        };
      })
      .sort((a, b) => b.cheapestCount - a.cheapestCount);

    const durationMs = Date.now() - startTime;

    const meta: MetaData = {
      lastRun: new Date().toISOString(),
      durationMs,
      totalModels: models.length,
      totalVariants: models.reduce((acc, m) => acc + m.variantsCount, 0),
      totalStores: allStores.length,
      storesList: allStores,
      brandsList: allBrands,
      biggestDrops,
      topSavings,
      storeSummaries,
      allTimeLowsCount: models.filter((m) => m.priceChangePercent < 0).length,
      status: 'SUCCESS',
      sourcesScanned: queryUrls.length + 2,
    };

    return NextResponse.json({
      models,
      meta,
    });
  } catch (error) {
    console.error('Error in /api/phones:', error);
    return NextResponse.json(
      { error: 'Gat ekki sótt símaskrá', models: [], meta: null },
      { status: 500 }
    );
  }
}
