import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";
import { ErrorApiData } from "./ErrorApiData";
import { WokaDetail } from "./PlayerTextures";

export const MeSuccessResponse = extendApi(
  z.object({
    status: z.literal("ok"),
    authToken: extendApi(z.string(), {
      description: "The authToken.",
    }),
    userUuid: extendApi(z.string(), {
      description: "A unique identifier for the user.",
    }),
    email: extendApi(z.string().nullable().optional(), {
      description: "The email of the user.",
    }),
    username: extendApi(z.string().nullable().optional(), {
      description: "The name of the Woka.",
      example: "John",
    }),
    locale: extendApi(z.string().nullable().optional(), {
      description: "The locale (if returned by OpenID Connect).",
    }),
    /*textures: extendApi(z.array(z.object({
            id: extendApi(z.string(), {
                description:
                    "The id of the texture.",
            }),
        })), {
            description:
                "The textures of the Woka.",
        }),*/
    visitCardUrl: extendApi(z.string().nullable().optional(), {
      description: "The visit card URL of the Woka.",
    }),
    isCharacterTexturesValid: extendApi(z.boolean(), {
      description:
        "True if the character textures are valid, false if we need to redirect the user to the Woka selection page.",
      example: true,
    }),
    isCompanionTextureValid: extendApi(z.boolean(), {
      description:
        "True if the companion texture is valid, false if we need to redirect the user to the companion selection page.",
      example: true,
    }),
    matrixUserId: extendApi(z.string().nullable().optional(), {
      description: "The matrix user id of the user.", // Note: do we need this with OpenID Connect?
    }),
    matrixServerUrl: extendApi(z.string().nullable().optional(), {
      description: "The matrix server url for this user.",
    }),
    /*isMatrixRegistered: extendApi(z.boolean(), {
            description:
                "???",
        }),*/
  }),
  {
    description: "This is a response to the /me endpoint.",
  }
);

export type MeSuccessResponse = z.infer<typeof MeSuccessResponse>;

export const MeResponse = z.union([MeSuccessResponse, ErrorApiData]);
export type MeResponse = z.infer<typeof MeResponse>;
