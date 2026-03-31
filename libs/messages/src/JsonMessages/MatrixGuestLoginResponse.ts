import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const MatrixGuestLoginResponse = extendApi(
    z.object({
        authToken: z.string(),
        userUuid: z.string(),
        matrixUserId: z.string(),
        matrixAccessToken: z.string(),
        matrixDeviceId: z.string(),
        matrixServerUrl: z.string(),
    }),
    {
        description: "Response from POST /matrixGuestLogin (anonymous Matrix guest session).",
    }
);

export type MatrixGuestLoginData = z.infer<typeof MatrixGuestLoginResponse>;
