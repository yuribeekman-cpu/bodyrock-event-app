# FIX-EventBingo-Preflight-v2

*17 juli 2026 · **vervangt** `FIX-Event-Preflight-v1`, `FIX-Bingo-Preflight-v1` en `FIX-Event-Overlay-v1` — die zijn hiermee vervallen, gebruik ze niet meer.*
*Repo's: `yuribeekman-cpu/bodyrock-event-app` + `yuribeekman-cpu/bodyrock-bingo` · DB `qkhnjejjkrznbcpgmbxv` (gedeeld)*
*Bron: `RAPPORT-Codereview-Event-Bingo.md` (17 juli)*

---

## ▶️ Voor Code

1. **Tijdlijn:** het Familie Fun Event is **zondag 19 juli, ochtend**. De Zomer Bingo start **maandag 20 juli**. Yuri heeft zaterdag maximaal 1 uur. Alles moet vandaag klaar.
2. Werk de blokken **A → B → C** af, in die volgorde. Binnen een blok is de volgorde vrij.
3. **Stop na blok C.** Alles wat niet in deze brief staat is bewust geparkeerd — ook als je het ziet en het jeukt. Zie §Geparkeerd voor wat en waarom.
4. **Loopt de tijd? Dan valt blok C af, nooit taak 6.** Taak 6 is het enige dat zondag redt of sloopt.
5. Verifieer elke taak in de DB — **kijk in de rijen, niet naar het scherm.** Dat is de kernles van het rapport.
6. Beantwoord de vragen in §Vragen expliciet, ook als het antwoord "weet ik niet" is.
7. Eindig met een statusblok: per taak `klaar` / `niet gelukt` / `overgeslagen` + wat je in de DB zag.

---

## De kern in vier zinnen

De event-app is niet stuk, hij is **leeg**: nul challenges in de database, en het enige event is van 1 juli. Scant een team zondag de QR, dan maakt het een team aan en belandt op een lege pagina. De 10 challenges bestaan wel, maar als hardcoded array in de admin-code, en die wordt alleen weggeschreven bij "Nieuw event" — een pad dat in deze DB nooit aantoonbaar heeft gewerkt.

Daaronder loopt één patroon door bijna alle bevindingen: **acties die stil falen.** RLS weigert zonder error. Subscriptions zwijgen. `challengeCount || 10` maakt van "nul challenges" een geldig getal. Het dashboard toont de array uit de client-code, niet de DB — daarom zág alles er goed uit terwijl de tabel leeg was. Elke taak hieronder maakt óf een stille fout luid, óf vult een lege tabel.

**Van de twee P0's uit het rapport staat er nog één.** P0-2 (`ADMIN_PASSWORD`) is op 17 juli geverifieerd en dicht — zie A1. **P0-1 (lege database) is nu het enige dat zondag nog kan slopen**, en die zit in blok B.

---

# BLOK A — kan nu meteen, hangt nergens van af

## A1 · `isAdmin` fail-open dichtzetten 🟡 P0-2 — **gedegradeerd, env-var is bevestigd aanwezig**

**Update 17 juli, ná het rapport:** Yuri heeft geverifieerd dat `ADMIN_PASSWORD` **wél in Vercel staat**, en de admin-login is live getest op een telefoon buiten het netwerk (eigen wachtwoordscherm, geen Vercel-login). **P0-2 is daarmee niet acuut.** Het rapport hield hier terecht een slag om de arm — die vraag is nu beantwoord.

`lib/auth.ts:3-6` vergelijkt de cookie direct met `process.env.ADMIN_PASSWORD`. Ontbreekt die env-var, dan is `undefined === undefined` waar en is iedere bezoeker admin. Zelfde fout in `app/api/admin/auth/route.ts:6`: een POST met `{}` stuurt `password: undefined`, login slaagt, cookie wordt de string `"undefined"`.

**Actie (blijft, maar is nu goedkope verzekering i.p.v. spoed):** faal dicht. Is `ADMIN_PASSWORD` leeg/undefined → `return false` en log luid. Beide plekken.

**Waarom nog steeds meenemen:** het zijn twee regels, en de constructie faalt de verkeerde kant op. Vandaag dekt de env-var het af; verhuis je ooit naar een ander Vercel-project of een nieuwe omgeving en vergeet je die variabele, dan staat je dashboard open zonder dat iets je waarschuwt. Faal-dicht kost niets en haalt die hele klasse fouten weg.

**Niet doen:** de cookie-is-het-wachtwoord-constructie omdraaien. P2.

**Niet aankomen — Vercel Deployment Protection:** "Require Log In" staat aan met Standard Protection. Live getest op 5G: `bodyrock-event-app.vercel.app` laadt gewoon, dus productie is publiek en alleen previews zijn beschermd. Dat is de gewenste staat. **Laat die instelling met rust.**

## A2 · `createEvent` moet luid falen 🔴 P0-1

De challenges-insert in `createEvent()` (`app/admin/dashboard/page.tsx:136-149`) is ooit stil mislukt — het 1-juli-event heeft 0 challenges. Wat er toen misging weten we niet en gaan we niet reconstrueren. Wat we wél doen: zorgen dat het niet nóg een keer ongemerkt gebeurt.

**Actie:**
1. Check de error van elke insert (`challenges` én `challenge_steps`) en gooi 'm op. Geen `catch` die 'm opslikt.
2. Na de inserts: **tel terug uit de DB**, niet uit de array in het geheugen. Verwacht: aantal challenges == lengte van `CHALLENGES_2026`, en 3 `challenge_steps`.
3. Klopt het niet → blokkerende foutmelding in het dashboard, en laat het event **niet** actief achter. Beter geen event dan een leeg event.

## A3 · `challengeCount || 10` slopen 🔴 P0-1-hygiëne

`app/event/[code]/page.tsx:68-80`. Met 0 challenges is `0` falsy → `total = 10` → er wordt netjes een startchallenge uitgerekend voor challenges die niet bestaan.

**Actie:** geen fallback. Is `challengeCount` 0 of null → gooi een fout en toon de gebruiker dat het event nog niet klaarstaat. Eén regel, en precies de regel die de lege database had verraden.

**Niet doen:** de race condition in dezelfde functie (P1-8). Zie §Geparkeerd.

## A4 · Realtime-publicatie vullen 🟡 P1-1

`pg_publication_tables` voor `supabase_realtime` is leeg → de subscription in `app/board/page.tsx:19-22` vuurt nooit → het bord bevriest na laden. Faalt stil: geen error, gewoon een bord dat stilstaat.

**Actie:** voeg `scores` en `fun_photos` toe aan de publicatie. Verifieer daarna dat `pg_publication_tables` ze teruggeeft. Kun je niet testen of een insert écht bij een open board-client aankomt zonder dev-server: meld dat, dan test Yuri het.

**Waarom nu:** het bord is het enige gedeelde scherm van de dag.

## A5 · Startknop voor de timer 🟡 P1-3 — besluit Yuri (17 juli): optie B

`openChallenge()` (`app/team/[id]/page.tsx:124-132`) zet `started_at` zodra de modal opengaat; eindtijd is `now - started_at` bij inleveren (`:186`). De PATCH-route weigert expliciet te herstarten als `started_at` al staat (`app/api/scores/route.ts:40-42`). Er is geen reset, ook niet voor admin.

**Actie:** `started_at` niet meer zetten bij openen, maar op een expliciete **"Start"-knop** in de modal. Opdracht lezen mag gratis; de klok begint als het team zegt dat 'ie begint.

**Waarom:** 8 van de 10 challenges scoren op tijd. De sequentiële lock voorkomt dat een team vooruit leest door de challenges, maar niet het gat op de challenge die wél open is: opdracht lezen → naar de post lopen → opstellen → beginnen. Daar lekt de tijd.

## A6 · Bingo: UPDATE-policy op `checkins` 🟡 P1-5

`BingoApp.tsx:735-743` doet een `upsert` op `checkins` met `onConflict: "player_id,cell_position"`. Bij conflict wordt dat `INSERT ... ON CONFLICT DO UPDATE`, en `checkins` heeft alleen INSERT/SELECT/DELETE-policies — **geen UPDATE**. RLS blokkeert, de `catch` slikt het, gebruiker ziet "Upload mislukt", en de foto staat al als weesbestand in storage.

**Dit is geen randgeval:** vakje afvinken → daarna foto uploaden is de normale volgorde. Iedereen loopt erin, vanaf dag 1.

**Actie:** UPDATE-policy toevoegen, in lijn met de bestaande policies. Verifieer in `pg_policies`.

**Eerst reproduceren:** het rapport markeert dit als *afgeleid uit de policies, niet empirisch getest*. Vink een vakje af, upload dan een foto, kijk of de rij een `photo_url` krijgt. Klopte de diagnose niet? Dan wil ik dat weten.

## A7 · Bingo: backup vóór zondag 🟡 P1-7

`checkins` heeft `DELETE using (true)` voor `public`. Met de anon-key uit de bundle kan iedereen elke check-in wissen — inclusief een `DELETE` zonder filter die de hele tabel leegt. Breder: elke schrijfpolicy staat op `true`.

**Geen echte fix vandaag** — er is geen auth om eigenaarschap aan op te hangen; een pin-geverifieerde RPC is geen vrijdagavondwerk.

**Actie — verzekering, geen slot:**
1. Dump `players`, `checkins`, `bingo_wins`, `week_prizes`, `weekly_draws`.
2. Zet 'm ergens waar Yuri erbij kan.
3. Eén alinea: hoe zet je 'm terug.

**Waarom dit nu voldoende is:** het risico is niet dat iemand het doet, het risico is dat het onherstelbaar is als het gebeurt. Een backup haalt de tweede helft weg voor 10 minuten werk.

## A8 · Bingo: startdatum is **20 juli** 🔴

**Vastgesteld door Yuri (17 juli):** de bingo start **maandag 20 juli**, de dag ná het event. De eerdere aanname (19 juli, uit de event-copy) was fout.

**Waarom dit een taak is:** zondag gaan er tientallen foto's de deur uit met *"Vanaf 20-07"* erop. Klikt de bingo maandag niet open, dan wijst je hele campagne naar een dichte deur — en die foto's roep je niet terug.

**Actie:**
1. Zoek elke plek waar de bingo een datum, week of periode kent: hardcoded startdatum, weeknummer-berekening, `week_prizes`, datumfilters.
2. Bevestig dat **20 juli dag 1 / week 1** is en dat een speler die dag een kaart kan aanmaken en een vakje kan afvinken.
3. Klopt het niet: **meld exact wat er staat, wijzig geen datumlogica zonder terugkoppeling.** Een verschoven weekindeling raakt de prijzen — dat is Yuri's beslissing.

*Let op: een oudere projectnotitie noemt 27-07 t/m 23-08 als bingoperiode. Vind je dát in de code, dan is dat het probleem. Melden, niet zelf fixen.*

## A9 · Bingo: pincode-copy 🟡 P1-2 — besluit Yuri (17 juli): accepteren + copy

`players` heeft een SELECT-policy `using (true)` inclusief de `pin`-kolom; de anon-key zit in de bundle. Het rapport heeft dit live geverifieerd — namen + pincodes kwamen er met één request uit.

**Besluit:** niet dichtzetten vóór de start. De huidige pins zijn testaccounts, dus de blootstelling is vandaag ~nul; vanaf 20 juli groeit die met elk nieuw lid. De structurele fix (pin niet exposen / RPC met pin-verificatie) volgt **begin volgende week, vóór de instroom groot is**. Vrijdagavond aan een auth-flow zitten die maandag moet werken is de verkeerde volgorde.

**Actie vandaag — alleen copy:** voeg bij het aanmaken van een kaart één regel toe: *"Kies een pincode die je nergens anders gebruikt."* Gratis, en haalt het echte risico (hergebruik van pincodes) er grotendeels uit.

---

# BLOK B — wacht op Yuri's challenge-sheet

Dit is het kritieke pad. B1 → B2 is de enige keten die zondag redt.

## B1 · Challenges bijwerken 🔴 GEBLOKKEERD

Vervang de `CHALLENGES_2026`-array in `app/admin/dashboard/page.tsx:12` door de bijgewerkte teksten van Yuri.

**Zonder dat bestand niet beginnen.** Niets verzinnen, en de oude teksten niet laten staan "omdat het toch werkt".

- Behoud de 3 sub-opdrachten van challenge 10 (`challenge_steps`).
- `score_type` per challenge tegen de sheet checken. Challenge 10 (foto-safari) staat op `'time'` — **dat is bevestigd door Yuri als bedoeld**, laten staan.

## B2 · Het echte event aanmaken + verifiëren 🔴 DE BELANGRIJKSTE TAAK

Kan pas na A2 en B1.

1. Ruim het testspoor op: event 1 juli + team "Balij". Volgorde: `step_completions → fun_photos → scores → challenge_steps → challenges → teams → events`.
2. Maak via het dashboard ("Nieuw event") het event voor **19 juli** aan. **Via het dashboard, niet via SQL** — we willen juist bewijzen dat dat pad werkt.
3. Verifieer in de tabellen:

```sql
select id, naam, datum, is_active, code from events;
select count(*) from challenges;              -- verwacht: 10
select count(*) from challenge_steps;         -- verwacht: 3
select count(*) from events where is_active;  -- verwacht: 1
```

4. **Rapporteer de event-code terug** — die heeft Yuri nodig voor de QR.

**Faalt de insert opnieuw:** A2 zorgt dat je nu ziet waaróm. Fix de oorzaak, meld wat het was. Val niet stil terug op handmatige SQL — dan is het probleem verplaatst naar volgend jaar, niet opgelost.

---

# BLOK C — foto-overlay (valt af als de tijd op is)

## C1 · Overlay + captainnaam

**Waarom dit erin zit en niet cosmetisch is:** het event is zondag, de bingo start maandag. Elke gedeelde event-foto draagt de bingo-footer naar buiten op precies het moment dat de bingo moet landen. Dit is de funnel event → bingo, en de reden dat de foto's worden verzameld.

### Harde regel: de overlay mag de upload nooit blokkeren

Faalt de canvas — om welke reden dan ook — dan gaat de **originele foto** gewoon omhoog. Geen error naar de gebruiker, wel een `console.warn`.

Overal elders in deze brief faal je luid en dicht (A1). Hier faal je stil en open. Dat is geen inconsistentie, dat is de kosten van falen volgen: een foto zonder randje is een foto; een foto die niet geüpload is omdat de canvas struikelde op een Android-WebView is wég.

### Layout — 9:16, 1080×1920

Tekst **náást** de foto, niet eroverheen (anders staat de naam over gezichten).

```
┌─────────────────────────┐
│  rode balk · logowit    │   ← public/logowit.png (wit, transparant)
├─────────────────────────┤
│  TEAMNAAM               │
│  captain: {naam}        │
├─────────────────────────┤
│                         │
│      de foto            │   ← geen tekst overheen
│      (cover-fit)        │
│                         │
├─────────────────────────┤
│  CHALLENGE-NAAM         │
├─────────────────────────┤
│ Vanaf 20-07: Body Rock  │
│ Bingo 💪🏼               │
│ Leuke prijzen te winnen │
│ 🤩 · body-rock.nl       │
└─────────────────────────┘
```

Stijl matcht de Bingo-app: `#F2F0ED` achtergrond · `#BC0000` accenten · Barlow / Barlow Condensed.

**Footer-copy (canoniek, vastgesteld door Yuri 17 juli):**

> **Vanaf 20-07: Body Rock Bingo 💪🏼**
> Leuke prijzen te winnen 🤩 · body-rock.nl

Regel 1 vet/groter, regel 2 kleiner.

**`body-rock.nl` is niet-onderhandelbaar en mag nooit een andere URL worden.** Deze foto's zijn permanent — ze gaan zondag de wereld in en staan over twee jaar nog op iemands telefoon. `body-rock.nl` is het enige adres waarvan we zeker weten dat het dan nog bestaat. Nooit een `.vercel.app`-URL of een subdomein dat kan verhuizen.

**Emoji:** 🤘 vervalt en wordt 💪🏼 (Yuri, 17 juli). Kom je 🤘 elders in de event- of bingo-copy tegen: vervangen door 💪🏼, en melden waar je 'm vond.

### Techniek

- **Client-side canvas.** (De Bingo doet dit server-side met Pillow — die aanpak niet overnemen; we willen de preview direct in de browser.)
- Nieuw: `lib/photoOverlay.ts` → `generateOverlay(file, { teamName, captainName, challengeName }) → Promise<Blob | null>`
- **Retourneert `null` bij elke fout.** De aanroeper uploadt dan het origineel.
- Logo async inladen; niet binnen ~2s geladen → teken zonder logo, niet wachten.
- `canvas.toBlob(cb, 'image/jpeg', 0.85)` op 1080×1920 → ~300–600KB.

**Bonus:** dit is meteen de compressie. Het backlog-item "foto's comprimeren naar 2MB vóór upload" vervalt hiermee.

### Inhaken — `app/team/[id]/page.tsx`

1. Foto gekozen → `generateOverlay(...)` → preview toont de overlay-versie (nu: kale `URL.createObjectURL`).
2. Team ziet het resultaat en kan een andere foto kiezen.
3. "Afronden" uploadt **alleen de overlay-versie**. Het origineel staat op de telefoon. → `app/api/upload/route.ts` hoeft niet te veranderen.
4. `generateOverlay` gaf `null` → upload het origineel, zonder melding.

### Captainnaam

Uit het rapport (P2-4): de legacy `/join`-flow heeft een captainnaam-veld, maar die `update()` raakt 0 rijen omdat `teams` geen UPDATE-policy heeft — het faalt stil. De live flow loopt via `/event/[code]`.

**Actie:** voeg het captainnaam-veld toe aan het **aanmaakformulier** in `/event/[code]` en neem het mee in de **INSERT** van het team. Dan is er geen UPDATE-policy nodig en vervalt P2-4 vanzelf.

- Eén tekstveld, kindertaal: *"Wie is jullie captain?"*
- Niet verplicht. Leeg → overlay laat de captainregel weg.
- Kolom `captain_name` op `teams`: check eerst of 'ie al bestaat (het legacy-veld schreef ergens naartoe). Rapporteer wat je aantreft.

### Testen

Android **en** iOS Safari — hier komen canvas + file-input + camera samen, historisch de rommeligste hoek van deze app (eerdere stuck-button- en back-button-bugs).

**Test expliciet het faalpad:** forceer een error in `generateOverlay` en bevestig dat de foto alsnog geüpload wordt. Dat pad is belangrijker dan het mooie pad.

---

## Vragen — expliciet beantwoorden

| # | Vraag |
|---|---|
| V1 | **Kan een team meerdere foto's uploaden binnen challenge 10 (foto-safari)?** Er zijn 3 sub-opdrachten (`challenge_steps`) en een `step_completions`-tabel. Staat de UI één foto per sub-opdracht toe, of meerdere? Krijgen die sub-foto's ook de overlay, of alleen de hoofdfoto per challenge? Antwoord met wat de code doet, niet met wat logisch zou zijn. |
| V2 | **Bestaat `teams.captain_name` al?** Zie C1. |
| V3 | **Klopte de diagnose van A6?** Zie A6 — reproduceren vóór fixen. |

---

## Geparkeerd — niet aankomen

| Bevinding | Waarom het wacht |
|---|---|
| P1-4 PATCH 405 "actief maken" | Niet nodig: POST bij een nieuw event deactiveert de rest al. Je hebt de knop zondag niet. |
| P1-8 race op `start_challenge` | Bij ~10 teams overleefbaar; Yuri stuurt ter plekke bij. Ongeteste concurrency-code op de avond vóór is een slechte ruil. |
| P1-6 `ADMIN_PIN = "3921"` hardcoded + open `weekly_draws` insert | Eerste trekking is pas over een week. |
| P1-9 open upload-route | Besloten event, niet-gepubliceerde URL. Na de 19e. |
| P1-2 pincodes structureel dichtzetten | Zie A9 — begin volgende week, vóór de instroom groeit. |
| Subdomein (`fun.` / `bingo.body-rock.nl`) | Nul functionele winst zondag. Kan altijd later; breekt de foto's niet, want die wijzen naar `body-rock.nl`. |
| Alle P2's (dood bestand, hardcoded anon-key-fallback, `/join`-prefill, SECURITY DEFINER views, TRUNCATE-grant, verouderde `supabase-schema.sql`, Next-versies) | Na het event. |

---

Maak de codewijzigingen. Verifieer je werk zelf in Supabase: controleer schema, RLS/GRANT én de daadwerkelijke rijen — kijk in de data, niet naar het scherm. Werkt iets niet: fix het en rapporteer wat er mis was en wat je hebt gedaan. Start geen dev-server en run geen test-suite; de app test Yuri handmatig. Kun je een genoemd bestand niet vinden: meld het, improviseer niet.
