import { useStore } from '../state/store'
import { ConsentBadge, Dir } from '../components/ui'
import { ImageEditor } from './ImageEditor'
import { RelationEditor } from './RelationEditor'
import { AtlasEditor } from './AtlasEditor'

/**
 * The inspector shows one of three things, in priority order: the selected
 * relation, the selected image, or (the home state) the atlas identity itself.
 */
export function Inspector() {
  const project = useStore((s) => s.project)
  const selectedImageId = useStore((s) => s.selectedImageId)
  const selectedRelationId = useStore((s) => s.selectedRelationId)

  const relation = selectedRelationId
    ? project.relations.find((r) => r.id === selectedRelationId)
    : undefined
  const image = selectedImageId
    ? project.images.find((i) => i.id === selectedImageId)
    : undefined

  if (relation) {
    return (
      <>
        <div className="panel-head">
          <span className="label"><span className="label-num">RL</span>Relation</span>
        </div>
        <div className="scroll-y grow">
          <RelationEditor relation={relation} />
        </div>
      </>
    )
  }

  if (image) {
    return (
      <>
        <div className="panel-head">
          <span className="label"><span className="label-num">IM</span>Image</span>
          <ConsentBadge consent={image.consent} />
        </div>
        <div className="inspector-title">
          <Dir text={image.title} />
        </div>
        <div className="scroll-y grow">
          <ImageEditor image={image} />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="panel-head">
        <span className="label"><span className="label-num">AT</span>Atlas</span>
      </div>
      <div className="scroll-y grow">
        <AtlasEditor />
      </div>
    </>
  )
}
