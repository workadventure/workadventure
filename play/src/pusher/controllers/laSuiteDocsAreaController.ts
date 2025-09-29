import * as Sentry from "@sentry/node";
import { Request, Response } from "express";
import { validatePostQuery } from "../services/QueryValidator";
import { mapStorageToken } from "../middlewares/MapStorageToken";
import {
    LASUITE_NUMERIQUE_DOCS_ROLE,
    LASUITE_NUMERIQUE_DOCS_VISIBILITY,
    laSuiteDocsProvider,
} from "../services/LaSuite/docsProvider";
import { LaSuiteNumeriqueDocsPropertyData } from "../../common/external-modules/lasuitenumerique-docs/MapEditor/types";
import { BaseHttpController } from "./BaseHttpController";

/*
   This controller is used as the resource URL for the lasuite docs area. It is called by the map storage. 
*/
//TODO: bouger dans l'extension module
export class LaSuiteDocsAreaController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        /**
         * @openapi
         * /roomArea:
         *   post:
         *     summary: Create a new LaSuite Docs document dedicated to an area
         *     description: Create a new LaSuite Docs document associated with a specific area.
         *     tags:
         *       - LaSuiteDocsArea
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/LaSuiteDocsPropertyData'
         *     responses:
         *       '201':
         *         description: Matrix room created successfully.
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/LaSuiteDocsPropertyData'
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
        this.app.post("/laSuiteDocsArea", [mapStorageToken], async (req: Request, res: Response) => {
            try {
                const body = validatePostQuery(req, res, LaSuiteNumeriqueDocsPropertyData);

                if (!body) {
                    res.status(400).send("Invalid Request Body");
                    return;
                }

                const serverData = await laSuiteDocsProvider.createDocument();

                body.serverData = serverData.serverData;

                if (serverData.serverData?.laSuiteNumeriqueDocsId) {
                    await laSuiteDocsProvider.changeDocumentVisibility(
                        serverData.serverData.laSuiteNumeriqueDocsId,
                        LASUITE_NUMERIQUE_DOCS_VISIBILITY.PUBLIC,
                        LASUITE_NUMERIQUE_DOCS_ROLE.EDITOR
                    );
                }

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
         *     summary: Update LaSuite Docs document name
         *     description: Updates the name of an existing LaSuite Docs document.
         *     tags:
         *       - LaSuiteDocsArea
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/LaSuiteDocsPropertyData'
         *     responses:
         *       '200':
         *         description: LaSuite Docs document name updated successfully.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *               example: LaSuite Docs document name updated successfully
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
        this.app.delete("/laSuiteDocsArea", [mapStorageToken], async (req: Request, res: Response) => {
            try {
                const body = req.body;
                const isLaSuiteDocsPropertyData = LaSuiteNumeriqueDocsPropertyData.safeParse(body);

                if (!isLaSuiteDocsPropertyData.success) {
                    res.status(400).send("Invalid request body");
                    return;
                }

                if (isLaSuiteDocsPropertyData.data.serverData?.laSuiteNumeriqueDocsId) {
                    await laSuiteDocsProvider.deleteDocument(
                        isLaSuiteDocsPropertyData.data.serverData.laSuiteNumeriqueDocsId
                    );
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
         *     description: Update LaSuite Docs document name
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
        this.app.patch("/laSuiteDocsArea", [mapStorageToken], (req: Request, res: Response) => {
            res.status(200).send("ok");
            return;
        });
    }

    private handleError(res: Response, error: unknown) {
        console.error(error);
        Sentry.captureMessage(`Internal Server Error : ${error}`);
        return res.status(500).send("Internal Server Error");
    }
}
