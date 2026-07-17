// Client-side foto-overlay voor het Familie Fun Event.
//
// Doel: elke gedeelde event-foto draagt de bingo-footer naar buiten (funnel event → bingo).
// Harde regel: dit mag de upload NOOIT blokkeren. Faalt de canvas om welke reden dan ook,
// dan retourneren we null en uploadt de aanroeper gewoon het origineel. Stil, geen error
// naar de gebruiker — een foto zonder randje is een foto; een niet-geüploade foto is weg.

export type OverlayOpts = {
  teamName: string
  captainName?: string
  challengeName?: string
}

const W = 1080
const H = 1920

// Body Rock huisstijl (matcht de Bingo-app)
const OFFWHITE = '#F2F0ED'
const RED = '#BC0000'
const DARK = '#1A1A1A'
const MUTED = '#6B6B6B'

// Footer-copy is canoniek en vastgesteld — niet aanpassen.
// body-rock.nl is niet-onderhandelbaar: deze foto's zijn permanent en dit is het
// enige adres waarvan we zeker weten dat het over jaren nog bestaat. Nooit een
// .vercel.app-URL of een subdomein dat kan verhuizen.
const FOOTER_LINE_1 = 'Vanaf 20-07: Body Rock Bingo 💪🏼'
const FOOTER_LINE_2 = 'Leuke prijzen te winnen 🤩 · body-rock.nl'

// Wit, transparant logo. Ontbreekt het bestand of laadt het niet binnen ~2s,
// dan tekenen we een tekst-wordmark als terugval — geen blocker.
const LOGO_SRC = '/logowit.png'
const LOGO_TIMEOUT_MS = 2000

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (val: HTMLImageElement | null) => {
      if (done) return
      done = true
      resolve(val)
    }
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

// Tekent tekst en breekt af op een maximale breedte (max 2 regels, laatste met ellipsis).
function drawFittedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): number {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    } else {
      current = test
    }
  }
  // Rest in de laatste regel proppen; te lang → ellipsis.
  const remainingWords = words.slice(lines.join(' ').split(/\s+/).filter(Boolean).length)
  let last = remainingWords.length ? remainingWords.join(' ') : current
  if (!lines.length) last = current
  if (ctx.measureText(last).width > maxWidth) {
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1)
    }
    last += '…'
  }
  lines.push(last)

  lines.slice(0, maxLines).forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })
  return lines.slice(0, maxLines).length * lineHeight
}

// Tekent een bron-afbeelding "cover-fit" in een doelvak (schaalt en snijdt bij).
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const scale = Math.max(dw / img.width, dh / img.height)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

export async function generateOverlay(file: File, opts: OverlayOpts): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined') return null

    const photo = await loadImageFromFile(file)
    if (!photo) return null

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Achtergrond
    ctx.fillStyle = OFFWHITE
    ctx.fillRect(0, 0, W, H)

    // ── Layout-zones ────────────────────────────────────────────────
    const hasChallenge = !!(opts.challengeName && opts.challengeName.trim())
    const barH = 150          // rode balk + logo
    const teamH = 190         // teamnaam + captain
    const footerH = 280       // bingo-footer
    const nameH = hasChallenge ? 130 : 0   // challenge-naam (weg bij fun-foto's)
    const photoTop = barH + teamH
    const photoBottom = H - footerH - nameH
    const photoH = photoBottom - photoTop

    // ── Rode balk + logo (of wordmark-terugval) ─────────────────────
    ctx.fillStyle = RED
    ctx.fillRect(0, 0, W, barH)
    const logo = await loadLogo()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (logo) {
      const lh = 70
      const lw = logo.width * (lh / logo.height)
      ctx.drawImage(logo, (W - lw) / 2, (barH - lh) / 2, lw, lh)
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = "700 60px 'Barlow Condensed', Arial, sans-serif"
      ctx.fillText('BODY ROCK', W / 2, barH / 2 + 4)
    }

    // ── Teamnaam + captain (tekst NAAST de foto-zone, niet eroverheen) ─
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = DARK
    ctx.font = "700 62px 'Barlow Condensed', Arial, sans-serif"
    const teamName = (opts.teamName || 'Team').toUpperCase()
    drawFittedLines(ctx, teamName, 60, barH + 28, W - 120, 66, 1)
    if (opts.captainName && opts.captainName.trim()) {
      ctx.fillStyle = MUTED
      ctx.font = "400 34px 'Barlow', Arial, sans-serif"
      ctx.fillText(`captain: ${opts.captainName.trim()}`, 60, barH + 108)
    }

    // ── De foto (cover-fit, geen tekst overheen) ────────────────────
    drawCover(ctx, photo, 0, photoTop, W, photoH)

    // ── Challenge-naam ──────────────────────────────────────────────
    if (hasChallenge) {
      ctx.fillStyle = OFFWHITE
      ctx.fillRect(0, photoBottom, W, nameH)
      ctx.fillStyle = RED
      ctx.fillRect(0, photoBottom, 10, nameH)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = DARK
      ctx.font = "700 40px 'Barlow Condensed', Arial, sans-serif"
      drawFittedLines(ctx, (opts.challengeName || '').toUpperCase(), 44, photoBottom + nameH / 2 - 20, W - 88, 44, 2)
    }

    // ── Bingo-footer ────────────────────────────────────────────────
    const footerTop = H - footerH
    ctx.fillStyle = DARK
    ctx.fillRect(0, footerTop, W, footerH)
    ctx.fillStyle = RED
    ctx.fillRect(0, footerTop, W, 8)

    // Schaal de fontgrootte terug tot de tekst binnen de breedte past. Beschermt
    // tegen font-fallback (Barlow Condensed → Arial) die breder uitpakt en anders
    // rechts van beeld zou aflopen.
    const fitFont = (text: string, weight: number, base: number, family: string, maxWidth: number) => {
      let size = base
      ctx.font = `${weight} ${size}px ${family}`
      while (size > 14 && ctx.measureText(text).width > maxWidth) {
        size -= 2
        ctx.font = `${weight} ${size}px ${family}`
      }
    }
    const maxTextW = W - 80 // 40px marge links en rechts

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    fitFont(FOOTER_LINE_1, 700, 52, "'Barlow Condensed', Arial, sans-serif", maxTextW)
    ctx.fillText(FOOTER_LINE_1, W / 2, footerTop + footerH / 2 - 45)
    ctx.fillStyle = OFFWHITE
    fitFont(FOOTER_LINE_2, 400, 36, "'Barlow', Arial, sans-serif", maxTextW)
    ctx.fillText(FOOTER_LINE_2, W / 2, footerTop + footerH / 2 + 40)

    // ── Exporteren (dit is meteen de compressie) ────────────────────
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    })
  } catch (err) {
    console.warn('[photoOverlay] overlay mislukt, origineel wordt geüpload:', err)
    return null
  }
}
