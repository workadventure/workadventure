import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import { wokaTexture } from "./PlayerTextures";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isMeData = extendApi(
    z.object({
        type: z.literal("me"),
        authToken: extendApi(z.string().nullable(), {
            description: "The authToken for the user.",
        }),
        userUuid: extendApi(z.string(), {
            description: "The user UUID.",
        }),
        email: extendApi(z.string().nullable().optional(), {
            description: "The email of the user.",
            example: "john.doe@example.com",
        }),
        username: extendApi(z.string().nullable().optional(), {
            description: "A user name to attribute to the user (if any)",
            example: "JohnJohn",
        }),
        locale: extendApi(z.string().nullable().optional(), {
            description: "The default locale for the user.",
            example: "fr-FR",
        }),
        textures: extendApi(z.array(wokaTexture), {
            description: "The array of textures to use for the Woka",
        }),
        visitCardUrl: extendApi(z.string().nullable().optional(), {
            description: "The URL to the visit card, if any",
            example: "https://example.com/visit-card/john_doe",
        }),
    }),
    {
        description: "Describes the curren user.",
    }
);

export type MeData = z.infer<typeof isMeData>;
