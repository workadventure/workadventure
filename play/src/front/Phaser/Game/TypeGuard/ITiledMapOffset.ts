import { z } from 'zod';

export const ITiledMapOffset = z.object({
  x: z.number(),
  y: z.number(),
});

export type ITiledMapOffset = z.infer<typeof ITiledMapOffset>;
