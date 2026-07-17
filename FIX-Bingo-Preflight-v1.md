# FIX-Bingo-Preflight-v1 — Stroom 2: Bingo-app

*17 juli 2026 · repo `yuribeekman-cpu/bodyrock-bingo` · DB `qkhnjejjkrznbcpgmbxv` (gedeeld met de event-app)*
*Context: de Bingo start volgens de event-copy op **19 juli** — dezelfde dag als het event. Loopt daarna 4 weken.*
*Bron: `RAPPORT-Codereview-Event-Bingo.md` (17 juli).*

---

## ▶️ Voor Code

1. Drie taken. **Stop na taak 3.**
2. Deze stroom is bewust klein: de Bingo loopt 4 weken, dus bijna alles kan volgende week. Alleen wat op **dag 1** stukgaat of onherstelbaar is, gaat vandaag mee.
3. Raak de event-app niet aan — die loopt in `FIX-Event-Preflight-v1`.
4. Verifieer alles in de DB, niet op het scherm.

---

## Waarom deze drie

De Bingo heeft geen P0. Wel drie dingen die je niet wilt ontdekken tijdens week 1: een upload die stil faalt bij normaal gebruik, een tabel die iedereen kan leegen, en pincodes van echte leden die publiek uit te lezen zijn. De eerste twee zijn elk één SQL-statement. De derde is een beslissing.

---

## Taak 1 — UPDATE-policy op `checkins` 🟡 P1-5

**Wat:** `BingoApp.tsx:735-743` doet een `upsert` op `checkins` met `onConflict: "player_id,cell_position"`. Bij een conflict wordt dat `INSERT ... ON CONFLICT DO UPDATE` — en `checkins` heeft alleen INSERT/SELECT/DELETE-policies, **geen UPDATE**. RLS blokkeert, de `catch` slikt het, de gebruiker ziet "Upload mislukt", en de foto staat al als weesbestand in storage.

**Waarom dit dag 1 raakt:** dit is geen randgeval. Het is de normale volgorde — vakje afvinken, daarna een foto uploaden. Iedereen die dat doet, loopt erin.

**Actie:** voeg een UPDATE-policy toe op `checkins` in dezelfde lijn als de bestaande policies. Verifieer daarna in `pg_policies` dat 'ie er staat.

**Testen:** het rapport markeert dit expliciet als *afgeleid uit de policies, niet empirisch getest*. Reproduceer het dus eerst: vink een vakje af, upload dan een foto, en kijk of de rij daadwerkelijk een `photo_url` krijgt. Bevestig in het rapport of de diagnose klopte — als 'ie niet klopte, wil ik dat weten.

---

## Taak 2 — Backup vóór zondag 🟡 P1-7

**Wat:** `checkins` heeft `DELETE using (true)` voor `public`. Met de anon-key uit de bundle kan iedereen elke check-in wissen — inclusief een `DELETE` zonder filter, die de hele tabel leegt. Hetzelfde geldt breder: elke schrijfpolicy staat op `true`.

**Waarom geen echte fix vandaag:** er is geen auth om eigenaarschap aan op te hangen. Een pin-geverifieerde RPC is de juiste oplossing en dat is geen vrijdagavondwerk.

**Actie in plaats daarvan — verzekering, geen slot:**
1. Maak vandaag een dump van `players`, `checkins`, `bingo_wins`, `week_prizes`, `weekly_draws`.
2. Zet 'm ergens waar Yuri erbij kan.
3. Beschrijf in één alinea hoe je 'm terugzet als het misgaat.

**Waarom dit voldoende is voor nu:** het risico is niet dat iemand het doet, het risico is dat het onherstelbaar is als het gebeurt. Een backup haalt de tweede helft weg voor 10 minuten werk. Het slot komt na de 19e.

---

## Taak 3 — Pincodes: rapporteer de opties 🔴 BESLISSING BIJ YURI

**Wat:** `players` heeft een SELECT-policy `using (true)` inclusief de `pin`-kolom. Het rapport heeft dit **live geverifieerd** — vijf namen + pincodes van echte leden kwamen er met één request uit.

**Doe vandaag nog niks aan de code.** Lever Yuri drie opties met eerlijke inschattingen:

- **(a) Kolom-GRANT / view** — haal `pin` uit wat `anon` mag lezen. Vraag die je moet beantwoorden: **breekt dit de login-flow?** Als de client de pin ophaalt om lokaal te vergelijken, wel. Kijk in `BingoApp.tsx` hoe de pin-verificatie werkt en meld het.
- **(b) RPC met pin-verificatie** — de structurele fix. Inschatting?
- **(c) Accepteren voor deze ronde** + na afloop alle pincodes roteren.

**Waarom het een beslissing is en geen fix:** het gaat om echte pincodes van echte leden, en mensen hergebruiken pincodes — dus dit is groter dan bingo. Maar de inzet is een bingo om de lol met 5 spelers, en optie (a) kan de login slopen op de dag dat de bingo start. Die afweging is niet aan jou of mij.

---

## Geparkeerd — niet aankomen

| Bevinding | Waarom het wacht |
|---|---|
| P1-6 `ADMIN_PIN = "3921"` hardcoded + open `weekly_draws` insert | De eerste trekking is pas over een week. Ruim zeg. |
| P2-5 twee SECURITY DEFINER views | Na het event. |
| P2-6 `anon` heeft TRUNCATE | Niet aanroepbaar via PostgREST. Na het event. |
| P2-9 Next-versies uiteen | Pas relevant als we code gaan delen. |
| Social share per challenge | Feature, geen fix. |

---

## Taak 4 — Startdatum verifiëren: de bingo start op **20 juli** 🔴 NIEUW

**Vastgesteld door Yuri (17 juli):** de bingo start **maandag 20 juli** — de dag ná het event, niet dezelfde dag. De eerdere aanname (19 juli, uit de event-copy) was fout. De footer op elke event-foto zegt nu letterlijk *"Vanaf 20-07"*.

**Waarom dit nu een taak is:** zondag gaan er tientallen foto's de deur uit met die belofte erop. Klikt de bingo maandag niet open, dan heb je een campagne die naar een dichte deur wijst — en die foto's kun je niet terugroepen.

**Actie:**
1. Zoek elke plek waar de bingo een datum, week of periode kent: hardcoded startdatum, weeknummer-berekening, `week_prizes`, filters op datum.
2. Bevestig dat **20 juli dag 1 / week 1** is en dat een speler op 20 juli daadwerkelijk een kaart kan aanmaken en een vakje kan afvinken.
3. Klopt het niet: meld exact wat er staat en wat het zou moeten zijn — **wijzig geen datumlogica zonder terugkoppeling.** Een verschoven weekindeling raakt de prijzen, en dat is Yuri's beslissing.

Let op: een oudere projectnotitie noemt 27-07 t/m 23-08 als bingoperiode. Als je dát in de code terugvindt, is dat het probleem. Meld het, fix het niet zelf.

---

Maak de codewijzigingen. Verifieer je werk zelf in Supabase: controleer schema, RLS/GRANT én de daadwerkelijke rijen — test of de DB-entries echt werken. Werkt iets niet: fix het en rapporteer wat er mis was en wat je hebt gedaan. Start geen dev-server en run geen test-suite; de app test Yuri handmatig.
