import { z } from 'zod';

export const ITiledMapGrid = z.object({
  width: z.number(),
  height: z.number(),
  orientation: z.enum(['orthogonal', 'isometric']),
});

export type ITiledMapGrid = z.infer<typeof ITiledMapGrid>;
