import {RoomConnection} from "../Connexion/RoomConnection";


export class BroadcastService {
    constructor(private connection: RoomConnection) {

        /**
         * This service is in charge of:
         * - tracking in which broadcast zone the user is
         * - sending this zone to the server
         * - listening for clicks on the broadcast button + listening to people entering the stage
         * - listening for a signal we should join a broadcast
         * - keep track of the Jitsi connexion / room and restart it if connexion is lost
         */


    }

    public destroy(): void {
        // TODO: do some cleanup
    }
}
