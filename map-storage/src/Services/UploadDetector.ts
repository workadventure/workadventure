import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
import { Metadata } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";

import { API_URL, GRPC_MAX_MESSAGE_SIZE } from "../Enum/EnvironmentVariable";

const MAP_STORAGE_NOTIFICATION_DEADLINE = 20000;

class UploadDetector {
    private apiClientRepository: ApiClientRepository;

    public constructor() {
        this.apiClientRepository = new ApiClientRepository(API_URL.split(","));
    }

    public async refresh(wamUrl: string): Promise<void> {
        // send only where mapUrl is matching with the one from GameRoom
        const clients = await this.apiClientRepository.getAllClients(GRPC_MAX_MESSAGE_SIZE);
        const results = await Promise.allSettled(
            clients.map(
                (client) =>
                    new Promise<void>((resolve, reject) => {
                        client.handleMapStorageUploadMapDetected(
                            {
                                wamUrl,
                            },
                            new Metadata(),
                            {
                                deadline: Date.now() + MAP_STORAGE_NOTIFICATION_DEADLINE,
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
        this.throwIfOneClientFailed(results, "handleMapStorageUploadMapDetected");
    }

    public async delete(wamUrl: string): Promise<void> {
        const clients = await this.apiClientRepository.getAllClients(GRPC_MAX_MESSAGE_SIZE);
        const results = await Promise.allSettled(
            clients.map(
                (client) =>
                    new Promise<void>((resolve, reject) => {
                        client.handleMapStorageDeleteMapDetected(
                            {
                                wamUrl,
                            },
                            new Metadata(),
                            {
                                deadline: Date.now() + MAP_STORAGE_NOTIFICATION_DEADLINE,
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
        this.throwIfOneClientFailed(results, "handleMapStorageDeleteMapDetected");
    }

    private throwIfOneClientFailed(results: PromiseSettledResult<void>[], operation: string): void {
        const errors: unknown[] = [];

        for (const result of results) {
            if (result.status === "rejected") {
                console.warn(`One back server did not respond to '${operation}': `, result.reason);
                Sentry.captureException(result.reason);
                errors.push(result.reason);
            }
        }

        if (errors.length > 0) {
            throw new AggregateError(errors, `One or more back servers failed to process '${operation}'.`);
        }
    }
}

export const uploadDetector = new UploadDetector();
