import { useEffect, useMemo, useState } from "react";
import { Room } from "livekit-client";
import { type EgressConnectionParams, readEgressConnectionParams } from "../recording/readEgressConnectionParams";
import { RECORDING_TEMPLATE_VERIFICATION_TITLE } from "../recording/recordingTemplateVerification";
import { useSignalRecordingReady } from "../recording/useSignalRecordingReady";
import { useRemoteVideoPublications } from "../hooks/useRemoteVideoPublications";
import { RecordingVideoMosaic } from "./RecordingVideoMosaic";

type BootstrapState =
    | { status: "idle" }
    | { status: "error"; message: string }
    | { status: "ready"; params: EgressConnectionParams };

export type RecordingRoomTemplateProps = {
    /**
     * When omitted, reads LiveKit egress `url` / `token` / `layout` from the page query string once.
     * For stable behavior, memoize this object in the parent when it is derived from props/state.
     */
    connection?: EgressConnectionParams;
};

/**
 * Minimal LiveKit Room Composite template: connects as the egress recorder, lays out remote
 * video tracks in a responsive grid, then signals readiness to the egress recorder.
 */
export function RecordingRoomTemplate({ connection: connectionProp }: RecordingRoomTemplateProps): JSX.Element {
    const [bootstrap, setBootstrap] = useState<BootstrapState>({ status: "idle" });
    const [room, setRoom] = useState<Room | undefined>();

    useEffect(() => {
        document.title = RECORDING_TEMPLATE_VERIFICATION_TITLE;
    }, []);

    const connectionKey = useMemo(() => {
        if (connectionProp === undefined) {
            return "__from_window_location__";
        }
        return `${connectionProp.serverUrl}\u0000${connectionProp.token}\u0000${connectionProp.layout}`;
    }, [connectionProp]);

    useEffect(() => {
        if (connectionKey === "__from_window_location__") {
            try {
                setBootstrap({ status: "ready", params: readEgressConnectionParams() });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Missing LiveKit egress parameters";
                setBootstrap({ status: "error", message });
            }
            return;
        }
        if (!connectionProp) {
            return;
        }
        setBootstrap({ status: "ready", params: connectionProp });
    }, [connectionKey, connectionProp]);

    useEffect(() => {
        if (bootstrap.status !== "ready") {
            return;
        }
        const { serverUrl, token } = bootstrap.params;
        if (!serverUrl || !token) {
            setBootstrap({ status: "error", message: "Missing serverUrl or token" });
            return;
        }

        const livekitRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
        });

        let cancelled = false;

        void livekitRoom
            .connect(serverUrl, token)
            .then(() => {
                if (!cancelled) {
                    setRoom(livekitRoom);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setBootstrap({
                        status: "error",
                        message: err instanceof Error ? err.message : "Failed to connect to LiveKit",
                    });
                }
            });

        return () => {
            cancelled = true;
            setRoom(undefined);
            void livekitRoom.disconnect();
        };
    }, [bootstrap]);

    useSignalRecordingReady(room);

    const publications = useRemoteVideoPublications(room);

    if (bootstrap.status === "error") {
        return (
            <div className="recording-template recording-template--error">
                <header className="recording-template__verification-bar">{RECORDING_TEMPLATE_VERIFICATION_TITLE}</header>
                <p className="recording-template__error">{bootstrap.message}</p>
            </div>
        );
    }

    const layout = bootstrap.status === "ready" ? bootstrap.params.layout : undefined;

    return (
        <div className="recording-template" data-layout={layout}>
            <header className="recording-template__verification-bar">{RECORDING_TEMPLATE_VERIFICATION_TITLE}</header>
            <RecordingVideoMosaic publications={publications} />
        </div>
    );
}
