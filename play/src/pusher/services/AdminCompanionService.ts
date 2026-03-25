import { CompanionTextureCollection } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { fetch, HttpError } from "@workadventure/shared-utils/src/Fetch/nodeFetch";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../enums/EnvironmentVariable";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

class AdminCompanionService implements CompanionServiceInterface {
    /**
     * Returns the list of all companions for the current user.
     */
    getCompanionList(roomUrl: string, token: string): Promise<CompanionTextureCollection[] | undefined> {
        /**
         * @openapi
         * /api/companion/list:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Get all the companions
         *     security:
         *      - Bearer: []
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "roomUrl"
         *        in: "query"
         *        description: "The slug of the room"
         *        type: "string"
         *        required: true
         *        example: "/@/teamSlug/worldSlug/roomSlug"
         *      - name: "uuid"
         *        in: "query"
         *        description: "The uuid of the user \n It can be an uuid or an email"
         *        type: "string"
         *        required: true
         *        example: "998ce839-3dea-4698-8b41-ebbdf7688ad8"
         *     responses:
         *       200:
         *         description: The list of the companions
         *         schema:
         *             type: array
         *             items:
         *                 $ref: '#/definitions/CompanionTextureCollection'
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         */
        const url = new URL("/api/companion/list", ADMIN_API_URL);
        url.searchParams.set("roomUrl", roomUrl);
        url.searchParams.set("uuid", token);

        return fetch(url, {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
        })
            .then(async (res) => {
                return CompanionTextureCollection.array().parse((await res.json()) as unknown);
            })
            .catch((err) => {
                if (err instanceof HttpError) {
                    console.error(`Admin companion API failed with status ${err.status}: ${err.body}`);
                }
                console.error(`Cannot get companion collection list from admin API with token: ${token}`, err);
                Sentry.captureException(
                    `Cannot get companion collection list from admin API with token: ${token}`,
                    err
                );
                return undefined;
            });
    }
}

export const adminCompanionService = new AdminCompanionService();
