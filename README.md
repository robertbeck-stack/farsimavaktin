# Farsímavaktin — Verðsamanburður og Verðsöguvakt á Íslandi

**Farsímavaktin** er sjálfvirk vefvakt og verðsamanburðarkerfi fyrir farsíma á íslenskum markaði. Kerfið skannar **14 íslenskar vefverslanir** (yfir **60 gagnastrauma og vefsíður** í hverri keyrslu), hreinsar út alla aukahluti, samræmir vöruheiti og geymslustærðir (`128GB`, `256GB`, `512GB`, `1TB`), og heldur utan um **raunverulega verðsögu** hvers símalíkans og hverrar verslunar í [`data/price_history.json`](data/price_history.json).

---

## 1. Yfirlit yfir verslanir og gagnastrauma (14 verslanir)

Til að tryggja að engir símar eða verslanir verði útundan notar [`app/api/phones/route.ts`](app/api/phones/route.ts) tvíþætta nálgun: **beina vefskafara (Direct Harvesters)** á vefverslanirnar sjálfar ásamt **Já.is vörutorginu** fyrir smærri söluaðila.

Ef sama verð finnst bæði á Já.is og beint á vef verslunarinnar tekur kerfið **alltaf beina vöruhlekkinn** (`elko.is`, `nova.is`, `syn.is`, o.s.frv.) fram yfir `ja.is` tilvísunarhlekkinn.

### Beinar tengingar við vefverslanir (Direct Harvesters)

| Verslun | Slóð / Endapunktur | Tæknileg útfærsla & Gagnasnið | Athugasemdir |
| :--- | :--- | :--- | :--- |
| **ELKO** (`elko.is`) | `https://elko.is/voruflokkar/farsimar-135?page=1..4` | Les `<script id="__NEXT_DATA__">` og sækir allar vörur úr `props.pageProps.serverState.initialResults.products.results[0].hits`. | Skilar öllum ~82 símum ELKO með beinum hlekkjum (`/vorur/${slug}/${sku}`), vefverði (`listings.webshop.price`) og `attributes.capacityGb`. |
| **Nova** (`nova.is`) | `https://www.nova.is/barinn/farsimar` | Les `window.__APOLLO_STATE__` JSON-tréð beint úr HTML síðunnar. | Skilar öllum 64 símalíkönum í Barnum og leysir allar minnisútgáfur (`ProductVariant_shopify:...` -> `selectedOptions` `Size` + `priceV2.amount`) með beinum hlekk (`/barinn/vara/${handle}`). *Ath: Nova skráir Pixel síma sem `"Pixel 10a"` án `"Google"`, en `vendor` er `"Google"`.* |
| **Lune.is** (`lune.is`) | `https://lune.is/voruflokkur/{iphone,samsung-simar,google-pixel,adrir-simar}` | Les Next.js RSC strauminn (`self.__next_f.push([1,"..."])`) og sækir `"initialProducts":[...]` fylkið. | Lune er **ekki á Já.is**. Skilar ~171 útgáfum (~31 símalíkönum) með nákvæmum litum, minnisstærðum og verðum. Notar `fetchHtmlUnverified` svo TLS-skírteinisendurnýjanir stöðvi aldrei uppfærslu. |
| **Síminn** (`siminn.is`) | `https://vefverslun.siminn.is/is/farsimar?pagenumber=1..6` | Sækir allar 6 síður samhliða og þáttar `<div class="product-item">` kortin. | Síminn er **ekki í farsímaflokki Já.is**. Skilar ~45 símalíkönum með beinum hlekkjum á `vefverslun.siminn.is`. |
| **Sýn** (`syn.is`) | `https://www.syn.is/vefverslun/farsimar` | Les `<script id="__NEXT_DATA__">` -> `props.pageProps.initialProducts` og `productsExtras`. | Skilar öllum 35 símum Sýnar með beinum hlekk (`/vefverslun/um-voru/${productId}`) og háupplausnarmyndum frá Contentful. Sameinar `Sýn` og `Sýn (Vodafone)` undir `Sýn`. |
| **Emobi** (`emobi.is`) | `https://emobi.is/wp-json/wc/store/v1/products?per_page=100&page=1..2` | Opið **WooCommerce Store API v1** (2 síður = ~160 vörur). | Emobi er **ekki á Já.is**. Allir aukahlutir eru síaðir út með `strictAccessoryRegex`, eftir standa ~38 símalíkön. |
| **Mi búðin** (`mibudin.is`) | `https://mibudin.is/wp-json/wc/store/v1/products?category=17&per_page=100&page=1..3` | Opið **WooCommerce Store API v1** fyrir flokk `17` (*Farsímar*, 3 síður = ~227 vörur). | Skilar öllum Xiaomi, Redmi, Poco og Ulefone símum með beinum hlekkjum á `mibudin.is/vara/...`. |
| **Tölvulistinn** (`tl.is`) | `https://tl.is/farsimar/farsimar.html` | Þáttar `.product-grid-card` blokkirnar í `<body>` á farsímasíðu Tölvulistans. | Tölvulistinn og systurverslunin Heimilistæki (`ht.is`) senda ekki lengur síma á Já.is. Skilar ~18 símum (Apple, Samsung, Doro) með CloudFront myndum og beinum hlekkjum. |
| **Epli.is** (`epli.is`) | `https://www.epli.is/iphone/...` (7 vörusíður) | Les `"viewedProduct"` JSON-hlutinn og `.categoryRadio-card` valkosti (`data-sku="iPhone..."`). | Epli er **ekki á Já.is**. Skilar öllum 9 iPhone líkönum Eplis (`18 Pro`, `18 Pro Max`, `17 Pro`, `17 Pro Max`, `17`, `17e`, `16e`, `Air`, `Duo`). |
| **Macland** (`macland.is`) | `https://macland.is/wp-json/wc/store/v1/products?category=20&per_page=100` | Opið **WooCommerce Store API v1** fyrir flokk `20` (*iPhone*). | Macland er **ekki á Já.is**. Síað eftir verði (`>= 35.000 kr.`) og `strictAccessoryRegex` til að halda eingöngu iPhone tækjum. |

### Verslanir sóttar í gegnum Já.is Vörutorg (`ja.is/vorur/results/`)
Til viðbótar við beinu skafarana skannar kerfið **30 síður á Já.is** í öruggum 7-síðna hollum (með `40ms` bið á milli holla svo Já.is skili aldrei `HTTP 429 Too Many Requests`):
- Allar **13 síðurnar í Flokki 28** (*Farsímar*).
- Sérsíður í **Flokki 50** (*Símar*) fyrir Nova (`company:60`), Sýn (`company:2133`) og Mi búðina (`company:342`).
- Markvissar leitarfyrirspurnir (`q=Google+Pixel`, `OnePlus`, `Motorola`, `Oppo`, `Honor`, `Poco`, `Nothing+Phone`, `snjallsimi`, `iPhone`) sem ná í síma sem verslanir hafa sett í óflokkaða flokka á Já.is:
  - **Tunglskin** (`tunglskin.is` — Google Pixel, OnePlus, Honor, Xiaomi Poco)
  - **Ofar** (`ofar.is` — Motorola Edge, OPPO Find)
  - **Coolshop** (`coolshop.is` — Endurnýjaðir iPhone símar)
  - **Tölvutek** (`tolvutek.is` — Nothing Phone línan)

### Verslanir sem voru prófaðar en selja ekki farsíma á vefnum
Við úttekt á íslenskum raftækjaverslunum kom í ljós að eftirfarandi verslanir selja ekki lengur farsíma í vefverslun:
- **Computer.is** (`computer.is/is/products/sima` inniheldur eingöngu RJ11 símasnúrur).
- **Ormsson** (`ormsson.is` selur aðeins snjallúr, heimilistæki og snúrur á vefnum).
- **Heimilistæki** (`ht.is` vísar farsímasölu samstæðunnar í gegnum systurvefinn **Tölvulistann** á `tl.is/farsimar/farsimar.html`, en hefur aðeins DECT heimasíma á `ht.is`).

---

## 2. Gagnavinnsla, Samræming og Verðsaga

Allur bakendarökstuðningur er í [`app/api/phones/route.ts`](app/api/phones/route.ts):

1. **Stöðlun á vöruheitum (`normalizeModelName`)**:
   - Fjarlægir skjástærðir (`6.3"`), myndavélaupplýsingar (`50/50/50MP`), vinnsluminni (`8+256GB`, `256GB/12GB`), netstaðla (`5G`, `4G`, `LTE`, `EE`), vörumerki í upphafi strengs, og yfir 60 litaheiti á íslensku og ensku (`Obsidian`, `Pistacho`, `Lavender`, `Starlit Green`, `Svartur`, `Ljósblár`, o.s.frv.).
   - Samræmir heiti þvert á verslanir (t.d. `Samsung Galaxy S26+` og `Samsung Galaxy S26 Plus` verða bæði `Samsung Galaxy S26 Plus` með auðkennið `samsung-galaxy-s26-plus`).
   - Merkir endurnýjaða síma (`Refreshed`, `Refurbished`, `Uppgerður`, `Græn græja`, `B-vara`) skýrt sem `(Endurnýjaður)` svo þeir blandist aldrei við verð á nýjum símum.
2. **Útdráttur og samruni geymslupláss (`extractStorage`)**:
   - Greinir `64GB`, `128GB`, `256GB`, `512GB`, `1TB`, `2TB` (og leiðréttir innsláttarvillur verslana eins og `265GB` -> `256GB`).
   - Ef verslun gefur ekki upp GB-stærð á yfirlitskorti (`Standard`), sameinar kerfið það tilboð sjálfkrafa við ódýrustu grunnútgáfu símans (`baseVariant`) svo samanburðurinn haldist í sama minnisflokki.
3. **Zero-Loss Verðsaga ([`data/price_history.json`](data/price_history.json))**:
   - Heldur utan um þrjú söfn:
     - `history`: Dagleg lægstu verð hvers símalíkans (`modelId`).
     - `storeOffers`: Dagleg verðsaga hvers tilboðs í hverri verslun (`modelId::storage::store`), sem knýr **Verðlækkanir / Verðhækkanir** í flipanum *Verslanir*.
     - `savedCatalog`: Afrit af öllum staðfestum símalíkönum svo tímabundin bilun hjá einni vefverslun eyði aldrei símalíkani úr gagnagrunninum.

---

## 3. Uppbygging framenda (Modular Bento UI)

Framendinn er skrifaður í **Next.js 16 (App Router)** og **Tailwind CSS v4** með fullum stuðningi við bæði **Ljóst þema (Light Mode)** og **Dökkt þema (Dark Mode)** án flökts við hleðslu (FOUC-vörn í [`app/layout.tsx`](app/layout.tsx)):

- [`app/page.tsx`](app/page.tsx) — Aðalsíða, haus (Header), þemaskiptir (`Ljóst` / `Dökkt`), flipastýring og sjálfvirk bakgrunnsuppfærsla á 15 mínútna fresti.
- [`app/types.ts`](app/types.ts) — Samræmd gagnaskil (`PhoneModelGroup`, `StoreOffer`, `MetaData`), verð- og dagsetningarsnið, litaflokkun verslana og `getStoreFavicon()` fyrir lógó allra 14 verslana.
- [`app/components/ProductsView.tsx`](app/components/ProductsView.tsx) — Flipinn **Vörur**: Hero-kort (*Mesti sparnaður í dag* og *Mestu verðlækkanir*), ítarleg leit og síun (eftir verslun, framleiðanda, verðbili, lækkunum og fjölda verslana), ásamt bæði **Spjaldasýn (Grid)** og **Töflusýn (Table)**.
- [`app/components/StoresView.tsx`](app/components/StoresView.tsx) — Flipinn **Verslanir**: Heildaryfirlit og greining á öllum 14 verslunum (hlutfall lægstu verða, verðlækkanir/hækkanir, og stærsta einstaka lækkun í hverri verslun).
- [`app/components/SystemLogsView.tsx`](app/components/SystemLogsView.tsx) — Flipinn **Kerfisvakt**: Rauntíma heilsufarsmælaborð fyrir gagnasöfnunina, keyrslusaga og niðurhal á JSON-gögnum.
- [`app/components/Modals.tsx`](app/components/Modals.tsx) — Samanburðargluggi (allt að 4 símar hlið við hlið) og ítarlegur vörugluggi með SVG-verðþróunarriti og beinum hlekkjum á allar verslanir.

---

## 4. Keyrsla og Þróun

### Keyra þróunarþjón (Development Server)
```bash
npm run dev
```
Opnaðu [http://localhost:3000](http://localhost:3000) í vafra.

### Uppfæra `data/price_history.json` handvirkt úr skipanalínu
Ef þú vilt keyra alla vefskafarana 14 úr skipanalínu og uppfæra [`data/price_history.json`](data/price_history.json) án þess að opna vafra:
```bash
npx tsx -e "import { GET } from './app/api/phones/route'; GET().then(r => r.json()).then(d => console.log(d.meta.totalModels, 'líkön úr', d.meta.totalStores, 'verslunum'));"
```

### Byggja fyrir framleiðslu (Production Build)
```bash
npm run build
```

---

## 5. Sjálfvirk dagleg keyrsla (GitHub Actions & Vercel Cron)

Kerfið keyrir **sjálfkrafa einu sinni á sólarhring (kl. 07:00 á morgnana)** á tvennan hátt:

1. **GitHub Actions (`.github/workflows/daily-price-update.yml`)**:
   - Keyrir á hverjum degi kl. `07:00 UTC` (`cron: '0 7 * * *'`), auk þess sem hægt er að ræsa keyrsluna handvirkt hvenær sem er með **Run workflow** (`workflow_dispatch`) undir *Actions* flipanum á GitHub.
   - Skannar allar 14 verslanirnar, uppfærir [`data/price_history.json`](data/price_history.json) með nýjustu verðum dagsins og vistar (`git commit & push`) beint inn á `main` greinina — sem kveikir jafnframt sjálfkrafa á nýrri útgáfu (deploy) á Vercel með uppfærðri verðsögu.
2. **Vercel Cron (`vercel.json`)**:
   - Kveikir á `/api/phones` endapunktinum kl. `07:05 UTC` á hverjum degi til að endurnýja skyndiminni (edge cache) á framleiðsluvefnum.

