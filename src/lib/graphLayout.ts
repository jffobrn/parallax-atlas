/**
 * A force-directed layout for the relations graph, shared by the live graph
 * view and the published dossier so the two agree. Initial positions are seeded
 * deterministically on a ring (by index), then relaxed by a fixed number of
 * d3-force ticks, so the same topology lays out the same way each time.
 */

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force'

interface SimNode extends SimulationNodeDatum {
  id: string
}

export interface LayoutEdge {
  from: string
  to: string
}

export interface Pos {
  x: number
  y: number
}

export function forceLayout(
  nodeIds: string[],
  edges: LayoutEdge[],
): Map<string, Pos> {
  const sim: SimNode[] = nodeIds.map((id, i) => {
    const a = (i / Math.max(1, nodeIds.length)) * Math.PI * 2
    const r = nodeIds.length > 1 ? 150 : 0
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
  const links = edges.map((e) => ({ source: e.from, target: e.to }))
  const simulation = forceSimulation(sim)
    .force('charge', forceManyBody().strength(-320))
    .force(
      'link',
      forceLink(links)
        .id((d) => (d as SimNode).id)
        .distance(120)
        .strength(0.65),
    )
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(38))
    .stop()
  for (let i = 0; i < 360; i++) simulation.tick()
  const out = new Map<string, Pos>()
  for (const n of sim) out.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 })
  return out
}
