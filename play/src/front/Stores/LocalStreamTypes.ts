export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

export interface StreamSuccessValue {
    type: "success";
    stream: MediaStream | undefined;
}

export interface StreamErrorValue {
    type: "error";
    error: Error;
}

export type LocalTrackStoreValue = TrackSuccessValue | StreamErrorValue;

export interface TrackSuccessValue {
    type: "success";
    track: MediaStreamTrack | undefined;
}

export function getLocalTrackFromStreamValue(
    streamValue: LocalStreamStoreValue,
    kind: "audio" | "video",
): LocalTrackStoreValue {
    if (streamValue.type === "error") {
        return streamValue;
    }

    const tracks = kind === "audio" ? streamValue.stream?.getAudioTracks() : streamValue.stream?.getVideoTracks();

    return {
        type: "success",
        track: tracks?.[0],
    };
}

export function composeLocalStreamValue(
    audioTrackValue: LocalTrackStoreValue,
    videoTrackValue: LocalTrackStoreValue,
    hasSourceStream: boolean,
): LocalStreamStoreValue {
    if (audioTrackValue.type === "error") {
        return audioTrackValue;
    }

    if (videoTrackValue.type === "error") {
        return videoTrackValue;
    }

    const tracks = [videoTrackValue.track, audioTrackValue.track].filter(
        (track): track is MediaStreamTrack => track !== undefined,
    );

    return {
        type: "success",
        stream: tracks.length > 0 || hasSourceStream ? new MediaStream(tracks) : undefined,
    };
}
