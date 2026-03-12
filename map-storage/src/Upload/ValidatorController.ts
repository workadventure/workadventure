import { z } from "zod";
import type { Express } from "express";
import type { MapValidation } from "@workadventure/map-editor/src/GameMap/MapValidator.js";
import { MapValidator } from "@workadventure/map-editor/src/GameMap/MapValidator.js";
import { HttpFileFetcher } from "@workadventure/map-editor/src/GameMap/Validator/HttpFileFetcher.js";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher.js";
import { LocalUrlError } from "@workadventure/map-editor/src/LocalUrlError.js";
import { passportAuthenticator } from "../Services/Authentication.ts";
import { validateQuery } from "./ValidateQuery.ts";

export class ValidatorController {
    constructor(private app: Express) {
        this.validate();
    }

    private validate() {
        this.app.get("/validate", passportAuthenticator, (req, res, next) => {
            (async () => {
                const data = validateQuery(req, res, z.object({ mapUrl: z.string().min(1) }));
                if (!data) {
                    return;
                }
                const mapUrl = data.mapUrl;

                const mapValidator = new MapValidator("info", new HttpFileFetcher(mapUrl));

                try {
                    const response = await mapFetcher.fetchFile(mapUrl, false, false);

                    const mapValidation = await mapValidator.validateMap(response.data);

                    if (mapValidation.ok) {
                        res.status(200).json({ ok: true });
                    } else {
                        res.status(400).json(mapValidation);
                    }
                } catch (error) {
                    if (error instanceof LocalUrlError) {
                        res.status(400).json({
                            ok: false,
                            error: {
                                map: [
                                    {
                                        message: "Unable to validate map: Cannot access local URL.",
                                        details: error.message,
                                        type: "warning",
                                    },
                                ],
                            },
                        } satisfies MapValidation);
                        return;
                    }
                    throw error;
                }
            })().catch((e) => next(e));
        });
    }
}
