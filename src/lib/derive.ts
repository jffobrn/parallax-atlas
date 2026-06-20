/**
 * Derived state: computed from the project, never stored as truth. The plate,
 * the graph, the map, the timeline, and the published artifact all read from
 * here so they agree.
 */

import {
  resect,
  timeInterval,
  type Consent,
  type ImageKind,
  type Project,
  type PublicProject,
  type Relation,
  type ResectionInput,
  type ResectionSet,
} from '../core'

/** Vantages with a usable origin and bearing, as resection inputs. */
export function imageVantages(project: Pick<Project, 'images'>): ResectionInput[] {
  const out: ResectionInput[] = []
  for (const img of project.images) {
    const v = img.vantage
    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
      out.push({ id: img.id, lat: v.lat, lng: v.lng, bearingDeg: v.bearingDeg })
    }
  }
  return out
}

/**
 * The crossing of several vantages: the image complex made geometric. When two
 * or more cameras look at the same object, their bearings resect it.
 */
export function getResection(project: Pick<Project, 'images'>): ResectionSet {
  return resect(imageVantages(project))
}

export interface TimelineItem {
  id: string
  imageKind: ImageKind
  label: string
  start: number
  end: number
  consent: Consent
}

/** Timeline items from images (by datetime). Relations carry no time of their own. */
export function timelineItems(project: Project): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const img of project.images) {
    if (!img.datetime) continue
    const iv = timeInterval(img.datetime.value, img.datetime.precision)
    if (!iv) continue
    items.push({
      id: img.id,
      imageKind: img.kind,
      label: img.title,
      start: iv.start,
      end: iv.end,
      consent: img.consent,
    })
  }
  return items.sort((a, b) => a.start - b.start)
}

/** Overall time extent across the atlas window and every dated image. */
export function timeExtent(project: Project): [number, number] | null {
  const points: number[] = []
  const w = project.atlas.window
  if (w.start) {
    const t = Date.parse(w.start)
    if (!Number.isNaN(t)) points.push(t)
  }
  if (w.end) {
    const t = Date.parse(w.end)
    if (!Number.isNaN(t)) points.push(t)
  }
  for (const it of timelineItems(project)) {
    points.push(it.start, it.end)
  }
  if (points.length === 0) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  if (min === max) return [min - 86_400_000, max + 86_400_000]
  return [min, max]
}

/** Every tag in use across the corpus, sorted, for the rail facets. */
export function allTags(project: Project): string[] {
  const set = new Set<string>()
  for (const img of project.images) for (const t of img.tags) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b))
}

// --- Graph (the relational structure) --------------------------------------

export interface GraphNode {
  id: string
  title: string
  kind: ImageKind
  consent: Consent
  degree: number
  hasFile: boolean
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  kind: Relation['kind']
  directed: boolean
  certainty: Relation['certainty']
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Node and edge lists for the graph view, with each node's degree precomputed. */
export function graphData(project: Project): GraphData {
  const degree = new Map<string, number>()
  const present = new Set(project.images.map((i) => i.id))
  const edges: GraphEdge[] = []
  for (const r of project.relations) {
    if (!present.has(r.from) || !present.has(r.to)) continue
    edges.push({
      id: r.id,
      from: r.from,
      to: r.to,
      kind: r.kind,
      directed: r.directed,
      certainty: r.certainty,
    })
    degree.set(r.from, (degree.get(r.from) ?? 0) + 1)
    degree.set(r.to, (degree.get(r.to) ?? 0) + 1)
  }
  const nodes: GraphNode[] = project.images.map((img) => ({
    id: img.id,
    title: img.title,
    kind: img.kind,
    consent: img.consent,
    degree: degree.get(img.id) ?? 0,
    hasFile: !!img.file?.blobKey,
  }))
  return { nodes, edges }
}

/** Relations that touch a given image (either endpoint). */
export function relationsOf(project: Project, imageId: string): Relation[] {
  return project.relations.filter((r) => r.from === imageId || r.to === imageId)
}

/** Whether the published projection has any drawable coordinates at all. */
export function hasGeo(p: Project | PublicProject): boolean {
  if (p.atlas.place) return true
  return p.images.some((i) => i.subject || i.vantage)
}
