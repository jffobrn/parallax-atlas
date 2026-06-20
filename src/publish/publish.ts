/**
 * Build the published atlas: one self-contained, static HTML file presenting
 * the image complex as the suite's "forum". It takes a PublicProject (already
 * through the consent boundary) and never reaches back to the full project, so
 * nothing sensitive can appear here. It renders the Mnemosyne plates as montage
 * boards, the relations as a graph and a list, the camera positions as a site
 * map, a chronology, the catalogue with fixity hashes, and the consent
 * disclosure. The same file is the screen artifact and, via print CSS, a
 * print dossier.
 */

import {
  APP_NAME,
  AUTHOR,
  DISCLAIMER,
  SUITE_NAME,
  destinationPoint,
  dirOf,
  formatBearing,
  formatDateTime,
  formatLatLng,
  redactionLines,
  resect,
  toLocal,
  type LatLng,
  type PublicImage,
  type PublicProject,
  type RelationKind,
} from '../core'
import { forceLayout } from '../lib/graphLayout'

/** "a place", "an object", so the subject tag reads as English. */
function subjectPhrase(subject: string): string {
  const article = /^[aeiou]/i.test(subject) ? 'an' : 'a'
  return `${article} ${subject}`
}

const REL_SHORT: Record<RelationKind, string> = {
  'same-object': 'same object',
  'same-place': 'same place',
  'depicts-same': 'depicts same',
  'derived-from': 'derived from',
  'detail-of': 'detail of',
  'before-after': 'before / after',
  'same-source': 'same source',
  'responds-to': 'responds to',
  other: 'related',
}

function esc(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dirAttr(s: string): string {
  return ` dir="${dirOf(s)}"`
}

function safeThumb(img: PublicImage): string {
  const t = img.file?.thumbnailDataUrl
  return t && t.startsWith('data:image/') ? t : ''
}

function catalogueLabel(index: number): string {
  return `FIG-${index + 1}`
}

// --- Plates (Mnemosyne montage) --------------------------------------------

function buildPlates(pub: PublicProject, idToLabel: Map<string, string>): string {
  if (pub.panels.length === 0) return ''
  const byId = new Map(pub.images.map((i) => [i.id, i]))
  const boards = pub.panels
    .map((panel) => {
      const tiles = panel.items
        .map((it) => {
          const img = byId.get(it.imageId)
          if (!img) return ''
          const thumb = safeThumb(img)
          const inner = thumb
            ? `<img src="${thumb}" alt="${esc(img.title)}"/>`
            : `<div class="ptile-empty">${esc(img.title)}</div>`
          return `<figure class="ptile" data-ex="${esc(img.id)}" data-id="${esc(img.id)}" style="left:${(it.x * 100).toFixed(2)}%;top:${(it.y * 100).toFixed(2)}%;width:${(it.scale * 15).toFixed(1)}%">
            ${inner}
            <figcaption class="ptile-cap">${esc(idToLabel.get(img.id) ?? '')}</figcaption>
          </figure>`
        })
        .join('')
      const title = panel.titles[0]?.text ?? 'Plate'
      return `<section class="plate">
        <h3 class="plate-h"${dirAttr(title)}>${esc(title)}</h3>
        ${panel.caption ? `<p class="plate-cap"${dirAttr(panel.caption)}>${esc(panel.caption)}</p>` : ''}
        <div class="board">${tiles}</div>
      </section>`
    })
    .join('')
  return `<section class="block">
    <h2 class="block-label">Plates</h2>
    ${boards}
  </section>`
}

// --- Graph (relations) -----------------------------------------------------

function buildGraphSvg(pub: PublicProject): string {
  if (pub.images.length === 0) return ''
  const ids = pub.images.map((i) => i.id)
  const edges = pub.relations.map((r) => ({ from: r.from, to: r.to }))
  const pos = forceLayout(ids, edges)
  const pts = ids.map((id) => pos.get(id)!).filter(Boolean)
  if (pts.length === 0) return ''

  const W = 820
  const H = 520
  const pad = 60
  const minX = Math.min(...pts.map((p) => p.x))
  const maxX = Math.max(...pts.map((p) => p.x))
  const minY = Math.min(...pts.map((p) => p.y))
  const maxY = Math.max(...pts.map((p) => p.y))
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const X = (x: number) => W / 2 + (x - cx) * scale
  const Y = (y: number) => H / 2 + (y - cy) * scale

  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const titleOf = new Map(pub.images.map((i) => [i.id, i.title]))

  const edgeEls = pub.relations
    .map((r) => {
      const a = pos.get(r.from)
      const b = pos.get(r.to)
      if (!a || !b) return ''
      return `<line x1="${X(a.x).toFixed(1)}" y1="${Y(a.y).toFixed(1)}" x2="${X(b.x).toFixed(1)}" y2="${Y(b.y).toFixed(1)}" class="g-edge${r.certainty === 'uncertain' ? ' g-edge-u' : ''}"/>`
    })
    .join('')

  const nodeEls = ids
    .map((id) => {
      const p = pos.get(id)
      if (!p) return ''
      const r = 7 + Math.min(7, (degree.get(id) ?? 0) * 1.3)
      const title = titleOf.get(id) ?? ''
      const short = title.length > 22 ? title.slice(0, 21) + '…' : title
      return `<g class="g-node" data-ex="${esc(id)}" data-id="${esc(id)}">
        <circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r.toFixed(1)}" class="g-dot"/>
        <text x="${X(p.x).toFixed(1)}" y="${(Y(p.y) + r + 11).toFixed(1)}" text-anchor="middle" class="g-label"${dirAttr(title)}>${esc(short)}</text>
      </g>`
    })
    .join('')

  return `<section class="block">
    <h2 class="block-label">Image complex</h2>
    <svg viewBox="0 0 ${W} ${H}" class="graph" role="img" aria-label="Relations graph">${edgeEls}${nodeEls}</svg>
    ${buildRelationList(pub)}
  </section>`
}

function buildRelationList(pub: PublicProject): string {
  if (pub.relations.length === 0) return ''
  const titleOf = new Map(pub.images.map((i) => [i.id, i.title]))
  const rows = pub.relations
    .map((r) => {
      const a = titleOf.get(r.from) ?? '?'
      const b = titleOf.get(r.to) ?? '?'
      const arrow = r.directed ? '&rarr;' : '&harr;'
      return `<li><span class="rel-k">${esc(REL_SHORT[r.kind])}</span><span class="rel-pair"><span${dirAttr(a)}>${esc(a)}</span> ${arrow} <span${dirAttr(b)}>${esc(b)}</span></span><span class="rel-c">${esc(r.certainty)}</span></li>`
    })
    .join('')
  return `<ul class="rel-list">${rows}</ul>`
}

// --- Map (camera positions) ------------------------------------------------

interface MapPoint {
  id?: string
  kind: 'place' | 'subject' | 'vantage' | 'crossing'
  lat: number
  lng: number
  bearingDeg?: number
  coarsened?: boolean
}

function collectPoints(pub: PublicProject): MapPoint[] {
  const pts: MapPoint[] = []
  if (pub.atlas.place)
    pts.push({ kind: 'place', lat: pub.atlas.place.lat, lng: pub.atlas.place.lng, coarsened: pub.atlas.place.coarsened })
  for (const s of pub.images) {
    if (s.subject)
      pts.push({ id: s.id, kind: 'subject', lat: s.subject.lat, lng: s.subject.lng, coarsened: s.subject.coarsened })
    if (s.vantage)
      pts.push({ id: s.id, kind: 'vantage', lat: s.vantage.lat, lng: s.vantage.lng, bearingDeg: s.vantage.bearingDeg, coarsened: s.vantage.coarsened })
  }
  const r = resect(
    pub.images
      .filter((s) => s.vantage)
      .map((s) => ({ id: s.id, lat: s.vantage!.lat, lng: s.vantage!.lng, bearingDeg: s.vantage!.bearingDeg })),
  )
  if (r.best?.point) pts.push({ kind: 'crossing', lat: r.best.point.lat, lng: r.best.point.lng })
  return pts
}

function buildSvgMap(pub: PublicProject): string {
  const pts = collectPoints(pub)
  if (pts.length === 0) {
    return '<div class="map-empty">No publishable coordinates in this atlas.</div>'
  }

  const W = 820
  const H = 470
  const pad = 48

  const ref: LatLng = pub.atlas.place ?? { lat: pts[0].lat, lng: pts[0].lng }
  const local = pts.map((p) => ({ p, xy: toLocal(ref, p) }))

  let minX = Math.min(...local.map((l) => l.xy.x))
  let maxX = Math.max(...local.map((l) => l.xy.x))
  let minY = Math.min(...local.map((l) => l.xy.y))
  let maxY = Math.max(...local.map((l) => l.xy.y))
  let spanX = maxX - minX
  let spanY = maxY - minY
  if (spanX < 120) { const c = (minX + maxX) / 2; minX = c - 60; maxX = c + 60; spanX = 120 }
  if (spanY < 120) { const c = (minY + maxY) / 2; minY = c - 60; maxY = c + 60; spanY = 120 }
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY)

  const X = (x: number) => pad + (x - minX) * scale
  const Y = (y: number) => H - (pad + (y - minY) * scale)
  const proj = (lat: number, lng: number) => {
    const xy = toLocal(ref, { lat, lng })
    return { x: X(xy.x), y: Y(xy.y) }
  }

  const rayLenM = Math.max(80, Math.min(900, Math.max(spanX, spanY) * 0.7))
  const parts: string[] = []

  parts.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" class="m-frame"/>`)
  for (let i = 1; i < 6; i++) {
    const gx = pad + ((W - 2 * pad) * i) / 6
    const gy = pad + ((H - 2 * pad) * i) / 6
    parts.push(`<line x1="${gx.toFixed(1)}" y1="${pad}" x2="${gx.toFixed(1)}" y2="${H - pad}" class="m-grid"/>`)
    parts.push(`<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${W - pad}" y2="${gy.toFixed(1)}" class="m-grid"/>`)
  }

  for (const p of pts) {
    if (p.kind !== 'vantage' || p.bearingDeg === undefined) continue
    const a = proj(p.lat, p.lng)
    const end = destinationPoint({ lat: p.lat, lng: p.lng }, p.bearingDeg, rayLenM)
    const b = proj(end.lat, end.lng)
    parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="m-ray" data-id="${esc(p.id)}"/>`)
  }

  for (const p of pts) {
    const c = proj(p.lat, p.lng)
    const cx = c.x.toFixed(1)
    const cy = c.y.toFixed(1)
    if (p.kind === 'crossing') {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="11" class="m-cross-ring"/>`)
      parts.push(`<circle cx="${cx}" cy="${cy}" r="5" class="m-cross"/>`)
    } else if (p.kind === 'place') {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="8" class="m-place"/>`)
    } else if (p.kind === 'vantage') {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="5" class="marker m-vantage" data-ex="${esc(p.id)}" data-id="${esc(p.id)}"/>`)
    } else {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="5" class="marker m-subject" data-ex="${esc(p.id)}" data-id="${esc(p.id)}"/>`)
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" class="sitemap" role="img" aria-label="Camera positions">${parts.join('')}</svg>`
}

// --- Chronology ------------------------------------------------------------

function chronologyRows(pub: PublicProject, idToLabel: Map<string, string>): string {
  interface Row { sort: number; time: string; label: string; tag: string; dir: string }
  const rows: Row[] = []
  for (const s of pub.images) {
    if (!s.datetime) continue
    const t = Date.parse(s.datetime.value)
    rows.push({
      sort: Number.isNaN(t) ? 0 : t,
      time: formatDateTime(s.datetime.value, s.datetime.precision),
      label: s.title,
      tag: idToLabel.get(s.id) ?? s.kind,
      dir: dirOf(s.title),
    })
  }
  rows.sort((a, b) => a.sort - b.sort)
  if (rows.length === 0) return '<p class="muted">No dated images.</p>'
  return `<ol class="chrono">${rows
    .map(
      (r) =>
        `<li><span class="chrono-time">${esc(r.time)}</span><span class="chrono-tag">${esc(r.tag)}</span><span class="chrono-label" dir="${r.dir}">${esc(r.label)}</span></li>`,
    )
    .join('')}</ol>`
}

// --- Catalogue -------------------------------------------------------------

function catalogueCard(
  s: PublicImage,
  index: number,
  pub: PublicProject,
  idToLabel: Map<string, string>,
): string {
  const label = catalogueLabel(index)
  const thumb = safeThumb(s)
  const img = thumb ? `<img class="ex-img" src="${thumb}" alt="${esc(s.title)}"/>` : ''
  const dt = s.datetime ? formatDateTime(s.datetime.value, s.datetime.precision) : 'undated'
  const rows: string[] = []
  rows.push(`<dt>kind</dt><dd>${esc(s.kind)}</dd>`)
  rows.push(`<dt>time</dt><dd>${esc(dt)}</dd>`)
  if (s.providerAlias) rows.push(`<dt>provider</dt><dd>${esc(s.providerAlias)}</dd>`)
  if (s.file) rows.push(`<dt>sha-256</dt><dd class="hash">${esc(s.file.sha256)}</dd>`)
  if (s.vantage) rows.push(`<dt>vantage</dt><dd>${esc(formatLatLng(s.vantage.lat, s.vantage.lng))} / ${esc(formatBearing(s.vantage.bearingDeg))}${s.vantage.coarsened ? ' (approx)' : ''}</dd>`)
  if (s.subject) rows.push(`<dt>subject</dt><dd>${esc(formatLatLng(s.subject.lat, s.subject.lng))}${s.subject.coarsened ? ' (approx)' : ''}</dd>`)
  if (s.iiif?.imageUrl) rows.push(`<dt>iiif</dt><dd class="hash">${esc(s.iiif.imageUrl)}</dd>`)
  if (s.link) {
    rows.push(`<dt>link</dt><dd class="hash">${esc(s.link.url)}</dd>`)
    if (s.link.archivedSha256) rows.push(`<dt>snapshot</dt><dd class="hash">sha256:${esc(s.link.archivedSha256)}</dd>`)
  }
  if (s.rights) rows.push(`<dt>rights</dt><dd>${esc(s.rights)}</dd>`)

  const rels = pub.relations.filter((r) => r.from === s.id || r.to === s.id)
  const relHtml = rels.length
    ? `<div class="ex-rels">${rels
        .map((r) => {
          const otherId = r.from === s.id ? r.to : r.from
          return `<span class="ex-rel">${esc(REL_SHORT[r.kind])} ${esc(idToLabel.get(otherId) ?? '')}</span>`
        })
        .join('')}</div>`
    : ''
  const tagHtml = s.tags.length
    ? `<div class="ex-tags">${s.tags.map((t) => `<span class="ex-tag">${esc(t)}</span>`).join('')}</div>`
    : ''

  return `<article class="exhibit" data-ex="${esc(s.id)}" data-id="${esc(s.id)}">
    <div class="ex-head"><span class="ex-label">${label}</span><span class="ex-title"${dirAttr(s.title)}>${esc(s.title)}</span></div>
    ${img}
    <dl class="ex-meta">${rows.join('')}</dl>
    ${relHtml}
    ${tagHtml}
    ${s.note ? `<p class="ex-note">${esc(s.note)}</p>` : ''}
  </article>`
}

// --- Document --------------------------------------------------------------

export function buildPublishedHtml(pub: PublicProject): string {
  const idToLabel = new Map<string, string>()
  pub.images.forEach((s, i) => idToLabel.set(s.id, catalogueLabel(i)))

  const title = pub.atlas.titles[0]?.text ?? 'Atlas'
  const titlesHtml = pub.atlas.titles
    .map(
      (t, i) =>
        `<h1 class="${i === 0 ? 'title' : 'title-alt'}"${dirAttr(t.text)}>${esc(t.text)}</h1>`,
    )
    .join('')

  const windowStr =
    pub.atlas.window.start || pub.atlas.window.end
      ? `${pub.atlas.window.start ? formatDateTime(pub.atlas.window.start, pub.atlas.window.precision) : '?'} to ${pub.atlas.window.end ? formatDateTime(pub.atlas.window.end, pub.atlas.window.precision) : '?'}`
      : 'time window not set'

  const redactions = redactionLines(pub.redactions)
    .map((l) => `<li>${esc(l)}</li>`)
    .join('')

  const generated = pub.generatedAt ? esc(pub.generatedAt) : ''
  const hasGeoPoints = collectPoints(pub).length > 0

  return `<!doctype html>
<html lang="${dirOf(title) === 'rtl' ? 'ar' : 'en'}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<style>${PUBLISHED_CSS}</style>
</head>
<body>
<header class="head">
  <div class="kicker">CONSENT-CLEARED ATLAS</div>
  ${titlesHtml}
  <div class="head-meta">
    <span class="tag">atlas of ${esc(subjectPhrase(pub.atlas.subject))}</span>
    <span class="mono">${esc(windowStr)}</span>
    ${pub.atlas.place?.name ? `<span class="mono">${esc(pub.atlas.place.name)}</span>` : ''}
    <span class="mono">${pub.images.length} images / ${pub.relations.length} relations</span>
  </div>
  ${pub.atlas.summary ? `<p class="summary">${esc(pub.atlas.summary)}</p>` : ''}
</header>

${buildPlates(pub, idToLabel)}

${buildGraphSvg(pub)}

${
  hasGeoPoints
    ? `<section class="block">
  <h2 class="block-label">Camera positions</h2>
  ${buildSvgMap(pub)}
  <div class="legend mono">
    <span><i class="sw sw-vantage"></i>vantage</span>
    <span><i class="sw sw-subject"></i>subject</span>
    <span><i class="sw sw-cross"></i>crossing</span>
    <span><i class="sw sw-place"></i>atlas place</span>
  </div>
</section>`
    : ''
}

<section class="block">
  <h2 class="block-label">Chronology</h2>
  ${chronologyRows(pub, idToLabel)}
</section>

<section class="block">
  <h2 class="block-label">Catalogue</h2>
  <div class="exhibits">
    ${pub.images.map((s, i) => catalogueCard(s, i, pub, idToLabel)).join('')}
  </div>
</section>

<section class="block disclosure">
  <h2 class="block-label">Consent disclosure</h2>
  <p>This atlas passed through the ${esc(APP_NAME)} consent boundary before publication.</p>
  <ul class="redactions">${redactions}</ul>
</section>

<footer class="foot">
  <p class="disclaimer">${esc(DISCLAIMER)}</p>
  <p class="mono">Produced with ${esc(APP_NAME)} (${esc(SUITE_NAME)}) by ${esc(AUTHOR.name)}, ${esc(AUTHOR.affiliation)}. ${generated ? 'Generated ' + generated + '.' : ''}</p>
</footer>

<script>
(function(){
  function all(id){return document.querySelectorAll('[data-id="'+id+'"]')}
  document.querySelectorAll('[data-ex]').forEach(function(n){
    var id=n.getAttribute('data-ex'); if(!id) return;
    n.addEventListener('mouseenter',function(){all(id).forEach(function(e){e.classList.add('hi')})});
    n.addEventListener('mouseleave',function(){all(id).forEach(function(e){e.classList.remove('hi')})});
  });
})();
</script>
</body>
</html>`
}

const PUBLISHED_CSS = `
:root{--bg:#07090c;--bg1:#0c0f14;--bg2:#11151c;--line:#1b212b;--line2:#27303c;--text:#e7ebf0;--t2:#a7b0bd;--t3:#6f7989;--signal:#f3a93c;--signalb:#ffc163;--subject:#7fa8bf;--vantage:#d8d2c0;--alert:#e5544b;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Archivo',system-ui,sans-serif;line-height:1.55;padding:40px 24px 80px;max-width:1000px;margin:0 auto;font-size:14px}
.mono,.hash,.chrono-time,.head-meta .mono{font-family:'Spline Sans Mono',ui-monospace,monospace}
[dir=rtl]{font-family:'Noto Naskh Arabic','Archivo',serif}
.kicker{font-family:'Spline Sans Mono',monospace;font-size:11px;letter-spacing:.18em;color:var(--signal);margin-bottom:10px}
.title{font-size:30px;line-height:1.15;font-weight:600;margin-bottom:4px}
.title-alt{font-size:20px;font-weight:500;color:var(--t2);margin-bottom:4px}
.head{border-bottom:1px solid var(--line2);padding-bottom:20px;margin-bottom:28px}
.head-meta{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;color:var(--t3);font-size:12px;align-items:center}
.tag{border:1px solid var(--line2);border-radius:2px;padding:2px 8px;font-family:'Spline Sans Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--t2)}
.summary{color:var(--t2);max-width:74ch;margin-top:8px}
.block{margin:34px 0}
.block-label{font-family:'Spline Sans Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:16px;font-weight:500}
.plate{margin-bottom:26px}
.plate-h{font-size:17px;font-weight:600;margin-bottom:2px}
.plate-cap{color:var(--t2);font-size:13px;margin-bottom:10px;max-width:74ch}
.board{position:relative;width:100%;padding-bottom:60%;background:var(--bg1);border:1px solid var(--line2);border-radius:4px;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:40px 40px}
.ptile{position:absolute;transform:translate(-50%,-50%);border:1px solid var(--line2);background:#05070b;box-shadow:0 8px 22px rgba(0,0,0,.5)}
.ptile.hi{border-color:var(--signal);box-shadow:0 0 0 1px var(--signal)}
.ptile img{display:block;width:100%;height:auto}
.ptile-empty{padding:14px 8px;font-size:11px;color:var(--t3);text-align:center;min-width:90px}
.ptile-cap{position:absolute;left:0;bottom:-15px;font-family:'Spline Sans Mono',monospace;font-size:9px;color:var(--signal);letter-spacing:.04em}
.graph{width:100%;height:auto;background:var(--bg1);border:1px solid var(--line2);border-radius:4px}
.g-edge{stroke:#38424f;stroke-width:1.2}
.g-edge-u{stroke-dasharray:4 3}
.g-dot{fill:var(--vantage);stroke:#05070b;stroke-width:1.5}
.g-node.hi .g-dot{fill:var(--signalb);stroke:var(--signal)}
.g-label{font-family:'Spline Sans Mono',monospace;font-size:10px;fill:var(--t2)}
.g-node.hi .g-label{fill:var(--signalb)}
.rel-list{list-style:none;margin-top:14px;display:flex;flex-direction:column;gap:4px}
.rel-list li{display:flex;gap:12px;align-items:baseline;font-size:13px;padding:5px 0;border-bottom:1px solid var(--line)}
.rel-k{font-family:'Spline Sans Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--signal);min-width:96px}
.rel-pair{flex:1}
.rel-c{font-family:'Spline Sans Mono',monospace;font-size:10px;color:var(--t3);text-transform:uppercase}
.sitemap{width:100%;height:auto;background:var(--bg1);border:1px solid var(--line2);border-radius:4px}
.map-empty{padding:30px;border:1px dashed var(--line2);color:var(--t3);text-align:center;border-radius:4px}
.m-frame{fill:none;stroke:var(--line2)}
.m-grid{stroke:var(--line);stroke-width:1}
.m-ray{stroke:rgba(216,210,192,.5);stroke-width:1.4}
.m-ray.hi{stroke:var(--signalb);stroke-width:2.4}
.marker{stroke:#0a0c10;stroke-width:1.5}
.m-vantage{fill:var(--vantage)}
.m-subject{fill:var(--subject)}
.m-place{fill:none;stroke:var(--t2);stroke-width:1.5}
.m-cross{fill:var(--signal);stroke:#0a0c10;stroke-width:1}
.m-cross-ring{fill:none;stroke:rgba(243,169,60,.5);stroke-width:1.5}
.marker.hi{stroke:var(--signalb);stroke-width:2.5}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;color:var(--t3);font-size:11px}
.legend i{display:inline-block;width:9px;height:9px;margin-right:5px;vertical-align:middle;border-radius:50%}
.sw-vantage{background:var(--vantage)}.sw-subject{background:var(--subject)}.sw-cross{background:var(--signal)}.sw-place{background:transparent;border:1.5px solid var(--t2)}
.chrono{list-style:none}
.chrono li{display:flex;gap:14px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line)}
.chrono-time{color:var(--signal);min-width:170px;font-size:12px}
.chrono-tag{font-family:'Spline Sans Mono',monospace;font-size:10px;color:var(--t3);min-width:54px}
.chrono-label{flex:1}
.exhibits{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.exhibit{border:1px solid var(--line2);border-radius:4px;background:var(--bg1);padding:12px;transition:border-color .12s}
.exhibit.hi{border-color:var(--signal)}
.ex-head{display:flex;gap:8px;align-items:baseline;margin-bottom:8px}
.ex-label{font-family:'Spline Sans Mono',monospace;font-size:11px;color:var(--signal);letter-spacing:.06em}
.ex-title{font-weight:500}
.ex-img{width:100%;height:auto;max-height:200px;object-fit:cover;border-radius:3px;border:1px solid var(--line);margin-bottom:8px;display:block}
.ex-meta{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px}
.ex-meta dt{font-family:'Spline Sans Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3)}
.hash{font-family:'Spline Sans Mono',monospace;font-size:10px;color:var(--t3);word-break:break-all}
.ex-rels{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ex-rel{font-family:'Spline Sans Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--t2);border:1px solid var(--line2);border-radius:9px;padding:1px 7px}
.ex-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.ex-tag{font-size:11px;color:var(--t3);border:1px solid var(--line);border-radius:2px;padding:1px 6px}
.ex-note{margin-top:8px;color:var(--t2);font-size:13px}
.disclosure{background:var(--bg1);border:1px solid var(--line2);border-radius:4px;padding:16px}
.redactions{margin-top:8px;padding-left:18px;color:var(--t2);font-size:13px}
.muted{color:var(--t3)}
.foot{margin-top:48px;border-top:1px solid var(--line2);padding-top:18px;color:var(--t3);font-size:12px}
.disclaimer{color:var(--t2);margin-bottom:8px;max-width:74ch}
@media print{
  body{background:#fff;color:#111;max-width:none;padding:0}
  .kicker{color:#7a5300}.title-alt,.summary,.ex-note,.disclaimer,.plate-cap{color:#333}
  .board,.graph,.sitemap{background:#fff;border-color:#bbb}.m-grid{stroke:#eee}.m-frame{stroke:#ccc}
  .m-ray{stroke:#999}.m-subject{fill:#3a6e8c}.m-cross{fill:#b3700a;stroke:#fff}.m-place{stroke:#555}
  .g-edge{stroke:#bbb}.g-dot{fill:#888;stroke:#fff}.g-label{fill:#333}
  .exhibit,.disclosure{background:#fff;border-color:#ccc;break-inside:avoid}
  .block-label,.chrono-tag,.ex-meta dt,.hash{color:#555}
  .chrono-time,.ex-label,.rel-k{color:#7a5300}
  .tag{color:#333;border-color:#bbb}
  a,script{display:initial}
}
`
