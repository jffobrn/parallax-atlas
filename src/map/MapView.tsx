import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer } from '@deck.gl/core'
import { useStore } from '../state/store'
import { getResection } from '../lib/derive'
import { buildMapLayers } from './layers'
import {
  graticuleLines,
  makeBasemapStyle,
  registerPmtilesProtocol,
  type Bounds,
} from './basemap'
import { CrossingCard } from './CrossingCard'

/**
 * The map view: camera positions and their sightlines. Several vantages on one
 * object cross and resect it. Reuses the Sightlines map core (a synthetic
 * graticule that fetches no tiles, so the area of interest never leaks; real
 * tiles, when wanted, come from a bundled PMTiles archive).
 */
export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const loadedRef = useRef(false)

  const project = useStore((s) => s.project)
  const selectedImageId = useStore((s) => s.selectedImageId)
  const hoveredId = useStore((s) => s.hoveredId)
  const placing = useStore((s) => s.placing)

  const resection = useMemo(() => getResection(project), [project])

  // Keep the latest data for imperative rebuilds (on map move).
  const dataRef = useRef({ project, selectedImageId, hoveredId, resection })
  dataRef.current = { project, selectedImageId, hoveredId, resection }

  const buildLayers = (): Layer[] => {
    const map = mapRef.current
    if (!map) return []
    const b = map.getBounds()
    const bounds: Bounds = {
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    }
    const d = dataRef.current
    return buildMapLayers({
      project: d.project,
      selectedImageId: d.selectedImageId,
      hoveredId: d.hoveredId,
      resection: d.resection,
      graticule: graticuleLines(bounds),
      onPickImage: (id) => useStore.getState().selectImage(id),
    })
  }

  const rebuild = () => {
    if (!loadedRef.current || !overlayRef.current) return
    overlayRef.current.setProps({ layers: buildLayers() })
  }

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return
    registerPmtilesProtocol()

    const s = useStore.getState().project
    const anchor =
      s.atlas.place ??
      s.images.find((x) => x.subject)?.subject ??
      s.images.find((x) => x.vantage)?.vantage
    const center: [number, number] = anchor
      ? [anchor.lng, anchor.lat]
      : [-19.85, 34.405]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeBasemapStyle(),
      center,
      zoom: 16.2,
      attributionControl: false,
      dragRotate: false,
      maxPitch: 0,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
    overlayRef.current = overlay
    map.addControl(overlay)

    map.on('load', () => {
      loadedRef.current = true
      fitToData(map, useStore.getState().project)
      rebuild()
    })
    map.on('move', rebuild)

    // Placement: a click while in placing mode drops the point.
    map.on('click', (e) => {
      const p = useStore.getState().placing
      if (p) useStore.getState().applyPlacement(e.lngLat.lat, e.lngLat.lng)
    })

    // Cursor readout, throttled to one update per frame.
    let raf = 0
    let pending: { lat: number; lng: number } | null = null
    map.on('mousemove', (e) => {
      pending = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (pending) useStore.getState().setCursor(pending)
      })
    })
    map.on('mouseout', () => useStore.getState().setCursor(null))

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      map.remove()
      mapRef.current = null
      overlayRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild layers whenever the data the map draws from changes.
  useEffect(() => {
    rebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, selectedImageId, hoveredId, resection])

  // Crosshair cursor while placing.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = placing ? 'crosshair' : ''
  }, [placing])

  return (
    <>
      <div className="map-fill" ref={containerRef} />
      <MapPlacementBanner />
      <CrossingCard resection={resection} />
      <MapLegend />
    </>
  )
}

/**
 * Frame the map to all placed points on load. A dispersed corpus can spread
 * much wider than a single incident, so a fixed zoom would open on emptiness;
 * fitting the points shows the camera positions and their crossing at once.
 */
function fitToData(map: maplibregl.Map, project: ReturnType<typeof useStore.getState>['project']) {
  const pts: [number, number][] = []
  if (project.atlas.place) pts.push([project.atlas.place.lng, project.atlas.place.lat])
  for (const img of project.images) {
    if (img.subject) pts.push([img.subject.lng, img.subject.lat])
    if (img.vantage) pts.push([img.vantage.lng, img.vantage.lat])
  }
  if (pts.length < 2) return
  const bounds = pts.reduce(
    (b, p) => b.extend(p),
    new maplibregl.LngLatBounds(pts[0], pts[0]),
  )
  map.fitBounds(bounds, { padding: 80, maxZoom: 16.5, duration: 0 })
}

function MapPlacementBanner() {
  const placing = useStore((s) => s.placing)
  const setPlacing = useStore((s) => s.setPlacing)
  if (!placing) return null
  const what =
    placing.kind === 'atlas-place'
      ? 'atlas place'
      : placing.kind === 'subject'
        ? 'subject point'
        : 'camera vantage'
  return (
    <div className="map-banner">
      <span>
        Click the map to place the <b>{what}</b>
      </span>
      <button className="btn btn-sm btn-ghost" onClick={() => setPlacing(null)}>
        Cancel
      </button>
    </div>
  )
}

function MapLegend() {
  return (
    <div className="map-legend mono">
      <div className="legend-row"><span className="sw sw-vantage" /> vantage</div>
      <div className="legend-row"><span className="sw sw-subject" /> subject</div>
      <div className="legend-row"><span className="sw sw-cross" /> crossing</div>
      <div className="legend-row"><span className="sw sw-place" /> atlas place</div>
      <div className="legend-row"><span className="sw sw-unsafe" /> protected</div>
    </div>
  )
}
