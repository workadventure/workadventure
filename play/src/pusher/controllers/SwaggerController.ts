import fs from "fs";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import * as cheerio from "cheerio";
import { ADMIN_URL } from "../enums/EnvironmentVariable";
import SwaggerGenerator from "../services/SwaggerGenerator";
import { BaseHttpController } from "./BaseHttpController";

export class SwaggerController extends BaseHttpController {
    routes(): void {
        this.app.get("/openapi/pusher", (req, res) => {
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

            res.atomic(() => {
                res.json(swaggerJsdoc(options));
            });
        });

        this.app.get("/openapi/admin", (req, res) => {
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
            res.atomic(() => {
                res.json(swaggerJsdoc(options));
            });
        });

        this.app.get("/openapi/external-admin", (req, res) => {
            // Let's load the module dynamically (it may not exist in prod because part of the -dev packages)
            const options = {
                swagger: "2.0",
                //openapi: "3.0.0",
                info: {
                    title: "WorkAdventure External Admin",
                    version: "1.0.0",
                    description:
                        "This is a documentation about the external endpoints called by the pusher (aka the Admin API). \n Those endpoints should be implemented by the Admin API. The pusher will access those endpoints (just like webhooks). You can find out more about WorkAdventure and the Admin API on [GitHub](https://github.com/thecodingmachine/workadventure/blob/develop/docs/dev/adminAPI.md).",
                    contact: {
                        email: "hello@workadventu.re",
                    },
                },
                tags: [
                    {
                        name: "ExternalAdminAPI",
                        description: "Access to end points of the external admin from the pusher",
                    },
                ],
                securityDefinitions: {
                    Header: {
                        type: "apiKey",
                        name: "Authorization",
                        in: "header",
                    },
                },
                ...SwaggerGenerator.definitions("external"),
                paths: {
                    "/api/mapinformation": {
                        get: {
                            security: [
                                {
                                    Header: [],
                                },
                            ],
                            tags: ["ExternalAdminAPI"],
                            parameters: [
                                {
                                    name: "playUri",
                                    in: "query",
                                    description: "The full URL of WorkAdventure",
                                    required: true,
                                    type: "string",
                                    example: "http://example.com/@/teamSlug/worldSLug/roomSlug",
                                },
                            ],
                            responses: {
                                200: {
                                    description: "The details of the map",
                                    schema: {
                                        $ref: "#/definitions/MapDetailsData",
                                    },
                                },
                                401: {
                                    description: "Error while retrieving the data because you are not authorized",
                                    schema: {
                                        $ref: "#/definitions/ErrorApiUnauthorizedData",
                                    },
                                },
                            },
                        },
                    },
                    "/api/roomaccess": {
                        get: {
                            security: [
                                {
                                    Header: [],
                                },
                            ],
                            tags: ["ExternalAdminAPI"],
                            parameters: [
                                {
                                    name: "playUri",
                                    in: "query",
                                    description: "The full URL of WorkAdventure",
                                    required: true,
                                    type: "string",
                                    example: "http://example.com/@/teamSlug/worldSLug/roomSlug",
                                },
                                {
                                    name: "ipAddress",
                                    in: "query",
                                    description:
                                        "IP Address of the user logged in, allows you to check whether a user has been banned or not",
                                    required: true,
                                    type: "string",
                                    example: "127.0.0.1",
                                },
                                {
                                    name: "userIdentifier",
                                    in: "query",
                                    description:
                                        "The identifier of the current user \n It can be null or an uuid or an email",
                                    type: "string",
                                    example: "998ce839-3dea-4698-8b41-ebbdf7688ad9",
                                },
                            ],
                            responses: {
                                200: {
                                    description: "The details of the member if he can access this room",
                                    schema: {
                                        $ref: "#/definitions/FetchMemberDataByUuidResponse",
                                    },
                                },
                                401: {
                                    description: "Error while retrieving the data because you are not authorized",
                                    schema: {
                                        $ref: "#/definitions/ErrorApiUnauthorizedData",
                                    },
                                },
                            },
                        },
                    },
                    "/api/loginurl/{organizationMemberToken}": {
                        get: {
                            security: [
                                {
                                    Header: [],
                                },
                            ],
                            description: "Returns a member from the token",
                            tags: ["ExternalAdminAPI"],
                            parameters: [
                                {
                                    name: "organizationMemberToken",
                                    in: "path",
                                    description: "The token of member in the organization",
                                    required: true,
                                    type: "string",
                                },
                            ],
                            responses: {
                                200: {
                                    description: "The details of the member",
                                    schema: {
                                        $ref: "#/definitions/AdminApiData",
                                    },
                                },
                                401: {
                                    description: "Error while retrieving the data because you are not authorized",
                                    schema: {
                                        $ref: "#/definitions/ErrorApiUnauthorizedData",
                                    },
                                },
                            },
                        },
                    },
                },
            };
            res.atomic(() => {
                res.json(options);
            });
        });

        // Create static serve route to serve index.html
        this.app.get("/swagger-ui/", (request, response) => {
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
                    { url: "/openapi/external-admin", name: "Admin -> External Admin" },
                ];
                const swaggerScript = `<script charset="UTF-8">window.onload = function() {
                    window.ui = SwaggerUIBundle({
                        urls: ${JSON.stringify(urls)}, "urls.primaryName": "Admin -> External Admin",
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

                response.send($.html());
                return;
            });
        });

        // Create static serve route to serve frontend assets
        this.app.get("/swagger-ui/*", (request, response) => {
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
