import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export type PhoneBrand =
  | 'Apple'
  | 'Samsung'
  | 'Xiaomi'
  | 'Google'
  | 'OPPO'
  | 'Nothing'
  | 'OnePlus'
  | 'Ulefone'
  | 'Motorola'
  | 'Nokia'
  | 'Aðrir';

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
  brand: PhoneBrand;
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
  '1294': 'Ofar',
  '33': 'Heimilistæki',
  '572': 'Tunglskin',
};

const strictAccessoryRegex =
  /(?:hulstur|\bcase\b|\bcover\b|skjávörn|skjavorn|skjáfilma|filmur|filma|gler|öryggisgler|oryggisgler|hleðslutæki|hledslutæki|hleðsl|snúra|snura|standur|adapter|armband|\bstrap\b|húfa|gleraugu|reim|veski|wallet|penni|\bpen\b|sleeve|festing|myndavélavörn|screen\s*protector|lens\s*protector|powerbank|power\s*bank|\bmah\b|veggspjald|framköllun|\bring\b|\btag\b|\bwatch\b|\bbuds\b|spigen|panzerglass|tech21|avionaut|kjóll|kjoll|peysa|buxur|fatnaður|fatnadur|talstöð|talstod|barnapía|barnapia|babyalarm|babymonitor|barnavakt|hljóðnemi|hljodnemi|spjaldtölva|spjaldtolva|\btab\b|\bpad\b|ipad|folio|hlíf|hlif|headset|heyrnartól|heyrnartol|heyrnatól|heyrnatol|hátalari|hatalari|snjallúr|snjallur|heilsuúr|heilsuur|smart\s*band|smartwatch|airpods|smartvision|gítar|gitar|sjónvarp|sjonvarp|fjarstýring|fjarstyring|tv\s*stick|tv\s*box|mi\s*box|apple\s*tv|dualsense|playstation|xbox|nintendo|dect|heimasími|heimasimi|borðsími|bordsimi|fjarfund|ip\s*sími|ip\s*phone|yealink|grandstream|fanvil|gigaset|profoon|alecto|backpack|bakpoki|taska|luggage|microscope|linsa|myndavélalinsa|photography\s*kit|rafhlaða|battery|skjár\s*fyrir|scooter|hlaupahjól|hlaupahjol|airfryer|steikingarpottur|ryksug|roborock|flosser|tannhreinsir|öryggismyndavél|oryggismyndavel|smart\s*camera|burðarpoki|burdarpoki|skiptidýna|skiptidyna|necklace|blazer|jakki|osprey|rfid|farsímahaldari|farsimahaldari|sound\s*kit|barcode\s*scanner|little\s*star|startpakkinn)/i;

const isTruePhoneRegex =
  /iphone|galaxy\s*(?:s\d|z\s*fold|z\s*flip|fold|flip|a\d|xcover|m\d)|pixel\s*\d|redmi\s*(?:note|\d|a\d)|xiaomi\s*1[2-9]|poco\s*[cfxm]\d|oneplus\s*(?:\d|nord|open)|ulefone\s*(?:armor|power|rugone|note)|rugone|xperia|motorola\s*(?:edge|moto|razr|defy|signature|g\d)|moto\s*(?:g\d|e\d|edge|razr|snjallsími|snjallsimi)|nokia\s*(?:\d|g\d|c\d|xr)|hmd\s*(?:\d|fusion|pulse|skyline|barbie|crest)|oppo\s*(?:find|reno|a\d)|honor\s*(?:magic|\d|x\d)|nothing\s*phone|balance\s*phone|light\s*phone|sonim|emporia|\b(?:3210|2660|105)\b|snjallsími|snjallsimi|farsími|farsimi|vinnusími|vinnusimi|samlokusími|samlokusimi|takkasími|takkasimi/i;

function detectBrand(title: string): PhoneBrand {
  const t = title.toLowerCase();
  if (t.includes('balance phone')) return 'Aðrir';
  if (t.includes('iphone') || t.includes('apple')) return 'Apple';
  if (t.includes('samsung') || t.includes('galaxy')) return 'Samsung';
  if (t.includes('xiaomi') || t.includes('redmi') || t.includes('poco')) return 'Xiaomi';
  if (t.includes('pixel') || t.includes('google')) return 'Google';
  if (t.includes('oppo')) return 'OPPO';
  if (t.includes('nothing phone')) return 'Nothing';
  if (t.includes('oneplus')) return 'OnePlus';
  if (t.includes('ulefone') || t.includes('armor') || t.includes('rugone')) return 'Ulefone';
  if (t.includes('motorola') || t.includes('moto ')) return 'Motorola';
  if (t.includes('nokia') || t.includes('hmd') || t.includes('barbie') || /\b(?:3210|2660|105)\b/.test(t)) return 'Nokia';
  return 'Aðrir';
}

function extractStorage(title: string): string {
  const cleanTitle = title.replace(/265\s*gb/gi, '256GB');
  const matches = [...cleanTitle.matchAll(/(\d+)\s*(gb|tb)/gi)];
  if (matches.length > 0) {
    for (const m of matches) {
      if (m[2].toUpperCase() === 'TB') {
        return `${m[1]}TB`;
      }
    }
    const gbVals = matches
      .filter((m) => m[2].toUpperCase() === 'GB')
      .map((m) => parseInt(m[1], 10))
      .filter((v) => v >= 32);
    if (gbVals.length > 0) {
      return `${Math.max(...gbVals)}GB`;
    }
    const last = matches[matches.length - 1];
    return `${last[1]}${last[2].toUpperCase()}`;
  }
  return 'Standard';
}

function normalizeModelName(title: string, brand: PhoneBrand): string {
  let s = title
    .replace(/&#8211;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&#8243;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2B;/gi, '+')
    .replace(/&#xED;/gi, 'í');

  const isRefurb = /refreshed|refurbished|uppgerður|uppgerdur|græn\s*græja|graen\s*graeja|\bb-vara\b|\bt1a\b/i.test(s);
  s = s.replace(/^\(b-vara\)\s*-\s*/i, '');
  s = s.replace(/^t1a\s*-\s*/i, '');
  s = s.replace(/^uppgerður\s+/i, '');

  if (/balance\s*phone/i.test(s)) {
    return /pro/i.test(s) ? 'Balance Phone Pro' : 'Balance Phone';
  }
  if (/the\s*light\s*phone\s*iii/i.test(s)) {
    return 'The Light Phone III';
  }
  if (/barbie/i.test(s)) {
    return 'Nokia HMD Barbie Phone';
  }

  // Strip screen sizes like 6.1", 6,67“, 6.59"
  s = s.replace(/\b\d+[.,]\d+\s*(?:"|”|“|’’|''|tommu)/gi, ' ');
  // Strip camera specs like 50/50/50MP or 50/200/200/50 or 200MP
  s = s.replace(/\b\d+(?:\/\d+){2,}(?:\s*mp)?\b/gi, ' ');
  s = s.replace(/\b\d+\s*mp\b/gi, ' ');
  // Strip RAM+Storage combinations (e.g. 12+512GB, 8+256GB, 16GB/512GB, 512GB/16GB, 256GB-8GB, 256GB -12GB)
  s = s.replace(/\b\d+\s*(?:gb|tb)\s*[-+/]\s*\d+\s*(?:gb|tb)\b/gi, ' ');
  s = s.replace(/\b(?:4|6|8|12|16|24)\s*[+/]\s*\d+\s*(?:gb|tb)\b/gi, ' ');
  // Strip standalone storage: 64GB, 128 GB, 256GB, 265GB, 512 GB, 1 TB, 2 TB
  s = s.replace(/\b\d+\s*(?:gb|tb)\b/gi, ' ');
  // Strip network & generic phone words
  s = s.replace(
    /\b(?:5g|4g-volte|4g|lte\/4g|lte-4g|lte|volte|snjallsími|snjallsimi|farsími|farsimi|vinnusími|vinnusimi|samlokusími|samlokusimi|takkasími|takkasimi|smartphone|enterprise\s*edition|leica)\b/gi,
    ' '
  );
  // Strip trailing descriptions after dash " - "
  s = s.replace(/\s+-\s+.*$/, '');
  // Strip "með hitamyndavél", "m. aukaskjá", etc.
  s = s.replace(/\b(?:með|m\.)\s+(?:hitamyndavél|auka\s*skjá|aukaskjá).*$/i, '');
  // Strip parenthetical grades
  s = s.replace(/\((?:a|b|premium)\s*einkunn\)/gi, '');
  // Strip Refreshed / Refurbished / Very Good Condition
  s = s.replace(/\b(?:refreshed|refurbished|very\s*good\s*condition|græn\s*græja)\b/gi, '');

  const colorRegex =
    /(?:,\s*|\s+)(?:black|white|silver\s*shadow|silver|cobalt\s*violet|pink\s*gold|sky\s*blue|sky\s*teal|glacier\s*blue|frost\s*blue|mist\s*blue|moonlight\s*blue|deep\s*blue|midnight\s*black|midnight\s*blue|midnight|titan\s*gray|titanium\s*charcoal|ripple\s*green|cloud\s*blush|graphite|purple|bleikur|blár|hvítur|svartur|grár|grænn|dökkgrænn|dökkblár|dökkgrár|ljósblár|ljósgrænn|ljósfjólublár|fjólublár|vínrauður|appelsínugulur|brúnn|gylltur|ljósgylltur|silfur|rauður|títan)\s*$/i;
  s = s.replace(colorRegex, '');
  s = s.replace(colorRegex, '');

  // Strip leading brand names (including repeated ones)
  s = s.replace(/^(?:(?:apple|samsung|xiaomi|google|redmi|poco|ulefone|motorola|moto|oppo|oneplus|nothing|nokia\/hmd|nokia|hmd)\s+)+/i, '').trim();
  s = s.replace(/\s+/g, ' ').replace(/^[\s\-–,/|]+|[\s\-–,/|]+$/g, '');

  let full = s;
  if (brand === 'Apple') {
    if (!s.toLowerCase().startsWith('iphone')) {
      s = `iPhone ${s}`;
    }
    s = s.replace(/^iphone\s+/i, 'iPhone ');
    full = `Apple ${s}`;
  } else if (brand === 'Samsung') {
    s = s.replace(/^galaxy\s+/i, '');
    s = s.replace(/^(fold|flip)\s*(\d)/i, 'Z $1$2');
    s = s.replace(/^z\s*fold\s*(\d)/i, 'Z Fold$1');
    s = s.replace(/^z\s*flip\s*(\d)/i, 'Z Flip$1');
    s = s.replace(/^(s\d+)fe\b/i, '$1 FE');
    s = s.replace(/^xcover\s*(\d)/i, 'XCover $1');
    s = s.replace(/Ultra\s+8$/i, 'Ultra');
    full = `Samsung Galaxy ${s}`;
  } else if (brand === 'Google') {
    s = s.replace(/^pixel\s+/i, '');
    s = s.replace(/\bxl\b/gi, 'XL');
    full = `Google Pixel ${s}`;
  } else if (brand === 'Xiaomi') {
    if (/poco/i.test(title)) {
      s = s.replace(/^poco\s+/i, '');
      full = `Xiaomi Poco ${s}`;
    } else if (/redmi/i.test(title)) {
      s = s.replace(/^redmi\s+/i, '');
      s = s.replace(/^note\s+/i, 'Note ');
      s = s.replace(/\s+\+/g, '+');
      full = `Xiaomi Redmi ${s}`;
    } else {
      full = `Xiaomi ${s}`;
    }
  } else if (brand === 'Motorola') {
    full = `Motorola ${s}`;
  } else if (brand === 'OPPO') {
    s = s.replace(/\bfind\b/gi, 'Find');
    s = s.replace(/\breno\b/gi, 'Reno');
    s = s.replace(/^Reno\s*(\d+)\s*f\b/i, 'Reno $1F');
    full = `OPPO ${s}`;
  } else if (brand === 'Nothing') {
    full = `Nothing ${s}`;
  } else if (brand === 'Nokia') {
    s = s.replace(/\s+flip$/i, '');
    full = `Nokia ${s}`;
  } else if (brand === 'OnePlus') {
    full = `OnePlus ${s}`;
  } else if (brand === 'Ulefone') {
    full = `Ulefone ${s}`;
  }

  full = full
    .replace(/\bpro\b/gi, 'Pro')
    .replace(/\bmax\b/gi, 'Max')
    .replace(/\bultra\b/gi, 'Ultra')
    .replace(/\bplus\b/gi, 'Plus')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–,/|]+|[\s\-–,/|]+$/g, '');

  if (isRefurb) {
    full += ' (Endurnýjaður)';
  }
  return full;
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

    const queryUrls: string[] = [
      // 1. All 13 pages of Já.is Category 28 (Farsímar - ~300 products)
      ...Array.from({ length: 13 }, (_, i) => `https://ja.is/vorur/results/?category=28&page=${i + 1}`),

      // 2. Store-specific pages in Category 50 (Símar) so grouped/uncategorized store offers (like Nova's 72 items) are 100% captured
      'https://ja.is/vorur/results/?category=50&facet=company:60&page=1',
      'https://ja.is/vorur/results/?category=50&facet=company:60&page=2',
      'https://ja.is/vorur/results/?category=50&facet=company:60&page=3',
      'https://ja.is/vorur/results/?category=50&facet=company:2133&page=1',
      'https://ja.is/vorur/results/?category=50&facet=company:2133&page=2',
      'https://ja.is/vorur/results/?category=50&facet=company:342&page=1',
      'https://ja.is/vorur/results/?category=50&facet=company:342&page=2',
      'https://ja.is/vorur/results/?category=50&facet=company:342&page=3',
      'https://ja.is/vorur/results/?category=50&facet=company:342&page=4',

      // 3. Direct brand & keyword searches to capture phones placed outside Category 28/50 (e.g. Ofar, Coolshop, Tunglskin)
      'https://ja.is/vorur/results/?q=Google+Pixel&page=1',
      'https://ja.is/vorur/results/?q=Google+Pixel&page=2',
      'https://ja.is/vorur/results/?q=OnePlus&page=1',
      'https://ja.is/vorur/results/?q=Motorola&page=1',
      'https://ja.is/vorur/results/?q=Oppo&page=1',
      'https://ja.is/vorur/results/?q=Honor&page=1',
      'https://ja.is/vorur/results/?q=Poco&page=1',
      'https://ja.is/vorur/results/?q=Nothing+Phone&page=1',
      'https://ja.is/vorur/results/?q=snjallsimi&page=1',
      'https://ja.is/vorur/results/?q=snjallsimi&page=2',
      'https://ja.is/vorur/results/?q=snjallsimi&page=3',
      'https://ja.is/vorur/results/?q=iPhone&page=1',
      'https://ja.is/vorur/results/?q=iPhone&page=2',
    ];

    // Fetch Emobi Store API (both pages = all 160 products)
    const emobiPromise = Promise.all([
      fetch('https://emobi.is/wp-json/wc/store/v1/products?per_page=100&page=1', {
        headers,
        next: { revalidate: 900 },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('https://emobi.is/wp-json/wc/store/v1/products?per_page=100&page=2', {
        headers,
        next: { revalidate: 900 },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([p1, p2]) => [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])]);

    // Fetch all 6 pages of Síminn web store directly in parallel
    const siminnPromise = Promise.all(
      [1, 2, 3, 4, 5, 6].map((p) =>
        fetch(`https://vefverslun.siminn.is/is/farsimar?pagenumber=${p}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          next: { revalidate: 900 },
        })
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => '')
      )
    );

    // Fetch Já pages in safe batches of 7 with small 40ms delay to prevent HTTP 429
    const allResponses: any[] = [];
    const batchSize = 7;
    for (let i = 0; i < queryUrls.length; i += batchSize) {
      const chunk = queryUrls.slice(i, i + batchSize);
      const chunkRes = await Promise.all(
        chunk.map((u) =>
          fetch(u, { headers, next: { revalidate: 900 } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      allResponses.push(...chunkRes);
      if (i + batchSize < queryUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }

    const [emobiProducts, siminnPages] = await Promise.all([emobiPromise, siminnPromise]);
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

    const processItem = (
      title: string,
      price: number,
      store: string,
      href: string,
      image?: string,
      storeLogo?: string
    ) => {
      if (!title || strictAccessoryRegex.test(title)) return;
      if (!price || price < 7000) return;
      if (!isTruePhoneRegex.test(title)) return;

      const brand = detectBrand(title);
      const modelName = normalizeModelName(title, brand);
      const storage = extractStorage(title);
      const modelId = modelName
        .toLowerCase()
        .replace(/\+/g, '-plus-')
        .replace(/[()]/g, '')
        .replace(/[^a-z0-9þæðöáéíóúý]+/g, '-')
        .replace(/^-+|-+$/g, '');

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
      }
    };

    // Process Já.is Pages
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
        const href = hrefMatch ? `https://ja.is${hrefMatch[1]}` : '#';

        const compIds = compMatch
          ? compMatch[1]
              .split(',')
              .map((c: string) => c.trim())
              .filter(Boolean)
          : [''];

        for (const rawComp of compIds) {
          const store = dynamicCompanies[rawComp] || 'Aðrir söluaðilar';
          processItem(title, price, store, href, image, compIds.length === 1 ? storeLogo : undefined);
        }
      }
    }

    // Process Direct Emobi Products (Pages 1 & 2)
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

    // Process Direct Síminn Products (Pages 1-6)
    for (const html of siminnPages) {
      if (!html) continue;
      const parts = html.split('<div class="product-item"');
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const titleM = part.match(/<h2 class="product-title">\s*<a href="([^"]+)">([^<]+)<\/a>/);
        const brandM = part.match(/<h4>([^<]+)<\/h4>/);
        const priceM = part.match(/class="price actual-price"[^>]*>([^<]+)<\/span>/);
        const imgM = part.match(/<img[^>]+src="([^"]+)"/);
        if (titleM && priceM) {
          const b = brandM ? brandM[1].trim() : '';
          const t = titleM[2].trim();
          const fullTitle = `${b} ${t}`.trim();
          const priceDigits = priceM[1].replace(/\D/g, '');
          const price = priceDigits ? parseInt(priceDigits, 10) : 0;
          const href = `https://vefverslun.siminn.is${titleM[1]}`;
          const img = imgM && imgM[1] ? (imgM[1].startsWith('http') ? imgM[1] : `https://vefverslun.siminn.is${imgM[1]}`) : undefined;
          processItem(fullTitle, price, 'Síminn', href, img);
        }
      }
    }

    // Merge "Standard" offers (from stores like Nova & Síminn that omit GB on overview cards)
    // into the model's base explicit storage variant when explicit GB/TB variants exist
    for (const group of modelMap.values()) {
      const explicitVariants = group.variants.filter((v) => v.storage !== 'Standard');
      const stdVariant = group.variants.find((v) => v.storage === 'Standard');
      if (explicitVariants.length > 0 && stdVariant) {
        // Pick the explicit variant with the lowest starting price (the base storage tier)
        explicitVariants.sort((a, b) => a.lowestPrice - b.lowestPrice);
        const baseVariant = explicitVariants[0];
        for (const stdOffer of stdVariant.offers) {
          const existingIdx = baseVariant.offers.findIndex((o) => o.store === stdOffer.store);
          if (existingIdx === -1) {
            baseVariant.offers.push(stdOffer);
          } else if (stdOffer.price < baseVariant.offers[existingIdx].price) {
            baseVariant.offers[existingIdx] = stdOffer;
          }
          if (stdOffer.price < baseVariant.lowestPrice) baseVariant.lowestPrice = stdOffer.price;
          if (stdOffer.price > baseVariant.highestPrice) baseVariant.highestPrice = stdOffer.price;
        }
        group.variants = explicitVariants;
        group.variantsCount = group.variants.length;
      }
      group.maxSavings = Math.max(
        0,
        ...group.variants.map((v) => (v.offers.length > 1 ? v.highestPrice - v.lowestPrice : 0))
      );
    }

    // Load persistent real price history ledger & verified models catalog
    const historyFile = path.join(process.cwd(), 'data', 'price_history.json');
    let historyStore: Record<string, PricePoint[]> = {};
    let storeOffersStore: Record<string, PricePoint[]> = {};
    let savedCatalog: Record<string, PhoneModelGroup> = {};
    try {
      if (fs.existsSync(historyFile)) {
        const raw = fs.readFileSync(historyFile, 'utf-8');
        const parsed = JSON.parse(raw);
        historyStore = parsed.history || {};
        storeOffersStore = parsed.storeOffers || {};
        savedCatalog = parsed.savedCatalog || {};
      }
    } catch {
      historyStore = {};
      storeOffersStore = {};
      savedCatalog = {};
    }

    // Zero-Loss Catalog: only preserve previously verified phone models that pass strict phone validation
    for (const [savedId, savedModel] of Object.entries(savedCatalog)) {
      if (
        !modelMap.has(savedId) &&
        savedModel &&
        savedModel.name &&
        !strictAccessoryRegex.test(savedModel.name) &&
        isTruePhoneRegex.test(savedModel.name)
      ) {
        modelMap.set(savedId, savedModel);
      }
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

    const cleanSavedCatalog: Record<string, PhoneModelGroup> = {};
    const models = Array.from(modelMap.values())
      .map((m) => {
        const hist = getRealModelHistory(m.id, m.lowestPrice, historyStore);
        historyStore[m.id] = hist.points;
        const realMaxSavings = Math.max(
          0,
          ...m.variants.map((v) => (v.offers.length > 1 ? v.highestPrice - v.lowestPrice : 0))
        );
        const updatedModel: PhoneModelGroup = {
          ...m,
          maxSavings: realMaxSavings,
          history: hist.points,
          trend: hist.trend,
          priceChangePercent: hist.changePercent,
          priceChangeAmount: hist.changeAmount,
          variants: m.variants.map((v) => ({
            ...v,
            offers: [...v.offers].sort((a, b) => a.price - b.price),
          })),
        };
        cleanSavedCatalog[m.id] = updatedModel;
        return updatedModel;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'is'));

    try {
      const dir = path.dirname(historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        historyFile,
        JSON.stringify(
          {
            lastUpdated: new Date().toISOString(),
            history: historyStore,
            storeOffers: storeOffersStore,
            savedCatalog: cleanSavedCatalog,
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // Ignore read-only filesystem errors on serverless
    }

    const allStores = Array.from(new Set(models.flatMap((m) => m.stores))).sort();
    const allBrands = Array.from(new Set(models.map((m) => m.brand))).sort();

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

    const topSavings = candidateSavings.sort((a, b) => b.savings - a.savings).slice(0, 4);

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
                const dropPct = storeOffer.previousPrice
                  ? Math.round((dropAmt / storeOffer.previousPrice) * 100)
                  : 0;
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
      sourcesScanned: queryUrls.length + 8,
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
