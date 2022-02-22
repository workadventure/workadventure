import { apiClientRepository } from "../Services/ApiClientRepository";
import {
    AdminRoomMessage,
    WorldFullWarningToRoomMessage,
    RefreshRoomPromptMessage,
} from "../Messages/generated/messages_pb";
import { adminToken } from "../Middleware/AdminToken";
import { BaseHttpController } from "./BaseHttpController";

export class AdminController extends BaseHttpController {
    routes() {
        this.receiveGlobalMessagePrompt();
        this.receiveRoomEditionPrompt();
    }

    /**
     * @openapi
     * /room/refresh:
     *   post:
     *     description: Forces anyone out of the room. The request must be authenticated with the "admin-token" header.
     *     parameters:
     *      - name: "admin-token"
     *        in: "header"
     *        required: true
     *        type: "string"
     *        description: TODO - move this to a classic "Authorization" header!
     *      - name: "roomId"
     *        in: "body"
     *        description: "The ID (full URL) to the room"
     *        required: true
     *        type: "string"
     *     responses:
     *       200:
     *         description: Will always return "ok".
     *         example: "ok"
     */
    receiveRoomEditionPrompt() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.post("/room/refresh", { middlewares: [adminToken] }, async (req, res) => {
            const body = await req.json();

            try {
                if (typeof body.roomId !== "string") {
                    throw new Error("Incorrect roomId parameter");
                }
                const roomId: string = body.roomId;

                await apiClientRepository.getClient(roomId).then((roomClient) => {
                    return new Promise<void>((res, rej) => {
                        const roomMessage = new RefreshRoomPromptMessage();
                        roomMessage.setRoomid(roomId);

                        roomClient.sendRefreshRoomPrompt(roomMessage, (err) => {
                            err ? rej(err) : res();
                        });
                    });
                });
            } catch (err) {
                this.castErrorToResponse(err, res);
                return;
            }

            res.send("ok");
        });
    }

    /**
     * @openapi
     * /message:
     *   post:
     *     description: Sends a message (or a world full message) to a number of rooms.
     *     parameters:
     *      - name: "admin-token"
     *        in: "header"
     *        required: true
     *        type: "string"
     *        description: TODO - move this to a classic "Authorization" header!
     *      - name: "text"
     *        in: "body"
     *        description: "The text of the message"
     *        required: true
     *        type: "string"
     *      - name: "type"
     *        in: "body"
     *        description: Either "capacity" or "message
     *        required: true
     *        type: "string"
     *      - name: "targets"
     *        in: "body"
     *        description: The list of room IDs to target
     *        required: true
     *        type: array
     *        items:
     *          type: string
     *          example: "https://play.workadventu.re/@/foo/bar/baz"
     *     responses:
     *       200:
     *         description: Will always return "ok".
     *         example: "ok"
     */
    receiveGlobalMessagePrompt() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.post("/message", { middlewares: [adminToken] }, async (req, res) => {
            const body = await req.json();

            try {
                if (typeof body.text !== "string") {
                    throw new Error("Incorrect text parameter");
                }
                if (body.type !== "capacity" && body.type !== "message") {
                    throw new Error("Incorrect type parameter");
                }
                if (!body.targets || typeof body.targets !== "object") {
                    throw new Error("Incorrect targets parameter");
                }
                const text: string = body.text;
                const type: string = body.type;
                const targets: string[] = body.targets;

                await Promise.all(
                    targets.map((roomId) => {
                        return apiClientRepository.getClient(roomId).then((roomClient) => {
                            return new Promise<void>((res, rej) => {
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
                this.castErrorToResponse(err, res);
                return;
            }

            res.send("ok");
        });
    }
}
