# Body Rock Event App 🤘

Event app voor Body Rock. Herbruikbaar per zomer/winter editie.

## Setup in 5 stappen

### 1. Supabase project aanmaken
- Ga naar [supabase.com](https://supabase.com) → New project
- Naam: `bodyrock-event`
- Kopieer je **Project URL** en **anon key** (Settings > API)

### 2. Database schema aanmaken
- Ga naar Supabase > SQL Editor
- Plak en run de volgende code: `supabase-schema.sql`

### 3. Storage bucket aanmaken
- Supabase > Storage > New bucket
- Naam: `challenge-photos`
- Aanvinken: **Public bucket**

### 4. Environment variables instellen
Maak een `.env.local` aan (zie `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
SUPABASE_SERVICE_ROLE_KEY=jouw-service-role-key
ADMIN_PASSWORD=bodyrock2026
NEXT_PUBLIC_APP_URL=https://jouw-app.vercel.app
```

### 5. Deploy naar Vercel
```bash
npx vercel
```
Of push naar GitHub en koppel aan Vercel. Zet de env vars in Vercel > Settings > Environment Variables.

---

## Gebruik op de dag zelf

### Als trainer (admin)
1. Ga naar `/admin` → log in
2. Maak het event aan (of activeer een bestaand event)
3. Maak X teams aan → QR codes worden gegenereerd
4. Print de QR-kaartjes of toon ze op je telefoon
5. Volg scores live via de Scores tab

### Als team
1. Scan de QR-code → vul teamnaam captain in
2. Open challenges één voor één
3. Voer score in + maak foto
4. Bekijk het scorebord via "Board"

---

## Elk jaar hergebruiken
- Admin maakt een nieuw event aan (bijv. "Winter 2026")
- Challenges worden automatisch geladen vanuit de template in `CHALLENGES_2026`
- Wil je andere challenges? Pas de `CHALLENGES_2026` array aan in `app/admin/dashboard/page.tsx`
- Of: voeg een "challenges bewerken" functie toe via de admin UI (volgende versie)

## App structuur

```
/               Home (join / board / admin)
/join           Team join via code invoeren
/join/[code]    Direct redirect via QR-link
/team/[id]      Team challenge interface
/board          Realtime scorebord + foto feed
/admin          Trainer login
/admin/dashboard  Event beheer, teams, QR, scores
/api/admin/auth   Login endpoint
/api/admin/events Event CRUD
/api/teams        Team aanmaken/ophalen
/api/scores       Score submit/ophalen
/api/upload       Foto upload naar Supabase Storage
```

## Tech stack
- **Next.js 15** (App Router)
- **Supabase** (database + storage + realtime)
- **Tailwind CSS**
- **Vercel** (hosting)
- **react-qr-code** (QR generatie)
