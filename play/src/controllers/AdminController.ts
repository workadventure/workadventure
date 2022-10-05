import { apiClientRepository } from "../services/ApiClientRepository";
import {
    AdminRoomMessage,
    WorldFullWarningToRoomMessage,
    RefreshRoomPromptMessage,
    EmptyMessage,
    RoomsList,
} from "../messages/generated/messages_pb";
import { adminToken } from "../middlewares/AdminToken";
import { BaseHttpController } from "./BaseHttpController";
import { Metadata } from "@grpc/grpc-js";
import type { Request, Response } from "hyper-express";

export class AdminController extends BaseHttpController {
    routes(): void {
        this.receiveGlobalMessagePrompt();
        this.receiveRoomEditionPrompt();
        this.getRoomsList();
    }

    /**
     * @openapi
     * /room/refresh:
     *   post:
     *     description: Forces anyone out of the room. The request must be authenticated with the "admin-token" header.
     *     tags:
     *      - Admin endpoint
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
    receiveRoomEditionPrompt(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.post("/room/refresh", { middlewares: [adminToken] }, async (req: Request, res: Response) => {
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
            return;
        });
    }

    /**
     * @openapi
     * /message:
     *   post:
     *     description: Sends a message (or a world full message) to a number of rooms.
     *     tags:
     *      - Admin endpoint
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
    receiveGlobalMessagePrompt(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.post("/message", { middlewares: [adminToken] }, async (req: Request, res: Response) => {
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

    /**
     * @openapi
     * /rooms:
     *   get:
     *     description: Returns the list of all rooms, along the number of users in each room.
     *     tags:
     *      - Admin endpoint
     *     parameters:
     *      - name: "Authorization"
     *        in: "header"
     *        required: true
     *        type: "string"
     *        description: The token to be allowed to access this API (in ADMIN_API_TOKEN environment variable)
     *     responses:
     *       200:
     *         description: Will always return "ok".
     *         example: "{\"https://workadventu.re/@/company/world/room\": 24}"
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               additionalProperties:
     *                 type: integer
     */
    getRoomsList(): void {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.app.get("/rooms", { middlewares: [adminToken] }, async (req: Request, res: Response) => {
            try {
                const roomClients = await apiClientRepository.getAllClients();

                const emptyMessage = new EmptyMessage();

                const promises: Promise<RoomsList>[] = [];
                for (const roomClient of roomClients) {
                    promises.push(
                        new Promise<RoomsList>((resolve, reject) => {
                            roomClient.getRooms(
                                emptyMessage,
                                new Metadata(),
                                {
                                    deadline: Date.now() + 1000,
                                },
                                (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );
                        })
                    );
                }

                // Note: this call will take at most 1 second because we won't wait more for all the promises to resolve.
                const roomsListsResult = await Promise.allSettled(promises);

                const rooms: Record<string, number> = {};

                for (const roomsListResult of roomsListsResult) {
                    if (roomsListResult.status === "fulfilled") {
                        for (const room of roomsListResult.value.getRoomdescriptionList()) {
                            rooms[room.getRoomid()] = room.getNbusers();
                        }
                    } else {
                        console.warn(
                            "One back server did not respond within one second to the call to 'getRooms': ",
                            roomsListResult.reason
                        );
                    }
                }

                res.setHeader("Content-Type", "application/json").send(JSON.stringify(rooms));
                return;
            } catch (err) {
                this.castErrorToResponse(err, res);
                return;
            }
        });
    }
}
