import type { Request, Response, Server } from "hyper-express";
import fs from "fs";
import { BaseHttpController } from "./BaseHttpController";
import { VITE_URL } from "../enums/EnvironmentVariable";
import { MetaTagsBuilder } from "../services/MetaTagsBuilder";
import type { LiveDirectory } from "../models/LiveDirectory";

export class FrontController extends BaseHttpController {
    constructor(protected app: Server, protected liveAssets: LiveDirectory) {
        super(app);
    }

    routes(): void {
        this.front();
    }

    private getFullUrl(req: Request): string {
        return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    }

    front(): void {
        this.app.get("/_/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(res, this.getFullUrl(req));
        });

        this.app.get("/*/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(res, this.getFullUrl(req));
        });

        this.app.get("/@/*", (req: Request, res: Response) => {
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(res, this.getFullUrl(req));
        });

        this.app.get("/~/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(res, this.getFullUrl(req));
        });

        this.app.get("/", (req: Request, res: Response) => {
            return this.displayFront(res, this.getFullUrl(req));
        });

        this.app.get("/index.html", (req: Request, res: Response) => {
            return res.status(303).redirect("/");
        });

        // this.app.get("/static/images/favicons/manifest.json", (req: Request, res: Response) => {
        //     return res.status(303).redirect("/");
        // });

        this.app.get("/*", (req: Request, res: Response) => {
            if (req.path.startsWith("/src") || req.path.startsWith("/node_modules")) {
                return res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
            }

            const filePath = req.path.startsWith("/src") ? req.path.replace(/\/src/, "") : req.path;

            const file = this.liveAssets.get(decodeURI(filePath));

            if (!file) {
                return res.status(404).send();
            }

            return res.type(file.extension).send(file.buffer);
        });
    }

    private displayFront(res: Response, url: string) {
        (async () => {
            const indexPath = process.env.NODE_ENV === "production" ? "public/index.html" : "index.html";
            const file = fs.readFileSync(indexPath);

            if (!file) {
                return res.status(500).send();
            }

            const builder = new MetaTagsBuilder(file, url);

            try {
                const formattedFile = await builder.build();

                return res.type("html").send(formattedFile);
            } catch (e) {
                console.error(e);
                return res.status(500).send();
            }
        })().catch((e) => console.error(e));
    }
}
