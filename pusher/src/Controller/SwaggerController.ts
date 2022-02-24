import swaggerJsdoc from "swagger-jsdoc";
import { BaseHttpController } from "./BaseHttpController";
// @ts-ignore
import LiveDirectory from "live-directory";
import * as fs from "fs";

export class SwaggerController extends BaseHttpController {
    routes() {
        this.app.get("/openapi", (req, res) => {
            const options = {
                swaggerDefinition: {
                    openapi: "3.0.0",
                    info: {
                        title: "WorkAdventure Pusher",
                        version: "1.0.0",
                    },
                },
                apis: ["./src/Controller/*.ts"],
            };

            res.json(swaggerJsdoc(options));
        });

        // Create a LiveDirectory instance to virtualize directory with our assets
        const LiveAssets = new LiveDirectory({
            path: __dirname + "/../../node_modules/swagger-ui-dist", // We want to provide the system path to the folder. Avoid using relative paths.
            keep: {
                extensions: [".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".html"], // We only want to serve files with these extensions
            },
            ignore: (path: string) => {
                return path.startsWith("."); // We want to ignore dotfiles for safety
            },
        });

        // Create static serve route to serve index.html
        this.app.get("/swagger-ui/", (request, response) => {
            fs.readFile(__dirname + "/../../node_modules/swagger-ui-dist/index.html", "utf8", function (err, data) {
                if (err) {
                    return response.status(500).send(err.message);
                }
                const result = data.replace(/https:\/\/petstore\.swagger\.io\/v2\/swagger.json/g, "/openapi");

                response.send(result);

                return;
            });
        });

        // Create static serve route to serve frontend assets
        this.app.get("/swagger-ui/*", (request, response) => {
            // Strip away '/assets' from the request path to get asset relative path
            // Lookup LiveFile instance from our LiveDirectory instance.
            const path = request.path.replace("/swagger-ui", "");
            const file = LiveAssets.get(path);

            // Return a 404 if no asset/file exists on the derived path
            if (file === undefined) return response.status(404).send("");

            // Set appropriate mime-type and serve file buffer as response body
            return response.type(file.extension).send(file.buffer);
        });
    }
}
