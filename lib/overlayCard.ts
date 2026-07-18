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

// De app laadt Barlow niet als webfont; canvas valt terug op de system-stack.
// De auto-fit (§8) vangt de bredere fallback-metriek op — niks loopt buiten beeld.
const COND = (s: number) => `700 ${s}px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif`
const SANS = (s: number) => `500 ${s}px 'Barlow', system-ui, -apple-system, Arial, sans-serif`

const LOGO_SRC = '/logowit.png' // C1: wit transparant woordmerk. NIET logowit1.png (kapot).
const LOGO_TIMEOUT_MS = 2000

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

// Held (§8): start 132, stap 8 terug tot 76 op één regel; past het dan nog niet →
// max 2 regels (line-height 0.90), zo nodig font verder terug tot alles binnen valt.
function fitHeld(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  for (let s = 132; s >= 76; s -= 8) {
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

// Label (§8): max 1 regel. Font terug tot 24, dan ellipsis. Uppercase.
function fitLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  let s = 30
  ctx.font = SANS(s)
  while (s > 24 && ctx.measureText(text).width > maxWidth) { s -= 2; ctx.font = SANS(s) }
  return { size: s, lines: wrapText(ctx, text, maxWidth, 1), lh: s * 1.15 }
}

// Voetregel hoofd (§8) — DIT is de bug die de footer nu afkapt: 32 → 28 → wrap 2 regels.
function fitFooterMain(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Fit {
  for (const s of [32, 30, 28]) {
    ctx.font = SANS(s)
    if (ctx.measureText(text).width <= maxWidth) return { size: s, lines: [text], lh: s * 1.15 }
  }
  const s = 28
  ctx.font = SANS(s)
  return { size: s, lines: wrapText(ctx, text, maxWidth, 2), lh: s * 1.15 }
}

// ── Publieke render ─────────────────────────────────────────────────────
// file = null → §9-fallback "geen foto": vol rood vlak, geen kaart.
export async function renderOverlayCard(file: File | null, slots: OverlaySlots): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined') return null

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

    // ── Laag 3: logo linksboven + chip rechtsboven (toprow top 290) ──
    drawTopRow(ctx, logo, chip)

    // ── Laag 4: de crème kaart (of, zonder foto, tekst direct op rood) ──
    const cardInner = W - 80 - 80 // kaartbreedte 1000 − padding 2×40
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const heldFit = fitHeld(ctx, held, cardInner)
    const labelFit = label ? fitLabel(ctx, label, cardInner) : null
    const footerMaxW = 1000 - 88 // kaartbreedte − 2×44 zijmarge in de voetregel
    const footerFit = fitFooterMain(ctx, footerMain, footerMaxW)

    // Body-hoogte (relatief, onafhankelijk van kaartpositie)
    const heldBlock = (heldFit.lines.length - 1) * heldFit.lh + heldFit.size
    const labelBlock = labelFit ? 8 + 22 + labelFit.size + 14 : 0 // keyline + gaps + label
    const metaBlock = meta ? 18 + 30 : 0
    const bodyH = 40 + labelBlock + heldBlock + metaBlock + 30

    // Voetregel-hoogte
    const footerMainBlock = (footerFit.lines.length - 1) * footerFit.lh + footerFit.size
    const footerH = 30 + footerMainBlock + (footerSub ? 10 + 30 : 0) + 30

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
  const top = 290
  const logoH = 72
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  if (logo) {
    const logoW = logo.width * (logoH / logo.height)
    ctx.drawImage(logo, 40, top, logoW, logoH)
  } else {
    // Terugval-wordmark als het bestand ontbreekt/traag is — nooit een blocker.
    ctx.fillStyle = '#FFFFFF'
    ctx.font = COND(64)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('BODY ROCK', 40, top + 4)
  }
  ctx.restore()

  if (chip) {
    ctx.font = SANS(30)
    const tw = ctx.measureText(chip).width
    const padX = 22
    const chipW = tw + padX * 2
    const chipH = 46
    const x = W - 40 - chipW
    const y = top + logoH / 2 - chipH / 2
    ctx.fillStyle = RED
    roundRectPath(ctx, x, y, chipW, chipH, { tl: 12, tr: 12, br: 12, bl: 12 })
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
  const cardX = 40
  const cardW = 1000
  const cardH = bodyH + footerH
  const cardY = H - 40 - cardH
  const radius = { tl: 28, tr: 28, br: 28, bl: 28 }

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

  drawCardBody(ctx, cardX + 40, cardY + 40, cardW - 80, c)
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
    // Rode keyline 96×8
    ctx.fillStyle = RED
    ctx.fillRect(x, cy, 96, 8)
    cy += 8 + 22
    ctx.fillStyle = RED
    ctx.font = SANS(c.labelFit.size)
    ctx.fillText(c.labelFit.lines[0] ?? '', x, cy)
    cy += c.labelFit.size + 14
  }

  ctx.fillStyle = INK
  c.heldFit.lines.forEach((line, i) => {
    ctx.font = COND(c.heldFit.size)
    ctx.fillText(line, x, cy + i * c.heldFit.lh)
  })
  cy += (c.heldFit.lines.length - 1) * c.heldFit.lh + c.heldFit.size

  if (c.meta) {
    cy += 18
    ctx.fillStyle = INK_SOFT
    ctx.font = SANS(30)
    ctx.fillText(c.meta, x, cy)
  }
  void innerW
}

function drawFooterText(
  ctx: CanvasRenderingContext2D, cardX: number, footerY: number, cardW: number, footerH: number, c: CardContent,
) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const cx = cardX + cardW / 2
  let fyy = footerY + 30

  ctx.fillStyle = '#FFFFFF'
  c.footerFit.lines.forEach((line, i) => {
    ctx.font = SANS(c.footerFit.size)
    ctx.fillText(line, cx, fyy + i * c.footerFit.lh)
  })
  fyy += (c.footerFit.lines.length - 1) * c.footerFit.lh + c.footerFit.size

  if (c.footerSub) {
    fyy += 10
    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    ctx.font = SANS(30)
    ctx.fillText(c.footerSub, cx, fyy)
  }
  void footerH
}

// §9 "geen foto": alles op het rode vlak. Tekst wit/crème, near-flush onderin.
function drawNoPhotoBody(
  ctx: CanvasRenderingContext2D, bodyH: number, footerH: number, c: CardContent,
) {
  const blockH = bodyH + footerH
  const top = H - 40 - blockH
  const x = 40
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let cy = top + 40

  if (c.labelFit) {
    ctx.fillStyle = `rgba(${CREME}, 1)`
    ctx.fillRect(x, cy, 96, 8)
    cy += 8 + 22
    ctx.font = SANS(c.labelFit.size)
    ctx.fillStyle = `rgba(${CREME}, 1)`
    ctx.fillText(c.labelFit.lines[0] ?? '', x, cy)
    cy += c.labelFit.size + 14
  }

  ctx.fillStyle = '#FFFFFF'
  c.heldFit.lines.forEach((line, i) => {
    ctx.font = COND(c.heldFit.size)
    ctx.fillText(line, x, cy + i * c.heldFit.lh)
  })
  cy += (c.heldFit.lines.length - 1) * c.heldFit.lh + c.heldFit.size

  if (c.meta) {
    cy += 18
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = SANS(30)
    ctx.fillText(c.meta, x, cy)
  }

  // Voetregel-sub (body-rock.nl) onderin, gecentreerd.
  ctx.textAlign = 'center'
  const cx = W / 2
  let fyy = H - 40 - footerH + 30
  ctx.fillStyle = '#FFFFFF'
  c.footerFit.lines.forEach((line, i) => {
    ctx.font = SANS(c.footerFit.size)
    ctx.fillText(line, cx, fyy + i * c.footerFit.lh)
  })
  fyy += (c.footerFit.lines.length - 1) * c.footerFit.lh + c.footerFit.size
  if (c.footerSub) {
    fyy += 10
    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    ctx.font = SANS(30)
    ctx.fillText(c.footerSub, cx, fyy)
  }
}
