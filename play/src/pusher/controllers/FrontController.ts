import type { Request, Response, Server } from "hyper-express";
import fs from "fs";
import { BaseHttpController } from "./BaseHttpController";
import { FRONT_URL } from "../enums/EnvironmentVariable";

export class FrontController extends BaseHttpController {
    constructor(protected app: Server, protected liveAssets: any) {
        super(app);
    }

    routes(): void {
        this.front();
    }

    front(): void {
        this.app.get("/_/*", (req: Request, res: Response) => {
            return this.displayFront(res);
        });

        this.app.get("/*/*", (req: Request, res: Response) => {
            return this.displayFront(res);
        });

        this.app.get("/@/*", (req: Request, res: Response) => {
            return this.displayFront(res);

        });

        this.app.get("/~/*", (req: Request, res: Response) => {
            return this.displayFront(res);
        });

        this.app.get("/", (req: Request, res: Response) => {
            return this.displayFront(res);
        });

        this.app.get("/index.html", (req: Request, res: Response) => {
            return res.status(303).redirect("/");
        });

        this.app.get("/*", (req: Request, res: Response) => {
            if (req.path.startsWith('/src') || req.path.startsWith('/node_modules')) {
                return res.status(303).redirect(`${FRONT_URL}${decodeURI(req.path)}`);
            }

            const filePath = req.path.startsWith('/src') ? req.path.replace(/\/src/, '') : req.path;

            const file = this.liveAssets.get(decodeURI(filePath));

            if (!file) {
                return res.status(404).send();
            }

            return res.type(file.extension).send(file.buffer);
        });
    }

    private displayFront(res: Response) {
        const indexPath = process.env.NODE_ENV === "production" ? "public/index.html" : "index.html";
        const file = fs.readFileSync(indexPath);

        if (!file) {
            return res.status(500).send();
        }

        return res.type("html").send(file);
    }
}
