import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
import * as Sentry from "@sentry/node";
import { API_URL } from "../Enum/EnvironmentVariable";

class UploadDetector {
    private apiClientRepository: ApiClientRepository;

    public constructor() {
        this.apiClientRepository = new ApiClientRepository(API_URL.split(","));
    }

    public async refresh(wamUrl: string): Promise<void> {
        // send only where mapUrl is matching with the one from GameRoom
        const clients = await this.apiClientRepository.getAllClients();
        for (const client of clients) {
            client.handleMapStorageUploadMapDetected(
                {
                    wamUrl,
                },
                (err) => {
                    console.error(`[${new Date().toISOString()}]`, err);
                    Sentry.captureException(err);
                }
            );
        }
    }
}

export const uploadDetector = new UploadDetector();
