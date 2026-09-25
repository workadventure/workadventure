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
    // isFirst / isLast give the first and last boxes an auto margin: this centers the row when it fits and keeps it
    // left-aligned (so fully scrollable) when it overflows. The container also has "justify-content: safe center",
    // which does the same, but "safe" is only supported from Chrome 115 / Safari 17.6. When those versions are old
    // enough, isFirst and isLast can be dropped.
    | { kind: "row"; order: number; width: number; isFirst: boolean; isLast: boolean }
    // Picture-in-picture window: the box fills its tile of the CSS grid.
    | { kind: "pipGrid"; tile: PipGridTile };
