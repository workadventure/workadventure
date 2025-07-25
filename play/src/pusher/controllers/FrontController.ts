import fs from "fs";
import type { Request, Response, Application } from "express";
import Mustache from "mustache";
import { uuid } from "stanza/Utils";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import Debug from "debug";
import { MetaTagsBuilder } from "../services/MetaTagsBuilder";
import { adminService } from "../services/AdminService";
import { getStringPalette, wrapWithStyleTag } from "../services/GenerateCustomColors";
import { notWaHost } from "../middlewares/NotWaHost";
import { version } from "../../../package.json";
import {
    FRONT_ENVIRONMENT_VARIABLES,
    VITE_URL,
    LOGROCKET_ID,
    AUTOLOGIN_URL,
    GOOGLE_DRIVE_PICKER_CLIENT_ID,
} from "../enums/EnvironmentVariable";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class FrontController extends BaseHttpController {
    private indexFile: string;
    private redirectToAdminFile: string;
    private script: Promise<string> | undefined;

    constructor(protected app: Application) {
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
    }

    private async getScript() {
        if (this.script) {
            return this.script;
        }
        this.script = adminService.getCapabilities().then((capabilities) => {
            return (
                "window.env = " +
                JSON.stringify(FRONT_ENVIRONMENT_VARIABLES) +
                "\nwindow.capabilities = " +
                JSON.stringify(capabilities)
            );
        });
        return this.script;
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
        this.app.get("/_/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/_/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // this.app.get("/*/{*splat}", (req: Request, res: Response) => {
        //     /**
        //      * get infos from map file details
        //      */
        //     return this.displayFront(req, res, this.getFullUrl(req));
        // });
        // this.app.post("/*/{*splat}", (req: Request, res: Response) => {
        //     /**
        //      * get infos from map file details
        //      */
        //     return this.displayFront(req, res, this.getFullUrl(req));
        // });

        this.app.get("/@/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/@/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/~/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/~/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/index.html", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect("/");
            return;
        });

        this.app.get("/static/images/favicons/manifest.json", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const query = validateQuery(
                req,
                res,
                z.object({
                    url: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }
            return this.displayManifestJson(req, res, query.url);
        });

        this.app.get("/login", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/jwt", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/register/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get(
            "/.well-known/cf-custom-hostname-challenge/{*splat}",
            [notWaHost],
            async (req: Request, res: Response) => {
                debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
                try {
                    const response = await adminService.fetchWellKnownChallenge(req.hostname);
                    res.status(200).send(response);
                    return;
                } catch (e) {
                    Sentry.captureException(e);
                    console.error(e);
                    res.status(526).send("Fail on challenging hostname");
                    return;
                }
            }
        );

        this.app.get("/server.json", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.json({
                domain: process.env.PUSHER_URL,
                name: process.env.SERVER_NAME || "WorkAdventure Server",
                motd: process.env.SERVER_MOTD || "A WorkAdventure Server",
                icon: process.env.SERVER_ICON || process.env.PUSHER_URL + "/static/images/favicons/icon-512x512.png",
                version: version + (process.env.NODE_ENV !== "production" ? "-dev" : ""),
            });
            return;
        });

        this.app.get("/src/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });

        this.app.get("/node_modules/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });

        this.app.get("/@fs/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });
    }

    private async displayFront(req: Request, res: Response, url: string) {
        const builder = new MetaTagsBuilder(url);
        let html = this.indexFile;

        let redirectUrl: string | undefined;

        try {
            redirectUrl = await builder.getRedirectUrl();
        } catch (e) {
            console.info(`Cannot get redirect URL "%s"`, url, e);
        }

        if (redirectUrl) {
            const redirect = redirectUrl;
            res.redirect(redirect);
            return;
        }

        // Read the access_key from the query parameter. If it is set, redirect to the admin to attempt a login.
        const accessKey = req.query.access_key;
        if (accessKey && typeof accessKey === "string" && accessKey.length > 0) {
            if (!AUTOLOGIN_URL) {
                res.status(400).send("AUTOLOGIN_URL is not configured.");
                return;
            }
            const html = Mustache.render(this.redirectToAdminFile, {
                accessKey,
                AUTOLOGIN_URL,
            });
            res.type("html").send(html);
            return;
        }

        // get auth token from post /authToken
        const { authToken } = req.body ?? {};

        try {
            const metaTagsData = await builder.getMeta(req.header("User-Agent"));
            const mapDetails = await builder.getMapDetails();
            let option = {};
            const secondaryPalette = getStringPalette(mapDetails?.primaryColor, "secondary");
            const contrastPalette = getStringPalette(mapDetails?.backgroundColor, "contrast");
            let cssVariablesOverride = "";
            if (secondaryPalette || contrastPalette) {
                cssVariablesOverride = wrapWithStyleTag(`${secondaryPalette}\n${contrastPalette}`);
            }
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
                // TODO change it to push data from admin
                msApplicationTileImage: metaTagsData.favIcons[metaTagsData.favIcons.length - 1].src,
                url,
                script: await this.getScript(),
                authToken: authToken,
                googleDrivePickerClientId: GOOGLE_DRIVE_PICKER_CLIENT_ID,
                cssVariablesOverride,
                ...option,
            });
        } catch (e) {
            console.info(`Cannot render metatags on "%"`, url, e);
        }

        res.type("html").send(html);
        return;
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

        res.json(manifest);
        return;
    }
}
