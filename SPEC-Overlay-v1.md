# SPEC-Overlay-v1 — Uniforme deelkaart (event + bingo)

**Status:** klaar om te bouwen · client-side render
**Geldt voor:** `bodyrock-event-app` én `bodyrock-bingo` — één component, per app andere slots
**Vervangt:** de huidige overlay met afgekapte footer, `captain: Test`-lek en onbehandelde foto

---

## ▶️ Voor Code

1. Bouw één overlay-component, gedeeld tussen beide repo's. Zet bovenaan: `/* OVERLAY-v1 — gedeeld tussen event- en bingo-app. Houd identiek. */`
2. Canvas = **1080×1920**. Foto full-bleed eronder, alle lagen erover.
3. Tekst zit op een **zwevende crème kaart** onderin: `rgba(245,245,240,0.78)` + `backdrop-filter: blur(8px)`. Géén ondersteuning voor blur → dekking naar `0.90`.
4. Logo = **`/public/logowit1.png`** (wit woordmerk, transparant), linksboven **direct op de foto**, met `drop-shadow` voor leesbaarheid. Géén crème pil.
5. **Rode voetregel binnen de kaart is 100% dekkend** (`#BC0000`) — nooit transparant.
6. Foto: `object-fit: cover`, verticale positie via slider (`object-position: 50% <Y>%`, default 50).
7. Preview-scherm vóór de camera + slider erna. Géén eigen zoeker, géén pinch.
8. Fallbacks: geen foto → rood vlak; leeg meta-slot → slot verdwijnt; `backdrop-filter` weg → dekking 90%.
9. Tekstvelden auto-fitten (zie §8). Niks mag ooit buiten het canvas lopen.

---

## 1. Kernbesluiten (deze sessie)

| Besluit | Waarde |
|---|---|
| Richting | Variant A — full-bleed foto, foto is de held |
| Tekstdrager | Zwevende crème kaart, transparant (78% + blur) |
| Licht/donker | **Licht** — donkere tekst op crème (zomer + daglicht-leesbaar) |
| Adaptieve scrim | **Vervallen** — het crème vlak doet dat werk nu |
| Fotobehandeling | Preview vóór camera + verticale slider erna |
| Eigen zoeker (getUserMedia) | **Niet** — systeemcamera behoudt HDR/kwaliteit |
| Render | Client-side (browser) |
| Emoji | 💪🏼 (de 🤘 is eruit, besluit 17 juli) |

---

## 2. Canvas & veilige zones

- Canvas: **1080 × 1920** (9:16).
- Story-veilige zones: bovenste **250px** en onderste **250px** worden door Instagram/WhatsApp afgedekt.
- **Let op — spanning:** deze kaarten worden vooral opgeslagen/gedeeld als afbeelding (jouw harde regel: alleen `body-rock.nl` op de foto, nooit een .vercel.app-URL). De opgeslagen afbeelding toont álles. Bij live story-posten dekt de reply-bar de onderste strip af. **Advies:** prioriteer de opgeslagen afbeelding — kaart mag near-flush onderin. De rode voetregel is bij story-posten de opoffer-zone; `body-rock.nl` staat in de sub-voetregel die net erboven zit.

---

## 3. Slotmodel

Eén component, zes slots. Per app anders gevuld.

| Slot | Verplicht | Event | Bingo | Gedrag bij leeg |
|---|---|---|---|---|
| Chip (rechtsboven) | nee | `2 / 10` | `VAKJE 12` | verdwijnt, logo blijft links |
| Label | ja | challengenaam | opdrachtnaam | — |
| Held | ja | teamnaam | naam speler | — |
| Meta | **nee** | `Aanvoerder <naam>` | `<x> bingo's gehaald` | slot + spacing weg, held zakt naar footer |
| Voetregel — hoofd | ja | `Vanaf 20-07: Body Rock Bingo 💪🏼` | `Body Rock Bingo · elke dag in beweging` | — |
| Voetregel — sub | ja | `Leuke prijzen te winnen 🤩 · body-rock.nl` | `body-rock.nl` | — |

**Verwijderd t.o.v. eerder:** de tijd-regel (event) en `6 leden`. Event-meta = alleen de aanvoerder.

---

## 4. Design tokens (px op 1080-basis)

**Kleuren**
- `--red: #BC0000` · `--creme: #F5F5F0` · `--ink: #1A1A1A` · `--ink-soft: #4A4A47`
- Kaart-vlak: `rgba(245,245,240,0.78)` (fallback `0.90`)

**Fonts** (Barlow / Barlow Condensed — jouw canon)
| Element | Font | Grootte | Overig |
|---|---|---|---|
| Held | Barlow Condensed 700 | 132px (auto-fit) | line-height 0.92 |
| Label | Barlow 500 | 30px | uppercase, letter-spacing 0.09em, `--red` |
| Meta | Barlow 500 | 30px | `--ink-soft` |
| Voetregel hoofd | Barlow 500 | 32px | wit op rood |
| Voetregel sub | Barlow 500 | 30px | wit-80% op rood |
| Chip | Barlow 500 | 30px | wit op rood, radius 12px, padding 8/22px |
| Logo | — | hoogte ~72px | `/public/logowit1.png`, wit, direct op foto |
| Rode keyline | — | 96×8px | accent boven het label |

**Logo**
- Bestand `/public/logowit1.png` (wit woordmerk, transparant).
- Linksboven direct op de foto, géén pil-achtergrond.
- `filter: drop-shadow(0 3px 8px rgba(0,0,0,0.55))` — houdt het leesbaar op een felle zomerlucht.
- **Let op:** wit logo op fel licht kan alsnog wegvallen. De schaduw vangt het meeste; de kadertip "zon in je rug" helpt de rest. Wil je het bombproof, dan is een rood/donker logo op een crème pil de v2-optie (asset bestaat nog niet).

**Kaart**
- Zijmarge 40px · ondermarge 40px · radius 28px · padding 40px
- Rode voetregel: volledige kaartbreedte, dekkend, radius alleen onderhoeken

**Logo + chip rij**
- Bovenkant op **290px** van boven (net onder de veilige zone)
- Logo links, chip rechts (space-between), 40px zijmarge

---

## 5. Lagen (render-volgorde, onder → boven)

1. Achtergrond `#333` (voor letterbox als foto het kader niet vult)
2. Foto — `object-fit: cover`, `object-position: 50% <Y>%`
3. Logo (`logowit1.png`, wit + drop-shadow) linksboven + chip rechtsboven
4. Zwevende crème kaart met blur
   - keyline → label → held → meta
   - rode voetregel (hoofd + sub) onderin de kaart

Géén boven-scrim; de drop-shadow onder het logo draagt de leesbaarheid. Géén onder-scrim; de kaart doet dat.

---

## 6. Fotobehandeling

### 6a. Preview vóór de camera
Toon vóór het openen van de systeemcamera één keer de lege overlay met:
- De kaart-footprint **hard gearceerd** (zwart, geen subtiele dim — moet in de zon leesbaar zijn).
- Tip 1: *"Zet je team in de bovenste twee derde — onderin komt je naam."*
- Tip 2: *"Zon in je rug: dan sta je niet in je eigen schaduw."*

### 6b. Slider erna (verticaal pannen)
- Eén slider, mapt op `object-position: 50% <Y>%`, Y = 0–100, **default 50**.
- Overlay staat er live overheen (WYSIWYG).
- `object-position` klemt vanzelf — geen handmatige grenzen nodig.
- **Ontdekbaarheid:** slider altijd zichtbaar, ook op mobiel. Eventueel losse hint *"Schuif je team in beeld"*.

### 6c. Opslag
Client-side render (html2canvas of canvas-compose). De Y-waarde wordt op **compose-moment** toegepast; de uitkomst is de PNG. Geen aparte persistentie nodig voor een eenmalige deelkaart. Wil je later herbewerken → sla Y als los getal op (één int), niet de gecropte pixels.

---

## 7. De crème kaart — dekking & blur

- Dekking **0.78**, blur **8px** → foto blijft voelbaar, tekst hard leesbaar op elke achtergrond.
- De blur smoort foto-details onder de tekst; daarom werkt 78% ook op drukke achtergronden (hek, publiek).
- **Tekst op de kaart is altijd donker** (`--ink`). Nooit wit — witte tekst op licht-transparant is het oude leesbaarheidsprobleem terug.
- **Fallback:** `backdrop-filter` niet ondersteund (oude Android-webview, sommige in-app browsers) → dekking automatisch naar **0.90**. Minder mooi, nooit kapot.

---

## 8. Auto-fit per tekstveld

Niets loopt ooit buiten het canvas. Regels:

- **Held:** start 132px. Breder dan de kaart-binnenbreedte → stap in 8px terug tot min **76px**. Nóg te breed → max 2 regels, line-height 0.90.
- **Label:** max 1 regel. Boven ~28 tekens eerst letter-spacing terug, dan font tot min 24px.
- **Voetregel hoofd:** start 32px. Boven ~40 tekens → 28px. Boven ~55 tekens → wrap naar 2 regels. **(Dit is de bug die nu de footer afkapt — hier hard oplossen.)**
- **Meta / sub:** vast, kort van aard; geen auto-fit nodig.

---

## 9. Fallback-states (anti silent-fallback)

| Situatie | Gedrag |
|---|---|
| Geen foto geüpload | Volledige achtergrond `#BC0000`, kaart vervalt; label + held in crème/wit direct op rood; voetregel-sub met `body-rock.nl`. Nooit een leeg grijs vlak. |
| Meta leeg | Slot + spacing weg, held zakt tegen de voetregel |
| 0 bingo's *(zie open punt)* | Meta-slot weg — kaart draagt alleen de zojuist behaalde opdracht |
| Chip leeg | Chip weg, logo blijft links |
| `backdrop-filter` weg | Kaartdekking 90% |
| Placeholder-waarde (`Test`, leeg veld) | Component rendert nooit een letterlijke placeholder — leeg = slot valt weg volgens bovenstaande regels |

---

## 10. Uniform tussen twee repo's

- Twee repo's, één component, identiek bestand met versiekop `OVERLAY-v1`.
- **Schaalbaarheid-vlag:** identiek bestand in beide repo's = divergentie-risico. De versiekop maakt zichtbaar of ze uit elkaar lopen. Extraheren naar een gedeeld package kan ná de zomer; nu is dat tijdverlies dat er niet is.
- Het enige verschil tussen event en bingo zit in de **slot-waarden** (§3), niet in de layout.

---

## 11. Open punten voor Yuri (klantcommunicatie-toon → jouw call)

1. **Meta bij 0 bingo's** — valt het slot weg (advies) of toon je `0 bingo's gehaald`? Advies: weg — een deelkaart met "0 gehaald" is precies de speler die je wil vasthouden.
2. **Prijzen op de bingo-kaart** — nu staat er alleen `body-rock.nl` in de sub-voetregel. `Leuke prijzen te winnen 🤩` werkt daar net zo goed (die foto's gaan ook de wereld in). Wil je dat, of blijft bingo soberder?
3. **Meta-inhoud bingo bevestigen** — `<x> bingo's gehaald` als through-copy. Cijfer voorop, apostrof erin.

---

## 12. Wat expliciet NIET in v1 zit

- Eigen camerazoeker (getUserMedia) — kandidaat voor ná de zomer, rustig te testen op een donker veld.
- Pinch-to-zoom / horizontaal pannen — verticale slider dekt telefoonfoto's; zoom is een v2-optie.
- Adaptieve helderheidsmeting — vervallen, het crème vlak lost leesbaarheid structureel op.
- Resultaat/tijd/plek-rij — bewust weggelaten.

---

*Puur frontend-brief: geen Supabase-schema, RLS of GRANT betrokken (de event/bingo-apps gebruiken geen Supabase Auth). Bouw de component client-side. Start geen dev-server en run geen test-suite; ik test de kaart handmatig zelf op een echte daglichtfoto vóór zondag.*
