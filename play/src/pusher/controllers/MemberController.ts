import type { Request, Response } from "hyper-express";
import { z } from "zod";
import { authenticated } from "../middlewares/Authenticated";
import { validateQuery } from "../services/QueryValidator";
import { adminApi } from "../services/AdminApi";
import { BaseHttpController } from "./BaseHttpController";

/**
 * Controller used for member related queries
 * and mutations with admin api
 */
export class MemberController extends BaseHttpController {
    routes(): void {
        this.searchMembers();
    }

    /**
     * @openapi
     * /members:
     *   get:
     *     description: Search members from search term.
     *     tags:
     *      - Admin endpoint
     *     parameters:
     *      - name: "playUri"
     *        in: "request"
     *        required: true
     *        type: "string"
     *        description: The room url
     *      - name: "searchText"
     *        in: "request"
     *        description: search text use for user search (name, email, etc)
     *        required: true
     *        type: "string"
     *     responses:
     *       200:
     *        description: Member list or empty list.
     *        schema:
     *            $ref: '#/definitions/MemberData'
     */
    searchMembers(): void {
        this.app.options("/members", (req, res) => {
            res.atomic(() => {
                res.status(200).send();
            });
        });
        this.app.get("/members", [authenticated], async (req: Request, res: Response) => {
            const query = validateQuery(
                req,
                res,
                z.object({
                    playUri: z.string(),
                    searchText: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }

            const members = await adminApi.searchMembers(query.playUri, query.searchText);

            res.atomic(() => {
                res.setHeader("Content-Type", "application/json").send(JSON.stringify(members));
            });

            return;
        });
    }
}
