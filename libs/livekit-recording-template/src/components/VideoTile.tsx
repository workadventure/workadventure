import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import type { RemoteTrackPublication } from "livekit-client";
import { Track } from "livekit-client";
import type { MosaicTilePlacement } from "../layout/mosaicLayoutPlans";

export type VideoTileProps = {
    publication: RemoteTrackPublication;
    /** Mosaic grid placement (CSS grid-column / grid-row). */
    mosaicPlacement?: MosaicTilePlacement;
    /** Layout variant; mosaic uses {@link mosaicPlacement}. */
    variant?: "mosaic" | "speaker-main" | "speaker-sidebar";
};

/**
 * Renders a single subscribed remote video track inside a grid cell (mosaic: fills cell, object-fit contain).
 */
export function VideoTile({ publication, mosaicPlacement, variant = "mosaic" }: VideoTileProps): JSX.Element {
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

    const placementStyle: CSSProperties | undefined =
        variant === "mosaic" && mosaicPlacement
            ? {
                  gridColumn: mosaicPlacement.gridColumn,
                  gridRow: mosaicPlacement.gridRow,
                  minWidth: 0,
                  minHeight: 0,
              }
            : variant === "mosaic"
            ? { minWidth: 0, minHeight: 0 }
            : undefined;

    const cellClass =
        variant === "speaker-main"
            ? "recording-template__cell recording-template__cell--speaker-main"
            : variant === "speaker-sidebar"
            ? "recording-template__cell recording-template__cell--speaker-sidebar"
            : "recording-template__cell recording-template__cell--mosaic";

    return (
        <div className={cellClass} style={placementStyle}>
            <video ref={videoRef} className="recording-template__video" muted playsInline />
        </div>
    );
}
