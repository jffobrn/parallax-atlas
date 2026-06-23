# Changelog

All notable changes to Atlas are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-06-22

### Changed

- Removed `CITATION.cff`: these tools are published for verifiability as part of
  Parallax, not packaged for reuse, so they carry no citation metadata.
- Rebalanced the README to lead with the method; consent is kept as one feature
  (the publish boundary) rather than the headline of every section.

### Fixed

- Chronology: the lane label no longer overlaps the leftmost image marks when
  dates cluster against the left edge.

## [1.1.0] - 2026-06-20

### Changed

- Relicensed from MIT to a dual noncommercial licence: the source code is now
  under the PolyForm Noncommercial License 1.0.0 and the non-code assets under
  CC BY-NC-SA 4.0. The project is source-available, not open source; commercial
  use is not granted. Versions released under MIT remain available under MIT.
- Attribution updated to Parallax Agency and Jeff O'Brien.

## [1.0.0] - 2026-06-19

First release. The second tool of the Parallax suite: assemble many images of one
place, object, or event into a relational, spatial, and temporal atlas, consent
first.

### Added

- **The corpus.** Images held as files (or referenced by link), each hashed with
  sha-256 over the bytes held, carrying datetime with precision, provider,
  provenance, rights, tags, and a consent state.
- **The image complex.** Typed relations (same object, same place, derived from,
  detail of, before / after, responds to, and more) rendered as a force-directed
  graph; draw a relation by clicking two nodes.
- **Camera positions.** Per-image subject and vantage on a MapLibre and deck.gl
  map; several vantages on one object cross and resect it, reusing the Sightlines
  geometry. A synthetic graticule basemap fetches no tiles.
- **The Mnemosyne plate.** A board on which images are arranged into a
  constellation; several plates per corpus, positions stored normalized.
- **Close looking.** Serverless deep zoom (OpenSeadragon) over held images, with
  point annotations anchored to the picture; static IIIF endpoints used when
  present.
- **A linked timeline** brushed to filter the corpus, with uncertain times drawn
  as spans.
- **The consent boundary (`publicClone`).** The shared-core function that
  produces every export and published view: it drops non-public images, aliases
  providers, hides provenance, withholds unsafe coordinates, and removes any
  relation or plate tile that references a withheld image.
- **Outputs.** A self-contained interactive published atlas (plates, image
  complex, camera positions, chronology, catalogue, disclosure), the full JSON
  project file, and an optional print dossier.
- **A plainly fictional sample** that opens loaded and exercises every feature.

[1.1.1]: https://github.com/jffobrn/parallax-atlas/releases/tag/v1.1.1
[1.1.0]: https://github.com/jffobrn/parallax-atlas/releases/tag/v1.1.0
[1.0.0]: https://github.com/jffobrn/parallax-atlas/releases/tag/v1.0.0
