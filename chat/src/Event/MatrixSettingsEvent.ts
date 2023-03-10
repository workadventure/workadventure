import { z } from "zod";

export const MatrixSettingsEvent = z.object({
    matrixUserId: z.string().optional(),
    homeServerUrl: z.string(),
    vaultPassword: z.string().optional()
});

export type MatrixSettingsEvent = z.infer<typeof MatrixSettingsEvent>;
