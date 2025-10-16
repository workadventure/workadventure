import { z } from "zod";

export const isRoomMetadataData = z.object({
  // Add here all the metadata from admin you want
  room: z.object({
    isPremium: z.boolean().optional().default(false),
    enableRecord: z.boolean().optional().default(false),
  })
});

export type RoomMetadataData = z.infer<typeof isRoomMetadataData>;