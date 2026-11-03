import { NextResponse } from 'next/server';

export interface PhoneItem {
  id: string;
  title: string;
  price: number;
  store: string;
  url: string;
  image?: string;
}

export async function GET() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    };

    const firstPageRes = await fetch(
      'https://ja.is/vorur/results/?category=28&sort=-price&page=1',
      { headers, next: { revalidate: 1800 } }
    );

    if (!firstPageRes.ok) {
      throw new Error(`Failed to fetch from source: ${firstPageRes.statusText}`);
    }

    const firstPage = await firstPageRes.json();

    // Map company ids to store names
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

    // Fetch pages (up to 10 pages to get complete phone coverage)
    const pagePromises = [];
    for (let p = 2; p <= 12; p++) {
      pagePromises.push(
        fetch(`https://ja.is/vorur/results/?category=28&sort=-price&page=${p}`, {
          headers,
          next: { revalidate: 1800 },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      );
    }

    const otherPages = await Promise.all(pagePromises);
    const allPages = [firstPage, ...otherPages.filter(Boolean)];

    const phones: PhoneItem[] = [];
    const seenIds = new Set<string>();

    for (const page of allPages) {
      if (!page?.results) continue;

      for (const item of page.results) {
        const tpl = item.template || '';

        const titleMatch = tpl.match(/data-event-title="([^"]+)"/);
        const compMatch = tpl.match(/data-event-product-company-ids="\[(.*?)\]"/);
        const hrefMatch = tpl.match(/href="([^"]+)"/);
        const imgMatch = tpl.match(/<img[^>]+src="([^">]+)"/);
        const idMatch = tpl.match(/data-event-product-id="([^"]+)"/);

        const title = titleMatch ? titleMatch[1] : 'Óþekktur sími';
        const rawComp = compMatch ? compMatch[1].split(',')[0].trim() : '';
        const store = companies[rawComp] || 'Aðrir söluaðilar';
        const href = hrefMatch ? `https://ja.is${hrefMatch[1]}` : '#';
        const image = imgMatch ? imgMatch[1] : undefined;
        const id = idMatch ? idMatch[1] : `${title}-${store}`;

        if (seenIds.has(id)) continue;
        seenIds.add(id);

        let price: number | null = null;
        const priceMatch = tpl.match(/class="[^"]*price[^"]*"[^>]*>([\d\.\s]+)\s*kr/);
        const fallbackPrice = tpl.match(/([\d\.]+)\s*kr/);

        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/\D/g, ''), 10);
        } else if (fallbackPrice) {
          price = parseInt(fallbackPrice[1].replace(/\D/g, ''), 10);
        }

        // Filter out obvious accessories
        const isAccessory = /hulstur|case|cover|skjáfilma|filmur|hleðslutæki|snúra|standur|adapter|snura/i.test(
          title
        );

        if (!isAccessory && price && price >= 5000) {
          phones.push({
            id,
            title,
            price,
            store,
            url: href,
            image,
          });
        }
      }
    }

    // Extract unique store names
    const storeSet = new Set(phones.map((p) => p.store));
    const stores = Array.from(storeSet).sort();

    return NextResponse.json({
      phones,
      stores,
      count: phones.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/phones:', error);
    return NextResponse.json(
      { error: 'Gat ekki sótt símaskrá', phones: [], stores: [] },
      { status: 500 }
    );
  }
}
