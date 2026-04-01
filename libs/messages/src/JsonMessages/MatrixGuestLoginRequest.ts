import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/** Body for POST /matrixGuestLogin — optional WOKA name applied as Matrix display name. */
export const MatrixGuestLoginRequest = extendApi(
    z.object({
        playerName: z
            .string()
            .max(256)
            .optional()
            .describe("WorkAdventure player (WOKA) name to set as the Matrix user display name."),
    }),
    {
        description: "Request body for POST /matrixGuestLogin.",
    }
);

export type MatrixGuestLoginRequestBody = z.infer<typeof MatrixGuestLoginRequest>;
