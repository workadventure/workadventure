import type { RecordingButtonState } from "@workadventure/messages";
import type { Readable } from "svelte/store";
import { derived } from "svelte/store";

import type { SpaceInterface } from "../../../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../../../Space/SpaceRegistry/SpaceRegistryInterface";
import { recordingSchema } from "../../../Space/SpaceMetadataValidator";
import type { RecordingState } from "../../../Stores/RecordingStore";
import { recordingStore } from "../../../Stores/RecordingStore";

export type SpaceRegistryForRecordingMenu = Pick<SpaceRegistryInterface, "getAll" | "spacesEligibleForRecording">;

export type RecordingRowStatus = "available" | "starting" | "stopping" | "recording-self" | "recording-other";
export type RecordingRowAction = "start" | "stop" | null;
export type RecordingSpaceKind = "discussion" | "megaphone";

export interface RecordingSpaceRow {
    action: RecordingRowAction;
    disabled: boolean;
    kind: RecordingSpaceKind;
    recorderName: string | null;
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
            recorderName: null,
            recorderSpaceUserId: null,
        };
    }

    const recorderSpaceUserId = recordingMetadata.data.recorder ?? null;

    return {
        isRecording: true,
        isCurrentUserRecorder: false,
        recorderName: recorderSpaceUserId ? space.getSpaceUserBySpaceUserId(recorderSpaceUserId)?.name ?? null : null,
        recorderSpaceUserId,
    };
}

export function getRecordingSpaceRows(
    allSpaces: SpaceInterface[],
    recordableSpaces: SpaceInterface[],
    recordingState: RecordingState,
    canStartRecording: boolean
): RecordingSpaceRow[] {
    const recordableSpaceNames = new Set(recordableSpaces.map((space) => space.getName()));

    const rows = allSpaces
        .map((space) => {
            const spaceName = space.getName();
            const requestState = recordingState.requestStatesBySpace[spaceName];
            const liveRecordingState = getSpaceLiveRecordingState(space, recordingState);
            const isCurrentUserRecorderFromMetadata =
                liveRecordingState.recorderSpaceUserId !== null &&
                liveRecordingState.recorderSpaceUserId === space.mySpaceUserId;
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
                recorderName: null,
                recorderSpaceUserId: null,
                space,
                spaceName,
                status: "available" as const,
            };
        })
        .filter((row): row is RecordingSpaceRow => row !== null);

    return rows;
}

export function getActionableRecordingRows(rows: RecordingSpaceRow[]): RecordingSpaceRow[] {
    return rows.filter((row) => row.action !== null && !row.disabled);
}

export function getShouldDisplayRecordingButton(
    rows: RecordingSpaceRow[],
    recordableSpaces: SpaceInterface[],
    roomButtonState?: RecordingButtonState
): boolean {
    if (roomButtonState === "hidden") {
        return rows.some((row) => row.status !== "available");
    }

    return rows.length > 0 || recordableSpaces.length > 0;
}

/**
 * Returns a row to apply immediately without opening the picker only when there is a single
 * unambiguous target. If several spaces in the room can be recorded, starting must go through
 * the picker so the user explicitly chooses — even when only one row is built yet (e.g. timing).
 *
 * Uses both `recordableSpaces` (store) and `allSpaces` (registry) so we still open the picker
 * when multiple joined spaces are recordable even if `rows` temporarily collapses to one line.
 */
export function getDirectRecordingActionRow(
    rows: RecordingSpaceRow[],
    allSpaces: SpaceInterface[],
    recordableSpaces: SpaceInterface[]
): RecordingSpaceRow | undefined {
    const actionableRows = getActionableRecordingRows(rows);
    if (actionableRows.length !== 1 || rows.length !== 1) {
        return undefined;
    }

    const candidate = actionableRows[0];

    if (candidate.action === "start") {
        const recordableNameSet = new Set(recordableSpaces.map((s) => s.getName()));
        const joinedRecordableSpaces = allSpaces.filter((s) => recordableNameSet.has(s.getName()));
        const forcePickerBecauseSeveralTargets = recordableSpaces.length > 1 || joinedRecordableSpaces.length > 1;

        if (forcePickerBecauseSeveralTargets) {
            return undefined;
        }
    }

    return candidate;
}

export interface RecordingMenuState {
    actionMode: "start" | "stop";
    actionableRows: RecordingSpaceRow[];
    buttonState: "disabled" | "normal" | "active";
    currentRows: RecordingSpaceRow[];
    directRow: RecordingSpaceRow | undefined;
    hasActionableStart: boolean;
    hasOtherRecording: boolean;
    hasOwnRecording: boolean;
    hasPendingRequest: boolean;
    shouldDisplayButton: boolean;
}

function computeRecordingButtonState(
    isLogged: boolean,
    actionableRows: RecordingSpaceRow[],
    hasOwnRecording: boolean
): "disabled" | "normal" | "active" {
    if (!isLogged) {
        return "disabled";
    }
    if (actionableRows.length > 0) {
        return hasOwnRecording ? "active" : "normal";
    }
    if (hasOwnRecording) {
        return "active";
    }
    return "disabled";
}

/**
 * Single derived pipeline for the recording action bar: registry spaces + recording store + room policy.
 * Keeps row building and picker/direct-row logic in one place instead of many `$:` blocks in the component.
 */
export function createRecordingMenuStateStore(
    spaceRegistry: SpaceRegistryForRecordingMenu,
    options: {
        canStartRecording: boolean;
        isUserLoggedIn: boolean;
        roomButtonState?: RecordingButtonState;
    }
): Readable<RecordingMenuState> {
    const { canStartRecording, isUserLoggedIn, roomButtonState } = options;

    return derived([spaceRegistry.spacesEligibleForRecording, recordingStore], ([$eligibleSpaces, $recordingState]) => {
        const allSpaces = spaceRegistry.getAll();
        const currentRows = getRecordingSpaceRows(allSpaces, $eligibleSpaces, $recordingState, canStartRecording);
        const actionableRows = getActionableRecordingRows(currentRows);
        const directRow = getDirectRecordingActionRow(currentRows, allSpaces, $eligibleSpaces);
        const hasOwnRecording = currentRows.some((row) => row.status === "recording-self");
        const hasOtherRecording = currentRows.some((row) => row.status === "recording-other");
        const hasPendingRequest = currentRows.some((row) => row.status === "starting" || row.status === "stopping");
        const hasActionableStart = actionableRows.some((row) => row.action === "start");
        const actionMode: RecordingMenuState["actionMode"] = hasOwnRecording ? "stop" : "start";

        return {
            actionMode,
            actionableRows,
            buttonState: computeRecordingButtonState(isUserLoggedIn, actionableRows, hasOwnRecording),
            currentRows,
            directRow,
            hasActionableStart,
            hasOtherRecording,
            hasOwnRecording,
            hasPendingRequest,
            shouldDisplayButton: getShouldDisplayRecordingButton(currentRows, $eligibleSpaces, roomButtonState),
        };
    });
}
