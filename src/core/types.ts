/**
 * Atlas / Parallax suite: the typed data model.
 *
 * Atlas assembles many images of one place, object, or event into a relational,
 * spatial, and temporal whole: Warburg's Mnemosyne plate meeting Forensic
 * Architecture's operative model, the "image complex" in which several vantages
 * on one thing locate each other. Where Sightlines reconstructs a single
 * incident, Atlas holds a dispersed corpus and the relations between its images.
 *
 * This is shared core. The primitives carried over from Sightlines unchanged
 * (Consent, Certainty, TimePrecision, GeoPoint, Vantage, LocalizedText,
 * HeldFile, ExternalLink) keep the two tools interoperable, so material can move
 * between them without ever loosening protection. The consent boundary in
 * `consent.ts`, the hashing in `hash.ts`, and the geometry in `geo.ts` reuse
 * these shapes. Keep this a clean module with no UI or framework imports.
 *
 * A note on truth: only the project (atlas, images, relations, panels) is
 * stored. Everything derived (the graph layout, timeline order, the resected
 * crossing of several vantages, the narrative) is computed at read time, never
 * persisted as fact.
 */

/** Whether an image may appear in anything published. */
export type Consent = 'public' | 'restricted' | 'embargoed'

/** How sure an assertion, a placement, or a relation is. */
export type Certainty = 'attested' | 'probable' | 'uncertain'

/** A datetime carries the precision it was actually known to, never more. */
export type TimePrecision = 'minute' | 'hour' | 'day' | 'approximate'

/** What an image is, as a bearer of the depicted thing. */
export type ImageKind =
  | 'photograph'
  | 'reproduction'
  | 'film-still'
  | 'document'
  | 'artwork'
  | 'other'

/** What kind of thing the whole image complex is about. */
export type AtlasSubject = 'place' | 'object' | 'event' | 'person' | 'corpus'

/**
 * How two images (or an image and itself across time) relate. The relations are
 * the operative model: they are what makes a heap of pictures an image complex.
 */
export type RelationKind =
  | 'same-place' // two images show the same location
  | 'same-object' // two images show the same object or work
  | 'depicts-same' // two images depict the same subject more loosely
  | 'derived-from' // a reproduction, copy, scan, or crop of another
  | 'detail-of' // a detail or fragment of a larger image
  | 'before-after' // a temporal pair (rephotography, change over time)
  | 'same-source' // shared provenance or contributor
  | 'responds-to' // one work or image answers another
  | 'other'

/** A point on the ground, with a per-point decision about publication. */
export interface GeoPoint {
  lat: number
  lng: number
  /** When false, the consent boundary withholds or coarsens this point. */
  safeToPublish: boolean
}

/**
 * A camera position. The bearing is the compass direction (degrees, 0 = north,
 * clockwise) the camera looked along. An optional field of view widens the ray
 * into a cone; confidence records how sure the placement is. Several vantages on
 * one object cross to resect it: the image complex made geometric.
 */
export interface Vantage extends GeoPoint {
  bearingDeg: number
  fovDeg?: number
  confidence: Certainty
}

/** A title or caption in one language, so a record can be multilingual (incl. RTL). */
export interface LocalizedText {
  text: string
  /** BCP-47-ish language tag, e.g. 'en', 'ar'. Direction is derived per string. */
  lang: string
}

/** Bytes actually held on the user's machine, with their fixity hash. */
export interface HeldFile {
  name: string
  mime: string
  bytes: number
  /** Lowercase hex sha-256 of the held bytes (Berkeley Protocol fixity). */
  sha256: string
  w?: number
  h?: number
  /** Key into the media store (IndexedDB). Not part of the evidentiary record. */
  blobKey?: string
}

/** A link to material not downloaded (video, a remote page). We hash what we hold. */
export interface ExternalLink {
  url: string
  archivedUrl?: string
  /** sha-256 of the archived snapshot we hold, never of the remote bytes. */
  archivedSha256?: string
  archivedAt?: string
}

/**
 * An optional IIIF reference for serverless deep-zoom close looking. When an
 * imageUrl (a level-0 IIIF info.json or image endpoint) is present, the viewer
 * uses it; otherwise it deep-zooms the held file directly. Static, level-0 IIIF
 * keeps viewing serverless, as the suite requires.
 */
export interface IiifRef {
  imageUrl?: string
  manifestUrl?: string
}

/**
 * A point annotation on an image, in the W3C Web Annotation spirit: a labelled
 * mark at a normalized location (0..1 of the image's width and height) used for
 * close looking. Kept minimal and serverless; it rides along with its image.
 */
export interface ImageAnnotation {
  id: string
  /** Normalized position, 0..1 from the top-left of the image. */
  x: number
  y: number
  text: string
}

/** A node in the atlas: one image-bearing item with its full apparatus. */
export interface Image {
  id: string
  kind: ImageKind
  title: string
  datetime?: { value: string; precision: TimePrecision }
  /** Who provided it. Reduced to an alias in anything published. */
  provider?: string
  /** Origin and how obtained. Withheld from anything published. */
  provenance?: string
  file?: HeldFile
  link?: ExternalLink
  iiif?: IiifRef
  /** Where the depicted thing is. */
  subject?: GeoPoint
  /** Where the camera was, and which way it looked. */
  vantage?: Vantage
  annotations?: ImageAnnotation[]
  consent: Consent
  rights?: string
  note?: string
  tags: string[]
}

/** A typed edge between two images. The relations are the atlas's structure. */
export interface Relation {
  id: string
  from: string // image id
  to: string // image id
  kind: RelationKind
  /** Whether the relation reads one way (from -> to) or symmetrically. */
  directed: boolean
  certainty: Certainty
  note?: string
}

/** Where an image sits on a panel board, in normalized 0..1 board coordinates. */
export interface PanelItem {
  imageId: string
  x: number
  y: number
  /** Relative size on the board, 1 = nominal. */
  scale: number
}

/**
 * A Mnemosyne plate: a named board on which images are arranged into a
 * constellation, so meaning emerges from juxtaposition. The signature surface
 * for close looking across the corpus.
 */
export interface Panel {
  id: string
  titles: LocalizedText[]
  caption?: string
  items: PanelItem[]
  tags: string[]
}

/** The corpus identity: what place, object, or event this image complex is of. */
export interface Atlas {
  id: string
  titles: LocalizedText[]
  subject: AtlasSubject
  place?: GeoPoint & { name?: string }
  window: { start?: string; end?: string; precision: TimePrecision }
  summary?: string
  tags: string[]
}

export interface Project {
  atlas: Atlas
  images: Image[]
  relations: Relation[]
  panels: Panel[]
}

// --- Export envelope -------------------------------------------------------

export const SCHEMA_VERSION = 1

/**
 * The full project as written to a single file (the user's own keeping). This
 * is the one output that is NOT sanitized; it never leaves the machine unless
 * the user saves it. Media bytes are inlined as base64 so the project is one
 * portable file.
 */
export interface ProjectFile {
  format: 'atlas-project'
  schemaVersion: number
  app: { name: string; version: string }
  exportedAt: string
  project: Project
  /** blobKey -> { mime, base64 } for every held file referenced above. */
  media: Record<string, { mime: string; base64: string }>
}

// --- Public (consent-cleared) projection -----------------------------------
// What survives the consent boundary. Sensitive fields are simply absent from
// these types, so they cannot be rendered even by mistake downstream.

export interface PublicGeoPoint {
  lat: number
  lng: number
  /** True when the coordinate was coarsened because it was not safe to publish. */
  coarsened?: boolean
}

export interface PublicVantage extends PublicGeoPoint {
  bearingDeg: number
  fovDeg?: number
  confidence: Certainty
}

export interface PublicFile {
  mime: string
  bytes: number
  sha256: string
  w?: number
  h?: number
  /** Public images may carry an inlined thumbnail (data URL) for the dossier. */
  thumbnailDataUrl?: string
}

export interface PublicLink {
  url: string
  archivedUrl?: string
  archivedSha256?: string
  archivedAt?: string
}

export interface PublicImage {
  id: string
  kind: ImageKind
  title: string
  datetime?: { value: string; precision: TimePrecision }
  /** Provider reduced to a stable alias, e.g. "Source A". Never the real name. */
  providerAlias?: string
  file?: PublicFile
  link?: PublicLink
  iiif?: IiifRef
  subject?: PublicGeoPoint
  vantage?: PublicVantage
  annotations?: ImageAnnotation[]
  rights?: string
  note?: string
  tags: string[]
}

export interface PublicRelation {
  id: string
  from: string
  to: string
  kind: RelationKind
  directed: boolean
  certainty: Certainty
  note?: string
}

export interface PublicPanel {
  id: string
  titles: LocalizedText[]
  caption?: string
  items: PanelItem[]
  tags: string[]
}

export interface PublicAtlas {
  id: string
  titles: LocalizedText[]
  subject: AtlasSubject
  place?: PublicGeoPoint & { name?: string }
  window: { start?: string; end?: string; precision: TimePrecision }
  summary?: string
  tags: string[]
}

/** A record of what the consent boundary removed or altered, for honest disclosure. */
export interface Redactions {
  imagesDropped: number
  droppedByConsent: { restricted: number; embargoed: number }
  providersAliased: number
  coordinatesWithheld: number
  coordinatesCoarsened: number
  relationsDropped: number
  panelsDropped: number
  panelItemsDropped: number
}

export interface PublicProject {
  atlas: PublicAtlas
  images: PublicImage[]
  relations: PublicRelation[]
  panels: PublicPanel[]
  redactions: Redactions
  generatedAt?: string
}
