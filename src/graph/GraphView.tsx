import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { graphData, type GraphNode } from '../lib/derive'
import { forceLayout, type Pos } from '../lib/graphLayout'
import { RELATION_KIND_SHORT } from '../components/ui'
import { dirOf } from '../core'

/**
 * The relations graph: the operative model, the image complex as a navigable
 * structure. Images are nodes; typed relations are edges. A d3-force layout is
 * computed once per topology change and then frozen, so selection and hover
 * never disturb the arrangement. Pan with the background, zoom with the wheel,
 * drag a node to reposition it, click to select, double-click to look closely.
 * When a relation gesture is in progress, a click completes the edge.
 */

const NODE = {
  public: '#d8d2c0',
  restricted: '#f3a93c',
  embargoed: '#e5544b',
}

function nodeColor(n: GraphNode): string {
  return n.consent === 'embargoed'
    ? NODE.embargoed
    : n.consent === 'restricted'
      ? NODE.restricted
      : NODE.public
}

function nodeRadius(n: GraphNode): number {
  return 8 + Math.min(7, n.degree * 1.3)
}

interface ViewT {
  tx: number
  ty: number
  k: number
}

function fitView(positions: Map<string, Pos>, w: number, h: number): ViewT {
  const pts = [...positions.values()]
  if (pts.length === 0) return { tx: w / 2, ty: h / 2, k: 1 }
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const pad = 90
  const k = Math.min(2, Math.max(0.25, Math.min((w - pad) / spanX, (h - pad) / spanY)))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return { tx: w / 2 - cx * k, ty: h / 2 - cy * k, k }
}

export function GraphView() {
  const project = useStore((s) => s.project)
  const selectedImageId = useStore((s) => s.selectedImageId)
  const selectedRelationId = useStore((s) => s.selectedRelationId)
  const hoveredId = useStore((s) => s.hoveredId)
  const linkingFromId = useStore((s) => s.linkingFromId)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const { nodes, edges } = useMemo(() => graphData(project), [project])

  // A signature that changes only when the topology changes, so the layout is
  // recomputed on add/remove of a node or edge, not on selection or hover.
  const topoKey = useMemo(
    () =>
      nodes.map((n) => n.id).join(',') +
      '|' +
      edges.map((e) => `${e.from}>${e.to}`).join(','),
    [nodes, edges],
  )

  const baseLayout = useMemo(
    () => forceLayout(nodes.map((n) => n.id), edges.map((e) => ({ from: e.from, to: e.to }))),
    [topoKey], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [positions, setPositions] = useState<Map<string, Pos>>(baseLayout)
  const [view, setView] = useState<ViewT>(() => fitView(baseLayout, size.w, size.h))

  useEffect(() => {
    setPositions(baseLayout)
    setView(fitView(baseLayout, wrapRef.current?.clientWidth ?? size.w, wrapRef.current?.clientHeight ?? size.h))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayout])

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // Cancel a linking gesture with Escape.
  useEffect(() => {
    if (!linkingFromId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().cancelLink()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkingFromId])

  // ---- interaction: pan, zoom, node drag ----
  const pan = useRef<{ x0: number; y0: number; tx0: number; ty0: number } | null>(null)
  const nodeDrag = useRef<{ id: string; moved: boolean } | null>(null)

  const toWorld = (clientX: number, clientY: number): Pos => {
    const rect = wrapRef.current?.getBoundingClientRect()
    const px = clientX - (rect?.left ?? 0)
    const py = clientY - (rect?.top ?? 0)
    return { x: (px - view.tx) / view.k, y: (py - view.ty) / view.k }
  }

  const onBgPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    pan.current = { x0: e.clientX, y0: e.clientY, tx0: view.tx, ty0: view.ty }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (nodeDrag.current) {
      const w = toWorld(e.clientX, e.clientY)
      const id = nodeDrag.current.id
      nodeDrag.current.moved = true
      setPositions((prev) => {
        const next = new Map(prev)
        next.set(id, { x: w.x, y: w.y })
        return next
      })
      return
    }
    if (pan.current) {
      setView((v) => ({
        ...v,
        tx: pan.current!.tx0 + (e.clientX - pan.current!.x0),
        ty: pan.current!.ty0 + (e.clientY - pan.current!.y0),
      }))
    }
  }

  const onPointerUp = () => {
    pan.current = null
    nodeDrag.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    const px = e.clientX - (rect?.left ?? 0)
    const py = e.clientY - (rect?.top ?? 0)
    const factor = Math.exp(-e.deltaY * 0.0014)
    setView((v) => {
      const k = Math.min(4, Math.max(0.15, v.k * factor))
      // Keep the point under the cursor fixed while zooming.
      const wx = (px - v.tx) / v.k
      const wy = (py - v.ty) / v.k
      return { k, tx: px - wx * k, ty: py - wy * k }
    })
  }

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    nodeDrag.current = { id, moved: false }
  }

  const onNodePointerUp = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    const wasDrag = nodeDrag.current?.moved
    nodeDrag.current = null
    if (wasDrag) return // a reposition, not a click
    if (useStore.getState().linkingFromId) {
      useStore.getState().completeLink(id)
    } else {
      useStore.getState().selectImage(id)
    }
  }

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  if (nodes.length === 0) {
    return (
      <div className="graph-view" ref={wrapRef}>
        <div className="plate-empty">
          The corpus is empty. Add images, then relate them to build the complex.
        </div>
      </div>
    )
  }

  const incident = (id: string) =>
    id === selectedImageId || id === hoveredId || id === linkingFromId

  return (
    <div className="graph-view" ref={wrapRef}>
      {linkingFromId && (
        <div className="map-banner">
          <span>
            Drawing a relation from{' '}
            <b>{nodeById.get(linkingFromId)?.title ?? 'image'}</b>: click a target
            node
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => useStore.getState().cancelLink()}>
            Cancel
          </button>
        </div>
      )}

      <svg
        className="graph-svg"
        width={size.w}
        height={size.h}
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: linkingFromId ? 'crosshair' : 'grab' }}
      >
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {/* edges */}
          {edges.map((e) => {
            const a = positions.get(e.from)
            const b = positions.get(e.to)
            if (!a || !b) return null
            const active =
              e.id === selectedRelationId ||
              ((e.from === hoveredId || e.to === hoveredId) && hoveredId !== null) ||
              ((e.from === selectedImageId || e.to === selectedImageId) &&
                selectedImageId !== null)
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            return (
              <g key={e.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? '#f3a93c' : '#38424f'}
                  strokeWidth={active ? 2 : 1.2}
                  strokeDasharray={e.certainty === 'uncertain' ? '4 3' : undefined}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    useStore.getState().selectRelation(e.id)
                  }}
                />
                {active && (
                  <text className="graph-edge-label" x={mx} y={my - 4} textAnchor="middle">
                    {RELATION_KIND_SHORT[e.kind]}
                  </text>
                )}
              </g>
            )
          })}

          {/* nodes */}
          {nodes.map((n) => {
            const p = positions.get(n.id)
            if (!p) return null
            const r = nodeRadius(n)
            const emph = incident(n.id)
            const col = nodeColor(n)
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: linkingFromId ? 'crosshair' : 'pointer' }}
                onPointerDown={(e) => onNodePointerDown(e, n.id)}
                onPointerUp={(e) => onNodePointerUp(e, n.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  useStore.getState().openLightbox(n.id)
                }}
                onPointerEnter={() => useStore.getState().hover(n.id)}
                onPointerLeave={() => useStore.getState().hover(null)}
              >
                {emph && (
                  <circle r={r + 5} fill="none" stroke="#f3a93c" strokeWidth={1.5} opacity={0.7} />
                )}
                <circle
                  r={r}
                  fill={col}
                  fillOpacity={n.hasFile ? 0.92 : 0.4}
                  stroke="#05070b"
                  strokeWidth={1.5}
                />
                {!n.hasFile && <circle r={r - 3} fill="none" stroke={col} strokeWidth={1} strokeDasharray="2 2" />}
                <text
                  className="graph-node-label"
                  x={0}
                  y={r + 12}
                  textAnchor="middle"
                  style={{ direction: dirOf(n.title) }}
                >
                  {n.title.length > 26 ? n.title.slice(0, 25) + '…' : n.title}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="stage-readout">
        {nodes.length} nodes / {edges.length} relations
      </div>
    </div>
  )
}
