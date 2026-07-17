# COPY-Bingo-Weekoverzicht-v1

*17 juli 2026 · bodyrock-bingo · voorstel aan Yuri (copy = zijn call)*
*Volgt op A8: bingo = 4 weken, ma 20 juli t/m zo 16 augustus, 2 prijzen per week.*

**Prioriteit — gewijzigd 17 juli op verzoek van Yuri: dit gaat mee in de sessie van vandaag.**

Eerder geparkeerd tot ná het event. Dat was te voorzichtig: de "bevries wat je niet kunt testen"-regel uit v2 gaat over **zondag**, en dit blok raakt de event-app niet — andere repo, andere app. Bovendien zit je vandaag toch al in deze code voor A8, en de bingo start maandag, dus dan staat 'ie er meteen.

**Twee harde voorwaarden:**
1. **Blok B (challenge-sheet → event aanmaken) springt vóór zodra de sheet binnen is.** Altijd. Dit blok wijkt.
2. **A8 eerst afmaken**, daarna pas dit. Zie §8 — dit blok leest de weekfunctie, en die moet er eerst zijn.

---

## 1. Wat dit blok moet doen

Twee dingen, in deze volgorde:

1. **"Waar ben ik nu?"** — welke week loopt, hoeveel tijd nog.
2. **"Wanneer is het volgende moment?"** — zondag 21:00.

Het tweede is het belangrijkste, en het is geen informatie maar een **afspraak**. Elke zondag, zelfde tijd, vier weken lang, en je weet niet of jij het bent. Vaste cue, variabele beloning — het patroon waar gewoontes op draaien. Daarom is de trekking de kop van dit blok en niet een kolom in de tabel.

**Daarom geen kolom "zondag 21:00".** Vier identieke cellen onder elkaar zijn dezelfde regel vier keer. Herhaling maakt het gewoon; één keer groot maakt het een afspraak.

## 2. Voorstel

```
┌──────────────────────────────────────┐
│  Vier weken zomer. 8 prijzen.        │
│  Let's rock.                         │
│                                      │
│  Elke zondag om 21:00 trekken        │
│  we 2 prijswinnaars 🤩               │
│  Maak deze week bingo en je zit      │
│  in de trekking.                     │
├──────────────────────────────────────┤
│  ✓  Week 1    20 – 26 juli           │
│                                      │
│ ▶  Week 2    27 juli – 2 aug         │
│     Nog 3 dagen om bingo te maken 💪🏼│
│                                      │
│     Week 3    3 – 9 aug              │
│     Week 4    10 – 16 aug            │
└──────────────────────────────────────┘
```

- **Kop + trekkingsregel** bovenaan, samen. Dat is de afspraak.
- **Actieve week** springt eruit (`--red`, vetter, iets groter) en is de enige rij met een subregel: de countdown.
- **Geweeste weken** blijven staan met een vinkje, gedimd. Niet verbergen — vier weken zien is het einde zien (goal gradient), en wat je al gehad hebt is voortgang.
- **Komende weken** normaal, niet gedimd. Ze zijn geen "nog niet", ze zijn "komt eraan".

**Titel — vastgesteld door Yuri (17 juli), canoniek:**

> `Vier weken zomer. 8 prijzen. Let's rock.`

Letterlijk zo overnemen. De mix van `Vier` (woord) en `8` (cijfer) is bedoeld en geen slordigheid: "vier" leest in het Nederlands ook als werkwoord, en het cijfer laat de prijzen eruit springen. Niet gelijktrekken naar `4` of `Acht`.

## 3. Alle staten — geen enkele mag leeg vallen

Dit blok kent vijf toestanden. Vier ervan zijn makkelijk te vergeten en vallen dan stil terug op iets verkeerds. Bouw ze alle vijf expliciet.

| Wanneer | Kop | Trekkingsregel | Tabel |
|---|---|---|---|
| **Vóór 20 juli** | `Vier weken zomer. 8 prijzen. Let's rock.` | `Maandag gaan we los 💪🏼` | alle 4 de weken, geen actieve |
| **Tijdens week 1–4** | idem | `Elke zondag om 21:00 trekken we 2 prijswinnaars 🤩` + `Maak deze week bingo en je zit in de trekking.` | actieve week uitgelicht + countdown |
| **Zondag ná 21:00** | idem | `De prijswinnaars zijn getrokken — kijk of jij erbij zit 👀` | actieve week blijft week n |
| **Ná 16 augustus** | `Dat was 'm.` | `Vier weken, 8 prijswinnaars. Tot de volgende 💪🏼` | alle 4 met vinkje |
| **Data onbekend / buiten bereik** | — | — | **blok niet tonen** |

Die laatste rij is de belangrijkste. Geeft de weekfunctie geen geldige week terug, dan verdwijnt het blok — het toont **nooit** week 1 als default. Dat is dezelfde fout als `challengeCount || 10`: een fallback die van "onbekend" een geldig antwoord maakt.

## 4. Countdown-copy — vastgesteld door Yuri (17 juli)

Alleen op de actieve week. Afgeleid bij render, niets opslaan.

| Nog | Tekst |
|---|---|
| 4–6 dagen | `Nog {n} dagen tot de trekking` |
| 2–3 dagen | `Nog {n} dagen om bingo te maken 💪🏼` |
| 1 dag | `Morgen om 21:00 worden de prijswinnaars getrokken` |
| vandaag, vóór 21:00 | `Vanavond 21:00. Nog even, dan weet je 't 👀` |
| vandaag, ná 21:00 | *(zie staat 3 hierboven)* |

**Correctieregel van Yuri, geldt overal:** *"wordt er getrokken"* is dubbelzinnig — het zegt niet wát er getrokken wordt. Benoem altijd **de prijswinnaars**. Doorgevoerd in de staten-tabel in §3 (staat 3 zei eerst "Vanavond getrokken"). Kom je deze constructie elders in de bingo-copy tegen: zelfde behandeling, en meld waar.

**Waarom de tekst verandert en de tabel niet:** de weekindeling is vocabulaire — die moet elke dag hetzelfde zijn, anders kun je twee dagen niet vergelijken. De countdown is de beloningskant, en die leeft van variatie. Vaste cue, variabele beloning.

## 5. Plaatsing

Op de leaderboard-pagina, **boven** de winnaars van vorige weken. Eerst "waar zijn we nu", dan "wie ging je voor".

Niet op het bingokaart-scherm. Daar is de taak: vakje afvinken. Een schema erbij leidt af van doen.

## 6. De trekking — bevestigd door Yuri (17 juli)

**Regel: je moet die week bingo hebben gemaakt om mee te dingen naar de weekprijs.** Niet "minstens één vakje" — mijn eerdere voorstel was fout. Yuri's eigen countdown-copy (*"om bingo te maken"*) zei het al.

**Mechaniek:** de admin klikt een **rad** aan dat de winnaar kiest uit de deelnemers van die week.

**Copy-regel, direct onder de trekkingsregel:**

> `Maak deze week bingo en je zit in de trekking.`

Dat is wat dit blok van schema naar aansporing tilt: het verschil tussen zondagavond kijken en zaterdag nog even doorpakken.

### 🔴 Verificatie vóór bouw — Yuri zegt zelf "meen ik"

Deze regel staat straks op **drie** plekken: in de spelregels, in dit weekblok, en rond het rad. Drie plekken die hetzelfde moeten zeggen, is drie plekken die uit elkaar lopen. Dat is exact het patroon dat we vandaag al twee keer hebben opgeruimd (challenges hardcoded náást de DB; ISO-week náást bingo-week).

**Voor Code, vóór je copy plaatst:**

| # | Wat |
|---|---|
| 1 | **Wat zeggen de spelregels in de app precies?** Citeer de letterlijke tekst. Zegt die hetzelfde als "maak bingo → trekking"? Wijkt 'ie af, dan hebben we een tegenstrijdigheid en beslist Yuri welke wint. |
| 2 | **Hoe kiest het rad z'n deelnemers?** Uit `bingo_wins` van die week, of uit iets anders (alle spelers, alle actieve spelers)? Rapporteer wat de code doet — niet wat logisch zou zijn. |
| 3 | **Landt het resultaat in `weekly_draws`?** Met welk `week_number` — en gaat dat na A8 mee naar 1–4? |
| 4 | Als 1, 2 en 3 elkaar tegenspreken: **melden, niets aanpassen.** De spelregels zijn klantcommunicatie, dus dat is Yuri's call. |

**Houd de formulering identiek** aan de spelregels. Niet mooier maken, niet korter. Twee versies van dezelfde regel is één versie te veel.

## 7. Scope

Klein. Eén component op de leaderboard, geen nieuwe tabellen, geen nieuwe kolommen. De vijf staten zijn het echte werk — niet de opmaak.

## 8. Afhankelijkheid — leest, rekent niet

**Dit blok hangt op A8 uit `FIX-EventBingo-Preflight-v2-Addendum1`.** Daar landt `getBingoWeek()` als de enige bron van de weekindeling: nummer + startdatum + einddatum + actief ja/nee, en expliciet "geen actieve week" buiten 20-07 t/m 16-08.

**Dit blok leest die functie en rekent zelf niets uit.** Geen eigen `BINGO_START`, geen eigen datumranges, geen eigen weeknummering. Twee plekken die weten wanneer week 3 begint, lopen een keer uit elkaar — en dat is exact de fout die A8 aan het opruimen is (ISO-week náást bingo-week).

**Volgorde:** A8 klaar → §6 geverifieerd → Yuri kiest een titel → dán pas dit blok.

---

**Voor Code:** dit gaat mee vandaag, maar in deze volgorde:

1. **A8 eerst af** — `getBingoWeek()` is de bron van dit blok (§8).
2. **Dan §6 verifiëren** — spelregels + rad. Spreken die de copy tegen: **melden en stoppen**, geen copy plaatsen. Een weekblok dat iets anders belooft dan de spelregels is erger dan geen weekblok.
3. **Dan pas bouwen**, met de titel die Yuri kiest.
4. **Blok B springt hier altijd vóór** zodra de challenge-sheet binnen is.

Maak de codewijzigingen. Verifieer je werk zelf in Supabase: controleer schema, RLS/GRANT én de daadwerkelijke rijen — kijk in de data, niet naar het scherm. Werkt iets niet: fix het en rapporteer wat er mis was en wat je hebt gedaan. Start geen dev-server en run geen test-suite; de app test Yuri handmatig.
