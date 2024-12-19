import { SpaceFilterMessage } from "@workadventure/messages";

export interface SpaceEventEmitterInterface {
    userLeaveSpace(spaceName: string): void;
    userJoinSpace(spaceName: string): void;
    updateSpaceMetadata(spaceName: string, metadata: Map<string, unknown>): void;
    emitJitsiParticipantId(spaceName: string, participantId: string): void;
}

export interface SpaceFilterEventEmitterInterface {
    removeSpaceFilter(spaceFilter: SpaceFilterMessage): void;
    updateSpaceFilter(spaceFilter: SpaceFilterMessage): void;
    addSpaceFilter(spaceFilter: SpaceFilterMessage): void;
    emitKickOffUserMessage(spaceName: string, userId: string): void;
    emitMuteEveryBodySpace(spaceName: string): void;
    emitMuteVideoEveryBodySpace(spaceName: string): void;
    emitMuteParticipantIdSpace(spaceName: string, userId: string): void;
    emitMuteVideoParticipantIdSpace(spaceName: string, userId: string): void;
}
