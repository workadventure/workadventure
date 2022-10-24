import type { Request, Response, Server } from "hyper-express";
import fs from "fs";
import { BaseHttpController } from "./BaseHttpController";
import { FRONT_ENVIRONMENT_VARIABLES, VITE_URL } from "../enums/EnvironmentVariable";
import { MetaTagsBuilder } from "../services/MetaTagsBuilder";
import Mustache from "mustache";
import type { LiveDirectory } from "../models/LiveDirectory";

export class FrontController extends BaseHttpController {
    private indexFile: string;
    private script: string;

    constructor(protected app: Server, protected liveAssets: LiveDirectory) {
        super(app);

        let indexPath: string;
        if (fs.existsSync("index.html")) {
            // In dev mode
            indexPath = "index.html";
        } else if (fs.existsSync("dist/public/index.html")) {
            // In prod mode
            indexPath = "dist/public/index.html";
        } else {
            throw new Error("Could not find index.html file");
        }

        this.indexFile = fs.readFileSync(indexPath, "utf8");

        // Pre-parse the index file for speed (and validation)
        Mustache.parse(this.indexFile);

        this.script = "window.env = " + JSON.stringify(FRONT_ENVIRONMENT_VARIABLES);
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
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/*/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/@/*", (req: Request, res: Response) => {
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/~/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/", (req: Request, res: Response) => {
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/index.html", (req: Request, res: Response) => {
            res.status(303).redirect("/");
            return;
        });

        this.app.get("/login", (req: Request, res: Response) => {
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/jwt", (req: Request, res: Response) => {
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/register", (req: Request, res: Response) => {
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // this.app.get("/static/images/favicons/manifest.json", (req: Request, res: Response) => {
        //     return res.status(303).redirect("/");
        // });

        this.app.get("/*", (req: Request, res: Response) => {
            if (req.path.startsWith("/src") || req.path.startsWith("/node_modules")) {
                res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
                return;
            }

            const filePath = req.path.startsWith("/src") ? req.path.replace(/\/src/, "") : req.path;

            const file = this.liveAssets.get(decodeURI(filePath));

            if (!file) {
                res.status(404).send("404 Page not found");
                return;
            }

            res.type(file.extension).send(file.buffer);
            return;
        });
    }

    private displayFront(req: Request, res: Response, url: string) {
        (async () => {
            let indexPath: string;
            if (fs.existsSync("index.html")) {
                // In dev mode
                indexPath = "index.html";
            } else if (fs.existsSync("public/index.html")) {
                // In prod mode
                indexPath = "public/index.html";
            } else {
                throw new Error("Could not find index.html file");
            }

            const builder = new MetaTagsBuilder(url);

            try {
                const metaTagsData = await builder.getMeta(req.header("User-Agent"));

                const html = Mustache.render(this.indexFile, {
                    ...metaTagsData,
                    msApplicationTileImage: metaTagsData.favIcons[metaTagsData.favIcons.length - 1].src,
                    url,
                    script: this.script,
                });

                return res.type("html").send(html);
            } catch (e) {
                console.error(e);
                res.status(500).send();
                return;
            }
        })().catch((e) => {
            console.error(e);
            res.status(500).send();
            return;
        });
    }
}
