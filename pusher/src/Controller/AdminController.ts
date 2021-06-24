import { BaseController } from "./BaseController";
import { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { ADMIN_API_TOKEN } from "../Enum/EnvironmentVariable";
import { apiClientRepository } from "../Services/ApiClientRepository";
import {
    AdminRoomMessage,
    WorldFullWarningToRoomMessage,
    RefreshRoomPromptMessage,
} from "../Messages/generated/messages_pb";

export class AdminController extends BaseController {
    constructor(private App: TemplatedApp) {
        super();
        this.App = App;
        this.receiveGlobalMessagePrompt();
        this.receiveRoomEditionPrompt();
    }

    receiveRoomEditionPrompt() {
        this.App.options("/room/refresh", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.post("/room/refresh", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const token = req.getHeader("admin-token");
            const body = await res.json();

            if (token !== ADMIN_API_TOKEN) {
                console.error("Admin access refused for token: " + token);
                res.writeStatus("401 Unauthorized").end("Incorrect token");
                return;
            }

            try {
                if (typeof body.roomId !== "string") {
                    throw "Incorrect roomId parameter";
                }
                const roomId: string = body.roomId;

                await apiClientRepository.getClient(roomId).then((roomClient) => {
                    return new Promise((res, rej) => {
                        const roomMessage = new RefreshRoomPromptMessage();
                        roomMessage.setRoomid(roomId);

                        roomClient.sendRefreshRoomPrompt(roomMessage, (err) => {
                            err ? rej(err) : res();
                        });
                    });
                });
            } catch (err) {
                this.errorToResponse(err, res);
                return;
            }

            res.writeStatus("200");
            res.end("ok");
        });
    }

    receiveGlobalMessagePrompt() {
        this.App.options("/message", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.App.post("/message", async (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn("/message request was aborted");
            });

            const token = req.getHeader("admin-token");
            const body = await res.json();

            if (token !== ADMIN_API_TOKEN) {
                console.error("Admin access refused for token: " + token);
                res.writeStatus("401 Unauthorized").end("Incorrect token");
                return;
            }

            try {
                if (typeof body.text !== "string") {
                    throw "Incorrect text parameter";
                }
                if (body.type !== "capacity" && body.type !== "message") {
                    throw "Incorrect type parameter";
                }
                if (!body.targets || typeof body.targets !== "object") {
                    throw "Incorrect targets parameter";
                }
                const text: string = body.text;
                const type: string = body.type;
                const targets: string[] = body.targets;

                await Promise.all(
                    targets.map((roomId) => {
                        return apiClientRepository.getClient(roomId).then((roomClient) => {
                            return new Promise((res, rej) => {
                                if (type === "message") {
                                    const roomMessage = new AdminRoomMessage();
                                    roomMessage.setMessage(text);
                                    roomMessage.setRoomid(roomId);

                                    roomClient.sendAdminMessageToRoom(roomMessage, (err) => {
                                        err ? rej(err) : res();
                                    });
                                } else if (type === "capacity") {
                                    const roomMessage = new WorldFullWarningToRoomMessage();
                                    roomMessage.setRoomid(roomId);

                                    roomClient.sendWorldFullWarningToRoom(roomMessage, (err) => {
                                        err ? rej(err) : res();
                                    });
                                }
                            });
                        });
                    })
                );
            } catch (err) {
                this.errorToResponse(err, res);
                return;
            }

            res.writeStatus("200");
            this.addCorsHeaders(res);
            res.end("ok");
        });
    }
}
