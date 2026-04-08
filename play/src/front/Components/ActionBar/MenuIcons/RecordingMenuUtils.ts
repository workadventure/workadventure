import type { SpaceInterface } from "../../../Space/SpaceInterface";
import { recordingSchema } from "../../../Space/SpaceMetadataValidator";
import type { RecordingState } from "../../../Stores/RecordingStore";

export type RecordingRowStatus = "available" | "starting" | "stopping" | "recording-self" | "recording-other";
export type RecordingRowAction = "start" | "stop" | null;
export type RecordingSpaceKind = "discussion" | "megaphone";

export interface RecordingSpaceRow {
    action: RecordingRowAction;
    disabled: boolean;
    kind: RecordingSpaceKind;
    recorderName: string;
    recorderSpaceUserId: string | null;
    space: SpaceInterface;
    spaceName: string;
    status: RecordingRowStatus;
}

function isMegaphoneSpace(space: SpaceInterface): boolean {
    return space.getMetadata().get("isMegaphoneSpace") === true;
}

function getSpaceLiveRecordingState(space: SpaceInterface, recordingState: RecordingState) {
    const storeEntry = recordingState.recordingsBySpace[space.getName()];
    if (storeEntry) {
        return {
            isRecording: true,
            isCurrentUserRecorder: storeEntry.isCurrentUserRecorder,
            recorderName: storeEntry.recorderName,
            recorderSpaceUserId: storeEntry.recorderSpaceUserId,
        };
    }

    const recordingMetadata = recordingSchema.safeParse(space.getMetadata().get("recording"));
    if (!recordingMetadata.success || !recordingMetadata.data.recording) {
        return {
            isRecording: false,
            isCurrentUserRecorder: false,
            recorderName: "unknown",
            recorderSpaceUserId: null,
        };
    }

    const recorderSpaceUserId = recordingMetadata.data.recorder ?? null;

    return {
        isRecording: true,
        isCurrentUserRecorder: false,
        recorderName: recorderSpaceUserId
            ? space.getSpaceUserBySpaceUserId(recorderSpaceUserId)?.name ?? "unknown"
            : "unknown",
        recorderSpaceUserId,
    };
}

export function getRecordingSpaceRows(
    allSpaces: SpaceInterface[],
    recordableSpaces: SpaceInterface[],
    recordingState: RecordingState,
    canStartRecording: boolean,
    localSpaceUserId: string
): RecordingSpaceRow[] {
    const recordableSpaceNames = new Set(recordableSpaces.map((space) => space.getName()));

    return allSpaces
        .map((space) => {
            const spaceName = space.getName();
            const requestState = recordingState.requestStatesBySpace[spaceName];
            const liveRecordingState = getSpaceLiveRecordingState(space, recordingState);
            const isCurrentUserRecorderFromMetadata =
                liveRecordingState.recorderSpaceUserId !== null &&
                liveRecordingState.recorderSpaceUserId === localSpaceUserId;
            const kind: RecordingSpaceKind = isMegaphoneSpace(space) ? "megaphone" : "discussion";

            if (requestState === "starting") {
                return {
                    action: null,
                    disabled: true,
                    kind,
                    recorderName: liveRecordingState.recorderName,
                    recorderSpaceUserId: liveRecordingState.recorderSpaceUserId,
                    space,
                    spaceName,
                    status: "starting" as const,
                };
            }

            if (requestState === "stopping") {
                return {
                    action: null,
                    disabled: true,
                    kind,
                    recorderName: liveRecordingState.recorderName,
                    recorderSpaceUserId: liveRecordingState.recorderSpaceUserId,
                    space,
                    spaceName,
                    status: "stopping" as const,
                };
            }

            if (liveRecordingState.isRecording) {
                const isCurrentUserRecorder =
                    liveRecordingState.isCurrentUserRecorder || isCurrentUserRecorderFromMetadata;
                return {
                    action: isCurrentUserRecorder ? "stop" : null,
                    disabled: !isCurrentUserRecorder,
                    kind,
                    recorderName: liveRecordingState.recorderName,
                    recorderSpaceUserId: liveRecordingState.recorderSpaceUserId,
                    space,
                    spaceName,
                    status: isCurrentUserRecorder ? "recording-self" : "recording-other",
                };
            }

            if (!recordableSpaceNames.has(spaceName) || !canStartRecording) {
                return null;
            }

            return {
                action: "start",
                disabled: false,
                kind,
                recorderName: "unknown",
                recorderSpaceUserId: null,
                space,
                spaceName,
                status: "available" as const,
            };
        })
        .filter((row): row is RecordingSpaceRow => row !== null);
}

export function getActionableRecordingRows(rows: RecordingSpaceRow[]): RecordingSpaceRow[] {
    return rows.filter((row) => row.action !== null && !row.disabled);
}

export function getDirectRecordingActionRow(rows: RecordingSpaceRow[]): RecordingSpaceRow | undefined {
    const actionableRows = getActionableRecordingRows(rows);
    if (actionableRows.length !== 1 || rows.length !== 1) {
        return undefined;
    }

    return actionableRows[0];
}
