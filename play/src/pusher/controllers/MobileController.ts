import type { Application, Request, Response } from "express";
import Debug from "debug";
import { validatePostQuery } from "../services/QueryValidator";
import { mapStorageToken } from "../middlewares/MapStorageToken";
import { BaseHttpController } from "./BaseHttpController";
import z from "zod";
import { apiClientRepository } from "../services/ApiClientRepository";
import type { ServiceError } from "@grpc/grpc-js";
import {
    GetLivekitCredentialVariableRequestMessage,
    GetLivekitCredentialResponseMessage,
} from "@workadventure/messages";
import { authenticated } from "../middlewares/Authenticated";

const debug = Debug("pusher:requests");

export class MobileController extends BaseHttpController {
    constructor(app: Application, private readonly GRPC_MAX_MESSAGE_SIZE: number) {
        super(app);
    }

    routes(): void {
        this.app.post("/mobile/join-meeting", [authenticated], async (req: Request, res: Response): Promise<void> => {
            debug(`MobileController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(req, res, z.object({
                spaceName: z.string().min(1),
                spaceUserId: z.string().min(1),
                userUuid: z.string().min(1),
            }));
            if (body === undefined) {
                return;
            }
            
            try {
                const client = await apiClientRepository.getClient(body.spaceName, this.GRPC_MAX_MESSAGE_SIZE);
                const request = GetLivekitCredentialVariableRequestMessage.fromPartial({
                    spaceName: body.spaceName,
                    spaceUserId: body.spaceUserId,
                    userUuid: body.userUuid,
                });
                console.log(request);
                console.log(client.getLivekitCredentials);
                await new Promise<void>((resolve, reject) => {
                    client.getLivekitCredentials(
                        request,
                        (error: ServiceError | null, response: GetLivekitCredentialResponseMessage | undefined) => {
                            console.log("getLivekitCredentials => error", error);
                            console.log("getLivekitCredentials => response", response);
                            if (error) {
                                reject(error);
                                return;
                            }
                            if (!response) {
                                reject(new Error("Empty LiveKit credentials response"));
                                return;
                            }
                            res.status(200).json({
                                url: response.url,
                                jwtToken: response.jwtToken,
                            });
                            resolve();
                        }
                    );
                });
            } catch (error) {
                console.error("Error joining meeting", error);
                res.status(500).send("Error joining meeting");
            }
        });
    }
}