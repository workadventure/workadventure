import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import { isMucRoomDefinition } from "./MucRoomDefinitionInterface";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isMapDetailsData = z.object({
    // @ts-ignore
    mapUrl: extendApi(z.string(), {
        description: "The full URL to the JSON map file",
        example: "https://myuser.github.io/myrepo/map.json",
    }),
    authenticationMandatory: extendApi(z.optional(z.nullable(z.boolean())), {
        description: "Whether the authentication is mandatory or not for this map",
        example: true,
    }),
    group: extendApi(z.nullable(z.string()), {
        description: 'The group this room is part of (maps the notion of "world" in WorkAdventure SAAS)',
        example: "myorg/myworld",
    }),
    mucRooms: extendApi(z.nullable(z.array(isMucRoomDefinition)), {
        description: 'The MUC room is a room of message',
    }),

    contactPage: extendApi(z.optional(z.nullable(z.string())), {
        description: "The URL to the contact page",
        example: "https://mycompany.com/contact-us",
    }),
    iframeAuthentication: extendApi(z.optional(z.nullable(z.string())), {
        description: "The URL of the authentication Iframe",
        example: "https://mycompany.com/authc",
    }),
    // The date (in ISO 8601 format) at which the room will expire
    expireOn: extendApi(z.optional(z.string()), {
        description: "The date (in ISO 8601 format) at which the room will expire",
        example: "2022-11-05T08:15:30-05:00",
    }),
    // Whether the "report" feature is enabled or not on this room
    canReport: extendApi(z.optional(z.boolean()), {
        description: 'Whether the "report" feature is enabled or not on this room',
        example: true,
    }),
    // The URL of the logo image on the loading screen
    loadingLogo: extendApi(z.optional(z.nullable(z.string())), {
        description: "The URL of the image to be used on the loading page",
        example: "https://example.com/logo.png",
    }),
    // The URL of the logo image on "LoginScene"
    loginSceneLogo: extendApi(z.optional(z.nullable(z.string())), {
        description: "The URL of the image to be used on the LoginScene",
        example: "https://example.com/logo_login.png",
    }),
    showPoweredBy: extendApi(z.boolean(), {
        description: "The URL of the image to be used on the name scene",
        example: "https://example.com/logo_login.png",
    }),
});

export type MapDetailsData = z.infer<typeof isMapDetailsData>;
