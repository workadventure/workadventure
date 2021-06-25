/**
 * A class to get connections to the correct "api" server given a room name.
 */
import { RoomManagerClient } from "../Messages/generated/messages_grpc_pb";
import grpc from "grpc";
import crypto from "crypto";
import { API_URL } from "../Enum/EnvironmentVariable";

import Debug from "debug";

const debug = Debug("apiClientRespository");

class ApiClientRepository {
    private roomManagerClients: RoomManagerClient[] = [];

    public constructor(private apiUrls: string[]) {}

    public async getClient(roomId: string): Promise<RoomManagerClient> {
        const array = new Uint32Array(crypto.createHash("md5").update(roomId).digest());
        const index = array[0] % this.apiUrls.length;

        let client = this.roomManagerClients[index];
        if (client === undefined) {
            this.roomManagerClients[index] = client = new RoomManagerClient(
                this.apiUrls[index],
                grpc.credentials.createInsecure()
            );
            debug("Mapping room %s to API server %s", roomId, this.apiUrls[index]);
        }

        return Promise.resolve(client);
    }

    public async getAllClients(): Promise<RoomManagerClient[]> {
        return [await this.getClient("")];
    }
}

const apiClientRepository = new ApiClientRepository(API_URL.split(","));

export { apiClientRepository };
