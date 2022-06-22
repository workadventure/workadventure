import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import { isMucRoomDefinition } from "./MucRoomDefinitionInterface";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

const isBbbData = z.object({
    url: extendApi(z.string(), {
        description: 'The full URL to your BigBlueButton server. Do not forget the trailing "/bigbluebutton/".',
        example: "https://test-install.blindsidenetworks.com/bigbluebutton/",
    }),
    secret: extendApi(z.string(), {
        description:
            'The BigBlueButton secret. From your BBB instance, you can get the correct values using the command: "bbb-conf --secret"',
    }),
});

const isJitsiData = z.object({
    url: extendApi(z.string(), {
        description: "The domain name of your Jitsi server.",
        example: "meet.jit.si",
    }),
    iss: extendApi(z.optional(z.nullable(z.string())), {
        description: "The Jitsi ISS setting. See https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md",
        default: false,
    }),
    secret: extendApi(z.optional(z.nullable(z.string())), {
        description: "The Jitsi secret setting. See https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md",
    }),
});

const isMapThirdPartyData = z.object({
    bbb: extendApi(z.optional(z.nullable(isBbbData)), {
        description: "Use these settings to override default BigBlueButton settings.",
    }),
    jitsi: extendApi(z.optional(z.nullable(isJitsiData)), {
        description: "Use these settings to override default Jitsi settings.",
    }),
});

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
        description: "The MUC room is a room of message",
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
    loadingCowebsiteLogo: extendApi(z.optional(z.nullable(z.string())), {
        description: "The URL of the image to be used on the cowebsite loading page",
        example: "https://example.com/logo.gif",
    }),
    miniLogo: z.optional(z.nullable(z.string())),
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
    showPoweredBy: extendApi(z.optional(z.nullable(z.boolean())), {
        description: "The URL of the image to be used on the name scene",
        example: "https://example.com/logo_login.png",
    }),
    thirdParty: extendApi(z.optional(z.nullable(isMapThirdPartyData)), {
        description: "Configuration data for third party services",
    }),
});

export type MapDetailsData = z.infer<typeof isMapDetailsData>;
export type MapThirdPartyData = z.infer<typeof isMapThirdPartyData>;
export type MapBbbData = z.infer<typeof isBbbData>;
export type MapJitsiData = z.infer<typeof isJitsiData>;
