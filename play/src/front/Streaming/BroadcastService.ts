import { derived, get, Readable, Unsubscriber, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
// eslint-disable-next-line import/no-unresolved
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import pLimit from "p-limit";
import { SpaceFilterMessage } from "@workadventure/messages";
import debug from "debug";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { megaphoneEnabledStore } from "../Stores/MegaphoneStore";
import { RoomConnection } from "../Connexion/RoomConnection";
import { Space } from "../Space/Space";
import { gameManager } from "../Phaser/Game/GameManager";
import { JITSI_DOMAIN, JITSI_MUC_DOMAIN, JITSI_XMPP_DOMAIN } from "../Enum/EnvironmentVariable";
import { JitsiTrackWrapper } from "./Jitsi/JitsiTrackWrapper";
import { jitsiConferencesStore } from "./Jitsi/JitsiConferencesStore";
import { JitsiConferenceWrapper } from "./Jitsi/JitsiConferenceWrapper";
import { libJitsiFactory } from "./Jitsi/LibJitsiFactory";

export const jitsiLoadingStore = writable<boolean>(false);

const limit = pLimit(1);

const broadcastServiceLogger = debug("jitsi");

class BroadcastSpace extends Space {
    public jitsiConference: JitsiConferenceWrapper | undefined;
    public unsubscribes: Unsubscriber[] = [];
    constructor(
        connection: RoomConnection,
        spaceName: string,
        spaceFilter: SpaceFilterMessage,
        private broadcastService: BroadcastService,
        public playSound: boolean
    ) {
        super(connection, spaceName, spaceFilter);
        this.unsubscribes.push(
            this.users.subscribe((users) => {
                if (users.size === 0) {
                    if (this.jitsiConference !== undefined) {
                        limit(() => this.jitsiConference?.leave("Nobody is streaming anymore ..."))
                            .then(() => {
                                this.jitsiConference = undefined;
                            })
                            .catch((e) => {
                                console.error(e);
                            })
                            .finally(() => {
                                broadcastService.checkIfCanDisconnect();
                            });
                    }
                } else {
                    if (this.jitsiConference === undefined) {
                        limit(async () => {
                            if (this.jitsiConference === undefined) {
                                jitsiLoadingStore.set(true);
                                return await broadcastService.joinJitsiConference(spaceName, this);
                            }
                            throw new Error("Jitsi conference already exists");
                        })
                            .then((jitsiConference) => {
                                this.jitsiConference = jitsiConference;
                                broadcastService.emitJitsiParticipantIdSpace(spaceName, jitsiConference.participantId);
                                jitsiLoadingStore.set(false);
                            })
                            .catch((e) => {
                                console.error("Error while joining the conference", e);
                            });
                    }
                }
            })
        );
    }
    destroy() {
        limit(() => this.jitsiConference?.leave("I want to leave this space ..."))
            .then(() => {
                this.jitsiConference = undefined;
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() => {
                this.broadcastService.checkIfCanDisconnect();
            });
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
        super.destroy();
    }
}

export class BroadcastService {
    private megaphoneEnabledUnsubscribe: Unsubscriber;
    private jitsiConnection: JitsiConnection | undefined;
    private broadcastSpaces: BroadcastSpace[];
    private readonly _jitsiTracks: ForwardableStore<Map<string, JitsiTrackWrapper>>;

    constructor(private connection: RoomConnection) {
        /**
         * This service is in charge of:
         * - tracking in which broadcast zone the user is
         * - sending this zone to the server
         * - listening for clicks on the broadcast button + listening to people entering the stage
         * - listening for a signal we should join a broadcast
         * - keep track of the Jitsi connexion / room and restart it if connexion is lost
         */
        this._jitsiTracks = new ForwardableStore<Map<string, JitsiTrackWrapper>>(new Map());

        this.broadcastSpaces = [];

        this.megaphoneEnabledUnsubscribe = megaphoneEnabledStore.subscribe((megaphoneEnabled) => {
            if (megaphoneEnabled) {
                this.broadcastSpaces.forEach((broadcastSpace) => {
                    if (broadcastSpace.jitsiConference) {
                        broadcastSpace.jitsiConference.broadcast(["video", "audio"]);
                        void broadcastSpace.jitsiConference.firstLocalTrackInit();
                    }
                });
            } else {
                this.broadcastSpaces.forEach((broadcastSpace) => {
                    broadcastSpace.jitsiConference?.broadcast([]);
                });
            }
        });

        //libJitsiFactory.createConnection("jitsi.test.workadventu.re", "prosody.test.workadventu.re", "muc.prosody.test.workadventu.re").then((connection) => {
    }

    public joinSpace(spaceName_: string, playSound = true) {
        const spaceName = slugify(spaceName_);
        const spaceFilter = this.connection.emitWatchSpaceLiveStreaming(spaceName);
        const broadcastSpace = new BroadcastSpace(this.connection, spaceName, spaceFilter, this, playSound);
        this.broadcastSpaces.push(broadcastSpace);
        broadcastServiceLogger("BroadcastService => joinSpace", spaceName);
    }

    public leaveSpace(spaceName_: string) {
        const spaceName = slugify(spaceName_);
        const space = this.broadcastSpaces.find((space) => space.name === spaceName);
        if (space) {
            this.connection.emitUnwatchSpaceLiveStreaming(spaceName);
            space.destroy();
            this.broadcastSpaces = this.broadcastSpaces.filter((space) => space.name !== spaceName);
            broadcastServiceLogger("BroadcastService => leaveSpace", spaceName);
        }
    }

    private async connect() {
        if (!JITSI_DOMAIN || !JITSI_XMPP_DOMAIN || !JITSI_MUC_DOMAIN) {
            throw new Error("Cannot use Jitsi with a no domain defined, please check your environment variables");
        }
        this.jitsiConnection = await libJitsiFactory.createConnection(
            JITSI_DOMAIN,
            JITSI_XMPP_DOMAIN,
            JITSI_MUC_DOMAIN
        );
    }

    async joinJitsiConference(roomName: string, broadcastSpace: BroadcastSpace): Promise<JitsiConferenceWrapper> {
        if (!this.jitsiConnection) {
            try {
                await this.connect();
            } catch (e) {
                broadcastServiceLogger("Error while connecting to Jitsi", e);
            }
            if (!this.jitsiConnection) {
                jitsiLoadingStore.set(false);
                throw new Error("Could not connect to Jitsi");
            }
        }

        debug("Joining Jitsi conference, jitsiConnecton is defined" + roomName);

        const jitsiConference = await JitsiConferenceWrapper.join(this.jitsiConnection, roomName);
        jitsiConferencesStore.set(roomName, jitsiConference);

        if (get(megaphoneEnabledStore)) {
            jitsiConference.broadcast(["video", "audio"]);
        } else if (broadcastSpace.playSound) {
            gameManager.getCurrentGameScene().playSound("audio-megaphone");
        }

        const associatedStreamStore: Readable<Map<string, JitsiTrackWrapper>> = derived(
            [jitsiConference.streamStore, broadcastSpace.users],
            ([$streamStore, $users]) => {
                const filtered = new Map<string, JitsiTrackWrapper>();
                for (const [participantId, stream] of $streamStore) {
                    let found = false;
                    if (stream.spaceUser !== undefined) {
                        if ($users.has(stream.spaceUser.id)) {
                            filtered.set(participantId, stream);
                        }
                        continue;
                    }
                    for (const user of $users.values()) {
                        if (user.jitsiParticipantId === stream.uniqueId) {
                            stream.spaceUser = user;
                            filtered.set(participantId, stream);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        broadcastServiceLogger(
                            "BroadcastService => joinJitsiConference => No associated spaceUser found for participantId" +
                                stream.uniqueId +
                                $users.values()
                        );
                    }
                }
                return filtered;
            }
        );

        this._jitsiTracks.forward(associatedStreamStore);
        return jitsiConference;
    }

    private canDisconnect(): boolean {
        return this.broadcastSpaces.every((space) => space.isEmpty);
    }

    public destroy(): void {
        this.megaphoneEnabledUnsubscribe();
        this.broadcastSpaces.forEach((space) => space.destroy());
    }

    public get jitsiTracks(): Readable<Map<string, JitsiTrackWrapper>> {
        return this._jitsiTracks;
    }

    public emitJitsiParticipantIdSpace(spaceName: string, participantId: string) {
        this.connection.emitJitsiParticipantIdSpace(spaceName, participantId);
    }

    public checkIfCanDisconnect() {
        if (this.canDisconnect() && this.jitsiConnection !== undefined) {
            broadcastServiceLogger("Disconnecting from Jitsi");
            this.jitsiConnection
                .disconnect()
                .then(() => {
                    this.jitsiConnection = undefined;
                })
                .catch((e) => {
                    console.error(e);
                });
        }
    }
}
