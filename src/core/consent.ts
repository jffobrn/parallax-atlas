/**
 * The consent boundary (shared core): publicClone.
 *
 * This is the contribution the suite makes over straight counter-forensics:
 * consent enforced by architecture, not by discipline. ONE function produces
 * every export and every published view. It takes the full project and returns
 * a sanitized copy in which:
 *
 *   - images that are not `public` (restricted, embargoed) are dropped;
 *   - provider names are reduced to stable aliases;
 *   - provenance and held filenames are removed;
 *   - coordinates are withheld (or coarsened) wherever `safeToPublish` is false;
 *   - relations are kept only when BOTH endpoints survived, so the relational
 *     structure can never point at, or imply the existence of, a dropped image;
 *   - panel items referencing dropped images are removed, and a panel left empty
 *     is dropped.
 *
 * Sensitive data cannot leak by accident because nothing sensitive crosses this
 * boundary: the public types in `types.ts` simply do not have fields for it. In
 * Atlas this matters twice over, because an edge or a montage tile could
 * otherwise reveal that a withheld image exists and what it connects to.
 *
 * The function is pure and synchronous. It takes no clock and no I/O so it is
 * trivially testable; the caller stamps `generatedAt` and supplies thumbnails.
 */

import type {
  GeoPoint,
  Image,
  Project,
  PublicFile,
  PublicGeoPoint,
  PublicImage,
  PublicLink,
  PublicPanel,
  PublicProject,
  PublicRelation,
  PublicVantage,
  Redactions,
  Vantage,
} from './types'

export type UnsafeCoordinatePolicy = 'withhold' | 'coarsen'

export interface PublicCloneOptions {
  /** What to do with a point whose safeToPublish is false. Default: withhold. */
  unsafeCoordinatePolicy?: UnsafeCoordinatePolicy
  /** Decimal places when coarsening an unsafe point. Default 2 (~1.1 km). */
  coarsenDecimals?: number
  /** Precision cap applied to safe coordinates too. Default 5 (~1.1 m). */
  roundSafeDecimals?: number
  /** Pre-generated thumbnails (data URLs) keyed by image id, public only. */
  thumbnails?: Record<string, string>
  /** Timestamp to stamp on the output; the caller owns the clock. */
  generatedAt?: string
}

const DEFAULTS = {
  unsafeCoordinatePolicy: 'withhold' as UnsafeCoordinatePolicy,
  coarsenDecimals: 2,
  roundSafeDecimals: 5,
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  return Math.round(n * f) / f
}

/** Stable alias generator: A, B, ... Z, AA, AB, ... */
function aliasFor(index: number): string {
  let i = index
  let s = ''
  do {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  } while (i >= 0)
  return `Source ${s}`
}

export function publicClone(
  project: Project,
  options: PublicCloneOptions = {},
): PublicProject {
  const opts = { ...DEFAULTS, ...options }
  const redactions: Redactions = {
    imagesDropped: 0,
    droppedByConsent: { restricted: 0, embargoed: 0 },
    providersAliased: 0,
    coordinatesWithheld: 0,
    coordinatesCoarsened: 0,
    relationsDropped: 0,
    panelsDropped: 0,
    panelItemsDropped: 0,
  }

  // 1. Keep only public images.
  const publicImages: Image[] = []
  for (const img of project.images) {
    if (img.consent === 'public') {
      publicImages.push(img)
    } else {
      redactions.imagesDropped++
      if (img.consent === 'restricted') redactions.droppedByConsent.restricted++
      if (img.consent === 'embargoed') redactions.droppedByConsent.embargoed++
    }
  }
  const survivingIds = new Set(publicImages.map((s) => s.id))

  // 2. Provider -> alias, stable in image order, shared across the same provider.
  const aliasByProvider = new Map<string, string>()
  for (const img of publicImages) {
    if (img.provider && !aliasByProvider.has(img.provider)) {
      aliasByProvider.set(img.provider, aliasFor(aliasByProvider.size))
    }
  }
  // Count distinct provider names reduced, not images, so the disclosure is honest.
  redactions.providersAliased = aliasByProvider.size

  // Coordinate handling, shared by every point. Returns undefined when withheld.
  const cleanPoint = (p?: GeoPoint): PublicGeoPoint | undefined => {
    if (!p) return undefined
    // Invalid coordinates are simply absent; they are not a safety withholding.
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return undefined
    if (p.safeToPublish) {
      return {
        lat: roundTo(p.lat, opts.roundSafeDecimals),
        lng: roundTo(p.lng, opts.roundSafeDecimals),
      }
    }
    if (opts.unsafeCoordinatePolicy === 'coarsen') {
      redactions.coordinatesCoarsened++
      return {
        lat: roundTo(p.lat, opts.coarsenDecimals),
        lng: roundTo(p.lng, opts.coarsenDecimals),
        coarsened: true,
      }
    }
    redactions.coordinatesWithheld++
    return undefined
  }

  const cleanVantage = (v?: Vantage): PublicVantage | undefined => {
    if (!v) return undefined
    const base = cleanPoint(v)
    if (!base) return undefined // no origin => no ray to draw
    return {
      ...base,
      bearingDeg: v.bearingDeg,
      fovDeg: v.fovDeg,
      confidence: v.confidence,
    }
  }

  const cleanImage = (img: Image): PublicImage => {
    const file: PublicFile | undefined = img.file
      ? {
          mime: img.file.mime,
          bytes: img.file.bytes,
          sha256: img.file.sha256,
          w: img.file.w,
          h: img.file.h,
          thumbnailDataUrl: opts.thumbnails?.[img.id],
        }
      : undefined
    const link: PublicLink | undefined = img.link
      ? {
          url: img.link.url,
          archivedUrl: img.link.archivedUrl,
          archivedSha256: img.link.archivedSha256,
          archivedAt: img.link.archivedAt,
        }
      : undefined
    return {
      id: img.id,
      kind: img.kind,
      title: img.title,
      datetime: img.datetime,
      providerAlias: img.provider ? aliasByProvider.get(img.provider) : undefined,
      file,
      link,
      iiif: img.iiif,
      subject: cleanPoint(img.subject),
      vantage: cleanVantage(img.vantage),
      annotations: img.annotations,
      rights: img.rights,
      note: img.note,
      tags: img.tags,
      // Intentionally omitted: provider (real name), provenance, file.name,
      // file.blobKey, consent flag.
    }
  }

  const images = publicImages.map(cleanImage)

  // 3. Relations: keep only those whose endpoints both survived. An edge to a
  // dropped image would betray that image's existence and its connections.
  const relations: PublicRelation[] = []
  for (const r of project.relations) {
    if (survivingIds.has(r.from) && survivingIds.has(r.to)) {
      relations.push({
        id: r.id,
        from: r.from,
        to: r.to,
        kind: r.kind,
        directed: r.directed,
        certainty: r.certainty,
        note: r.note,
      })
    } else {
      redactions.relationsDropped++
    }
  }

  // 4. Panels: drop tiles for non-surviving images; drop a panel left empty.
  const panels: PublicPanel[] = []
  for (const p of project.panels) {
    const items = p.items.filter((it) => survivingIds.has(it.imageId))
    redactions.panelItemsDropped += p.items.length - items.length
    if (items.length === 0) {
      redactions.panelsDropped++
      continue
    }
    panels.push({
      id: p.id,
      titles: p.titles,
      caption: p.caption,
      items,
      tags: p.tags,
    })
  }

  // 5. Atlas identity, with the same coordinate discipline on its place.
  const placePublic = project.atlas.place ? cleanPoint(project.atlas.place) : undefined
  const atlas: PublicProject['atlas'] = {
    id: project.atlas.id,
    titles: project.atlas.titles,
    subject: project.atlas.subject,
    place:
      project.atlas.place && placePublic
        ? { ...placePublic, name: project.atlas.place.name }
        : undefined,
    window: project.atlas.window,
    summary: project.atlas.summary,
    tags: project.atlas.tags,
  }

  return {
    atlas,
    images,
    relations,
    panels,
    redactions,
    generatedAt: opts.generatedAt,
  }
}

/** Human-readable lines describing what the boundary removed, for disclosure. */
export function redactionLines(r: Redactions): string[] {
  const lines: string[] = []
  if (r.imagesDropped > 0) {
    const parts: string[] = []
    if (r.droppedByConsent.embargoed)
      parts.push(`${r.droppedByConsent.embargoed} embargoed`)
    if (r.droppedByConsent.restricted)
      parts.push(`${r.droppedByConsent.restricted} restricted`)
    lines.push(
      `${r.imagesDropped} image${r.imagesDropped === 1 ? '' : 's'} withheld (${parts.join(', ')})`,
    )
  }
  if (r.providersAliased > 0)
    lines.push(`${r.providersAliased} provider name${r.providersAliased === 1 ? '' : 's'} reduced to aliases`)
  if (r.coordinatesWithheld > 0)
    lines.push(`${r.coordinatesWithheld} coordinate${r.coordinatesWithheld === 1 ? '' : 's'} withheld as unsafe to publish`)
  if (r.coordinatesCoarsened > 0)
    lines.push(`${r.coordinatesCoarsened} coordinate${r.coordinatesCoarsened === 1 ? '' : 's'} coarsened`)
  if (r.relationsDropped > 0)
    lines.push(`${r.relationsDropped} relation${r.relationsDropped === 1 ? '' : 's'} dropped for referencing a withheld image`)
  if (r.panelItemsDropped > 0)
    lines.push(`${r.panelItemsDropped} plate tile${r.panelItemsDropped === 1 ? '' : 's'} removed for referencing a withheld image`)
  if (r.panelsDropped > 0)
    lines.push(`${r.panelsDropped} plate${r.panelsDropped === 1 ? '' : 's'} dropped after losing all publishable images`)
  if (lines.length === 0) lines.push('Nothing required redaction.')
  return lines
}
