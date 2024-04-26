import { z } from 'zod';

export const ITiledMapFrame = z.object({
  duration: z.number(),
  tileid: z.number(),
});

export type ITiledMapFrame = z.infer<typeof ITiledMapFrame>;
