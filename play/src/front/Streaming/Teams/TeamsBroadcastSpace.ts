import { Readable, Unsubscriber, derived, get } from "svelte/store";
import { Space } from "../../Space/Space";
import { BroadcastSpace } from "../Common/BroadcastSpace";
import { SpaceFilterMessage } from "@workadventure/messages";
import { RoomConnection } from "../../Connection/RoomConnection";
import { BroadcastService, broadcastStreamLoadingStore } from "../BroadcastService";
import { ForwardableStore } from "@workadventure/store-utils";
import { TeamsTrackWrapper } from "./TeamsTrackWrapper";
import pLimit from "p-limit";
import debug from "debug";
import { TeamsConnection } from "./TeamsConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { TeamsCallWrapper } from "./TeamsCallWrapper";

const limit = pLimit(1);
const teamsBroadcastSpaceLogger = debug("TeamsBroadcastSpace");

export class TeamsBroadcastSpace implements BroadcastSpace {
    readonly provider = "teams";
    readonly space: Space;
    private teamsTracks: ForwardableStore<Map<string, TeamsTrackWrapper>>;
    private unsubscribes: Unsubscriber[] = [];
    private call: TeamsCallWrapper | undefined;

    constructor(
        private roomConnection: RoomConnection,
        spaceName: string,
        spaceFilter: SpaceFilterMessage,
        private broadcastService: BroadcastService,
        private playSound: boolean
    ) {
        this.space = new Space(roomConnection, spaceName, spaceFilter);
        this.teamsTracks = new ForwardableStore<Map<string, TeamsTrackWrapper>>(new Map());

        // When the user leaves the space, we leave the Teams conference
        this.unsubscribes.push(
            this.space.users.subscribe((users) => {
                if (users.size === 0) {
                    if (this.call !== undefined) {
                        limit(() => this.call?.call?.hangUp())
                            .then(() => {
                                this.call = undefined;
                            })
                            .catch((e) => {
                                console.error(e);
                            })
                            .finally(() => {
                                broadcastStreamLoadingStore.set(false);
                                broadcastService.checkIfCanDisconnect(this.provider);
                            });
                    }
                } else {
                    limit(async () => {
                        if (this.call === undefined) {
                            broadcastStreamLoadingStore.set(true);
                            this.call = await this.joinTeamsCall();
                            broadcastStreamLoadingStore.set(false);
                        }
                    }).catch((e) => {
                        // TODO : Handle the error and retry to join the conference
                        console.error("Error while joining the conference", e);
                    });
                }
            })
        );
    }

    private async joinTeamsCall(): Promise<TeamsCallWrapper> {
        let teamsConnection = this.broadcastService.getBroadcastConnection(this.provider);

        if (!teamsConnection || teamsConnection instanceof TeamsConnection === false) {
            try {
                teamsConnection = await TeamsConnection.generate(gameManager.getPlayerName() ?? "UserUnknown");
            } catch (error) {
                teamsBroadcastSpaceLogger("Error while generating Teams connection", error);
                broadcastStreamLoadingStore.set(false);
                throw new Error("Error while generating Teams connection");
            }

            this.broadcastService.setBroadcastConnection(this.provider, teamsConnection);
        }

        const teamsConnectionCertified = teamsConnection as TeamsConnection;

        return TeamsCallWrapper.join(teamsConnectionCertified, this.space, this.roomConnection);
    }

    // private listenTracks(call: TeamsCall): void {
    //     const associatedStreamStore: Readable<Map<string, TeamsTrackWrapper>> = derived(
    //         [clall.streamStore, this.space.users],
    //         ([$streamStore, $users]) => {
    //     );
    // }

    get tracks(): Readable<Map<string, TeamsTrackWrapper>> {
        return this.teamsTracks;
    }

    destroy(): void {
        this.space.destroy();
    }
}
