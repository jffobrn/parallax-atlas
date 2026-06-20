/**
 * The sample atlas. Plainly fictional: a dispersed image complex of an invented
 * modernist mural by an invented artist (N. Sarrouf), painted in 1979 on a sea
 * wall in the invented town of Vela (the same fiction as the Sightlines sample)
 * and since whitewashed, surviving only in scattered photographs, a catalogue
 * reproduction, a film still, and a salvaged fragment. The town, the artist, the
 * coordinates, the timestamps, and the people are all invented; only the file
 * hashes are real, computed here over the actual asset bytes.
 *
 * It exercises every distinctive feature of Atlas: several vantages on one wall
 * whose bearings cross and resect it (the image complex made geometric); typed
 * relations of several kinds (same-object, detail-of, derived-from,
 * before-after); two Mnemosyne plates arranging the corpus into constellations;
 * point annotations for close looking; one embargoed image that publishing drops
 * along with the relation and plate tile that referenced it; and a public image
 * whose current location is marked not safe to publish, so that coordinate is
 * withheld while the image itself survives.
 */

import {
  putMedia,
  sha256OfText,
  type HeldFile,
  type Image,
  type Panel,
  type Project,
  type Relation,
} from '../core'

import muralSw from './assets/mural-sw.svg?raw'
import muralSe from './assets/mural-se.svg?raw'
import muralDetail from './assets/mural-detail.svg?raw'
import reproCatalogue from './assets/repro-catalogue.svg?raw'
import rephoto1992 from './assets/rephoto-1992.svg?raw'
import filmStill from './assets/film-still.svg?raw'
import fragment from './assets/fragment.svg?raw'
import privatePhoto from './assets/private-photo.svg?raw'

async function heldSvg(
  raw: string,
  name: string,
  w: number,
  h: number,
): Promise<HeldFile> {
  const bytes = new TextEncoder().encode(raw)
  const sha256 = await sha256OfText(raw)
  const blobKey = `media_${name.replace(/[^a-z0-9]/gi, '')}`
  await putMedia(blobKey, new Blob([bytes], { type: 'image/svg+xml' }))
  return { name, mime: 'image/svg+xml', bytes: bytes.byteLength, sha256, w, h, blobKey }
}

// The wall, resected subject of the two earliest photographs.
const WALL = { lat: 34.4052, lng: -19.8503 }

export async function buildSampleProject(): Promise<Project> {
  const [fSw, fSe, fDetail, fRepro, fRephoto, fFilm, fFragment, fPrivate] =
    await Promise.all([
      heldSvg(muralSw, 'mural-sw-1979.svg', 1200, 800),
      heldSvg(muralSe, 'mural-se-1981.svg', 1200, 800),
      heldSvg(muralDetail, 'central-panel-detail.svg', 900, 1100),
      heldSvg(reproCatalogue, 'catalogue-pl14-1986.svg', 1000, 1300),
      heldSvg(rephoto1992, 'sw-wall-1992.svg', 1200, 800),
      heldSvg(filmStill, 'reel2-vela-waterfront.svg', 1280, 720),
      heldSvg(fragment, 'salvaged-fragment.svg', 1000, 1000),
      heldSvg(privatePhoto, 'private-interior.svg', 1200, 800),
    ])

  const images: Image[] = [
    {
      id: 'img-sw',
      kind: 'photograph',
      title: 'The mural from the south-west',
      datetime: { value: '1979-06-02T00:00:00Z', precision: 'day' },
      provider: 'Sarrouf family papers',
      provenance: 'Print held in the artist’s papers; scanned by the family in 2019.',
      file: fSw,
      vantage: { lat: 34.404, lng: -19.852, safeToPublish: true, bearingDeg: 50, fovDeg: 36, confidence: 'attested' },
      consent: 'public',
      rights: 'Estate of N. Sarrouf; shared for study.',
      note: 'The earliest known photograph of the finished wall, looking north-east.',
      tags: ['mural', 'before', 'sarrouf-papers'],
    },
    {
      id: 'img-se',
      kind: 'photograph',
      title: 'The mural from the south-east',
      datetime: { value: '1981-09-12T00:00:00Z', precision: 'day' },
      provider: 'Vela Municipal Archive',
      provenance: 'Municipal survey photograph; reference print consulted on site.',
      file: fSe,
      vantage: { lat: 34.4042, lng: -19.8486, safeToPublish: true, bearingDeg: 305, fovDeg: 40, confidence: 'attested' },
      consent: 'public',
      rights: 'Public record (fictional).',
      note: 'A second vantage; its bearing crosses the south-west view on the wall.',
      tags: ['mural', 'before', 'municipal'],
    },
    {
      id: 'img-detail',
      kind: 'photograph',
      title: 'Central panel, detail',
      datetime: { value: '1981-09-12T00:00:00Z', precision: 'day' },
      provider: 'Vela Municipal Archive',
      provenance: 'Detail frame from the same 1981 survey.',
      file: fDetail,
      annotations: [
        { id: 'anno-sig', x: 0.71, y: 0.89, text: 'painted signature, lower right' },
        { id: 'anno-head', x: 0.5, y: 0.27, text: 'overpainted head, repainted once' },
      ],
      consent: 'public',
      rights: 'Public record (fictional).',
      note: 'A close detail of the central figure, used for the signature and the repainting.',
      tags: ['detail', 'central-figure'],
    },
    {
      id: 'img-repro',
      kind: 'reproduction',
      title: 'Catalogue reproduction (Pl. 14)',
      datetime: { value: '1986-01-01T00:00:00Z', precision: 'approximate' },
      provider: 'Galerie du Quai, exhibition catalogue',
      provenance: 'Half-tone reproduction printed from the 1979 south-west photograph.',
      file: fRepro,
      consent: 'public',
      rights: 'Catalogue, 1986 (fictional).',
      note: 'A reproduction derived from the 1979 photograph; the only colour record many readers saw.',
      tags: ['reproduction', 'catalogue'],
    },
    {
      id: 'img-rephoto',
      kind: 'photograph',
      title: 'The wall after whitewashing',
      datetime: { value: '1992-08-15T00:00:00Z', precision: 'day' },
      provider: 'Vela Municipal Archive',
      provenance: 'Rephotograph from approximately the 1979 station.',
      file: fRephoto,
      vantage: { lat: 34.4039, lng: -19.8521, safeToPublish: true, bearingDeg: 49, fovDeg: 34, confidence: 'attested' },
      consent: 'public',
      rights: 'Public record (fictional).',
      note: 'Made from near the original south-west station, after the mural was painted over.',
      tags: ['mural', 'after', 'rephotography'],
    },
    {
      id: 'img-film',
      kind: 'film-still',
      title: 'Film still, Vela waterfront',
      datetime: { value: '1983-01-01T00:00:00Z', precision: 'approximate' },
      provider: 'Vela Film Unit (mirror)',
      provenance: 'Frame grab from a documentary reel; the mural appears behind the figures.',
      file: fFilm,
      consent: 'public',
      rights: 'Uploader unknown; treated as all rights reserved.',
      note: 'The wall in the background dates the still to before the whitewashing.',
      tags: ['film', 'incidental'],
    },
    {
      id: 'img-fragment',
      kind: 'photograph',
      title: 'A salvaged fragment',
      datetime: { value: '1994-05-01T00:00:00Z', precision: 'approximate' },
      provider: 'Anonymous (resident)',
      provenance: 'Photograph of a plaster fragment said to be from the central panel.',
      file: fFragment,
      // The fragment now hangs in a private courtyard whose location is protected.
      subject: { lat: 34.4071, lng: -19.8466, safeToPublish: false },
      consent: 'public',
      rights: 'Used with permission for study.',
      note: 'The image is public; its current location is withheld, so the coordinate does not publish.',
      tags: ['fragment', 'afterlife'],
    },
    {
      id: 'img-private',
      kind: 'photograph',
      title: 'Fragment in a private interior (identifying)',
      datetime: { value: '1995-03-01T00:00:00Z', precision: 'approximate' },
      provider: 'Private collector',
      provenance: 'Shared on condition it is not published; an individual is identifiable in frame.',
      file: fPrivate,
      subject: { lat: 34.4075, lng: -19.846, safeToPublish: false },
      consent: 'embargoed',
      rights: 'Not cleared for publication.',
      note: 'Held for the record only. Embargoed, so it and anything that references it never cross the consent boundary.',
      tags: ['fragment', 'embargoed'],
    },
  ]

  const relations: Relation[] = [
    { id: 'rel-1', from: 'img-sw', to: 'img-se', kind: 'same-object', directed: false, certainty: 'attested', note: 'Two vantages on the same wall.' },
    { id: 'rel-2', from: 'img-detail', to: 'img-se', kind: 'detail-of', directed: true, certainty: 'attested' },
    { id: 'rel-3', from: 'img-repro', to: 'img-sw', kind: 'derived-from', directed: true, certainty: 'attested', note: 'Half-tone made from this print.' },
    { id: 'rel-4', from: 'img-sw', to: 'img-rephoto', kind: 'before-after', directed: true, certainty: 'attested', note: '1979 before, 1992 after.' },
    { id: 'rel-5', from: 'img-film', to: 'img-se', kind: 'same-object', directed: false, certainty: 'probable' },
    { id: 'rel-6', from: 'img-fragment', to: 'img-se', kind: 'same-object', directed: false, certainty: 'probable' },
    { id: 'rel-7', from: 'img-detail', to: 'img-sw', kind: 'same-object', directed: false, certainty: 'probable' },
    // References the embargoed image: dropped by the consent boundary on publish.
    { id: 'rel-8', from: 'img-private', to: 'img-fragment', kind: 'depicts-same', directed: false, certainty: 'probable' },
  ]

  const panels: Panel[] = [
    {
      id: 'panel-wall',
      titles: [
        { text: 'The wall, and its erasure', lang: 'en' },
        { text: 'الجدار ومحوه', lang: 'ar' },
      ],
      caption:
        'The mural across time: two early vantages, the documentary still, and the whitewashed wall of 1992.',
      items: [
        { imageId: 'img-sw', x: 0.26, y: 0.4, scale: 1.1 },
        { imageId: 'img-se', x: 0.54, y: 0.32, scale: 1.1 },
        { imageId: 'img-film', x: 0.42, y: 0.72, scale: 0.9 },
        { imageId: 'img-rephoto', x: 0.78, y: 0.6, scale: 1 },
      ],
      tags: ['before-after'],
    },
    {
      id: 'panel-afterlives',
      titles: [{ text: 'Reproductions, details, afterlives', lang: 'en' }],
      caption:
        'How the work survives its destruction: a catalogue plate, a detail, a salvaged fragment, and the private photograph withheld from publication.',
      items: [
        { imageId: 'img-repro', x: 0.24, y: 0.36, scale: 1 },
        { imageId: 'img-detail', x: 0.5, y: 0.34, scale: 0.85 },
        { imageId: 'img-fragment', x: 0.72, y: 0.6, scale: 1 },
        // The embargoed image: this tile is dropped from the published plate.
        { imageId: 'img-private', x: 0.44, y: 0.74, scale: 0.9 },
      ],
      tags: ['afterlife'],
    },
  ]

  return {
    atlas: {
      id: 'atlas-sea-wall-mural',
      titles: [
        { text: 'The Sea-Wall Mural: a dispersed image complex', lang: 'en' },
        { text: 'جدارية البحر: أرشفة صورة غائبة', lang: 'ar' },
      ],
      subject: 'object',
      place: { ...WALL, safeToPublish: true, name: 'Sea wall, Quai des Marais, Vela (fictional)' },
      window: { start: '1979-06-02T00:00:00Z', end: '1995-03-01T00:00:00Z', precision: 'day' },
      summary:
        'A plainly fictional sample. The modernist Sea-Wall Mural, painted in 1979 by the invented artist N. Sarrouf in the invented town of Vela and whitewashed in 1992, survives only as a dispersed set of images: two early photographs from separate stations, a catalogue reproduction, a detail, a documentary film still, and photographs of a salvaged fragment. The town, the artist, the coordinates, the dates, and the people are invented; only the file hashes are real. Use it to cross the camera vantages onto the wall, read the corpus as a relations graph, arrange it on a Mnemosyne plate, look closely with deep zoom and annotation, and watch the embargoed image (and the relation and plate tile that reference it) drop when the atlas is published.',
      tags: ['fictional-sample', 'mural', 'dispersal', 'rephotography', 'image-complex'],
    },
    images,
    relations,
    panels,
  }
}
