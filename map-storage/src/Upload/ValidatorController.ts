import { z } from "zod";
import { Express } from "express";
import { MapValidator } from "@workadventure/map-editor/src/GameMap/MapValidator";
import { HttpFileFetcher } from "@workadventure/map-editor/src/GameMap/Validator/HttpFileFetcher";
import { mapFetcher } from "@workadventure/map-editor";
import { passportAuthenticator } from "../Services/Authentication";
import { validateQuery } from "./ValidateQuery";

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

                const response = await mapFetcher.fetchFile(mapUrl, false, false);

                const mapValidation = await mapValidator.validateMap(response.data);
                if (mapValidation.ok) {
                    res.status(200).json({ ok: true });
                } else {
                    res.status(400).json(mapValidation);
                }
            })().catch((e) => next(e));
        });
    }
}
