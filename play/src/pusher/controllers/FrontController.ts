import fs from "fs";
import type { Request, Response, Server } from "hyper-express";
import Mustache from "mustache";
import { uuid } from "stanza/Utils";
import * as Sentry from "@sentry/node";
import { MetaTagsBuilder } from "../services/MetaTagsBuilder";
import type { LiveDirectory } from "../models/LiveDirectory";
import { adminService } from "../services/AdminService";
import { notWaHost } from "../middlewares/NotWaHost";
import { version } from "../../../package.json";
import { FRONT_ENVIRONMENT_VARIABLES, VITE_URL, LOGROCKET_ID, ADMIN_URL } from "../enums/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";

export class FrontController extends BaseHttpController {
    private indexFile: string;
    private redirectToAdminFile: string;
    private script: string;

    constructor(protected app: Server, protected liveAssets: LiveDirectory) {
        super(app);

        let indexPath: string;
        if (fs.existsSync("dist/public/index.html")) {
            // In prod mode
            indexPath = "dist/public/index.html";
        } else if (fs.existsSync("index.html")) {
            // In dev mode
            indexPath = "index.html";
        } else {
            throw new Error("Could not find index.html file");
        }

        let redirectToAdminPath: string;
        if (fs.existsSync("dist/public/redirectToAdmin.html")) {
            // In prod mode
            redirectToAdminPath = "dist/public/redirectToAdmin.html";
        } else if (fs.existsSync("redirectToAdmin.html")) {
            // In dev mode
            redirectToAdminPath = "redirectToAdmin.html";
        } else {
            throw new Error("Could not find redirectToAdmin.html file");
        }

        this.indexFile = fs.readFileSync(indexPath, "utf8");
        this.redirectToAdminFile = fs.readFileSync(redirectToAdminPath, "utf8");

        // Pre-parse the index file for speed (and validation)
        Mustache.parse(this.indexFile);

        this.script = "window.env = " + JSON.stringify(FRONT_ENVIRONMENT_VARIABLES);
    }

    routes(): void {
        this.front();
    }

    private getFullUrl(req: Request): string {
        let protocol = req.header("X-Forwarded-Proto");
        if (!protocol) {
            protocol = req.protocol;
        }
        return `${protocol}://${req.get("host")}${req.originalUrl}`;
    }

    front(): void {
        this.app.get("/_/*", (req: Request, res: Response) => {
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/_/*", (req: Request, res: Response) => {
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
        this.app.post("/*/*", (req: Request, res: Response) => {
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
        this.app.post("/@/*", (req: Request, res: Response) => {
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
        this.app.post("/~/*", (req: Request, res: Response) => {
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

        this.app.get("/static/images/favicons/manifest.json", (req: Request, res: Response) => {
            if (req.query.url == undefined) {
                return res.status(500).send("playUrl is empty in query parameter of the request");
            }
            return this.displayManifestJson(req, res, req.query.url.toString());
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

        this.app.get(
            "/.well-known/cf-custom-hostname-challenge/*",
            [notWaHost],
            async (req: Request, res: Response) => {
                try {
                    const response = await adminService.fetchWellKnownChallenge(req.hostname);
                    return res.status(200).send(response);
                } catch (e) {
                    Sentry.captureException(e);
                    console.error(e);
                    return res.status(526).send("Fail on challenging hostname");
                }
            }
        );

        this.app.get("/server.json", (req: Request, res: Response) => {
            return res.json({
                domain: process.env.PUSHER_URL,
                name: process.env.SERVER_NAME || "WorkAdventure Server",
                motd: process.env.SERVER_MOTD || "A WorkAdventure Server",
                icon: process.env.SERVER_ICON || process.env.PUSHER_URL + "/static/images/favicons/icon-512x512.png",
                version: version + (process.env.NODE_ENV !== "production" ? "-dev" : ""),
            });
        });

        this.app.get("/*", (req: Request, res: Response) => {
            if (req.path.startsWith("/src") || req.path.startsWith("/node_modules") || req.path.startsWith("/@fs/")) {
                res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
                return;
            }

            const filePath = req.path.startsWith("/src") ? req.path.replace(/\/src/, "") : req.path;

            const file = this.liveAssets.get(decodeURI(filePath));

            if (!file) {
                res.status(404).send("404 Page not found");
                return;
            }

            if (filePath.startsWith("/assets")) {
                const date = new Date();
                date.setFullYear(date.getFullYear() + 1);
                res.header("expires", date.toUTCString());
                res.header("cache-control", "public");
            }
            if (filePath.startsWith("/resources") || filePath.startsWith("/static")) {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                res.header("expires", date.toUTCString());
                res.header("cache-control", "public");
            }

            res.type(file.extension).header("etag", file.etag).send(file.buffer);
            return;
        });
    }

    private async displayFront(req: Request, res: Response, url: string) {
        const builder = new MetaTagsBuilder(url);
        let html = this.indexFile;

        let redirectUrl: string | undefined;

        try {
            redirectUrl = await builder.getRedirectUrl();
        } catch (e) {
            console.log(`Cannot get redirect URL ${url}`, e);
        }

        if (redirectUrl) {
            return res.redirect(redirectUrl);
        }

        // Read the access_key from the query parameter. If it is set, redirect to the admin to attempt a login.
        const accessKey = req.query.access_key;
        if (accessKey && typeof accessKey === "string" && accessKey.length > 0) {
            if (!ADMIN_URL) {
                return res.status(400).send("ADMIN_URL is not configured.");
            }
            const html = Mustache.render(this.redirectToAdminFile, {
                accessKey,
                ADMIN_URL,
            });
            return res.type("html").send(html);
        }

        // get auth token from post /authToken
        const { authToken } = await req.urlencoded();

        try {
            const metaTagsData = await builder.getMeta(req.header("User-Agent"));
            let option = {};
            if (req.query.logrocket === "true" && LOGROCKET_ID != undefined) {
                option = {
                    ...option,
                    /* TODO change it to push data from admin */
                    logRocketId: LOGROCKET_ID,
                    userId: uuid(),
                };
            }
            html = Mustache.render(this.indexFile, {
                ...metaTagsData,
                msApplicationTileImage: metaTagsData.favIcons[metaTagsData.favIcons.length - 1].src,
                url,
                script: this.script,
                authToken: authToken,
                ...option,
            });
        } catch (e) {
            console.log(`Cannot render metatags on ${url}`, e);
        }

        return res.type("html").send(html);
    }

    private async displayManifestJson(req: Request, res: Response, url: string) {
        const builder = new MetaTagsBuilder(url);

        const metaTagsData = await builder.getMeta(req.header("User-Agent"));

        const manifest = {
            short_name: metaTagsData.title,
            name: metaTagsData.title,
            icons: metaTagsData.manifestIcons,
            start_url: url.replace(`${req.protocol}://${req.hostname}`, ""),
            background_color: metaTagsData.themeColor,
            display_override: ["window-control-overlay", "minimal-ui"],
            display: "standalone",
            orientation: "portrait-primary",
            scope: "/",
            lang: "en",
            theme_color: metaTagsData.themeColor,
            shortcuts: [
                {
                    name: metaTagsData.title,
                    short_name: metaTagsData.title,
                    description: metaTagsData.description,
                    url: "/",
                    icons: [
                        {
                            src: "/static/images/favicons/android-icon-192x192.png",
                            sizes: "192x192",
                            type: "image/png",
                        },
                    ],
                },
            ],
            description: metaTagsData.description,
            screenshots: [],
            related_applications: [
                {
                    platform: "web",
                    url: "https://workadventu.re",
                },
                {
                    platform: "play",
                    url: "https://play.workadventu.re",
                },
            ],
        };

        return res.json(manifest);
    }
}
