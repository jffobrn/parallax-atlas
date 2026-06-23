import { useState } from 'react'
import {
  formatDateTimeShort,
  newId,
  type Image,
} from '../core'
import { useStore } from '../state/store'
import { useMediaUrl } from '../state/useMediaUrl'
import { allTags, relationsOf } from '../lib/derive'
import { ConsentBadge, Dir, KindBadge, RELATION_KIND_SHORT, rowButton } from '../components/ui'

type ConsentFilter = 'all' | 'public' | 'protected'

/**
 * The rail: the atlas identity at the top, then the corpus, faceted by consent
 * and tag, then the relations. Selecting anything here drives every other view.
 */
export function Rail() {
  const project = useStore((s) => s.project)
  const selectedImageId = useStore((s) => s.selectedImageId)
  const selectedRelationId = useStore((s) => s.selectedRelationId)
  const hoveredId = useStore((s) => s.hoveredId)

  const [consentFilter, setConsentFilter] = useState<ConsentFilter>('all')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  const atlas = project.atlas
  const home = !selectedImageId && !selectedRelationId

  const tags = allTags(project)
  const toggleTag = (t: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const images = project.images.filter((img) => {
    if (consentFilter === 'public' && img.consent !== 'public') return false
    if (consentFilter === 'protected' && img.consent === 'public') return false
    if (activeTags.size && !img.tags.some((t) => activeTags.has(t))) return false
    return true
  })

  const onAddImage = () => {
    const img: Image = {
      id: newId('img'),
      kind: 'photograph',
      title: 'Untitled image',
      consent: 'public',
      tags: [],
    }
    useStore.getState().addImage(img)
  }

  return (
    <>
      {/* Atlas identity / open the atlas editor */}
      <button
        className="atlas-card"
        data-active={home}
        onClick={() => {
          useStore.getState().selectImage(null)
          useStore.getState().selectRelation(null)
        }}
      >
        <div className="between">
          <span className="label"><span className="label-num">01</span>Atlas</span>
          <span className="tag">{atlas.subject}</span>
        </div>
        <div className="atlas-titles">
          {atlas.titles.map((t, i) => (
            <div key={i} className={i === 0 ? 'atlas-title' : 'atlas-title-alt'}>
              <Dir text={t.text || 'Untitled'} />
            </div>
          ))}
        </div>
        <div className="row-sub" style={{ padding: 0 }}>
          {atlas.window.start ? formatDateTimeShort(atlas.window.start, atlas.window.precision) : 'no window'}
          {atlas.window.end ? ` -> ${formatDateTimeShort(atlas.window.end, atlas.window.precision)}` : ''}
        </div>
      </button>

      {/* Corpus */}
      <div className="panel">
        <div className="panel-head">
          <span className="label"><span className="label-num">02</span>Corpus</span>
          <span className="faint mono" style={{ fontSize: 11 }}>{images.length}/{project.images.length}</span>
          <button className="btn btn-sm btn-ghost" onClick={onAddImage}>+ Image</button>
        </div>

        <div className="facet-row">
          {(['all', 'public', 'protected'] as ConsentFilter[]).map((c) => (
            <button key={c} className="facet" data-on={consentFilter === c} onClick={() => setConsentFilter(c)}>
              {c}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="facet-row">
            {tags.map((t) => (
              <button key={t} className="facet" data-on={activeTags.has(t)} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="list">
          {images.length === 0 && <div className="empty">No images match.</div>}
          {images.map((img) => (
            <ImageRow
              key={img.id}
              image={img}
              selected={img.id === selectedImageId}
              hovered={img.id === hoveredId && img.id !== selectedImageId}
            />
          ))}
        </div>
      </div>

      {/* Relations */}
      <div className="panel">
        <div className="panel-head">
          <span className="label"><span className="label-num">03</span>Relations</span>
          <span className="faint mono" style={{ fontSize: 11 }}>{project.relations.length}</span>
        </div>
        <div className="list">
          {project.relations.length === 0 && (
            <div className="empty">
              No relations yet. Select an image and use Relate, or click two nodes in the graph.
            </div>
          )}
          {project.relations.map((r) => {
            const from = project.images.find((i) => i.id === r.from)
            const to = project.images.find((i) => i.id === r.to)
            return (
              <div
                key={r.id}
                className="row"
                data-selected={r.id === selectedRelationId}
                {...rowButton(() => useStore.getState().selectRelation(r.id))}
              >
                <div className="row-main">
                  <div className="row-sub" style={{ marginTop: 0 }}>
                    <span className="rel-kind">{RELATION_KIND_SHORT[r.kind]}</span>
                  </div>
                  <div className="row-title" style={{ fontSize: 12 }}>
                    <Dir text={from?.title ?? '?'} /> <span className="faint">{r.directed ? '→' : '↔'}</span>{' '}
                    <Dir text={to?.title ?? '?'} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function ImageRow({
  image,
  selected,
  hovered,
}: {
  image: Image
  selected: boolean
  hovered: boolean
}) {
  const url = useMediaUrl(image.file?.blobKey)
  const project = useStore((s) => s.project)
  const degree = relationsOf(project, image.id).length

  return (
    <div
      className="row"
      data-selected={selected}
      data-hovered={hovered}
      {...rowButton(() => useStore.getState().selectImage(image.id))}
      onMouseEnter={() => useStore.getState().hover(image.id)}
      onMouseLeave={() => useStore.getState().hover(null)}
    >
      {url ? (
        <img className="img-thumb" src={url} alt="" />
      ) : (
        <span className="img-thumb-empty">◫</span>
      )}
      <div className="row-main">
        <div className="row-title"><Dir text={image.title} /></div>
        <div className="row-sub">
          <KindBadge kind={image.kind} />
          <ConsentBadge consent={image.consent} />
          {image.vantage && <span title="has a vantage">V</span>}
          {image.subject && <span title="has a subject">S</span>}
          {degree > 0 && <span title="relations">·{degree}</span>}
          {image.datetime && <span>{formatDateTimeShort(image.datetime.value, image.datetime.precision)}</span>}
        </div>
      </div>
    </div>
  )
}
