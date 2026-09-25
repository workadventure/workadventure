import type { PipGridTile } from "./PictureInPicture/pictureInPictureGridLayout";

/**
 * How a video box is laid out in the cameras container. Each case only carries the data it needs.
 *
 * "order" is the position of the box in the display order (see orderedStreamableCollectionStore). It is applied
 * with the CSS "order" property so that reordering the boxes never moves their DOM nodes (moving a <video> element
 * can interrupt the playback of its WebRTC / LiveKit stream).
 */
export type VideoBoxLayout =
    // Multi-line layout, the videos wrap. Without a height, the box keeps a 16:9 ratio.
    | { kind: "grid"; order: number; width: number; height?: number }
    // Single horizontal line. The box keeps a 16:9 ratio.
    | { kind: "row"; order: number; width: number }
    // Picture-in-picture window: the box fills its tile of the CSS grid.
    | { kind: "pipGrid"; tile: PipGridTile };
