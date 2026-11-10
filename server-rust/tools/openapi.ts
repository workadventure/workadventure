// Writes the two OpenAPI documents of the pusher (SwaggerController: /openapi/pusher and /openapi/admin) as a
// pair of JSON files (pusher.json, admin.json, in the directory given), from the TypeScript sources, so that the Rust server serves the same documents. Run from play/.
import fs from "fs";
import swaggerJsdoc from "swagger-jsdoc";
import SwaggerGenerator from "../../play/src/pusher/services/SwaggerGenerator";

const pusher = swaggerJsdoc({
    swaggerDefinition: { openapi: "3.0.0", info: { title: "WorkAdventure Pusher", version: "1.0.0" } },
    apis: ["./src/pusher/controllers/*.ts"],
});
const admin = swaggerJsdoc({
    swaggerDefinition: {
        swagger: "2.0",
        info: {
            title: "WorkAdventure Admin API",
            version: "1.0.0",
            description:
                "This is a documentation about the endpoints of the admin API called by WorkAdventure. Most are called by the pusher, a few by the back. \n You can find out more about WorkAdventure on [github](https://github.com/thecodingmachine/workadventure).",
            contact: { email: "hello@workadventu.re" },
        },
        tags: [{ name: "AdminAPI", description: "Access to end points of the admin from WorkAdventure (pusher and back)" }],
        securityDefinitions: { Bearer: { type: "apiKey", name: "Authorization", in: "header" } },
        ...SwaggerGenerator.definitions(null),
    },
    apis: ["./src/pusher/services/*.ts"],
} as swaggerJsdoc.Options);
// swagger-jsdoc prints its warnings on stdout (the pusher has the same ones): the documents go to files.
const out = process.argv[2];
fs.writeFileSync(`${out}/pusher.json`, JSON.stringify(pusher, null, 2) + "\n");
fs.writeFileSync(`${out}/admin.json`, JSON.stringify(admin, null, 2) + "\n");
