import { z } from 'zod';

export const ITiledMapPoint = z.object({
  x: z.number(),
  y: z.number(),
});

export type ITiledMapPoint = z.infer<typeof ITiledMapPoint>;
