import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
import { API_URL } from "../Enum/EnvironmentVariable";

class UploadDetector {
    private apiClientRepository: ApiClientRepository;

    public constructor() {
        this.apiClientRepository = new ApiClientRepository(API_URL.split(","));
    }

    public async refresh(wamKey: string, mapUrl: string): Promise<void> {
        // send only where mapUrl is matching with the one from GameRoom
        const clients = await this.apiClientRepository.getAllClients();
        for (const client of clients) {
            client.handleMapStorageUploadMapDetected(
                {
                    wamKey,
                    mapUrl,
                },
                (err) => {
                    console.error(err);
                }
            );
        }
    }
}

export const uploadDetector = new UploadDetector();
