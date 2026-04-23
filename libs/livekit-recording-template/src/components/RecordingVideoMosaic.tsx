import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { RemoteTrackPublication } from "livekit-client";
import { getMosaicLayoutPlan, MAX_MOSAIC_VIDEOS } from "../layout/mosaicLayoutPlans";
import { VideoTile } from "./VideoTile";

export type RecordingVideoMosaicProps = {
    publications: RemoteTrackPublication[];
};

/** Full-viewport mosaic for up to {@link MAX_MOSAIC_VIDEOS} video tracks; layout chosen from tile count. */
export function RecordingVideoMosaic({ publications }: RecordingVideoMosaicProps): JSX.Element {
    const visible = useMemo(() => publications.slice(0, MAX_MOSAIC_VIDEOS), [publications]);

    const plan = useMemo(() => {
        const n = visible.length;
        if (n === 0) {
            return null;
        }
        return getMosaicLayoutPlan(n);
    }, [visible]);

    if (!plan) {
        return <div className="recording-template__mosaic recording-template__mosaic--empty" />;
    }

    const gridStyle: CSSProperties = {
        display: "grid",
        gridTemplateColumns: plan.templateColumns,
        gridTemplateRows: plan.templateRows,
    };

    return (
        <div className="recording-template__mosaic" style={gridStyle}>
            {visible.map((publication, index) => (
                <VideoTile key={publication.trackSid} publication={publication} mosaicPlacement={plan.tiles[index]} />
            ))}
        </div>
    );
}
