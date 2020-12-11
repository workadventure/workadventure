/**
 * A class to get connections to the correct "api" server given a room name.
 */
import {RoomManagerClient} from "../Messages/generated/messages_grpc_pb";
import grpc from 'grpc';
import {API_URL} from "../Enum/EnvironmentVariable";


class ApiClientRepository {
    private roomManagerClient: RoomManagerClient|null = null;

    public async getClient(roomId: string): Promise<RoomManagerClient> {
        if (this.roomManagerClient === null) {
            this.roomManagerClient = new RoomManagerClient(API_URL, grpc.credentials.createInsecure());
        }
        return Promise.resolve(this.roomManagerClient);
    }

    public async getAllClients(): Promise<RoomManagerClient[]> {
        return [await this.getClient('')];
    }
}

const apiClientRepository = new ApiClientRepository();

export { apiClientRepository };
