import { MatrixRoomPropertyData } from "@workadventure/map-editor";
import * as Sentry from "@sentry/node";
import { Request, Response } from "express";
import Debug from "debug";
import { matrixProvider } from "../services/MatrixProvider";
import { validatePostQuery } from "../services/QueryValidator";
import { mapStorageToken } from "../middlewares/MapStorageToken";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

/*
   This controller is used as the resource URL for the matrix chat area. It is called by the map storage. 
*/
export class MatrixRoomAreaController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        /**
         * @openapi
         * /roomArea:
         *   post:
         *     summary: Create a new Matrix room dedicated to an area
         *     description: Create a new Matrix room associated with a specific area.
         *     tags:
         *       - MatrixRoomArea
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/MatrixRoomPropertyData'
         *     responses:
         *       '201':
         *         description: Matrix room created successfully.
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/MatrixRoomPropertyData'
         *       '400':
         *         description: Invalid request body.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: Invalid Request Body
         *       '500':
         *         description: Internal Server Error.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: Internal Server Error
         */
        this.app.post("/roomArea", [mapStorageToken], async (req: Request, res: Response) => {
            debug(
                `MatrixRoomAreaController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`
            );
            try {
                const body = validatePostQuery(req, res, MatrixRoomPropertyData);

                if (!body) {
                    res.status(400).send("Invalid Request Body");
                    return;
                }

                const roomID = await matrixProvider.createRoomForArea();
                body.serverData = {
                    matrixRoomId: roomID,
                };
                res.status(201).json(body);
                return;
            } catch (error) {
                this.handleError(res, error);
                return;
            }
        });

        /**
         * @openapi
         * /roomArea:
         *   patch:
         *     summary: Update Matrix room name
         *     description: Updates the name of an existing Matrix room.
         *     tags:
         *       - MatrixRoomArea
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/MatrixRoomPropertyData'
         *     responses:
         *       '200':
         *         description: Room name updated successfully.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: Room name updated successfully
         *       '400':
         *         description: Invalid request body.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: Invalid Request Body
         *       '500':
         *         description: Internal Server Error.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: Internal Server Error
         */
        this.app.delete("/roomArea", [mapStorageToken], async (req: Request, res: Response) => {
            debug(
                `MatrixRoomAreaController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`
            );
            try {
                const body = req.body;
                const isMatrixRoomPropertyData = MatrixRoomPropertyData.safeParse(body);

                if (!isMatrixRoomPropertyData.success) {
                    res.status(400).send("Invalid request body");
                    return;
                }

                if (isMatrixRoomPropertyData.data.serverData?.matrixRoomId) {
                    await matrixProvider.deleteRoom(isMatrixRoomPropertyData.data.serverData.matrixRoomId);
                }
                res.status(204).send();
                return;
            } catch (error) {
                this.handleError(res, error);
                return;
            }
        });
        /**
         * @openapi
         * /roomArea:
         *   patch:
         *     description: Update room name
         *     produces:
         *      - "text/plain;charset=UTF-8"
         *     responses:
         *       200:
         *         description: OK
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: pong
         *       503:
         *         description: One or more back servers are unreachable
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: ko
         *
         */
        this.app.patch("/roomArea", [mapStorageToken], async (req: Request, res: Response) => {
            debug(
                `MatrixRoomAreaController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`
            );
            try {
                const body = req.body;
                const isMatrixRoomPropertyData = MatrixRoomPropertyData.safeParse(body);

                if (!isMatrixRoomPropertyData.success) {
                    res.status(400).send("Invalid request body");
                    return;
                }

                if (isMatrixRoomPropertyData.data.serverData?.matrixRoomId) {
                    await matrixProvider.changeRoomName(
                        isMatrixRoomPropertyData.data.serverData.matrixRoomId,
                        isMatrixRoomPropertyData.data.displayName
                    );
                }
                res.status(200).send("Room name updated successfully");
                return;
            } catch (error) {
                this.handleError(res, error);
                return;
            }
        });
    }
    private handleError(res: Response, error: unknown) {
        console.error(error);
        Sentry.captureMessage(`Internal Server Error : ${error}`);
        return res.status(500).send("Internal Server Error");
    }
}
