import { z } from "zod";

export const NewSpaceUserEvent = z.object({
    spaceUserId: z.string(),
    name: z.string(),
    playUri: z.string(),
    isLogged: z.boolean(),
    availabilityStatus: z.number(),
    tags: z.string().array(),
    cameraState: z.boolean(),
    microphoneState: z.boolean(),
    screenSharingState: z.boolean(),
    megaphoneState: z.boolean(),
    uuid: z.string(),
    chatID: z.string().optional(),
    showVoiceIndicator: z.boolean(),
});
export type NewSpaceUserEvent = z.infer<typeof NewSpaceUserEvent>;
