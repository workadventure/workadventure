import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";

import { API_URL, GRPC_MAX_MESSAGE_SIZE } from "../Enum/EnvironmentVariable";

class UploadDetector {
    private apiClientRepository: ApiClientRepository;

    public constructor() {
        this.apiClientRepository = new ApiClientRepository(API_URL.split(","));
    }

    public async refresh(wamUrl: string): Promise<void> {
        // send only where mapUrl is matching with the one from GameRoom
        const clients = await this.apiClientRepository.getAllClients(GRPC_MAX_MESSAGE_SIZE);
        await Promise.all(
            clients.map(
                (client) =>
                    new Promise<void>((resolve, reject) => {
                        client.handleMapStorageUploadMapDetected(
                            {
                                wamUrl,
                            },
                            (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve();
                            }
                        );
                    })
            )
        );
    }

    public async delete(wamUrl: string): Promise<void> {
        const clients = await this.apiClientRepository.getAllClients(GRPC_MAX_MESSAGE_SIZE);
        await Promise.all(
            clients.map(
                (client) =>
                    new Promise<void>((resolve, reject) => {
                        client.handleMapStorageDeleteMapDetected(
                            {
                                wamUrl,
                            },
                            (err) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve();
                            }
                        );
                    })
            )
        );
    }
}

export const uploadDetector = new UploadDetector();
