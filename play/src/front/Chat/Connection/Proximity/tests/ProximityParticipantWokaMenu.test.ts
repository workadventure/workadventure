import { describe, expect, it } from "vitest";
import type { ProximityChatSidePanelParticipant } from "../../ChatConnection";
import { openProximityParticipantWokaMenu } from "../ProximityParticipantWokaMenu";

describe("openProximityParticipantWokaMenu", () => {
    it("should activate the remote player matching the participant uuid", () => {
        let activatedUserId: number | undefined;
        const participant: ProximityChatSidePanelParticipant = {
            spaceUserId: "space-user-1",
            uuid: "user-uuid-1",
            name: "Alice",
        };
        const scene = {
            getRemotePlayersRepository: () => ({
                getPlayerByUuid: (uuid: string) => (uuid === "user-uuid-1" ? { userId: 42 } : undefined),
            }),
            MapPlayersByKey: new Map([
                [
                    42,
                    {
                        activate: () => {
                            activatedUserId = 42;
                        },
                    },
                ],
            ]),
        };

        const opened = openProximityParticipantWokaMenu(participant, scene);

        expect(opened).toBe(true);
        expect(activatedUserId).toBe(42);
    });

    it("should not activate a Woka menu when the participant has no uuid", () => {
        let wasRepositoryCalled = false;
        const participant: ProximityChatSidePanelParticipant = {
            spaceUserId: "space-user-1",
            name: "Anonymous",
        };
        const scene = {
            getRemotePlayersRepository: () => {
                wasRepositoryCalled = true;
                return {
                    getPlayerByUuid: () => undefined,
                };
            },
            MapPlayersByKey: new Map<number, { activate: () => void }>(),
        };

        const opened = openProximityParticipantWokaMenu(participant, scene);

        expect(opened).toBe(false);
        expect(wasRepositoryCalled).toBe(false);
    });
});
