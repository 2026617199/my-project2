import type { NodeTypes } from '@xyflow/react'

import ImageNode from './ImageNode'
import TextNode from './TextNode'
import VideoNode from './VideoNode'

export const canvasNodeTypes: NodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
}
