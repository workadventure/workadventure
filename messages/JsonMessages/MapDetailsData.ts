import { z } from "zod";
import { isMucRoomDefinition } from "./MucRoomDefinitionInterface";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isMapDetailsData = z.object({
    mapUrl: z.string(),
    policy_type: z.number(),
    tags: z.array(z.string()),
    authenticationMandatory: z.optional(z.nullable(z.boolean())),
    roomSlug: z.nullable(z.string()), // deprecated
    contactPage: z.nullable(z.string()),
    group: z.nullable(z.string()),
    mucRooms: z.array(isMucRoomDefinition),

    iframeAuthentication: z.optional(z.nullable(z.string())),
    // The date (in ISO 8601 format) at which the room will expire
    expireOn: z.optional(z.string()),
    // Whether the "report" feature is enabled or not on this room
    canReport: z.optional(z.boolean()),
    // The URL of the logo image on the loading screen
    loadingLogo: z.optional(z.nullable(z.string())),
    // The URL of the logo image on "LoginScene"
    loginSceneLogo: z.optional(z.nullable(z.string())),
});

export type MapDetailsData = z.infer<typeof isMapDetailsData>;
