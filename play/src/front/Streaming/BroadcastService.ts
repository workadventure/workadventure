import { RoomConnection } from "../Connexion/RoomConnection";
import { libJitsiFactory } from "./Jitsi/LibJitsiFactory";
import { JitsiConferenceWrapper } from "./Jitsi/JitsiConferenceWrapper";
import { jitsiConferencesStore } from "./Jitsi/JitsiConferencesStore";
import { megaphoneEnabledStore } from "../Stores/MegaphoneStore";
import { get, Readable, Unsubscriber } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { JitsiTrackWrapper } from "./Jitsi/JitsiTrackWrapper";

export class BroadcastService {
    private megaphoneEnabledUnsubscribe: Unsubscriber;

    private jitsiConference: JitsiConferenceWrapper | undefined;

    private _jitsiTracks: ForwardableStore<JitsiTrackWrapper[]>;

    constructor(private connection: RoomConnection) {
        /**
         * This service is in charge of:
         * - tracking in which broadcast zone the user is
         * - sending this zone to the server
         * - listening for clicks on the broadcast button + listening to people entering the stage
         * - listening for a signal we should join a broadcast
         * - keep track of the Jitsi connexion / room and restart it if connexion is lost
         */

        this._jitsiTracks = new ForwardableStore<JitsiTrackWrapper[]>([]);

        this.megaphoneEnabledUnsubscribe = megaphoneEnabledStore.subscribe((megaphoneEnabled) => {
            if (megaphoneEnabled) {
                this.jitsiConference?.broadcast(["video", "audio"]);
            } else {
                this.jitsiConference?.broadcast([]);
            }
        });

        //libJitsiFactory.createConnection("jitsi.test.workadventu.re", "prosody.test.workadventu.re", "muc.prosody.test.workadventu.re").then((connection) => {
        libJitsiFactory
            .createConnection("coremeet.workadventu.re", "prosody.workadventu.re", "muc.prosody.workadventu.re")
            .then(async (connection) => {
                this.jitsiConference = await JitsiConferenceWrapper.join(connection, "conferencetestfromjitsilib");
                jitsiConferencesStore.set("conferencetestfromjitsilib", this.jitsiConference);

                if (get(megaphoneEnabledStore)) {
                    this.jitsiConference.broadcast(["video", "audio"]);
                }

                this._jitsiTracks.forward(this.jitsiConference.streamStore);
            })
            .catch((e) => console.error(e));
    }

    public destroy(): void {
        this.megaphoneEnabledUnsubscribe();
    }

    public get jitsiTracks(): Readable<JitsiTrackWrapper[]> {
        return this._jitsiTracks;
    }
}
