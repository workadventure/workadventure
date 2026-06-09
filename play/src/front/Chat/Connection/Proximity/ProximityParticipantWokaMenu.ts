import type { ProximityChatSidePanelParticipant } from "../ChatConnection";

type ActivatableRemotePlayer = {
    activate: () => void;
};

type RemotePlayerData = {
    userId: number;
};

export type ProximityParticipantWokaMenuScene = {
    getRemotePlayersRepository: () => {
        getPlayerByUuid: (uuid: string) => RemotePlayerData | undefined;
    };
    MapPlayersByKey: {
        get: (userId: number) => ActivatableRemotePlayer | undefined;
    };
};

export function openProximityParticipantWokaMenu(
    participant: ProximityChatSidePanelParticipant,
    scene: ProximityParticipantWokaMenuScene,
): boolean {
    if (!participant.uuid) {
        return false;
    }

    const remotePlayerData = scene.getRemotePlayersRepository().getPlayerByUuid(participant.uuid);
    if (!remotePlayerData) {
        return false;
    }

    const remotePlayer = scene.MapPlayersByKey.get(remotePlayerData.userId);
    if (!remotePlayer) {
        return false;
    }

    remotePlayer.activate();
    return true;
}
