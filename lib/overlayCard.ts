/* OVERLAY-v1 — gedeeld tussen event- en bingo-app. Houd identiek. */
//
// Uniforme deelkaart (SPEC-Overlay-v1). Client-side canvas-compose → Blob.
// Variant A: full-bleed foto (de held) + zwevende crème kaart onderin +
// 100%-dekkende rode voetregel. Eén component, per app andere slot-waarden (§3/§10).
//
// HEILIG FAALPAD: deze render mag een upload NOOIT blokkeren. Faalt de canvas om
// welke reden dan ook, dan retourneren we null en uploadt de aanroeper het origineel.
// Stil (console.warn), geen error naar de gebruiker. Een foto zonder kaart is een foto;
// een foto die niet uploadt omdat de canvas struikelde, is weg.
//
// NB output = JPEG 0.85, geen PNG. Bewuste afwijking van SPEC §6c: een full-bleed
// fotokaart als PNG loopt al snel richting meerdere MB en knalt door de 8MB-uploadcap
// (fun-foto's). JPEG 0.85 is voor een fotokaart de juiste keuze. Zie brief §Vragen.

export type OverlaySlots = {
  chip?: string        // rechtsboven — event "2 / 10", bingo "VAKJE 12". Leeg → weg, logo blijft links.
  label?: string       // event challengenaam, bingo opdrachtnaam. Leeg → keyline + label weg.
  held: string         // event teamnaam, bingo naam speler. Verplicht.
  meta?: string        // event "Aanvoerder X", bingo "3 bingo's gehaald". Leeg → slot + spacing weg.
  footerMain: string   // voetregel hoofd (wit op rood)
  footerSub: string    // voetregel sub (wit-80% op rood)
  photoY?: number      // 0-100 verticale pan (object-position: 50% Y%). Default 50.
}

const W = 1080
const H = 1920

// ── Design tokens (§4, px op 1080-basis) ──────────────────────────────
const RED = '#BC0000'
const CREME = '245, 245, 240'   // rgb, opacity apart (crème kaart 0.78 / fallback 0.90)
const INK = '#1A1A1A'
const INK_SOFT = '#4A4A47'
const LETTERBOX = '#333333'

// De app linkt Barlow + Barlow Condensed als webfont (Google Fonts, app/layout.tsx:
// Barlow 400;500;600, Barlow Condensed 600;700). ensureFonts() wacht (bounded) tot ze
// geladen zijn vóór het tekenen, zodat de canvas de ECHTE condensed Barlow gebruikt i.p.v.
// de brede Arial-fallback — die maakte de held "stretched". Weights = exact wat gelinkt is:
// Barlow Condensed 700 voor de held, Barlow 500/600 voor de rest. 'Arial Narrow'/Arial
// blijven als vangnet als de webfont (offline/CSP) niet laadt; auto-fit (§8) vangt de
// bredere fallback-metriek op zodat niks buiten beeld loopt.
const COND = (s: number) => `700 ${s}px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif`
const SANS = (s: number) => `500 ${s}px 'Barlow', system-ui, -apple-system, Arial, sans-serif`
// Semibold voor label + voetregel-hoofd (mockup Barlow 600).
const SANS_SEMI = (s: number) => `600 ${s}px 'Barlow', system-ui, -apple-system, Arial, sans-serif`

const LOGO_SRC = '/logowit.png' // C1: wit transparant woordmerk. NIET logowit1.png (kapot).
const LOGO_TIMEOUT_MS = 2000

// ── Layout-tokens (§4, gecorrigeerd door FIX-Overlay-Tokens-v1; px op 1080-basis) ──
// Mockup-waarde × 3,6. Waar dit afwijkt van SPEC §4 wint deze tabel: §4 was bij het
// opschalen van de 300px-mockup te krap afgerond (letters te klein, blok te compact,
// logo te laag, voetregel knijpt). Alle afhankelijke posities worden hieruit afgeleid.
const CARD_MARGIN_X = 43          // kaart zijmarge (was 40)
const CARD_MARGIN_BOTTOM = 43     // kaart ondermarge (was 40)
const CARD_W = W - CARD_MARGIN_X * 2   // 994 (was 1000)
const CARD_RADIUS = 36            // .card 10px × 3,6 (memo had per abuis .frame 16px=58)
const CARD_PAD_TOP = 47           // body-padding boven, 13px × 3,6
const CARD_PAD_SIDE = 50          // body-padding zij, 14px × 3,6
const CARD_PAD_BOTTOM = 43        // ruimte body → voetregel, 12px × 3,6
const FOOTER_PAD_Y = 25           // voetregel verticaal, 7px × 3,6
const FOOTER_PAD_X = 43           // voetregel horizontaal, 12px × 3,6
const KEYLINE_W = 101             // rode keyline breedte, 28px × 3,6
const KEYLINE_H = 11              // rode keyline hoogte, 3px × 3,6
const KEYLINE_MARGIN_BOTTOM = 32  // keyline → label, 9px × 3,6
const LABEL_MARGIN_BOTTOM = 14    // label → held, 4px × 3,6
const META_MARGIN_TOP = 18        // held → meta, 5px × 3,6
const FOOTER_SUB_GAP = 7          // voetregel hoofd → sub, 2px × 3,6
const TOPROW_TOP = 281            // logo/chip-rij bovenkant, 78px × 3,6
const LOGO_H = 72                 // logo-hoogte, 20px × 3,6
const TOPROW_MARGIN_X = 43        // logo/chip zijmarge, 12px × 3,6 (= kaart-zijmarge)

// Font-groottes (mockup × 3,6). Held/label Barlow Condensed 700 resp. Barlow 600.
const HELD_MAX = 151              // held auto-fit start, 42px × 3,6
const LABEL_FONT = 36             // label, 10px × 3,6 (weight 600)
const META_FONT = 40             // meta, 11px × 3,6 (weight 500)
const FOOTER_MAIN_MAX = 40        // voetregel hoofd, 11px × 3,6 (weight 600)
const FOOTER_SUB_FONT = 36        // voetregel sub, 10px × 3,6 (weight 500)
const CHIP_FONT = 40             // chip, 11px × 3,6 (weight 500)
const CHIP_PAD_X = 36             // chip padding horizontaal, 10px × 3,6
const CHIP_PAD_Y = 14             // chip padding verticaal, 4px × 3,6
const CHIP_RADIUS = 18            // chip radius, 5px × 3,6
const LABEL_TRACKING = '0.08em'   // label letter-spacing (mockup .08em), feature-detected

// ── §9 anti-silent-fallback: leeg of een bekende placeholder → slot valt weg.
// Zo lekt "Aanvoerder Test" (testdata) nooit meer de kaart op.
const PLACEHOLDERS = new Set(['test', 'placeholder', 'naam', 'n/a', 'n.v.t.', '-', '—'])
function cleanSlot(v?: string): string | undefined {
  if (!v) return undefined
  const t = v.trim()
  if (!t) return undefined
  if (PLACEHOLDERS.has(t.toLowerCase())) return undefined
  return t
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// letter-spacing (label + held). ctx.letterSpacing wordt niet overal ondersteund
// (oudere iOS/Safari); feature-detected + try/catch, nooit een blocker. Zet na gebruik
// terug op '0px' zodat het niet lekt naar andere slots. Waar het ontbreekt valt het
// stil weg — de tekst rendert dan zonder tracking (geen hack, geen crash).
function setTracking(ctx: CanvasRenderingContext2D, value: string | null) {
  if (!('letterSpacing' in ctx)) return
  try {
    ;(ctx as unknown as { letterSpacing: string }).letterSpacing = value ?? '0px'
  } catch { /* niet ondersteund → stil laten vallen */ }
}

// Wacht (bounded) tot de gelinkte Barlow-faces geladen zijn, zodat de canvas de echte
// (condensed) Barlow gebruikt i.p.v. de Arial-fallback. Best-effort: bij timeout of geen
// FontFace-API tekenen we gewoon door — auto-fit + fallback-stack vangen het op (faalpad).
async function ensureFonts(): Promise<void> {
  try {
    const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts
    if (!fonts || typeof fonts.load !== 'function') return
    const faces = [`700 100px 'Barlow Condensed'`, `600 100px 'Barlow'`, `500 100px 'Barlow'`]
    await Promise.race([
      Promise.all(faces.map((f) => fonts.load(f))),
      new Promise<void>((resolve) => setTimeout(resolve, 800)),
    ])
  } catch { /* geen webfont → auto-fit + fallback vangen het op */ }
}

// ── Laders ────────────────────────────────────────────────────────────
function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (val: HTMLImageElement | null) => { if (done) return; done = true; resolve(val) }
    const timer = setTimeout(() => finish(null), LOGO_TIMEOUT_MS)
    img.onload = () => { clearTimeout(timer); finish(img) }
    img.onerror = () => { clearTimeout(timer); finish(null) }
    img.src = LOGO_SRC
  })
}

function loadImageFromFile(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ── Teken-helpers ───────────────────────────────────────────────────────
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: { tl: number; tr: number; br: number; bl: number },
) {
  ctx.beginPath()
  ctx.moveTo(x + r.tl, y)
  ctx.lineTo(x + w - r.tr, y)
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr)
  ctx.lineTo(x + w, y + h - r.br)
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br)
  ctx.lineTo(x + r.bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl)
  ctx.lineTo(x, y + r.tl)
  ctx.arcTo(x, y, x + r.tl, y, r.tl)
  ctx.closePath()
}

// Foto "cover-fit" met object-position (fx, fy = 0..1).
function drawCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  fx = 0.5, fy = 0.5,
) {
  const scale = Math.max(dw / img.width, dh / img.height)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.width - sw) * fx
  const sy = (img.height - sh) * fy
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

// Greedy word-wrap; levert altijd ≤ maxLines regels op die binnen maxWidth passen
// (laatste regel geëllipseerd bij overloop). Niks loopt ooit buiten het canvas.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
      if (lines.length === maxLines) { cur = ''; break }
    } else {
      cur = test
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]
    if (ctx.measureText(l).width > maxWidth) {
      while (l.length > 1 && ctx.measureText(l + '…').width > maxWidth) l = l.slice(0, -1)
      lines[i] = l + '…'
    }
  }
  return lines
}

type Fit = { size: number; lines: string[]; lh: number }

// Held (§8): start 151, stap 8 terug tot 76 op één regel; past het dan nog niet →
// max 2 regels (line-height 0.90), zo nodig font verder terug tot alles binnen valt.
function fitHeld(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  for (let s = HELD_MAX; s >= 76; s -= 8) {
    ctx.font = COND(s)
    if (ctx.measureText(text).width <= maxWidth) return { size: s, lines: [text], lh: s * 0.92 }
  }
  for (let s = 76; s >= 48; s -= 4) {
    ctx.font = COND(s)
    const lines = wrapText(ctx, text, maxWidth, 2)
    if (lines.every((l) => ctx.measureText(l).width <= maxWidth) && lines.join(' ').replace(/…/g, '').length >= text.replace(/\s/g, '').length * 0.5) {
      return { size: s, lines, lh: s * 0.90 }
    }
  }
  ctx.font = COND(48)
  return { size: 48, lines: wrapText(ctx, text, maxWidth, 2), lh: 48 * 0.90 }
}

// Label (§8): max 1 regel. Font terug tot 24, dan ellipsis. Uppercase + tracking.
// Meet mét tracking aan zodat de auto-fit klopt met wat drawCardBody straks tekent.
function fitLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  setTracking(ctx, LABEL_TRACKING)
  let s = LABEL_FONT
  ctx.font = SANS_SEMI(s)
  while (s > 24 && ctx.measureText(text).width > maxWidth) { s -= 2; ctx.font = SANS_SEMI(s) }
  const lines = wrapText(ctx, text, maxWidth, 1)
  setTracking(ctx, null)
  return { size: s, lines, lh: s * 1.15 }
}

// ── Emoji-veilige voetregelbreedte (FIX-Overlay-Footer-Overflow-v1) ──────
// De voetregels bevatten kleur-emoji (💪🏼 in het event-hoofd, 🤩 in de sub). Op iOS Safari
// meet ctx.measureText zo'n skin-tone-/ZWJ-emoji ONBETROUWBAAR: de advance komt te smal (soms
// 0) terug, terwijl fillText 'm wél op volle breedte tekent. Meet de auto-fit op die te smalle
// waarde, dan "past" een bijna-volle regel volgens de meting maar loopt 'ie in werkelijkheid
// rechts van de kaart af — precies de iOS-only overflow. (Android had Barlow al geladen op het
// meetmoment én meet emoji anders, dus dáár viel het niet op; een groene Android-render bewees
// dus niets.) Oplossing: reserveer per emoji ~1,5 em extra breedte. 1,5 em ligt ruim boven de
// werkelijke emoji-advance (~1,2 em), dus de fit klopt zelfs als measureText de emoji als 0 meet.
const EMOJI_RE = /\p{Extended_Pictographic}/gu
const EMOJI_RESERVE_EM = 1.5
function emojiReserve(text: string, fontSize: number): number {
  const m = text.match(EMOJI_RE)
  return m ? m.length * fontSize * EMOJI_RESERVE_EM : 0
}
// Breedte waarop we zowel de fit ALS de plaatsing van een voetregel baseren: de gemeten
// breedte plus de emoji-reserve. Zo kan een mismeten emoji de regel nooit buiten de kaart duwen.
function footerLineWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
  return ctx.measureText(text).width + emojiReserve(text, fontSize)
}

// Voetregel hoofd (§8) — auto-fit: pak de grootste maat die op één regel binnen het ECHTE
// tekstvak (kaart − 2× footer-padding) past, gemeten mét emoji-reserve; in fijne stappen van 2
// (i.p.v. 40→36→32) zodat de grootste passende maat gekozen wordt. Past het bij min-maat nog
// niet → wrap naar 2 regels en krimp tot beide regels (mét reserve) binnen vallen. wrapText
// ellipseert wat dan nóg niet past, dus er loopt gegarandeerd niets buiten de kaart. Meet ná
// ensureFonts met de echte ctx.font (weight 600), line-height 1,2.
function fitFooterMain(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  for (let s = FOOTER_MAIN_MAX; s >= 30; s -= 2) {
    ctx.font = SANS_SEMI(s)
    if (footerLineWidth(ctx, text, s) <= maxWidth) return { size: s, lines: [text], lh: s * 1.2 }
  }
  for (let s = 34; s >= 26; s -= 2) {
    ctx.font = SANS_SEMI(s)
    const lines = wrapText(ctx, text, maxWidth - emojiReserve(text, s), 2)
    if (lines.every((l) => footerLineWidth(ctx, l, s) <= maxWidth)) return { size: s, lines, lh: s * 1.2 }
  }
  const s = 26
  ctx.font = SANS_SEMI(s)
  return { size: s, lines: wrapText(ctx, text, maxWidth - emojiReserve(text, s), 2), lh: s * 1.2 }
}

// Voetregel-sub (§8): geen wrap; krimp de font tot 'ie binnen de balkbreedte past (min 26),
// gemeten mét emoji-reserve (de sub bevat 🤩). footerH rekent met FOOTER_SUB_FONT (max), dus
// de balk blijft hoog genoeg.
function fitSubFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  let s = FOOTER_SUB_FONT
  ctx.font = SANS(s)
  while (s > 26 && footerLineWidth(ctx, text, s) > maxWidth) { s -= 2; ctx.font = SANS(s) }
  return s
}

// ── Publieke render ─────────────────────────────────────────────────────
// file = null → §9-fallback "geen foto": vol rood vlak, geen kaart.
export async function renderOverlayCard(file: File | null, slots: OverlaySlots): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined') return null

    await ensureFonts() // held is de blikvanger: canvas moet de echte condensed Barlow hebben

    const photo = file ? await loadImageFromFile(file) : null
    // Wél een file meegegeven maar hij laadt niet → heilig faalpad (origineel gaat omhoog).
    if (file && !photo) return null

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const held = (cleanSlot(slots.held) || '').toUpperCase()
    const label = cleanSlot(slots.label)?.toUpperCase()
    const meta = cleanSlot(slots.meta)
    const chip = cleanSlot(slots.chip)
    const footerMain = (slots.footerMain || '').trim()
    const footerSub = (slots.footerSub || '').trim()
    const fy = clamp(slots.photoY ?? 50, 0, 100) / 100

    const logo = await loadLogo()

    // ── Laag 1: achtergrond (letterbox voor als de foto het kader niet vult) ──
    ctx.fillStyle = photo ? LETTERBOX : RED
    ctx.fillRect(0, 0, W, H)

    // ── Laag 2: foto full-bleed, object-fit cover, object-position 50% <Y>% ──
    if (photo) drawCover(ctx, photo, 0, 0, W, H, 0.5, fy)

    // ── Laag 3: logo linksboven + chip rechtsboven (toprow top 281) ──
    drawTopRow(ctx, logo, chip)

    // ── Laag 4: de crème kaart (of, zonder foto, tekst direct op rood) ──
    const cardInner = CARD_W - CARD_PAD_SIDE * 2 // tekstbreedte binnen de kaart
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const heldFit = fitHeld(ctx, held, cardInner)
    const labelFit = label ? fitLabel(ctx, label, cardInner) : null
    const footerMaxW = CARD_W - FOOTER_PAD_X * 2 // kaartbreedte − voetregel-zijmarge
    const footerFit = fitFooterMain(ctx, footerMain, footerMaxW)

    // Body-hoogte (relatief, onafhankelijk van kaartpositie)
    const heldBlock = (heldFit.lines.length - 1) * heldFit.lh + heldFit.size
    const labelBlock = labelFit ? KEYLINE_H + KEYLINE_MARGIN_BOTTOM + labelFit.size + LABEL_MARGIN_BOTTOM : 0 // keyline + gaps + label
    const metaBlock = meta ? META_MARGIN_TOP + META_FONT : 0
    const bodyH = CARD_PAD_TOP + labelBlock + heldBlock + metaBlock + CARD_PAD_BOTTOM

    // Voetregel-hoogte
    const footerMainBlock = (footerFit.lines.length - 1) * footerFit.lh + footerFit.size
    const footerH = FOOTER_PAD_Y + footerMainBlock + (footerSub ? FOOTER_SUB_GAP + FOOTER_SUB_FONT : 0) + FOOTER_PAD_Y

    if (photo) {
      drawCard(ctx, photo, fy, bodyH, footerH, {
        heldFit, labelFit, meta, footerFit, footerSub,
      })
    } else {
      // §9: geen foto → label + held + voetregel direct op het rode vlak, near-flush onderin.
      drawNoPhotoBody(ctx, bodyH, footerH, { heldFit, labelFit, meta, footerFit, footerSub })
    }

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    })
  } catch (err) {
    console.warn('[OVERLAY-v1] render mislukt, origineel wordt geüpload:', err)
    return null
  }
}

// Logo (wit + drop-shadow) links, chip (wit op rood) rechts. Chip leeg → alleen logo.
function drawTopRow(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, chip?: string) {
  const top = TOPROW_TOP
  const logoH = LOGO_H
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  if (logo) {
    const logoW = logo.width * (logoH / logo.height)
    ctx.drawImage(logo, TOPROW_MARGIN_X, top, logoW, logoH)
  } else {
    // Terugval-wordmark als het bestand ontbreekt/traag is — nooit een blocker.
    ctx.fillStyle = '#FFFFFF'
    ctx.font = COND(64)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('BODY ROCK', TOPROW_MARGIN_X, top + 4)
  }
  ctx.restore()

  if (chip) {
    ctx.font = SANS(CHIP_FONT)
    const tw = ctx.measureText(chip).width
    const padX = CHIP_PAD_X
    const chipW = tw + padX * 2
    const chipH = CHIP_FONT + CHIP_PAD_Y * 2
    const x = W - TOPROW_MARGIN_X - chipW
    const y = top + logoH / 2 - chipH / 2
    ctx.fillStyle = RED
    roundRectPath(ctx, x, y, chipW, chipH, { tl: CHIP_RADIUS, tr: CHIP_RADIUS, br: CHIP_RADIUS, bl: CHIP_RADIUS })
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(chip, x + padX, y + chipH / 2 + 1)
  }
}

type CardContent = {
  heldFit: Fit
  labelFit: Fit | null
  meta?: string
  footerFit: Fit
  footerSub: string
}

// De zwevende crème kaart met blur-behind + rode voetregel.
function drawCard(
  ctx: CanvasRenderingContext2D, photo: HTMLImageElement, fy: number,
  bodyH: number, footerH: number, c: CardContent,
) {
  const cardX = CARD_MARGIN_X
  const cardW = CARD_W
  const cardH = bodyH + footerH
  const cardY = H - CARD_MARGIN_BOTTOM - cardH
  const radius = { tl: CARD_RADIUS, tr: CARD_RADIUS, br: CARD_RADIUS, bl: CARD_RADIUS }

  const supportsBlur = typeof ctx.filter === 'string'

  ctx.save()
  roundRectPath(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.clip()

  // Blur-behind (§7): een geblurde kopie van de foto onder de kaart geeft het
  // frosted-glass-effect. Geen blur-support → kaartdekking naar 0.90 (nooit kapot).
  if (supportsBlur) {
    try {
      ctx.filter = 'blur(8px)'
      drawCover(ctx, photo, 0, 0, W, H, 0.5, fy)
    } finally {
      ctx.filter = 'none'
    }
  }
  ctx.fillStyle = `rgba(${CREME}, ${supportsBlur ? 0.78 : 0.90})`
  ctx.fillRect(cardX, cardY, cardW, cardH)

  // Rode voetregel binnen de kaart (100% dekkend, onderhoeken volgen de kaart-clip).
  const footerY = cardY + bodyH
  ctx.fillStyle = RED
  ctx.fillRect(cardX, footerY, cardW, footerH)

  drawCardBody(ctx, cardX + CARD_PAD_SIDE, cardY + CARD_PAD_TOP, cardW - CARD_PAD_SIDE * 2, c)
  drawFooterText(ctx, cardX, footerY, cardW, footerH, c)

  ctx.restore()
}

// keyline → label → held → meta
function drawCardBody(
  ctx: CanvasRenderingContext2D, x: number, y: number, innerW: number, c: CardContent,
) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let cy = y

  if (c.labelFit) {
    // Rode keyline 101×11
    ctx.fillStyle = RED
    ctx.fillRect(x, cy, KEYLINE_W, KEYLINE_H)
    cy += KEYLINE_H + KEYLINE_MARGIN_BOTTOM
    ctx.fillStyle = RED
    ctx.font = SANS_SEMI(c.labelFit.size)
    setTracking(ctx, LABEL_TRACKING)
    ctx.fillText(c.labelFit.lines[0] ?? '', x, cy)
    setTracking(ctx, null)
    cy += c.labelFit.size + LABEL_MARGIN_BOTTOM
  }

  ctx.fillStyle = INK
  c.heldFit.lines.forEach((line, i) => {
    ctx.font = COND(c.heldFit.size)
    ctx.fillText(line, x, cy + i * c.heldFit.lh)
  })
  cy += (c.heldFit.lines.length - 1) * c.heldFit.lh + c.heldFit.size

  if (c.meta) {
    cy += META_MARGIN_TOP
    ctx.fillStyle = INK_SOFT
    ctx.font = SANS(META_FONT)
    ctx.fillText(c.meta, x, cy)
  }
  void innerW
}

function drawFooterText(
  ctx: CanvasRenderingContext2D, cardX: number, footerY: number, cardW: number, footerH: number, c: CardContent,
) {
  // Links uitlijnen en zelf om het midden plaatsen (x = cx − breedte/2, mét emoji-reserve).
  // Zo bepaalt niet de browser-interne breedte (die de emoji mismeet) de centrering, maar onze
  // eigen — gereserveerde — breedte. Omdat die reserve ≥ de echte emoji-advance is, blijven
  // linker- én rechterrand van elke regel gegarandeerd binnen het tekstvak (cx ± tekstvak/2).
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const cx = cardX + cardW / 2
  let fyy = footerY + FOOTER_PAD_Y

  ctx.fillStyle = '#FFFFFF'
  c.footerFit.lines.forEach((line, i) => {
    ctx.font = SANS_SEMI(c.footerFit.size)
    const w = footerLineWidth(ctx, line, c.footerFit.size)
    ctx.fillText(line, cx - w / 2, fyy + i * c.footerFit.lh)
  })
  fyy += (c.footerFit.lines.length - 1) * c.footerFit.lh + c.footerFit.size

  if (c.footerSub) {
    fyy += FOOTER_SUB_GAP
    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    const subSize = fitSubFont(ctx, c.footerSub, cardW - FOOTER_PAD_X * 2)
    ctx.font = SANS(subSize)
    ctx.fillText(c.footerSub, cx - footerLineWidth(ctx, c.footerSub, subSize) / 2, fyy)
  }
  void footerH
}

// §9 "geen foto": alles op het rode vlak. Tekst wit/crème, near-flush onderin.
function drawNoPhotoBody(
  ctx: CanvasRenderingContext2D, bodyH: number, footerH: number, c: CardContent,
) {
  const blockH = bodyH + footerH
  const top = H - CARD_MARGIN_BOTTOM - blockH
  const x = CARD_MARGIN_X
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let cy = top + CARD_PAD_TOP

  if (c.labelFit) {
    ctx.fillStyle = `rgba(${CREME}, 1)`
    ctx.fillRect(x, cy, KEYLINE_W, KEYLINE_H)
    cy += KEYLINE_H + KEYLINE_MARGIN_BOTTOM
    ctx.font = SANS_SEMI(c.labelFit.size)
    ctx.fillStyle = `rgba(${CREME}, 1)`
    setTracking(ctx, LABEL_TRACKING)
    ctx.fillText(c.labelFit.lines[0] ?? '', x, cy)
    setTracking(ctx, null)
    cy += c.labelFit.size + LABEL_MARGIN_BOTTOM
  }

  ctx.fillStyle = '#FFFFFF'
  c.heldFit.lines.forEach((line, i) => {
    ctx.font = COND(c.heldFit.size)
    ctx.fillText(line, x, cy + i * c.heldFit.lh)
  })
  cy += (c.heldFit.lines.length - 1) * c.heldFit.lh + c.heldFit.size

  if (c.meta) {
    cy += META_MARGIN_TOP
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = SANS(META_FONT)
    ctx.fillText(c.meta, x, cy)
  }

  // Voetregel (near-flush onderin), zelf om het midden geplaatst mét emoji-reserve — zie
  // drawFooterText voor waarom we niet op textAlign:'center' vertrouwen.
  ctx.textAlign = 'left'
  const cx = W / 2
  let fyy = H - CARD_MARGIN_BOTTOM - footerH + FOOTER_PAD_Y
  ctx.fillStyle = '#FFFFFF'
  c.footerFit.lines.forEach((line, i) => {
    ctx.font = SANS_SEMI(c.footerFit.size)
    const w = footerLineWidth(ctx, line, c.footerFit.size)
    ctx.fillText(line, cx - w / 2, fyy + i * c.footerFit.lh)
  })
  fyy += (c.footerFit.lines.length - 1) * c.footerFit.lh + c.footerFit.size
  if (c.footerSub) {
    fyy += FOOTER_SUB_GAP
    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    const subSize = fitSubFont(ctx, c.footerSub, CARD_W - FOOTER_PAD_X * 2)
    ctx.font = SANS(subSize)
    ctx.fillText(c.footerSub, cx - footerLineWidth(ctx, c.footerSub, subSize) / 2, fyy)
  }
}
