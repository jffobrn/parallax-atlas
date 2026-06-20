/**
 * Application state (Zustand). Holds the one project, the selection shared by
 * every view (rail, plate, graph, map, timeline), the active view and the
 * active Mnemosyne plate, the lightbox for close looking, the relation-linking
 * gesture, the map placement mode, and the time brush. Mutations persist to
 * IndexedDB on a short debounce. Media bytes never live here; only the typed
 * records do.
 */

import { create } from 'zustand'
import {
  clearProject,
  loadProject,
  newId,
  pruneMedia,
  saveProject,
  type Atlas,
  type GeoPoint,
  type Image,
  type ImageAnnotation,
  type Panel,
  type PanelItem,
  type Project,
  type Relation,
} from '../core'
import { buildSampleProject } from '../sample/sampleProject'

export type StageView = 'plate' | 'graph' | 'map'

/** What a map click will set next, if anything. */
export type Placing =
  | { kind: 'atlas-place' }
  | { kind: 'subject'; imageId: string }
  | { kind: 'vantage'; imageId: string }
  | null

export interface AppState {
  project: Project
  ready: boolean

  view: StageView
  activePanelId: string | null

  selectedImageId: string | null
  selectedRelationId: string | null
  hoveredId: string | null
  editingImageId: string | null

  /** The deep-zoom lightbox target, and whether a click adds an annotation. */
  lightboxImageId: string | null
  annotating: boolean

  /** In-progress relation gesture: the chosen source node awaits a target. */
  linkingFromId: string | null

  timeBrush: { start: number; end: number } | null
  placing: Placing
  cursor: { lat: number; lng: number } | null

  // lifecycle
  init: () => Promise<void>
  resetToSample: () => Promise<void>
  adoptProject: (project: Project) => void

  // atlas identity
  patchAtlas: (partial: Partial<Atlas>) => void

  // images
  addImage: (image: Image) => void
  updateImage: (id: string, partial: Partial<Image>) => void
  removeImage: (id: string) => void

  // relations
  addRelation: (relation: Relation) => void
  updateRelation: (id: string, partial: Partial<Relation>) => void
  removeRelation: (id: string) => void

  // panels (Mnemosyne plates)
  addPanel: () => void
  updatePanel: (id: string, partial: Partial<Panel>) => void
  removePanel: (id: string) => void
  setActivePanel: (id: string | null) => void
  addImageToPanel: (panelId: string, imageId: string) => void
  movePanelItem: (panelId: string, imageId: string, x: number, y: number) => void
  scalePanelItem: (panelId: string, imageId: string, scale: number) => void
  removeImageFromPanel: (panelId: string, imageId: string) => void

  // annotations (close looking)
  addAnnotation: (imageId: string, x: number, y: number, text: string) => void
  updateAnnotation: (imageId: string, annoId: string, text: string) => void
  removeAnnotation: (imageId: string, annoId: string) => void

  // selection / interaction
  selectImage: (id: string | null) => void
  selectRelation: (id: string | null) => void
  hover: (id: string | null) => void
  setEditingImage: (id: string | null) => void
  setView: (view: StageView) => void
  openLightbox: (id: string) => void
  closeLightbox: () => void
  setAnnotating: (on: boolean) => void
  setTimeBrush: (range: { start: number; end: number } | null) => void
  setCursor: (c: { lat: number; lng: number } | null) => void

  // relation gesture
  startLink: (fromId: string) => void
  completeLink: (toId: string) => void
  cancelLink: () => void

  // placement ("drop a station")
  setPlacing: (placing: Placing) => void
  applyPlacement: (lat: number, lng: number) => void
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(project: Project) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void saveProject(project)
    void pruneMedia(project)
  }, 400)
}

export const useStore = create<AppState>()((set, get) => {
  /** Apply a project mutation and queue a save. */
  const commit = (project: Project) => {
    set({ project })
    schedulePersist(project)
  }

  return {
    project: blankProject(),
    ready: false,

    view: 'plate',
    activePanelId: null,

    selectedImageId: null,
    selectedRelationId: null,
    hoveredId: null,
    editingImageId: null,

    lightboxImageId: null,
    annotating: false,

    linkingFromId: null,

    timeBrush: null,
    placing: null,
    cursor: null,

    async init() {
      const existing = await loadProject()
      if (existing) {
        set({ project: existing, ready: true, activePanelId: existing.panels[0]?.id ?? null })
        return
      }
      const sample = await buildSampleProject()
      await saveProject(sample)
      set({ project: sample, ready: true, activePanelId: sample.panels[0]?.id ?? null })
    },

    async resetToSample() {
      await clearProject()
      const sample = await buildSampleProject()
      await saveProject(sample)
      set({
        project: sample,
        activePanelId: sample.panels[0]?.id ?? null,
        selectedImageId: null,
        selectedRelationId: null,
        editingImageId: null,
        lightboxImageId: null,
        linkingFromId: null,
        timeBrush: null,
        placing: null,
      })
    },

    adoptProject(project) {
      set({
        project,
        activePanelId: project.panels[0]?.id ?? null,
        selectedImageId: null,
        selectedRelationId: null,
        editingImageId: null,
        lightboxImageId: null,
        linkingFromId: null,
        timeBrush: null,
        placing: null,
      })
      schedulePersist(project)
    },

    patchAtlas(partial) {
      const p = get().project
      commit({ ...p, atlas: { ...p.atlas, ...partial } })
    },

    addImage(image) {
      const p = get().project
      commit({ ...p, images: [...p.images, image] })
      set({ selectedImageId: image.id, selectedRelationId: null, editingImageId: image.id })
    },

    updateImage(id, partial) {
      const p = get().project
      commit({
        ...p,
        images: p.images.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      })
    },

    removeImage(id) {
      const p = get().project
      commit({
        ...p,
        images: p.images.filter((s) => s.id !== id),
        relations: p.relations.filter((r) => r.from !== id && r.to !== id),
        panels: p.panels.map((pl) => ({
          ...pl,
          items: pl.items.filter((it) => it.imageId !== id),
        })),
      })
      if (get().selectedImageId === id) set({ selectedImageId: null })
      if (get().editingImageId === id) set({ editingImageId: null })
      if (get().lightboxImageId === id) set({ lightboxImageId: null })
    },

    addRelation(relation) {
      const p = get().project
      commit({ ...p, relations: [...p.relations, relation] })
      set({ selectedRelationId: relation.id })
    },

    updateRelation(id, partial) {
      const p = get().project
      commit({
        ...p,
        relations: p.relations.map((r) => (r.id === id ? { ...r, ...partial } : r)),
      })
    },

    removeRelation(id) {
      const p = get().project
      commit({ ...p, relations: p.relations.filter((r) => r.id !== id) })
      if (get().selectedRelationId === id) set({ selectedRelationId: null })
    },

    addPanel() {
      const p = get().project
      const panel: Panel = {
        id: newId('panel'),
        titles: [{ text: `Plate ${p.panels.length + 1}`, lang: 'en' }],
        items: [],
        tags: [],
      }
      commit({ ...p, panels: [...p.panels, panel] })
      set({ activePanelId: panel.id })
    },

    updatePanel(id, partial) {
      const p = get().project
      commit({
        ...p,
        panels: p.panels.map((pl) => (pl.id === id ? { ...pl, ...partial } : pl)),
      })
    },

    removePanel(id) {
      const p = get().project
      const panels = p.panels.filter((pl) => pl.id !== id)
      commit({ ...p, panels })
      if (get().activePanelId === id) set({ activePanelId: panels[0]?.id ?? null })
    },

    setActivePanel(id) {
      set({ activePanelId: id })
    },

    addImageToPanel(panelId, imageId) {
      const p = get().project
      commit({
        ...p,
        panels: p.panels.map((pl) => {
          if (pl.id !== panelId) return pl
          if (pl.items.some((it) => it.imageId === imageId)) return pl
          // Place new tiles near the centre with a small deterministic offset so
          // several added in a row do not stack exactly.
          const n = pl.items.length
          const item: PanelItem = {
            imageId,
            x: 0.5 + ((n % 4) - 1.5) * 0.12,
            y: 0.5 + (Math.floor(n / 4) - 1) * 0.16,
            scale: 1,
          }
          return { ...pl, items: [...pl.items, item] }
        }),
      })
    },

    movePanelItem(panelId, imageId, x, y) {
      const p = get().project
      commit({
        ...p,
        panels: p.panels.map((pl) =>
          pl.id !== panelId
            ? pl
            : {
                ...pl,
                items: pl.items.map((it) =>
                  it.imageId === imageId
                    ? { ...it, x: clamp01(x), y: clamp01(y) }
                    : it,
                ),
              },
        ),
      })
    },

    scalePanelItem(panelId, imageId, scale) {
      const p = get().project
      const s = Math.max(0.4, Math.min(2.6, scale))
      commit({
        ...p,
        panels: p.panels.map((pl) =>
          pl.id !== panelId
            ? pl
            : {
                ...pl,
                items: pl.items.map((it) =>
                  it.imageId === imageId ? { ...it, scale: s } : it,
                ),
              },
        ),
      })
    },

    removeImageFromPanel(panelId, imageId) {
      const p = get().project
      commit({
        ...p,
        panels: p.panels.map((pl) =>
          pl.id !== panelId
            ? pl
            : { ...pl, items: pl.items.filter((it) => it.imageId !== imageId) },
        ),
      })
    },

    addAnnotation(imageId, x, y, text) {
      const p = get().project
      const anno: ImageAnnotation = { id: newId('anno'), x: clamp01(x), y: clamp01(y), text }
      commit({
        ...p,
        images: p.images.map((img) =>
          img.id === imageId
            ? { ...img, annotations: [...(img.annotations ?? []), anno] }
            : img,
        ),
      })
    },

    updateAnnotation(imageId, annoId, text) {
      const p = get().project
      commit({
        ...p,
        images: p.images.map((img) =>
          img.id === imageId
            ? {
                ...img,
                annotations: (img.annotations ?? []).map((a) =>
                  a.id === annoId ? { ...a, text } : a,
                ),
              }
            : img,
        ),
      })
    },

    removeAnnotation(imageId, annoId) {
      const p = get().project
      commit({
        ...p,
        images: p.images.map((img) =>
          img.id === imageId
            ? { ...img, annotations: (img.annotations ?? []).filter((a) => a.id !== annoId) }
            : img,
        ),
      })
    },

    selectImage(id) {
      set({ selectedImageId: id, selectedRelationId: null })
    },
    selectRelation(id) {
      set({ selectedRelationId: id, selectedImageId: null })
    },
    hover(id) {
      set({ hoveredId: id })
    },
    setEditingImage(id) {
      set({ editingImageId: id })
      if (id) set({ selectedImageId: id, selectedRelationId: null })
    },
    setView(view) {
      set({ view, linkingFromId: null })
    },
    openLightbox(id) {
      set({ lightboxImageId: id, annotating: false })
    },
    closeLightbox() {
      set({ lightboxImageId: null, annotating: false })
    },
    setAnnotating(on) {
      set({ annotating: on })
    },
    setTimeBrush(range) {
      set({ timeBrush: range })
    },
    setCursor(c) {
      set({ cursor: c })
    },

    startLink(fromId) {
      set({ linkingFromId: fromId })
    },
    completeLink(toId) {
      const fromId = get().linkingFromId
      if (!fromId || fromId === toId) {
        set({ linkingFromId: null })
        return
      }
      const p = get().project
      const exists = p.relations.some(
        (r) =>
          (r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId),
      )
      if (!exists) {
        get().addRelation({
          id: newId('rel'),
          from: fromId,
          to: toId,
          kind: 'same-object',
          directed: false,
          certainty: 'probable',
        })
      }
      set({ linkingFromId: null })
    },
    cancelLink() {
      set({ linkingFromId: null })
    },

    setPlacing(placing) {
      set({ placing })
    },

    applyPlacement(lat, lng) {
      const placing = get().placing
      if (!placing) return
      const p = get().project
      // Round to ~0.1 m so a placed point does not carry floating-point noise.
      lat = Math.round(lat * 1e6) / 1e6
      lng = Math.round(lng * 1e6) / 1e6

      if (placing.kind === 'atlas-place') {
        const prev = p.atlas.place
        const place = {
          lat,
          lng,
          safeToPublish: prev?.safeToPublish ?? true,
          name: prev?.name,
        }
        commit({ ...p, atlas: { ...p.atlas, place } })
        set({ placing: null })
        return
      }

      const image = p.images.find((s) => s.id === placing.imageId)
      if (!image) {
        set({ placing: null })
        return
      }

      if (placing.kind === 'subject') {
        const prev = image.subject
        const subject: GeoPoint = {
          lat,
          lng,
          safeToPublish: prev?.safeToPublish ?? true,
        }
        get().updateImage(image.id, { subject })
      } else {
        const prev = image.vantage
        const vantage = {
          lat,
          lng,
          safeToPublish: prev?.safeToPublish ?? true,
          bearingDeg: prev?.bearingDeg ?? 0,
          fovDeg: prev?.fovDeg,
          confidence: prev?.confidence ?? ('probable' as const),
        }
        get().updateImage(image.id, { vantage })
      }
      set({ placing: null })
    },
  }
})

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function blankProject(): Project {
  return {
    atlas: {
      id: 'atlas',
      titles: [{ text: 'Untitled atlas', lang: 'en' }],
      subject: 'object',
      window: { precision: 'day' },
      tags: [],
    },
    images: [],
    relations: [],
    panels: [],
  }
}
