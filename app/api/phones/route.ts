import { NextResponse } from 'next/server';

export interface PhoneItem {
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

export interface BrandStat {
  brand: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface StoreStat {
  store: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface TierStat {
  tier: string;
  count: number;
}

function detectBrand(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('iphone') || t.includes('apple')) return 'Apple';
  if (t.includes('samsung') || t.includes('galaxy')) return 'Samsung';
  if (t.includes('xiaomi') || t.includes('redmi') || t.includes('poco')) return 'Xiaomi';
  if (t.includes('pixel') || t.includes('google')) return 'Google Pixel';
  if (t.includes('oneplus')) return 'OnePlus';
  if (t.includes('ulefone')) return 'Ulefone';
  if (t.includes('motorola') || t.includes('moto ')) return 'Motorola';
  if (t.includes('sony') || t.includes('xperia')) return 'Sony';
  if (t.includes('nokia')) return 'Nokia';
  return 'Aðrir';
}

function detectTier(price: number): string {
  if (price < 60000) return 'Undir 60 þús.';
  if (price < 130000) return '60 - 130 þús.';
  if (price < 240000) return '130 - 240 þús.';
  return '240 þús. og yfir';
}

export async function GET() {
  const startTime = Date.now();
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    };

    // 1. Fetch first page to map company ids to store names
    const firstPageRes = await fetch(
      'https://ja.is/vorur/results/?category=28&sort=-price&page=1',
      { headers, next: { revalidate: 1800 } }
    );

    if (!firstPageRes.ok) {
      throw new Error(`Failed to fetch from source: ${firstPageRes.statusText}`);
    }

    const firstPage = await firstPageRes.json();

    const companies: Record<string, string> = {};
    if (firstPage?.meta?.facets) {
      for (const facet of firstPage.meta.facets) {
        if (facet.name === 'Verslanir' || facet.name === 'Söluaðilar') {
          for (const val of facet.values || []) {
            const id = (val.facet || '').replace('company:', '');
            companies[id] = val.name;
          }
        }
      }
    }

    // 2. Multi-source parallel fetch: all pages of category 28 + targeted smart searches
    const queryUrls: string[] = [];
    for (let p = 2; p <= 15; p++) {
      queryUrls.push(`https://ja.is/vorur/results/?category=28&sort=-price&page=${p}`);
    }
    for (let p = 1; p <= 5; p++) {
      queryUrls.push(`https://ja.is/vorur/results/?category=17&q=snjalls%C3%ADmi&page=${p}`);
      queryUrls.push(`https://ja.is/vorur/results/?category=17&q=iPhone&page=${p}`);
    }

    const otherPages = await Promise.all(
      queryUrls.map((u) =>
        fetch(u, { headers, next: { revalidate: 1800 } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    const allPages = [firstPage, ...otherPages.filter(Boolean)];
    const phones: PhoneItem[] = [];
    const seenTitles = new Set<string>();

    for (const page of allPages) {
      if (!page?.results) continue;

      for (const item of page.results) {
        const tpl = item.template || '';

        const titleMatch = tpl.match(/data-event-title="([^"]+)"/);
        const compMatch = tpl.match(/data-event-product-company-ids="\[(.*?)\]"/);
        const hrefMatch = tpl.match(/href="([^"]+)"/);
        const idMatch = tpl.match(/data-event-product-id="([^"]+)"/);

        // 1. Extract product image (must NOT be the company logo)
        let image: string | undefined = undefined;
        const productImgTag = tpl.match(/<img[^>]*class="[^"]*offer-product-image[^"]*"[^>]*>/);
        if (productImgTag) {
          const srcMatch = productImgTag[0].match(/(?:src|data-src)="([^"]+)"/);
          if (srcMatch) {
            image = srcMatch[1];
          }
        }

        // Fallback: look for image inside offer-product-container or any non-logo img
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

        // 2. Extract company logo if available
        const logoMatch = tpl.match(/<img[^>]*class="[^"]*company-logo[^"]*"[^>]*src="([^"]+)"/);
        const storeLogo = logoMatch ? logoMatch[1] : undefined;

        const title = titleMatch ? titleMatch[1].trim() : 'Óþekktur sími';
        const rawComp = compMatch ? compMatch[1].split(',')[0].trim() : '';
        const store = companies[rawComp] || 'Aðrir söluaðilar';
        const href = hrefMatch ? `https://ja.is${hrefMatch[1]}` : '#';
        const id = idMatch ? idMatch[1] : `${title}-${store}`;

        let price: number | null = null;
        const priceMatch = tpl.match(/class="[^"]*price[^"]*"[^>]*>([\d\.\s]+)\s*kr/);
        const fallbackPrice = tpl.match(/([\d\.]+)\s*kr/);

        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/\D/g, ''), 10);
        } else if (fallbackPrice) {
          price = parseInt(fallbackPrice[1].replace(/\D/g, ''), 10);
        }

        // Filter out obvious accessories
        const isAccessory = /hulstur|case|cover|skjáfilma|filmur|hleðslutæki|snúra|standur|adapter|snura|armband|strap|húfa|gleraugu|reim/i.test(
          title
        );

        if (!isAccessory && price && price >= 5000) {
          // Normalize deduplication key
          const dedupeKey = `${title.toLowerCase()}_${store.toLowerCase()}`;
          if (seenTitles.has(dedupeKey)) continue;
          seenTitles.add(dedupeKey);

          const brand = detectBrand(title);
          const priceTier = detectTier(price);

          phones.push({
            id,
            title,
            price,
            brand,
            priceTier,
            store,
            storeLogo,
            url: href,
            image,
          });
        }
      }
    }

    // Extract unique stores and brands
    const storeSet = new Set(phones.map((p) => p.store));
    const stores = Array.from(storeSet).sort();

    const brandSet = new Set(phones.map((p) => p.brand));
    const brands = Array.from(brandSet).sort((a, b) => {
      if (a === 'Apple') return -1;
      if (b === 'Apple') return 1;
      if (a === 'Samsung') return -1;
      if (b === 'Samsung') return 1;
      return a.localeCompare(b, 'is');
    });

    // Compute Brand Stats for Charts
    const brandStats: BrandStat[] = brands.map((b) => {
      const bPhones = phones.filter((p) => p.brand === b);
      const prices = bPhones.map((p) => p.price);
      const sum = prices.reduce((acc, curr) => acc + curr, 0);
      return {
        brand: b,
        count: bPhones.length,
        avgPrice: Math.round(sum / (bPhones.length || 1)),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      };
    }).sort((a, b) => b.count - a.count);

    // Compute Store Stats for Charts
    const storeStats: StoreStat[] = stores.map((s) => {
      const sPhones = phones.filter((p) => p.store === s);
      const prices = sPhones.map((p) => p.price);
      const sum = prices.reduce((acc, curr) => acc + curr, 0);
      return {
        store: s,
        count: sPhones.length,
        avgPrice: Math.round(sum / (sPhones.length || 1)),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      };
    }).sort((a, b) => b.count - a.count);

    // Compute Tier Stats for Charts
    const tierOrder = ['Undir 60 þús.', '60 - 130 þús.', '130 - 240 þús.', '240 þús. og yfir'];
    const tierStats: TierStat[] = tierOrder.map((tier) => ({
      tier,
      count: phones.filter((p) => p.priceTier === tier).length,
    }));

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      phones,
      stores,
      brands,
      meta: {
        lastRun: new Date().toISOString(),
        durationMs,
        totalFound: phones.length,
        storesCount: stores.length,
        sourcesChecked: queryUrls.length + 1,
        status: 'SUCCESS',
        brandStats,
        storeStats,
        tierStats,
      },
    });
  } catch (error) {
    console.error('Error in /api/phones:', error);
    return NextResponse.json(
      {
        error: 'Gat ekki sótt símaskrá',
        phones: [],
        stores: [],
        brands: [],
        meta: {
          lastRun: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          totalFound: 0,
          storesCount: 0,
          sourcesChecked: 0,
          status: 'ERROR',
        },
      },
      { status: 500 }
    );
  }
}
