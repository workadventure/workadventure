import { z } from "zod";

export const isNotificationEvent = z.object({
    userName: z.string(),
    notificationType: z.number(),
    forum: z.optional(z.nullable(z.string())),
});

/**
 * A message sent from the iFrame to the game to emit a notification.
 */
export type NotificationEvent = z.infer<typeof isNotificationEvent>;
