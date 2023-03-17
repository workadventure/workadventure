import { RoomConnection } from "../Connexion/RoomConnection";
import { libJitsiFactory } from "./Jitsi/LibJitsiFactory";
import { JitsiConferenceWrapper } from "./Jitsi/JitsiConferenceWrapper";
import { jitsiConferencesStore } from "./Jitsi/JitsiConferencesStore";
import { megaphoneEnabledStore } from "../Stores/MegaphoneStore";
import { get, Readable, Unsubscriber } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { JitsiTrackWrapper } from "./Jitsi/JitsiTrackWrapper";
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import { Space } from "../Space/Space";
import pLimit from "p-limit";

class BroadcastSpace extends Space {
    public jitsiConference: JitsiConferenceWrapper | undefined;
    public unsubscribes: Unsubscriber[] = [];
    destroy() {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
        super.destroy();
    }
}

export class BroadcastService {
    private limit = pLimit(1);
    private megaphoneEnabledUnsubscribe: Unsubscriber;
    private jitsiConnection: JitsiConnection | undefined;
    private broadcastSpaces: BroadcastSpace[];
    private _jitsiTracks: ForwardableStore<Map<string, Readable<JitsiTrackWrapper>>>;

    constructor(private connection: RoomConnection) {
        /**
         * This service is in charge of:
         * - tracking in which broadcast zone the user is
         * - sending this zone to the server
         * - listening for clicks on the broadcast button + listening to people entering the stage
         * - listening for a signal we should join a broadcast
         * - keep track of the Jitsi connexion / room and restart it if connexion is lost
         */
        this._jitsiTracks = new ForwardableStore<Map<string, Readable<JitsiTrackWrapper>>>(new Map());

        this.broadcastSpaces = [];

        this.megaphoneEnabledUnsubscribe = megaphoneEnabledStore.subscribe((megaphoneEnabled) => {
            if (megaphoneEnabled) {
                this.broadcastSpaces.forEach((broadcastSpace) => {
                    broadcastSpace.jitsiConference?.broadcast(["video", "audio"]);
                });
            } else {
                this.broadcastSpaces.forEach((broadcastSpace) => {
                    broadcastSpace.jitsiConference?.broadcast([]);
                });
            }
        });

        //libJitsiFactory.createConnection("jitsi.test.workadventu.re", "prosody.test.workadventu.re", "muc.prosody.test.workadventu.re").then((connection) => {
    }

    public joinSpace(spaceName: string) {
        const spaceFilter = this.connection.emitWatchSpaceLiveStreaming(spaceName);
        const broadcastSpace = new BroadcastSpace(this.connection, spaceName, spaceFilter);
        broadcastSpace.unsubscribes.push(
            broadcastSpace.users.subscribe((users) => {
                if (users.size === 0) {
                    if (broadcastSpace.jitsiConference !== undefined) {
                        const jitsiConference = broadcastSpace.jitsiConference;
                        this.limit(() => jitsiConference.leave())
                            .then(async () => {
                                broadcastSpace.jitsiConference = undefined;
                                if (this.canDisconnect()) {
                                    console.log("Disconnecting from Jitsi");
                                    await this.jitsiConnection?.disconnect();
                                    this.jitsiConnection = undefined;
                                }
                            })
                            .catch((e) => {
                                console.error(e);
                            });
                    }
                } else {
                    if (broadcastSpace.jitsiConference === undefined) {
                        this.limit(() => this.joinJitsiConference(spaceName))
                            .then((jitsiConference) => {
                                broadcastSpace.jitsiConference = jitsiConference;
                                this.connection.emitJitsiParticipantIdSpace(spaceName, jitsiConference.participantId);
                            })
                            .catch((e) => {
                                console.error(e);
                            });
                    }
                }
            })
        );
        this.broadcastSpaces.push(broadcastSpace);
    }

    private async connect() {
        this.jitsiConnection = await libJitsiFactory.createConnection(
            "coremeet.workadventu.re",
            "prosody.workadventu.re",
            "muc.prosody.workadventu.re"
        );
    }

    private async joinJitsiConference(roomName: string): Promise<JitsiConferenceWrapper> {
        if (!this.jitsiConnection) {
            await this.connect();
        }
        if (!this.jitsiConnection) {
            throw new Error("Could not connect to Jitsi");
        }
        console.log("Joined jitsi connection");
        const jitsiConference = await JitsiConferenceWrapper.join(this.jitsiConnection, roomName);
        jitsiConferencesStore.set(roomName, jitsiConference);

        if (get(megaphoneEnabledStore)) {
            jitsiConference.broadcast(["video", "audio"]);
        }

        this._jitsiTracks.forward(jitsiConference.streamStore);
        return jitsiConference;
    }

    private canDisconnect(): boolean {
        return this.broadcastSpaces.every((space) => space.isEmpty);
    }

    public destroy(): void {
        this.megaphoneEnabledUnsubscribe();
        this.broadcastSpaces.forEach((space) => space.destroy());
    }

    public get jitsiTracks(): Readable<Map<string, Readable<JitsiTrackWrapper>>> {
        return this._jitsiTracks;
    }
}
