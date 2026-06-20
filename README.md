# Atlas

Assemble many images of one place, object, or event into a relational, spatial, and temporal atlas, consent first.

Atlas is the second tool of **Parallax**, a client-side, local-first suite that
brings the transferable methods of open-source investigation into art history and
archival research, at the scale of a curator, a researcher, a student, or a
community partner. Where the first tool, [Sightlines](https://github.com/jffobrn/parallax-sightlines),
reconstructs a single incident, Atlas holds a dispersed corpus: it gathers many
images of one thing, relates them into an image complex, places their camera
vantages on a map, arranges them on a Mnemosyne plate, and lets you look closely
with deep zoom and annotation. Warburg's plate meeting Forensic Architecture's
operative model.

It makes one move that the studio-scale tools it learns from do not: **it begins
from consent.** Restricted and embargoed images, the identities of sources, and
unsafe locations are withheld from anything published unless deliberately
released. In an atlas this matters twice over, because a relation or a montage
tile could otherwise betray that a withheld image exists. That rule is enforced by
architecture, not by discipline.

> Atlas assembles a source-tethered image complex, not legal proof or a verified
> attribution. It documents and corroborates; it does not adjudicate.

## What it does

1. **Define the atlas.** What place, object, or event the complex is of; its
   place anchors the map and its window frames the timeline. Titles are
   multilingual, including Arabic (RTL).
2. **Gather the corpus.** Photographs, reproductions, film stills, documents, and
   artworks, held as files or referenced by link. Each carries a datetime with
   its precision, provenance, a sha-256 of the bytes held, rights, tags, and a
   consent state (public, restricted, embargoed).
3. **Relate the images.** Typed relations (same object, same place, derived from,
   detail of, before / after, responds to, and more) turn a heap of pictures into
   an image complex you can read as a graph.
4. **Place camera positions.** Per image, an optional subject (where the depicted
   thing is) and an optional vantage (camera position and bearing). Several
   vantages on one object cross and resect it, exactly as in Sightlines.
5. **Arrange a plate.** Lay images out on a Mnemosyne board so meaning emerges
   from juxtaposition. Keep several plates as several readings of one corpus.
6. **Look closely.** Deep-zoom any held image, serverless, and drop point
   annotations that stay anchored to the picture.
7. **Publish and export.** A self-contained interactive atlas (plates, image
   complex, camera positions, chronology, catalogue), the full JSON project file,
   and an optional print dossier.

## The consent boundary

Every export and every published view is produced by one function,
[`publicClone`](src/core/consent.ts). It takes the full project and returns a
sanitized copy in which:

- images that are not public are dropped;
- provider names are reduced to stable aliases and provenance is removed;
- coordinates are withheld (or coarsened) wherever a point is not safe to publish;
- relations are kept only when both endpoints survived, so the relational
  structure can never point at a withheld image;
- plate tiles referencing a withheld image are removed, and a plate left empty is
  dropped.

Sensitive data cannot leak by accident because nothing sensitive crosses that
boundary: the public types simply have no field for it. The published artifact
also states plainly what was withheld.

## Stack

Best-in-class, source-available, free for noncommercial use, and client-side local-first. The application is
a static bundle; all processing happens in the browser; data stays on the
machine; a published atlas is itself a static artifact that hosts free.

- React, TypeScript, Vite
- MapLibre GL with deck.gl overlays for camera positions, sightline rays, and the
  crossing
- A synthetic forensic graticule basemap that fetches no tiles; real tiles, when
  wanted, come from a bundled or self-hosted PMTiles archive over `pmtiles://`,
  never a third-party service
- A force-directed relations graph (d3-force) rendered as themed SVG
- OpenSeadragon for deep-zoom close looking; held images are zoomed as
  single-image pyramids, so nothing is fetched from a tile server. A static
  (level-0) IIIF endpoint is used when an image carries one
- A custom visx timeline, brushed and linked to every view
- Dexie / IndexedDB for the project, with media held as Blobs
- WebCrypto `crypto.subtle.digest` for sha-256 fixity
- Self-hosted Archivo, Spline Sans Mono, and Noto Naskh Arabic (no font CDN)

Atlas reuses the shared core that Sightlines established (the typed data layer,
the consent boundary, the resection geometry, hashing, persistence, and the
forensic design system), and extends the model with relations and plates.

## Safety properties

- **Tiles never leak the viewport.** The default basemap makes no network request
  at all. A sensitive area of interest cannot reach an outside server.
- **Close looking is serverless.** Held images are deep-zoomed in the browser as
  single-image pyramids; no tile server is contacted.
- **Local-first.** No accounts, no servers, no uploads. The project and its media
  live in your browser's storage and only leave when you save a file.
- **We hash only what we hold.** For a linked image, the remote bytes are not
  downloaded; an archived snapshot record is hashed instead, and the interface
  says so.
- **Consent is enforced, not hidden.** Publishing routes through `publicClone`,
  and the published file discloses what it withheld, down to the relations and
  plate tiles removed.

## Getting started

Requirements: Node 18 or newer.

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check and build the static bundle to dist/
npm run preview    # preview the production build
```

The app opens with a plainly fictional sample loaded: a dispersed image complex
of an invented modernist sea-wall mural, painted in 1979 in the invented town of
Vela and whitewashed in 1992, surviving only as scattered photographs, a
catalogue reproduction, a film still, and a salvaged fragment. The town, the
artist, the coordinates, the dates, and the people are invented; only the file
hashes are real. Use it to cross the camera vantages onto the wall, read the
corpus as a relations graph, arrange it on a Mnemosyne plate, look closely with
deep zoom and annotation, and watch the embargoed image (and the relation and
plate tile that reference it) drop when the atlas is published.

### Deploy

`npm run build` produces a static `dist/` that hosts on GitHub Pages, Netlify, or
Cloudflare Pages. The base path is relative, so it also runs from a subfolder or
straight off the filesystem. A published atlas is a single self-contained HTML
file that hosts the same way or opens offline.

## Project structure

The suite's shared core lives in [`src/core`](src/core) as clean, exported
modules carried over from Sightlines:

- `types.ts` the typed data model, including the public (consent-cleared) shapes
- `consent.ts` the `publicClone` boundary
- `geo.ts` resection geometry (crossing the vantages of one object)
- `hash.ts` sha-256 fixity over held bytes
- `time.ts`, `format.ts` time without false precision, and apparatus formatting
- `db.ts`, `projectFile.ts` IndexedDB persistence and single-file export/import

The design tokens in [`src/design`](src/design) are the suite's authored forensic
identity. The plate, graph, map, timeline, lightbox, and publishing layers build
on top.

## Roadmap

Parallax is a small suite of siblings that share this core and the consent ethic.
Built so far: **Sightlines** (reconstruct a single incident or site) and
**Atlas** (the image complex as a navigable space). Planned as interest dictates:
**Situated Testimony** (model-aided oral history) and **Verification** (a
source-criticism workbench for teaching).

## License and citation

Source-available, not open source. The source code is under the
[PolyForm Noncommercial License 1.0.0](LICENSE); the non-code assets (the design,
this documentation, the bundled sample, and the investigations the tool produces)
are under [CC BY-NC-SA 4.0](LICENSE-ASSETS.md). Free to use, modify, and share for
any noncommercial purpose, including education, research, nonprofits, and
government. Commercial use is not granted here; contact the authors for commercial
licensing. If you use Atlas in your work, please cite it using
[CITATION.cff](CITATION.cff).

## Author

Parallax Agency and Jeff O'Brien. Parallax is an independent, consent-first
research practice for art history and the archive, founded and directed by Jeff
O'Brien (Material / Image Research Lab, UC Santa Barbara).
