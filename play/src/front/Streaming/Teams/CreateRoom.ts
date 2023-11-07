import { RoomsClient } from "@azure/communication-rooms";
import { CommunicationIdentityClient } from "@azure/communication-identity";

const endpoint = "<endpoint>";
const connectionKey = "<connection key>";
const connectionString =
    `endpoint=${endpoint}/;accesskey=${connectionKey}`;

// Create the Teams room class
export class TeamsRoom {
    private roomsClient: RoomsClient;
    constructor() {
        // create RoomsClient
        this.roomsClient = new RoomsClient(connectionString);
    }
    async room() {
        // create identities for users
        const identityClient = new CommunicationIdentityClient(connectionString);
        const user1 = await identityClient.createUserAndToken(["voip"]);
        const user2 = await identityClient.createUserAndToken(["voip"]);

        // Create a room
        var validFrom = new Date(Date.now());
        var validUntil = new Date(validFrom.getTime() + 60 * 60 * 1000);
        var pstnDialOutEnabled = false;

        const participants = [
            {
                id: user1.user,
                role: "Presenter",
            },
            {
                id: user2.user,
                role: "Consumer",
            },
        ];

        const createRoomOptions = {
            validFrom,
            validUntil,
            pstnDialOutEnabled,
            participants,
        };

        // @ts-ignore
        const createRoom = await this.roomsClient.createRoom(createRoomOptions);
        const roomId = createRoom.id;
        console.log("\nCreated a room with id: ", roomId);
    }
}
