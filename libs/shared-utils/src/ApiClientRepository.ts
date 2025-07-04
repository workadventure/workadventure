/**
 * A class to get connections to the correct "api" server given a room name.
 */
import crypto from "crypto";
import * as grpc from "@grpc/grpc-js";

import Debug from "debug";
import { RoomManagerClient, SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";

const debug = Debug("apiClientRespository");

export class ApiClientRepository {
    private roomManagerClients: RoomManagerClient[] = [];
    private spaceManagerClients: SpaceManagerClient[] = [];

    public constructor(private apiUrls: string[]) {}

    public async getClient(roomId: string, GRPC_MAX_MESSAGE_SIZE: number): Promise<RoomManagerClient> {
        const index = this.getIndex(roomId);

        let client = this.roomManagerClients[index];
        if (client === undefined) {
            this.roomManagerClients[index] = client = new RoomManagerClient(
                this.apiUrls[index],
                grpc.credentials.createInsecure(),
                {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                }
            );
        }
        debug("Mapping room %s to API server %s", roomId, this.apiUrls[index]);

        return Promise.resolve(client);
    }

    public getAllClients(GRPC_MAX_MESSAGE_SIZE: number): Promise<RoomManagerClient[]> {
        for (let i = 0; i < this.apiUrls.length; i++) {
            if (this.roomManagerClients[i] === undefined) {
                this.roomManagerClients[i] = new RoomManagerClient(this.apiUrls[i], grpc.credentials.createInsecure(), {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                });
            }
        }
        return Promise.resolve(this.roomManagerClients);
    }

    async getSpaceClient(spaceName: string, GRPC_MAX_MESSAGE_SIZE: number): Promise<SpaceManagerClient> {
        const index = this.getIndex(spaceName);

        let client = this.spaceManagerClients[index];
        if (client === undefined) {
            this.spaceManagerClients[index] = client = new SpaceManagerClient(
                this.apiUrls[index],
                grpc.credentials.createInsecure(),
                {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                }
            );
        }
        debug("Mapping room %s to API server %s", spaceName, this.apiUrls[index]);

        return Promise.resolve(client);
    }

    public getIndex(name: string) {
        const array = new Uint32Array(crypto.createHash("md5").update(name).digest());
        return array[0] % this.apiUrls.length;
    }
}
