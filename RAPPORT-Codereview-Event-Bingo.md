# Codereview — Event-app & Bingo

**Datum:** 17 juli 2026 · **Scope:** `yuribeekman-cpu/bodyrock-event-app` + `yuribeekman-cpu/bodyrock-bingo` · **DB:** Supabase `qkhnjejjkrznbcpgmbxv` (gedeeld)
**Aard:** leesactie. Er is niets gewijzigd — geen code, geen schema, geen data.
**Prioriteit t.o.v. 19 juli:** `P0` = de dag loopt hierop stuk · `P1` = doet pijn maar overleefbaar · `P2` = na het event.

---

## §0 · Wat ik heb geïnspecteerd

| Bron | Hoe geverifieerd |
|---|---|
| Beide repos | Remote gecheckt: `bodyrock-event-app` @ `fea2330` (1 juli), `bodyrock-bingo` @ `4c478ee` (30 juni). Beide clean. |
| DB-schema, RLS, GRANTs, buckets, rowcounts | Live via SQL op `qkhnjejjkrznbcpgmbxv` — niet uit de docs. |
| Anon-key blootstelling | Live HTTP-call met de publieke anon-key uit de bundle. |
| Typecheck | `tsc --noEmit` op event-app: schoon (2 meldingen komen uit stale `.next`-artefacten, niet uit de source). |

Twee dingen vooraf:

- **`Temp/bodyrock-event-app` is géén git-repo** en is genegeerd. Alleen `~/Documents/GitHub/bodyrock-event-app` en `~/Documents/GitHub/bodyrock-bingo` zijn beoordeeld.
- **De docs kloppen niet met de DB.** `supabase-schema.sql` beschrijft 4 tabellen zonder `start_challenge`, `challenge_steps`, `step_completions` of `fun_photos`. De echte DB heeft die wel. Het SQL-bestand is een momentopname van eind juni en is sindsdien niet bijgehouden — niet gebruiken als waarheid.

---

## §1 · P0 — hier loopt 19 juli op stuk

### P0-1 · De event-app is leeg. Er zijn nul challenges in de database.

Dit is de belangrijkste bevinding van het hele rapport.

```
challenges:       0 rijen
challenge_steps:  0 rijen
scores:           0 rijen
teams:            1 rij   ("Balij")
events:           1 rij
```

Het enige event in de DB:

| naam | edition | datum | actief | code | challenges |
|---|---|---|---|---|---|
| Body Rock Familie Fun | Zomer 2026 | **2026-07-01** | ja | `ZM2WNN` | **0** |

Er is dus geen event voor 19 juli, en het event dat er wél staat heeft geen enkele challenge. Als een team morgen de QR scant, komt het via `/event/ZM2WNN` binnen, maakt een team aan, en belandt op `/team/[id]` met **een lege lijst**. Geen challenges, geen opdrachten, niets te doen. De app is technisch in de lucht en functioneel leeg.

De 10 challenges bestaan wél — maar als hardcoded array `CHALLENGES_2026` in [app/admin/dashboard/page.tsx:12](app/admin/dashboard/page.tsx#L12), niet in de DB. Ze worden alleen weggeschreven op één moment: wanneer je in het admin-dashboard op **"Nieuw event"** klikt. `createEvent()` doet de insert van de challenges én de 3 sub-opdrachten van challenge 10 ([dashboard:136-149](app/admin/dashboard/page.tsx#L136)).

Dat het 1-juli-event 0 challenges heeft, betekent dat die insert toen is mislukt of dat het event anders is aangemaakt. Ik kan niet vaststellen wat er is gebeurd — maar het resultaat is dat het pad "challenges komen erin via Nieuw event" **nooit aantoonbaar heeft gewerkt in deze DB**.

**Wat dit betekent voor 19 juli:** je moet een nieuw event aanmaken via het dashboard, en daarna *verifiëren* dat er 10 challenges in `challenges` staan. Niet aannemen. Als de insert weer stilletjes faalt, sta je op de dag zelf met lege telefoons. Dit is de enige bevinding in dit rapport die het event gegarandeerd sloopt, en het is ook de enige die je niet kunt ontdekken door de app even te openen — de admin-kant ziet er namelijk prima uit.

### P0-2 · Als `ADMIN_PASSWORD` niet in Vercel staat, is iedereen admin

[lib/auth.ts:3-6](lib/auth.ts#L3):

```ts
export function isAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_auth')?.value
  return cookie === process.env.ADMIN_PASSWORD
}
```

Staat `ADMIN_PASSWORD` niet in de Vercel-omgeving, dan is `process.env.ADMIN_PASSWORD` `undefined`. Een bezoeker zonder cookie levert óók `undefined`. `undefined === undefined` is `true` — **iedere willekeurige bezoeker is dan admin**, zonder iets te doen.

Dezelfde fout in de loginroute ([api/admin/auth/route.ts:6](app/api/admin/auth/route.ts#L6)): `password !== process.env.ADMIN_PASSWORD`. Een POST met `{}` stuurt `password: undefined`, wat gelijk is aan `undefined` — login slaagt, en de cookie wordt op de string `"undefined"` gezet.

Lokaal staat `ADMIN_PASSWORD` in `.env.local` (correct, niet in git — `.gitignore` dekt `.env*` af, geverifieerd). **Of hij in Vercel staat kan ik hiervandaan niet zien. Check dit vóór 19 juli.** Staat hij er, dan zakt dit naar P2 (het blijft een fail-open constructie die je moet omdraaien). Staat hij er niet, dan is je admin-dashboard publiek.

Los daarvan: de cookie *is* het wachtwoord, in plaintext. Wie de cookie ziet, heeft het wachtwoord — en dat wachtwoord is herbruikbaar op de loginpagina.

---

## §2 · P1 — doet pijn, maar je overleeft het

### P1-1 · Het scorebord ververst niet live

[app/board/page.tsx:19-22](app/board/page.tsx#L19) abonneert op `postgres_changes` voor `scores` en `fun_photos`. Maar de publicatie is leeg:

```sql
select * from pg_publication_tables where pubname='supabase_realtime';
-- 0 rijen
```

Geen enkele tabel staat in de realtime-publicatie. **De subscription vuurt nooit.** Het board toont wat er stond op het moment van laden en beweegt daarna niet meer. De code faalt stil — geen error, gewoon een bord dat bevriest.

Overleefbaar omdat een refresh wél nieuwe data haalt. Maar als het board op een scherm staat waar niemand bij staat, staat het de hele dag stil. Fix is één statement (tabellen toevoegen aan de publicatie), maar test dat dan wel even.

### P1-2 · Alle pincodes van de bingo zijn publiek leesbaar

`players` heeft een `SELECT`-policy `using (true)` en een `pin`-kolom. De anon-key staat in de client-bundle. Ik heb dit live geverifieerd:

```
GET /rest/v1/players?select=name,pin
→ [{"name":"Bertje","pin":"8942"},{"name":"Sabine","pin":"4764"},
   {"name":"Test","pin":"6385"},{"name":"Annelieke","pin":"7774"},
   {"name":"Wouter","pin":"6006"}]
```

Iedereen kan met één request alle namen + pincodes ophalen en zich als elke speler voordoen. De pincode is decoratief.

Realistisch: 5 spelers, een bingo om de lol, lage inzet. Daarom P1 en niet P0 — maar het zijn wel echte pincodes van echte leden, en mensen hergebruiken pincodes. De structurele fix (pin niet exposen; verificatie via een RPC) is te groot voor deze week. Minimale mitigatie: haal `pin` uit de policy via een view of kolom-GRANT.

### P1-3 · De timer start bij openen en is nooit te resetten

In [app/team/[id]/page.tsx:124-132](app/team/[id]/page.tsx#L124) zet `openChallenge()` `started_at` zodra de modal opengaat. De eindtijd is `now - started_at` bij inleveren ([team:186](app/team/[id]/page.tsx#L186)).

Een team dat een challenge opent om te kíjken wat de opdracht is, en dan de modal sluit om zich voor te bereiden, heeft een lopende klok. De PATCH-route weigert expliciet te herstarten als `started_at` al staat ([api/scores/route.ts:40-42](app/api/scores/route.ts#L40)). Er is geen resetknop, en admin kan het niet corrigeren via de UI.

Op een familie-event met 8 van de 10 challenges op `score_type: 'time'` gaan hier gegarandeerd tijden sneuvelen. Overleefbaar omdat de scores toch vooral voor de lol zijn en je handmatig in de DB kunt corrigeren — maar weet dat je die correcties gaat moeten doen.

Bijkomend: challenge 10 (de foto-safari) staat op `score_type: 'time'` ([dashboard:71](app/admin/dashboard/page.tsx#L71)). Daar loopt dus een klok op een fotoopdracht.

### P1-4 · "Actief maken" in het dashboard is stuk (405)

[dashboard:112](app/admin/dashboard/page.tsx#L112) doet `PATCH /api/admin/events`. Die route exporteert alleen `GET` en `POST` ([api/admin/events/route.ts](app/api/admin/events/route.ts)) — een PATCH levert **405 Method Not Allowed**. `await res.json()` krijgt dan geen event terug en de UI-state wordt bagger.

Je kunt dus **geen bestaand event aan- of uitzetten** via het dashboard. Het werkt alleen bij *nieuw* aanmaken (POST zet `is_active` en deactiveert de rest, [events route:19-21](app/api/admin/events/route.ts#L19)).

Praktisch gevolg voor 19 juli: maak je een nieuw event aan, dan komt het goed. Wil je terugschakelen naar een eerder event, of het 1-juli-event uitzetten zonder een nieuw aan te maken — dan kan dat alleen via SQL.

### P1-5 · Foto uploaden op een al-afgevinkt vakje faalt (bingo)

[BingoApp.tsx:735-743](../bodyrock-bingo/app/BingoApp.tsx#L735) doet een `upsert` op `checkins` met `onConflict: "player_id,cell_position"`. De unique constraint bestaat, maar `checkins` heeft **alleen INSERT/SELECT/DELETE-policies — geen UPDATE**. Een upsert die conflicteert wordt `INSERT ... ON CONFLICT DO UPDATE`, en dat vereist een UPDATE-policy.

Dus: vink je eerst een vakje af (INSERT) en upload je daarná een foto (conflict → UPDATE) → RLS blokkeert. De `catch` slikt het en toont "Upload mislukt" ([BingoApp:750](../bodyrock-bingo/app/BingoApp.tsx#L750)). De foto staat op dat moment al in storage — je houdt een weesbestand over.

*Let op: dit heb ik afgeleid uit de policy-inspectie, niet empirisch getest — testen zou data wijzigen en dat viel buiten de opdracht. Reproduceren is triviaal: vink een vakje af, upload dan een foto.*

### P1-6 · Admin-pincode van de bingo staat hardcoded in de client

[leaderboard/page.tsx:52](../bodyrock-bingo/app/leaderboard/page.tsx#L52): `const ADMIN_PIN = "3921";`

Staat in de JS-bundle, leesbaar voor iedereen die "view source" doet. Beschermt de prijzentrekking ([leaderboard:280](../bodyrock-bingo/app/leaderboard/page.tsx#L280)) — dus wie hem leest kan de trekking uitvoeren. Bovendien: `weekly_draws` heeft `INSERT with check (true)`, dus je kunt de trekking ook gewoon rechtstreeks via de API insertten, zonder de pin.

### P1-7 · Iedereen kan andermans check-ins wissen

`checkins` heeft `DELETE using (true)` voor `public`. Met de anon-key kan iedereen elke check-in van elke speler verwijderen — inclusief een `DELETE` zonder filter, die de hele tabel leegt. Geen authenticatie, geen eigenaarscheck.

Zelfde patroon, kleiner: `bingo_wins` heeft `INSERT with check (true)` — je kunt jezelf wins toekennen.

### P1-8 · Startchallenge-verdeling heeft een race + valt terug op een verzonnen 10

[event/[code]/page.tsx:68-80](app/event/[code]/page.tsx#L68):

```ts
const { count } = await supabase.from('teams').select(...)  // tel teams
const { count: challengeCount } = await supabase.from('challenges')...
const total = challengeCount || 10
const start_challenge = ((count || 0) % total) + 1
```

Twee problemen:

1. **Race condition.** Teams die tegelijk aanmaken (en dat gebeurt: iedereen scant de QR op hetzelfde moment) lezen dezelfde `count` en krijgen dezelfde `start_challenge`. Dan staan meerdere teams bij dezelfde post. Precies wat de rotatie moest voorkomen.
2. **`challengeCount || 10`.** Met 0 challenges (zie P0-1) is `0` falsy → `total = 10`. Er wordt netjes een startchallenge tussen 1 en 10 uitgerekend voor challenges die niet bestaan. De fout wordt weggemoffeld in plaats van zichtbaar.

De race is op ~10 teams overleefbaar (je stuurt ter plekke bij). Punt 2 verdwijnt zodra P0-1 is opgelost.

### P1-9 · De upload-route is volledig open

[api/upload/route.ts](app/api/upload/route.ts) heeft geen enkele auth. Iedereen kan naar een publieke bucket uploaden met een zelfgekozen `team_id` als pad. Er is een 8MB-limiet in de route, maar:

- `contentType` komt rechtstreeks van de client, geen validatie op type
- de extensie komt uit `file.name` — `path` is dus deels door de gebruiker bepaald
- beide buckets (`challenge-photos`, `challenge-proof`) hebben `file_size_limit: null` en `allowed_mime_types: null` — de 8MB geldt alleen in deze route, niet in de bucket zelf. De bingo-app upload rechtstreeks naar storage en gaat er dus helemaal langs
- beide buckets zijn publiek mét een brede SELECT-policy, dus de bestandslijst is opvraagbaar (Supabase-advisor bevestigt dit voor allebei)

Op een besloten familie-event met een niet-gepubliceerde URL is dit een beperkt risico. Het is wel een open uploadpunt naar een publieke bucket zonder typecheck.

---

## §3 · P2 — na het event

| # | Bevinding | Waar |
|---|---|---|
| P2-1 | **`lib/supabase oud.ts`** — dood bestand mét hardcoded anon-key en een `Team`-type zonder `start_challenge`. Wordt nergens geïmporteerd. Weggooien. | [lib/supabase oud.ts](lib/supabase%20oud.ts) |
| P2-2 | **Hardcoded anon-key als fallback** in `lib/supabase.ts:3-4`. Ontbreekt de env-var, dan praat de app stilletjes tegen productie i.p.v. te falen. Sloop de fallback. | [lib/supabase.ts:3](lib/supabase.ts#L3) |
| P2-3 | **`/join/[code]` prefilt de code niet.** Redirect naar `/join?code=X`, maar `JoinPage` leest `searchParams` nergens (geverifieerd: geen `useSearchParams` in het bestand). De gebruiker moet alsnog handmatig typen. | [join/[code]/page.tsx:11](app/join/%5Bcode%5D/page.tsx#L11) |
| P2-4 | **Captainnaam opslaan in `/join` doet niets.** `teams` heeft geen UPDATE-policy, dus de `update()` op regel 48 raakt 0 rijen en faalt stil. Alleen relevant voor de legacy join-flow. | [join/page.tsx:48](app/join/page.tsx#L48) |
| P2-5 | **Twee SECURITY DEFINER views** (`leaderboard`, `current_week_winner`) — draaien met de rechten van de maker en omzeilen RLS. Supabase-advisor meldt beide als ERROR. | DB |
| P2-6 | **`anon` heeft TRUNCATE op alle tabellen.** TRUNCATE negeert RLS volledig. Via PostgREST niet aan te roepen, dus geen acuut pad — maar het hoort er niet. | DB |
| P2-7 | **`supabase-schema.sql` is verouderd** (zie §0). Of bijwerken, of weggooien voor hij iemand misleidt. | [supabase-schema.sql](supabase-schema.sql) |
| P2-8 | **De hele beveiliging leunt op "niemand kent de URL".** Elke tabel is `with check (true)`; de app-laag is het enige slot, en de anon-key zit in de bundle. Voor dit event een bewuste, verdedigbare keuze — als het ooit groter wordt, is dit het eerste dat om moet. | DB + `supabase-schema.sql:83` |
| P2-9 | **Twee Next-versies naast elkaar**: event-app op 15.3.8, bingo op 16.2.9. Geen probleem nu, wel als je code gaat delen. | beide `package.json` |

---

## §4 · Harde vragen

**Eerst dit: §4 zat niet in de opdracht die ik heb gekregen.** Ik heb de zes genummerde instructies ontvangen, maar niet de lijst met harde vragen waar punt 5 naar verwijst. Ik ga die lijst niet verzinnen — hieronder de vragen die ik op basis van de opdracht als de kern beschouw, expliciet beantwoord. **Stuur §4 door, dan beantwoord ik jouw vragen één voor één.**

**Haalt 19 juli het?**
Niet in de huidige staat. Niet vanwege de code, maar vanwege de data: er zijn nul challenges (P0-1). De app werkt; hij heeft alleen niets te tonen. Los P0-1 op en verifieer daarna in de DB dát er 10 challenges staan, en de dag kan door.

**Is het admin-dashboard veilig?**
Weet ik niet — en dat is precies het probleem. Als `ADMIN_PASSWORD` in Vercel staat: redelijk, met een lelijke plaintext-cookie. Staat hij er niet: het dashboard is publiek voor iedereen (P0-2). Ik kan de Vercel-omgeving hiervandaan niet inzien. **Dit is de eerste die je moet checken.**

**Kan iemand met de data knoeien?**
Ja. Elke schrijfpolicy is `true` en de anon-key zit in de client-bundle. Concreet: check-ins van anderen wissen (P1-7), bingo-wins verzinnen, de prijzentrekking uitvoeren (P1-6), scores overschrijven, uploaden naar de publieke bucket (P1-9). Vereist wel dat iemand de anon-key uit de bundle vist — geen hoge drempel, wel een bewuste actie. Op een besloten familie-event acht ik dit onwaarschijnlijk, maar mogelijk is het zeker.

**Staan er geheimen in git?**
Nee. `.gitignore` dekt `.env*` af en ik heb geverifieerd dat `.env.local` niet getrackt is. Wél staat de anon-key hardcoded in de source (P2-2) — die is publiek van aard, dus geen lek, maar het is een slecht patroon. De service-role key heb ik nergens in de code aangetroffen. `ADMIN_PIN = "3921"` staat wel in git en in de bundle (P1-6) — dat is een echt geheim op een publieke plek.

**Zijn de twee apps van elkaar te scheiden?**
Ze delen één DB maar raken elkaars tabellen niet aan: event-app op `events`/`challenges`/`teams`/`scores`, bingo op `players`/`checkins`/`bingo_wins`/`week_prizes`. Ze delen wel de buckets en de anon-key. Er is geen pad waarlangs de bingo het event op 19 juli kan slopen.

**Wat zou ik doen vóór 19 juli?**
In deze volgorde. De eerste twee zijn niet optioneel.

1. **Check of `ADMIN_PASSWORD` in Vercel staat** (P0-2). Kost een minuut.
2. **Maak het event voor 19 juli aan via "Nieuw event" en verifieer daarna in de DB dat er 10 challenges staan** (P0-1). Klik niet alleen — kijk in de tabel. Dit is de enige stap die het event kan redden of breken.
3. Zet `scores` en `fun_photos` in de realtime-publicatie, als je wilt dat het board leeft (P1-1).
4. Draai een droge testronde: scan de QR, maak een team, open een challenge, upload een foto, kijk of hij op het board komt. Dat vangt precies de stille fouten die dit rapport beschrijft — RLS die niets zegt, subscriptions die niet vuren, inserts die verdwijnen.

Alles daaronder kan wachten tot na de 19e.

---

## §5 · Patroon

Drie van de zwaarste bevindingen — de lege challenges (P0-1), het stilstaande board (P1-1), de mislukte foto-upsert (P1-5) — hebben dezelfde vorm: **een schrijf- of leesactie die faalt zonder iets te zeggen.** RLS weigert een UPDATE en geeft geen error terug, alleen 0 rijen. Een realtime-subscription op een lege publicatie levert netjes een `subscribe()` op en zwijgt daarna. `challengeCount || 10` maakt van "0 challenges" een geldig getal.

Dat is ook waarom P0-1 zo lang onopgemerkt kon blijven: het dashboard *ziet er goed uit*, want het toont de hardcoded `CHALLENGES_2026` uit de client-code — niet wat er in de DB staat. Je moet in de tabel kijken om het te zien.

De les voor de testronde van punt 4 hierboven: **vertrouw de UI niet, kijk in de data.** Bijna elke bevinding hier is onzichtbaar vanaf het scherm.

---

*Leesactie. Er is niets gewijzigd in code, schema of data. Alle DB-uitspraken komen uit live-inspectie van `qkhnjejjkrznbcpgmbxv` op 17 juli 2026; de enige bevinding die is afgeleid i.p.v. empirisch getest is P1-5, en dat staat daar vermeld.*
