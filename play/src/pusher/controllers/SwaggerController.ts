import fs from "fs";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import * as cheerio from "cheerio";
import Debug from "debug";
import { ADMIN_URL } from "../enums/EnvironmentVariable";
import SwaggerGenerator from "../services/SwaggerGenerator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class SwaggerController extends BaseHttpController {
    routes(): void {
        this.app.get("/openapi/pusher", (req, res) => {
            debug(`SwaggerController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const options = {
                swaggerDefinition: {
                    openapi: "3.0.0",
                    info: {
                        title: "WorkAdventure Pusher",
                        version: "1.0.0",
                    },
                },
                apis: ["./src/pusher/controllers/*.ts"],
            };

            res.json(swaggerJsdoc(options));
        });

        this.app.get("/openapi/admin", (req, res) => {
            debug(`PrometheusController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const options: swaggerJsdoc.Options = {
                swaggerDefinition: {
                    swagger: "2.0",
                    //openapi: "3.0.0",
                    info: {
                        title: "WorkAdventure Pusher",
                        version: "1.0.0",
                        description:
                            "This is a documentation about the endpoints called by the pusher. \n You can find out more about WorkAdventure on [github](https://github.com/thecodingmachine/workadventure).",
                        contact: {
                            email: "hello@workadventu.re",
                        },
                    },
                    tags: [
                        {
                            name: "AdminAPI",
                            description: "Access to end points of the admin from the pusher",
                        },
                    ],
                    securityDefinitions: {
                        Bearer: {
                            type: "apiKey",
                            name: "Authorization",
                            in: "header",
                        },
                    },
                    ...SwaggerGenerator.definitions(null),
                },
                apis: ["./src/pusher/services/*.ts"],
            };
            if (ADMIN_URL && options.swaggerDefinition) {
                options.swaggerDefinition.host = "pusher." + ADMIN_URL.replace("//", "");
            }
            res.json(swaggerJsdoc(options));
        });

        // Create static serve route to serve index.html
        this.app.get("/swagger-ui/", (request, response) => {
            debug(
                `SwaggerController => [${request.method}] ${request.originalUrl} — IP: ${
                    request.ip
                } — Time: ${Date.now()}`
            );
            fs.readFile(process.cwd() + "/../node_modules/swagger-ui-dist/index.html", "utf8", function (err, data) {
                if (err) {
                    return response.status(500).send(err.message);
                }

                // Load the html file
                const $ = cheerio.load(data);

                // Replace the url of the swagger.json file
                const urls = [
                    { url: "/openapi/pusher", name: "Front -> Pusher <- Admin" },
                    { url: "/openapi/admin", name: "Pusher -> Admin" },
                ];
                const swaggerScript = `<script charset="UTF-8">window.onload = function() {
                    window.ui = SwaggerUIBundle({
                        urls: ${JSON.stringify(urls)}, "urls.primaryName": "Pusher -> Admin",
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIStandalonePreset
                        ],
                        plugins: [
                            SwaggerUIBundle.plugins.DownloadUrl
                        ],
                        layout: "StandaloneLayout"
                    });
                  };</script>`;
                $("body").append(swaggerScript);

                response.type("html").send($.html());
                return;
            });
        });

        // Create static serve route to serve frontend assets
        this.app.get("/swagger-ui/{*splat}", (request, response) => {
            debug(
                `SwaggerController => [${request.method}] ${request.originalUrl} — IP: ${
                    request.ip
                } — Time: ${Date.now()}`
            );
            const fileParsed = path.parse(request.path);
            // Filter files
            if (
                fileParsed.name.startsWith(".") ||
                ![".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".html"].includes(fileParsed.ext)
            ) {
                response.status(404).send("");
                return;
            }

            // Strip away '/assets' from the request path to get asset relative path
            const formattedPath = request.path.replace("/swagger-ui", "");
            const realPath = `${path.resolve("../node_modules/swagger-ui-dist")}${formattedPath}`;
            if (!fs.existsSync(realPath)) {
                response.status(404).send("");
                return;
            }

            const file = fs.readFileSync(realPath);

            // Return a 404 if no asset/file exists on the derived path
            if (file === undefined) {
                response.status(404).send("");
                return;
            }

            // Set appropriate mime-type and serve file buffer as response body
            response.type(fileParsed.ext).send(file);
            return;
        });
    }
}
