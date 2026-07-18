// Event-adapter op de gedeelde OVERLAY-v1-kaart (lib/overlayCard.ts).
//
// Deze module bevat ALLES wat event-specifiek is (footer-copy, "Aanvoerder"-meta,
// chip-format) en mapt dat op het generieke slot-model. De kaart zelf (layout, tokens,
// auto-fit, fallbacks, faalpad) leeft in het gedeelde bestand dat identiek in de
// bingo-app staat — hier komt geen layout-logica bij.
//
// Faalpad blijft heilig: renderOverlayCard geeft bij elke fout null terug en de
// aanroeper uploadt dan het origineel. Zie overlayCard.ts.

import { renderOverlayCard } from './overlayCard'

export type OverlayOpts = {
  teamName: string
  captainName?: string
  challengeName?: string
  // Chip rechtsboven, bijv. "2 / 10" (challenge x van totaal). Leeg → geen chip.
  chipText?: string
  // Verticale foto-pan 0-100 (object-position 50% Y%), default 50. Zie SPEC §6b (slider).
  photoY?: number
}

// Footer-copy is canoniek en vastgesteld — niet aanpassen.
// body-rock.nl is niet-onderhandelbaar: deze foto's zijn permanent en dit is het
// enige adres waarvan we zeker weten dat het over jaren nog bestaat. Nooit een
// .vercel.app-URL of een subdomein dat kan verhuizen.
const FOOTER_MAIN = 'Vanaf 20-07: Body Rock Bingo 💪🏼'
const FOOTER_SUB = 'Leuke prijzen te winnen 🤩 · body-rock.nl'

export async function generateOverlay(file: File, opts: OverlayOpts): Promise<Blob | null> {
  const captain = opts.captainName?.trim()
  return renderOverlayCard(file, {
    chip: opts.chipText,
    label: opts.challengeName,                       // fun-foto's hebben er geen → slot valt weg
    held: opts.teamName || 'Team',
    meta: captain ? `Aanvoerder ${captain}` : undefined, // leeg/placeholder → slot weg (§9)
    footerMain: FOOTER_MAIN,
    footerSub: FOOTER_SUB,
    photoY: opts.photoY,
  })
}
