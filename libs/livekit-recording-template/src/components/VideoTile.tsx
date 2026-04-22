import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { RemoteTrackPublication, Track } from "livekit-client";
import type { MosaicTilePlacement } from "../layout/mosaicLayoutPlans";

export type VideoTileProps = {
    publication: RemoteTrackPublication;
    /** Mosaic grid placement (CSS grid-column / grid-row). */
    mosaicPlacement?: MosaicTilePlacement;
};

/**
 * Renders a single subscribed remote video track inside a grid cell (mosaic: fills cell, object-fit contain).
 */
export function VideoTile({ publication, mosaicPlacement }: VideoTileProps): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const element = videoRef.current;
        const track = publication.track;
        if (!element || !track || track.kind !== Track.Kind.Video) {
            return;
        }
        track.attach(element);
        return () => {
            track.detach(element);
        };
    }, [publication, publication.track]);

    const placementStyle: CSSProperties | undefined = mosaicPlacement
        ? {
              gridColumn: mosaicPlacement.gridColumn,
              gridRow: mosaicPlacement.gridRow,
              minWidth: 0,
              minHeight: 0,
          }
        : undefined;

    return (
        <div className="recording-template__cell recording-template__cell--mosaic" style={placementStyle}>
            <video ref={videoRef} className="recording-template__video" muted playsInline />
        </div>
    );
}
