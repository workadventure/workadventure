import { useMemo } from "react";
import type { RemoteTrackPublication, Room } from "livekit-client";
import { useSpeakerFeaturedPublication } from "../hooks/useSpeakerFeaturedPublication";
import { VideoTile } from "./VideoTile";

const MAX_SIDEBAR_TILES = 16;

export type RecordingSpeakerLayoutProps = {
    room: Room | undefined;
    publications: RemoteTrackPublication[];
};

/**
 * ~88% main (dominant screen share or active speaker), ~12% right column of other participants (max 16, no scroll).
 */
export function RecordingSpeakerLayout({ room, publications }: RecordingSpeakerLayoutProps): JSX.Element {
    const featured = useSpeakerFeaturedPublication(room, publications);

    const sidebar = useMemo(() => {
        if (!featured) {
            return [];
        }
        return publications.filter((p) => p.trackSid !== featured.trackSid).slice(0, MAX_SIDEBAR_TILES);
    }, [publications, featured]);

    if (!featured) {
        return <div className="recording-template__mosaic recording-template__mosaic--empty" />;
    }

    return (
        <div className="recording-template__speaker">
            <div className="recording-template__speaker-main">
                <VideoTile publication={featured} variant="speaker-main" />
            </div>
            <div className="recording-template__speaker-rail">
                {sidebar.map((publication) => (
                    <VideoTile key={publication.trackSid} publication={publication} variant="speaker-sidebar" />
                ))}
            </div>
        </div>
    );
}
