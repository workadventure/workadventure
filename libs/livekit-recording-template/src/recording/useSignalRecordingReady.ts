import { useEffect } from "react";
import EgressHelper from "@livekit/egress-sdk";
import { type Room, Track } from "livekit-client";

const POLL_MS = 100;
const FRAME_DECODE_TIMEOUT_MS = 5000;

function hasDecodedVideoFrames(track: {
    getRTCStatsReport: () => Promise<RTCStatsReport | undefined>;
}): Promise<boolean> {
    return track.getRTCStatsReport().then((stats) => {
        if (!stats) {
            return false;
        }
        for (const report of stats.values()) {
            if (report.type !== "inbound-rtp") {
                continue;
            }
            const inbound = report as RTCInboundRtpStreamStats;
            if (typeof inbound.framesDecoded === "number" && inbound.framesDecoded > 0) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Registers the room with {@link EgressHelper} and calls `startRecording()` when media is ready,
 * following the same readiness rules as LiveKit's default egress template.
 */
export function useSignalRecordingReady(room: Room | undefined): void {
    useEffect(() => {
        if (!room) {
            return;
        }

        EgressHelper.setRoom(room);

        const startedAt = Date.now();
        const intervalId = window.setInterval(() => {
            const poll = async (): Promise<void> => {
                let hasSubscribedTracks = false;
                let hasVideoTracks = false;
                const videoTracks: Array<{ getRTCStatsReport: () => Promise<RTCStatsReport | undefined> }> = [];

                for (const participant of room.remoteParticipants.values()) {
                    for (const publication of participant.trackPublications.values()) {
                        if (publication.isSubscribed) {
                            hasSubscribedTracks = true;
                        }
                        if (publication.kind === Track.Kind.Video && publication.track) {
                            hasVideoTracks = true;
                            videoTracks.push(publication.track);
                        }
                    }
                }

                const decodedFlags = await Promise.all(videoTracks.map((t) => hasDecodedVideoFrames(t)));
                const hasDecodedFrames = decodedFlags.some(Boolean);

                const elapsed = Date.now() - startedAt;
                let shouldStart = false;
                if (hasDecodedFrames) {
                    shouldStart = true;
                } else if (!hasVideoTracks && hasSubscribedTracks && elapsed > 500) {
                    shouldStart = true;
                } else if (elapsed > FRAME_DECODE_TIMEOUT_MS && hasSubscribedTracks) {
                    shouldStart = true;
                }

                if (shouldStart) {
                    EgressHelper.startRecording();
                    window.clearInterval(intervalId);
                }
            };

            poll().catch(() => {});
        }, POLL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [room]);
}
