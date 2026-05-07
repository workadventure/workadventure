import fs from "fs";
import path from "path";
import { VITE_URL } from "../enums/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";

/**
 * Dev entry: GET /dev/pip-layout-test.html
 * Serves the built PiP layout test page from dist/public when available;
 * otherwise redirects to the Vite dev server (see VITE_URL).
 */
export class PipLayoutTestDevController extends BaseHttpController {
    protected routes(): void {
        this.app.get("/dev/pip-layout-test.html", (_req, res) => {
            const distHtml = path.join(process.cwd(), "dist/public/pip-layout-test.html");
            if (fs.existsSync(distHtml)) {
                res.sendFile(path.resolve(distHtml));
                return;
            }
            const base = (VITE_URL || "http://localhost:8080").replace(/\/$/, "");
            res.redirect(302, `${base}/pip-layout-test.html`);
        });
    }
}
