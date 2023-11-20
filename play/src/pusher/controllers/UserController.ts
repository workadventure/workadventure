import { z } from "zod";
import type { Request } from "hyper-express";
import { adminService } from "../services/AdminService";
import { validatePostQuery } from "../services/QueryValidator";
import { authenticated, ResponseWithUserIdentifier } from "../middlewares/Authenticated";
import { BaseHttpController } from "./BaseHttpController";

export class UserController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        this.saveName();
    }

    /**
     * @openapi
     * /save-name:
     *   post:
     *     description: Forces anyone out of the room. The request must be authenticated with the "admin-token" header.
     *     tags:
     *      - Admin endpoint
     *    requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: "object"
     *             properties:
     *               roomUrl:
     *                 type: string
     *                 required: true
     *                 description: The URL of the room
     *                 example: "https://play.workadventu.re/@/teamSlug/worldSlug/roomSlug"
     *               name:
     *                 type: string
     *                 required: true
     *                 description: The new name for the Woka
     *                 example: "Alice"
     *               userIdentifier:
     *                 type: string
     *                 required: true
     *                 description: "It can be an uuid or an email"
     *                 example: "998ce839-3dea-4698-8b41-ebbdf7688ad9"
     *     responses:
     *      204:
     *         description: Save succeeded
     *       404:
     *         description: User or room not found
     *         schema:
     *             $ref: '#/definitions/ErrorApiErrorData'
     */
    private saveName(): void {
        this.app.post("/save-name", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            const body = await validatePostQuery(
                req,
                res,
                z.object({
                    name: z.string(),
                    roomUrl: z.string(),
                })
            );

            if (body === undefined) {
                return;
            }

            if (!res.userIdentifier) {
                res.status(401).send("Undefined userIdentifier");
                return;
            }

            // Not logged? Nothing to save!
            if (res.isLogged) {
                await adminService.saveName(res.userIdentifier, body.name, body.roomUrl);
            }

            res.atomic(() => {
                res.status(204).send("");
            });
            return;
        });
    }
}
