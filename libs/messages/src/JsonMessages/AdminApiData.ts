import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isAdminApiData = z.object({
  userUuid: extendApi(z.string(), {
    example: "998ce839-3dea-4698-8b41-ebbdf7688ad9",
  }),
  email: extendApi(z.string().nullable(), {
    description: "The email of the current user.",
    example: "example@workadventu.re",
  }),
  roomUrl: extendApi(z.string(), { example: "/@/teamSlug/worldSlug/roomSlug" }),
  mapUrlStart: extendApi(z.string(), {
    description: "The full URL to the JSON map file",
    example: "https://myuser.github.io/myrepo/map.json",
  }),
  messages: z.optional(z.array(z.unknown())),
});

export type AdminApiData = z.infer<typeof isAdminApiData>;

export const isUserRoomToken = z.object({
  messages: z.optional(z.array(z.unknown())),
  alg: z.string(),
  iss: z.string(),
  aud: z.string(),
  iat: z.number(),
  uid: z.string(),
  user: extendApi(z.string().nullable(), {
    description: "The email of the current user.",
    example: "example@workadventu.re",
  }),
  room: extendApi(z.string(), {
    description: "The room URL of the current user.",
    example: "/@/teamSlug/worldSlug/roomSlug",
  }),
  exp: z.number(),
});

export const isOauthRefreshToken = z.object({
  message: z.string(),
  token: z.string(),
});

export type OauthRefreshToken = z.infer<typeof isOauthRefreshToken>;
